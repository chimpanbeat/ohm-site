// Body map zone overlays and measurements (B5, I-157; ARCHITECTURE §B12 Zones).
//   npm run bodymap:zones [-- <figure> ...]
//     Per figure with a zone file (src/data/bodymap-zones/<figure>.json): two overlay PNGs in
//     docs/build/screens/bodymap-zones/ (<figure>-leaves.png, <figure>-regions.png), coverage (body pixels
//     outside every leaf) and the smaller bounding-box side of each leaf and region in canvas units,
//     with anything under the floors flagged. A figure with no zone file is skipped.
//   npm run bodymap:zones -- --rows [--step 0.01] [<figure> ...]
//     The body's runs per row, read from png/: how the zone list's sizes and the polygons were measured.
// Reads the art and the zone files only. No client data, ever.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bodymap } from '../src/data/bodymap.ts';
import { leafKeys } from '../src/lib/bodymap-zones.ts';
import { pointInPolygon } from '../src/lib/geo.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const ART = join(root, 'src/assets/bodymap/png');
const ZONES = join(root, 'src/data/bodymap-zones');
const OUT = join(root, 'docs/build/screens/bodymap-zones');
const FIGURES = bodymap.figures.flatMap((sex) => bodymap.views.map((view) => `${sex}_${view}`));
const W = bodymap.viewBox.width;
const H = bodymap.viewBox.height;
/** Floors on the smaller bounding-box side, canvas units (§B12 Sizes, BM-2). */
const LEAF_FLOOR = 105;
const REGION_FLOOR = 210;
const REGION_EXEMPT = { 'ribs-side': 170, 'shoulder-top': 180 };
/** The same raster and white cut-off as tests/bodymap-zones.test.ts, so the numbers agree. */
const MASK_W = 512;
const MASK_H = 1024;
const WHITE = 245;

const viewOf = (figure) => (figure.endsWith('front') ? 'front' : 'back');
const bare = (key) => key.replace(/^(left|right)-/, '');
const regionFloor = (key) => REGION_EXEMPT[bare(key)] ?? REGION_FLOOR;

function bbox(rings) {
  const pts = rings.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
function smaller(rings) {
  const b = bbox(rings);
  return Math.min((b.x1 - b.x0) * W, (b.y1 - b.y0) * H);
}

/** Body pixels of a figure at the given size: anything that is not the white page. */
async function bodyMask(figure, w, h) {
  const { data } = await sharp(join(ART, `${figure}.png`)).resize(w, h).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 3] < WHITE || data[i * 3 + 1] < WHITE || data[i * 3 + 2] < WHITE ? 1 : 0;
  return mask;
}

/** The leaves of each region of a view: its fine zones, or the region itself. */
function leavesByRegion(view) {
  const map = new Map();
  for (const r of bodymap.regions[view]) {
    const fine = bodymap.zones[view].filter((z) => z.region === r.key).map((z) => z.key);
    map.set(r.key, fine.length ? fine : [r.key]);
  }
  return map;
}
function nameOf(view, key) {
  return (bodymap.zones[view].find((z) => z.key === key) ?? bodymap.regions[view].find((r) => r.key === key))?.name ?? key;
}

// ---------------------------------------------------------------- --rows

async function printRows(figure, step) {
  const file = join(ART, `${figure}.png`);
  if (!existsSync(file)) return;
  const mask = await bodyMask(figure, W, H);
  console.log(`\n${figure}: body runs per row (y, then x from-to of each run, 0-1 of the canvas; width in canvas units)`);
  for (let v = 0; v <= 1 + 1e-9; v += step) {
    const y = Math.min(H - 1, Math.round(v * H));
    const runs = [];
    let start = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && mask[y * W + x] === 1;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        // a highlight inside the body is a few white pixels: join runs that close together
        const last = runs[runs.length - 1];
        if (last && start - last[1] <= 8) last[1] = x;
        else runs.push([start, x]);
        start = -1;
      }
    }
    const wide = runs.filter(([a, b]) => b - a > 3);
    if (!wide.length) continue;
    console.log(`  ${v.toFixed(3)}  ${wide.map(([a, b]) => `${(a / W).toFixed(3)}-${(b / W).toFixed(3)} (${b - a})`).join('  ')}`);
  }
}

// ---------------------------------------------------------------- measurements

/** Body pixels outside every leaf, and the largest uncovered patch (its longer side, in mask pixels). */
function coverage(file, mask) {
  const covered = new Uint8Array(MASK_W * MASK_H);
  for (const z of file.zones) {
    const b = bbox(z.rings);
    for (let py = Math.max(0, Math.floor(b.y0 * MASK_H)); py <= Math.min(MASK_H - 1, Math.ceil(b.y1 * MASK_H)); py++) {
      for (let px = Math.max(0, Math.floor(b.x0 * MASK_W)); px <= Math.min(MASK_W - 1, Math.ceil(b.x1 * MASK_W)); px++) {
        if (!covered[py * MASK_W + px] && pointInPolygon([(px + 0.5) / MASK_W, (py + 0.5) / MASK_H], z.rings)) covered[py * MASK_W + px] = 1;
      }
    }
  }
  let body = 0;
  let missed = 0;
  const gap = new Uint8Array(MASK_W * MASK_H);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    body++;
    if (!covered[i]) {
      missed++;
      gap[i] = 1;
    }
  }
  let worst = { side: 0, x: 0, y: 0 };
  const seen = new Uint8Array(MASK_W * MASK_H);
  for (let i = 0; i < gap.length; i++) {
    if (!gap[i] || seen[i]) continue;
    const stack = [i];
    seen[i] = 1;
    let x0 = MASK_W, x1 = 0, y0 = MASK_H, y1 = 0;
    while (stack.length) {
      const k = stack.pop();
      const x = k % MASK_W;
      const y = (k / MASK_W) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MASK_W || ny >= MASK_H) continue;
        const n = ny * MASK_W + nx;
        if (gap[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    const side = Math.max(x1 - x0, y1 - y0) + 1;
    if (side > worst.side) worst = { side, x: (x0 + 0.5) / MASK_W, y: (y0 + 0.5) / MASK_H };
  }
  return { body, missed, worst };
}

function report(figure, file, mask) {
  const view = viewOf(figure);
  const byRegion = leavesByRegion(view);
  const rings = new Map(file.zones.map((z) => [z.key, z.rings]));
  let flags = 0;
  const flag = (text) => { flags++; return `  <-- ${text}`; };

  console.log(`\n${figure} (zone set ${file.zoneSet}, ${file.zones.length} leaves)`);
  if (file.zoneSet !== bodymap.zoneSet) console.log(`  zoneSet is ${file.zoneSet}, the contract says ${bodymap.zoneSet}${flag('VERSION')}`);
  const want = leafKeys(view);
  const missing = want.filter((k) => !rings.has(k));
  const extra = [...rings.keys()].filter((k) => !want.includes(k));
  if (missing.length) console.log(`  missing leaves: ${missing.join(', ')}${flag('MISSING')}`);
  if (extra.length) console.log(`  not leaves of this view: ${extra.join(', ')}${flag('EXTRA')}`);

  const c = coverage(file, mask);
  const pct = (100 * c.missed) / c.body;
  console.log(
    `  coverage: ${c.missed} of ${c.body} body pixels outside every leaf (${pct.toFixed(3)}%, limit 0.1%)${pct > 0.1 ? flag('COVERAGE') : ''}`,
  );
  console.log(
    c.worst.side
      ? `  largest uncovered patch: ${c.worst.side} px at x ${c.worst.x.toFixed(3)}, y ${c.worst.y.toFixed(3)} (limit 4 px at ${MASK_W}x${MASK_H})${c.worst.side > 4 ? flag('GAP') : ''}`
      : '  no uncovered patch',
  );

  console.log(`  smaller bounding-box side, canvas units (leaf floor ${LEAF_FLOOR}; region floor ${REGION_FLOOR}, ribs-side 170, shoulder-top 180):`);
  for (const r of bodymap.regions[view]) {
    const leaves = byRegion.get(r.key).filter((k) => rings.has(k));
    if (!leaves.length) continue;
    const size = smaller(leaves.flatMap((k) => rings.get(k)));
    const floor = regionFloor(r.key);
    console.log(`    ${r.key.padEnd(30)} ${String(Math.round(size)).padStart(4)}${size < floor ? flag(`UNDER ${floor}`) : ''}`);
    for (const k of leaves) {
      const s = smaller(rings.get(k));
      const own = k === r.key;
      if (own && s >= LEAF_FLOOR) continue; // a region with no fine zones: one line is enough
      console.log(`      ${(own ? '(as a leaf)' : k).padEnd(28)} ${String(Math.round(s)).padStart(4)}${s < LEAF_FLOOR ? flag(`UNDER ${LEAF_FLOOR}`) : ''}`);
    }
  }

  for (const r of bodymap.regions[view]) {
    const a = file.anchors?.[r.key];
    if (!a) { console.log(`  no anchor for ${r.key}${flag('ANCHOR')}`); continue; }
    const inLeaf = byRegion.get(r.key).some((k) => rings.has(k) && pointInPolygon(a, rings.get(k)));
    const inBody = mask[Math.min(MASK_H - 1, Math.floor(a[1] * MASK_H)) * MASK_W + Math.min(MASK_W - 1, Math.floor(a[0] * MASK_W))] === 1;
    if (!inLeaf || !inBody) console.log(`  anchor of ${r.key} at ${a.join(', ')}: ${inLeaf ? '' : 'outside its own leaves '}${inBody ? '' : 'outside the body'}${flag('ANCHOR')}`);
  }
  console.log(flags ? `  ${flags} flagged` : '  nothing flagged');
  return flags;
}

// ---------------------------------------------------------------- overlays

const MARGIN = 1000; // legend column on each side of the figure, canvas units
const TOP = 170; // title band above the figure
const ROW = 76; // legend row height
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pts = (ring) => ring.map(([x, y]) => `${(MARGIN + x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(' ');
const hue = (i) => Math.round((i * 137.508) % 360);

/** A point well inside a polygon (the grid point farthest from its edges), in canvas units. */
function labelPoint(rings) {
  const ring = rings[0].map(([x, y]) => [x * W, y * H]);
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const edgeDistance = (px, py) => {
    let best = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[(i + 1) % ring.length];
      const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len2)) : 0;
      best = Math.min(best, Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay))));
    }
    return best;
  };
  let best = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, d: -1 };
  const N = 40;
  for (let i = 1; i < N; i++) {
    for (let j = 1; j < N; j++) {
      const px = x0 + ((x1 - x0) * i) / N;
      const py = y0 + ((y1 - y0) * j) / N;
      if (!pointInPolygon([px / W, py / H], rings)) continue;
      const d = edgeDistance(px, py);
      if (d > best.d) best = { x: px, y: py, d };
    }
  }
  return best;
}

/**
 * The outline of a group of polygons that share borders: every edge is cut at the group's own vertices that lie
 * on it, and a piece that two polygons share is inside the group, so it is left out.
 */
function outline(polys) {
  const all = polys.flatMap((rings) => rings[0]);
  const key = (p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
  const count = new Map();
  for (const rings of polys) {
    const ring = rings[0];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const len = Math.hypot((b[0] - a[0]) * W, (b[1] - a[1]) * H);
      if (!len) continue;
      const cuts = [0, 1];
      for (const p of all) {
        const t = (((p[0] - a[0]) * W) * ((b[0] - a[0]) * W) + ((p[1] - a[1]) * H) * ((b[1] - a[1]) * H)) / (len * len);
        if (t <= 1e-6 || t >= 1 - 1e-6) continue;
        const off = Math.hypot((a[0] + t * (b[0] - a[0]) - p[0]) * W, (a[1] + t * (b[1] - a[1]) - p[1]) * H);
        if (off < 0.75) cuts.push(t);
      }
      cuts.sort((m, n) => m - n);
      for (let c = 0; c + 1 < cuts.length; c++) {
        if (cuts[c + 1] - cuts[c] < 1e-6) continue;
        const p = [a[0] + cuts[c] * (b[0] - a[0]), a[1] + cuts[c] * (b[1] - a[1])];
        const q = [a[0] + cuts[c + 1] * (b[0] - a[0]), a[1] + cuts[c + 1] * (b[1] - a[1])];
        const k = [key(p), key(q)].sort().join('|');
        const seen = count.get(k);
        if (seen) seen.n++;
        else count.set(k, { n: 1, p, q });
      }
    }
  }
  return [...count.values()].filter((e) => e.n === 1);
}

/** Legend rows down one side, each as near its shape's height as the rows above allow. */
function placeRows(items) {
  const sorted = [...items].sort((a, b) => a.at.y - b.at.y);
  let y = 20;
  for (const it of sorted) {
    it.row = Math.max(y, it.at.y - ROW / 2);
    y = it.row + ROW;
  }
  const over = y - (H - 20);
  if (over > 0) {
    let limit = H - 20;
    for (let i = sorted.length - 1; i >= 0; i--) {
      sorted[i].row = Math.min(sorted[i].row, limit - ROW);
      limit = sorted[i].row;
    }
  }
  return sorted;
}

/**
 * One overlay: the figure in the middle, every shape filled and numbered, and a legend on each side listing
 * number, name and key beside the half of the body it belongs to. Names never have to fit inside a shape.
 */
async function overlay(figure, title, shapes, target) {
  const width = W + 2 * MARGIN;
  const height = H + TOP;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="Arial, Helvetica, sans-serif">`;
  svg += `<text x="${width / 2}" y="72" font-size="52" font-weight="bold" text-anchor="middle" fill="#111">${esc(title)}</text>`;
  svg += `<text x="${width / 2}" y="124" font-size="30" text-anchor="middle" fill="#444">Left and right are the client's own. Shapes reach a little past the outline on purpose.</text>`;
  svg += `<g transform="translate(0 ${TOP})">`;
  for (const s of shapes) {
    for (const rings of s.polys) svg += `<polygon points="${pts(rings[0])}" fill="hsl(${s.hue} 75% 50%)" fill-opacity="0.42" stroke="none"/>`;
  }
  for (const s of shapes) {
    for (const e of outline(s.polys)) {
      svg += `<line x1="${(MARGIN + e.p[0] * W).toFixed(1)}" y1="${(e.p[1] * H).toFixed(1)}" x2="${(MARGIN + e.q[0] * W).toFixed(1)}" y2="${(e.q[1] * H).toFixed(1)}" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>`;
    }
  }
  for (const s of shapes) {
    const x = (MARGIN + s.at.x).toFixed(1);
    const y = (s.at.y + 14).toFixed(1);
    svg += `<text x="${x}" y="${y}" font-size="40" font-weight="bold" text-anchor="middle" stroke="#fff" stroke-width="9" stroke-linejoin="round" fill="#fff">${s.n}</text>`;
    svg += `<text x="${x}" y="${y}" font-size="40" font-weight="bold" text-anchor="middle" fill="#111">${s.n}</text>`;
  }
  const sides = [shapes.filter((s) => s.at.x < W / 2), shapes.filter((s) => s.at.x >= W / 2)];
  sides.forEach((items, side) => {
    const x = side === 0 ? 24 : MARGIN + W + 24;
    for (const it of placeRows(items)) {
      svg += `<rect x="${x}" y="${it.row + 6}" width="56" height="56" rx="8" fill="hsl(${it.hue} 75% 50%)" fill-opacity="0.55" stroke="#1a1a1a" stroke-width="2"/>`;
      svg += `<text x="${x + 28}" y="${it.row + 46}" font-size="32" font-weight="bold" text-anchor="middle" fill="#111">${it.n}</text>`;
      svg += `<text x="${x + 72}" y="${it.row + 32}" font-size="30" font-weight="bold" fill="#111">${esc(it.name)}</text>`;
      svg += `<text x="${x + 72}" y="${it.row + 62}" font-size="24" fill="#555">${esc(it.key)}</text>`;
    }
  });
  svg += '</g></svg>';
  const art = await sharp(join(ART, `${figure}.png`)).resize(W, H).png().toBuffer();
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite([{ input: art, left: MARGIN, top: TOP }, { input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(target);
}

async function overlays(figure, file) {
  const view = viewOf(figure);
  const byRegion = leavesByRegion(view);
  const rings = new Map(file.zones.map((z) => [z.key, z.rings]));
  mkdirSync(OUT, { recursive: true });

  // leaves, numbered head to toe in the contract's order
  const leaves = leafKeys(view)
    .filter((k) => rings.has(k))
    .map((k) => ({ key: k, name: nameOf(view, k), polys: [rings.get(k)], at: labelPoint(rings.get(k)) }))
    .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x)
    .map((s, i) => ({ ...s, n: i + 1, hue: hue(i) }));
  const leavesPng = join(OUT, `${figure}-leaves.png`);
  await overlay(figure, `${figure}: fine zones (${leaves.length}), PDF and JSON only`, leaves, leavesPng);

  // coarse regions: the union of each region's leaves, numbered at the region's anchor (where a list mark lands)
  const regions = bodymap.regions[view]
    .map((r) => {
      const polys = byRegion.get(r.key).filter((k) => rings.has(k)).map((k) => rings.get(k));
      const a = file.anchors?.[r.key];
      return { key: r.key, name: r.name, polys, at: a ? { x: a[0] * W, y: a[1] * H } : polys.length ? labelPoint(polys[0]) : null };
    })
    .filter((s) => s.polys.length && s.at)
    .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x)
    .map((s, i) => ({ ...s, n: i + 1, hue: hue(i) }));
  const regionsPng = join(OUT, `${figure}-regions.png`);
  await overlay(figure, `${figure}: regions (${regions.length}), what the client sees; each number sits on the region's list mark`, regions, regionsPng);
  return [leavesPng, regionsPng];
}

// ---------------------------------------------------------------- main

const args = process.argv.slice(2);
const rows = args.includes('--rows');
const stepAt = args.indexOf('--step');
const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 0.01;
const named = args.filter((a, i) => !a.startsWith('--') && !(stepAt >= 0 && i === stepAt + 1));
const unknown = named.filter((n) => !FIGURES.includes(n));
if (unknown.length || !(step > 0)) {
  console.error(`Usage: npm run bodymap:zones -- [--rows [--step 0.01]] [${FIGURES.join(' | ')}]`);
  process.exit(1);
}
const figures = named.length ? named : FIGURES;

if (rows) {
  for (const figure of figures) await printRows(figure, step);
} else {
  let flags = 0;
  let done = 0;
  for (const figure of figures) {
    const zoneFile = join(ZONES, `${figure}.json`);
    if (!existsSync(zoneFile) || !existsSync(join(ART, `${figure}.png`))) continue; // no zones yet
    const file = JSON.parse(readFileSync(zoneFile, 'utf8'));
    flags += report(figure, file, await bodyMask(figure, MASK_W, MASK_H));
    for (const png of await overlays(figure, file)) console.log(`  wrote ${png.slice(root.length).replace(/\\/g, '/')}`);
    done++;
  }
  console.log(`\n${done} figure${done === 1 ? '' : 's'}, ${flags} flagged.`);
}
