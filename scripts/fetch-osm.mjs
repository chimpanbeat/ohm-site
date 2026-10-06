// Fetches the major roads and town labels for the service-area map from OpenStreetMap
// (Overpass API) and writes src/data/osm.geojson. Run by hand, rarely; commit the result.
// Never part of CI or the build. See docs/build/ARCHITECTURE.md §B5.
//
// Output is ODbL data: © OpenStreetMap contributors. The map shows the credit.
// Only {kind, name, major} properties are written; no OSM tags or IDs.
//
// Usage: npm run osm [-- --out src/data/osm.geojson]

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'ohm-site map builder (https://github.com/chimpanbeat/ohm-site)';
const RETRY_MS = 30_000;

// [south, west, north, east] (Overpass order). The map's full view plus ~25% each side, so a
// widened `out` view (Falcon, Fountain, Monument pins) still has roads around it.
const BBOX = [38.63, -105.09, 39.17, -104.54];
const CLIP = { w: BBOX[1], s: BBOX[0], e: BBOX[3], n: BBOX[2] };

const SIMPLIFY_DEG = 0.0004;
const DECIMALS = 5;
// Pieces of one road closer than NEAR_KM form a cluster. Clusters shorter than MIN_KM are dropped:
// they are isolated stubs (a ramp, the far end of a road whose middle isn't a major road) that
// show on the map as unlabeled dashes (7R).
const NEAR_KM = 0.3;
const MIN_KM = 2;

/** Road names (after dropping a North/South/East/West prefix) → short name. */
const NAMED = [
  ['Academy Boulevard', 'Academy'],
  ['Woodmen Road', 'Woodmen'],
  ['Powers Boulevard', 'Powers'],
  ['Garden of the Gods Road', 'Garden of the Gods'],
  ['Austin Bluffs Parkway', 'Austin Bluffs'],
  ['Templeton Gap Road', 'Templeton Gap'],
  ['Baptist Road', 'Baptist'],
];

/** Output order, with each road's short name and `major` flag. */
const ROADS = [
  { name: 'I-25', major: true },
  { name: 'US 24', major: false },
  { name: 'Hwy 83', major: false },
  ...NAMED.map(([, name]) => ({ name, major: false })),
];

const PLACES = [
  'Colorado Springs',
  'Manitou Springs',
  'Monument',
  'Falcon',
  'Fountain',
  'Black Forest',
  'Security-Widefield',
];
/** Labels drawn at the mean of several OSM place nodes (OSM has no single node for them). */
const COMBINED = { 'Security-Widefield': ['Security', 'Widefield'] };
const OSM_PLACES = PLACES.flatMap((p) => COMBINED[p] ?? [p]);
const PLACE_RANK = { city: 0, town: 1, village: 2, hamlet: 3 };

const outPath =
  process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : fileURLToPath(new URL('../src/data/osm.geojson', import.meta.url));

const box = BBOX.join(',');
const query = `[out:json][timeout:120];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"]["name"~"^(North |South |East |West )?(${NAMED.map(([n]) => n).join('|')})$"](${box});
  way["highway"~"^(motorway|trunk)$"]["ref"~"I 25|US 24"](${box});
  way["highway"]["ref"~"CO 83"](${box});
  node["place"~"^(city|town|village|hamlet)$"]["name"~"^(${OSM_PLACES.join('|')})$"](${box});
);
out geom;`;

async function overpass() {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // Overpass answers "too busy" with an HTML/XML page, not JSON.
      if (attempt === 0) {
        console.error(`Overpass did not return JSON (HTTP ${res.status}); retrying in ${RETRY_MS / 1000}s…`);
        await new Promise((r) => setTimeout(r, RETRY_MS));
      }
    }
  }
  console.error('Overpass did not return JSON twice. Try again later.');
  process.exit(1);
}

const refsOf = (tags) => (tags.ref ?? '').split(';').map((s) => s.trim());

/** The short name for a way, or null. A matching ref wins over the name. */
function shortName(tags) {
  const refs = refsOf(tags);
  const highway = tags.highway;
  if (refs.includes('I 25') && (highway === 'motorway' || highway === 'trunk')) return 'I-25';
  if (refs.includes('US 24') && (highway === 'motorway' || highway === 'trunk')) return 'US 24';
  if (refs.includes('CO 83')) return 'Hwy 83';
  const bare = (tags.name ?? '').replace(/^(North|South|East|West) /, '');
  return NAMED.find(([n]) => n === bare)?.[1] ?? null;
}

/**
 * Joins lines that share an endpoint into longer chains. OSM splits roads into many short
 * ways; simplifying them one by one leaves thousands of 2-point lines.
 */
function joinLines(input) {
  const key = ([x, y]) => `${x},${y}`;
  const lines = input.map((l) => l.slice());
  const alive = new Set(lines.keys());
  const ends = new Map(); // endpoint key → set of line indexes
  const addEnd = (k, i) => (ends.get(k) ?? ends.set(k, new Set()).get(k)).add(i);
  lines.forEach((l, i) => {
    addEnd(key(l[0]), i);
    addEnd(key(l[l.length - 1]), i);
  });
  const dropEnds = (i) => {
    const l = lines[i];
    ends.get(key(l[0]))?.delete(i);
    ends.get(key(l[l.length - 1]))?.delete(i);
  };
  for (const i of lines.keys()) {
    if (!alive.has(i)) continue;
    let grew = true;
    while (grew) {
      grew = false;
      for (const atEnd of [true, false]) {
        const l = lines[i];
        const k = key(atEnd ? l[l.length - 1] : l[0]);
        const j = [...(ends.get(k) ?? [])].find((m) => m !== i && alive.has(m));
        if (j === undefined) continue;
        dropEnds(i);
        dropEnds(j);
        let o = lines[j];
        // Orient o so it continues l at the shared point.
        if (atEnd ? key(o[0]) !== k : key(o[o.length - 1]) !== k) o = o.slice().reverse();
        lines[i] = atEnd ? l.concat(o.slice(1)) : o.slice(0, -1).concat(l);
        alive.delete(j);
        addEnd(key(lines[i][0]), i);
        addEnd(key(lines[i][lines[i].length - 1]), i);
        grew = true;
      }
    }
  }
  return [...alive].map((i) => lines[i]);
}

// Liang–Barsky: the part of segment a→b inside the clip box, or null.
function clipSegment([x0, y0], [x1, y1]) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, x0 - CLIP.w],
    [dx, CLIP.e - x0],
    [-dy, y0 - CLIP.s],
    [dy, CLIP.n - y0],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return [
    [x0 + t0 * dx, y0 + t0 * dy],
    [x0 + t1 * dx, y0 + t1 * dy],
  ];
}

/** Splits a line into the pieces that lie inside the clip box. */
function clipLine(line) {
  const pieces = [];
  let cur = null;
  for (let i = 1; i < line.length; i++) {
    const seg = clipSegment(line[i - 1], line[i]);
    if (!seg) {
      cur = null;
      continue;
    }
    const continues = cur && cur[cur.length - 1][0] === seg[0][0] && cur[cur.length - 1][1] === seg[0][1];
    if (continues) cur.push(seg[1]);
    else {
      cur = [seg[0], seg[1]];
      pieces.push(cur);
    }
  }
  return pieces;
}

// Douglas–Peucker on lng/lat treated as planar (fine at this scale).
function simplify(line, tol) {
  if (line.length < 3) return line;
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = line[a];
    const [bx, by] = line[b];
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1;
    let max = tol;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = line[i];
      const d =
        len === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > max) {
        max = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

// Kilometres on a local flat approximation (fine at this scale).
const KX = 111.32 * Math.cos(((BBOX[0] + BBOX[2]) / 2) * (Math.PI / 180));
const KY = 110.57;
const km = ([ax, ay], [bx, by]) => Math.hypot((bx - ax) * KX, (by - ay) * KY);
const lengthKm = (line) => line.reduce((sum, p, i) => (i ? sum + km(line[i - 1], p) : 0), 0);

function pointToSegmentKm(p, a, b) {
  const [px, py] = [p[0] * KX, p[1] * KY];
  const [ax, ay] = [a[0] * KX, a[1] * KY];
  const [bx, by] = [b[0] * KX, b[1] * KY];
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** True when any vertex of one line is within `limit` km of the other line. */
function near(a, b, limit) {
  const close = (pts, line) =>
    pts.some((p) => line.some((q, i) => i > 0 && pointToSegmentKm(p, line[i - 1], q) <= limit));
  return close(a, b) || close(b, a);
}

/** Drops clusters of nearby pieces whose total length is under MIN_KM. */
function dropStubs(pieces) {
  const parent = pieces.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (find(i) !== find(j) && near(pieces[i], pieces[j], NEAR_KM)) parent[find(j)] = find(i);
    }
  }
  const total = new Map();
  pieces.forEach((p, i) => total.set(find(i), (total.get(find(i)) ?? 0) + lengthKm(p)));
  return pieces.filter((_, i) => total.get(find(i)) >= MIN_KM);
}

const round = (n) => Number(n.toFixed(DECIMALS));

const data = await overpass();
const raw = new Map(ROADS.map((r) => [r.name, []]));
const lines = new Map(ROADS.map((r) => [r.name, []]));
const places = new Map();

for (const el of data.elements ?? []) {
  const tags = el.tags ?? {};
  if (el.type === 'way' && el.geometry) {
    const name = shortName(tags);
    if (name) raw.get(name).push(el.geometry.map((p) => [p.lon, p.lat]));
  } else if (el.type === 'node' && OSM_PLACES.includes(tags.name)) {
    const rank = PLACE_RANK[tags.place] ?? 9;
    const prev = places.get(tags.name);
    if (!prev || rank < prev.rank) places.set(tags.name, { rank, coord: [el.lon, el.lat] });
  }
}

for (const [name, ways] of raw) {
  const pieces = joinLines(ways).flatMap(clipLine);
  for (const piece of dropStubs(pieces)) {
    const s = simplify(piece, SIMPLIFY_DEG).map(([x, y]) => [round(x), round(y)]);
    if (s.length >= 2) lines.get(name).push(s);
  }
}

const missing = [
  ...ROADS.filter((r) => lines.get(r.name).length === 0).map((r) => `road ${r.name}`),
  ...OSM_PLACES.filter((p) => !places.has(p)).map((p) => `place ${p}`),
];
if (missing.length) {
  console.error(`Missing from OpenStreetMap results: ${missing.join(', ')}`);
  process.exit(1);
}

const features = [
  ...ROADS.map((r) => ({
    type: 'Feature',
    properties: { kind: 'road', name: r.name, major: r.major },
    geometry: { type: 'MultiLineString', coordinates: lines.get(r.name) },
  })),
  ...PLACES.map((name) => {
    const parts = (COMBINED[name] ?? [name]).map((p) => places.get(p).coord);
    const mean = (i) => round(parts.reduce((sum, c) => sum + c[i], 0) / parts.length);
    return {
      type: 'Feature',
      properties: { kind: 'place', name },
      geometry: { type: 'Point', coordinates: [mean(0), mean(1)] },
    };
  }),
];

writeFileSync(outPath, JSON.stringify({ type: 'FeatureCollection', features }) + '\n');

let vertices = 0;
for (const r of ROADS) {
  const ls = lines.get(r.name);
  const n = ls.reduce((sum, l) => sum + l.length, 0);
  vertices += n;
  console.log(`road  ${r.name.padEnd(20)} ${String(ls.length).padStart(3)} lines ${String(n).padStart(5)} vertices`);
}
console.log(`place ${PLACES.length} (${PLACES.join(', ')})`);
console.log(`${features.length} features, ${vertices} road vertices → ${outPath}`);
