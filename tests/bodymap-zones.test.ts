import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bodymap, sideOf, type View } from '../src/data/bodymap.ts';
import { describePin, leafKeys, locate, type Ring, type ZoneFile } from '../src/lib/bodymap-zones.ts';
import { pointInPolygon } from '../src/lib/geo.ts';
import { buildReport } from '../src/lib/bodymap-pdf.ts';

// B5 (I-073, I-156, I-157): two zone levels, the lookup and the female figure files. ARCHITECTURE §B12 Zones.
const root = fileURLToPath(new URL('..', import.meta.url));
const FIGURES = ['female_front', 'female_back'] as const;
const viewOf = (name: string): View => (name.endsWith('front') ? 'front' : 'back');
const zoneFile = (name: string): ZoneFile => JSON.parse(readFileSync(join(root, 'src/data/bodymap-zones', `${name}.json`), 'utf8'));
const files = () => Object.fromEntries(FIGURES.map((n) => [n, zoneFile(n)])) as Record<(typeof FIGURES)[number], ZoneFile>;
const W = 2048;
const H = 4096;

const bbox = (rings: Ring[]) => {
  const pts = rings.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
/** the smaller side of a bounding box, in canvas units */
const smaller = (rings: Ring[]) => {
  const b = bbox(rings);
  return Math.min((b.x1 - b.x0) * W, (b.y1 - b.y0) * H);
};

/** body pixels of the silhouette at 512x1024: anything that is not the white page */
async function body(name: string) {
  const { data, info } = await sharp(join(root, 'src/assets/bodymap/png', `${name}.png`)).resize(512, 1024).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 3] < 245 || data[i * 3 + 1] < 245 || data[i * 3 + 2] < 245 ? 1 : 0;
  return { mask, w: info.width, h: info.height };
}

function segmentsCross(a: number[], b: number[], c: number[], d: number[]): boolean {
  const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) && o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function simple(ring: Ring): boolean {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return false;
    }
  }
  return true;
}

test('1. contract: counts, region links, unique keys, twins, sides, names', () => {
  assert.equal(bodymap.zoneSet, 1);
  assert.equal(bodymap.reportVersion, 2);
  assert.equal(bodymap.regions.front.length, 28);
  assert.equal(bodymap.regions.back.length, 29);
  assert.equal(bodymap.zones.front.length, 51);
  assert.equal(bodymap.zones.back.length, 55);
  assert.equal(leafKeys('front').length, 57);
  assert.equal(leafKeys('back').length, 63);
  const all = new Set<string>();
  for (const view of bodymap.views) {
    const regionKeys = bodymap.regions[view].map((r) => r.key);
    for (const z of bodymap.zones[view]) {
      assert.ok(regionKeys.includes(z.region), `${z.key} sits in a ${view} region`);
      assert.match(z.key, /^[a-z]+(-[a-z]+)*$/);
      assert.ok(z.name.trim(), `${z.key} has a name`);
      assert.doesNotMatch(z.name, /massage therapist|\bLMT\b|licensed/i);
      assert.ok(!all.has(z.key), `${z.key} is unique`);
      all.add(z.key);
    }
    for (const k of regionKeys) {
      assert.ok(!all.has(k), `${k} is unique across both levels`);
      all.add(k);
    }
    const keys = bodymap.zones[view].map((z) => z.key);
    for (const z of bodymap.zones[view]) {
      if (z.key.startsWith('left-')) {
        const twin = bodymap.zones[view].find((q) => q.key === 'right-' + z.key.slice(5));
        assert.ok(twin, `${z.key} has a right twin`);
        assert.equal(twin!.region, z.region.startsWith('left-') ? 'right-' + z.region.slice(5) : z.region, `${z.key} twin sits in the twin region`);
        assert.equal(twin!.name, z.name.replace(/^Left /, 'Right '));
      }
      if (z.key.startsWith('right-')) assert.ok(keys.includes('left-' + z.key.slice(6)), `${z.key} has a left twin`);
    }
  }
  assert.equal(sideOf('left-knee'), 'left');
  assert.equal(sideOf('right-thigh-front-upper-inner'), 'right');
  assert.equal(sideOf('forehead'), 'midline');
  assert.equal(sideOf('belly-upper'), 'midline');
});

type Probe = { name: string; view: View; x: number; y: number; zone: string; region: string; side: 'left' | 'right' | 'midline' };
// Written from the art's landmarks (navel, xiphoid, collarbones, knee caps, skull base, blade edges, sit-bone lines).
// On a front view the client's left is the viewer's right (x above 0.5); on a back view it is x below 0.5.
const PROBES: Probe[] = [
  { name: 'forehead', view: 'front', x: 0.5, y: 0.07, zone: 'forehead', region: 'head-face', side: 'midline' },
  { name: 'left collarbone', view: 'front', x: 0.58, y: 0.195, zone: 'left-collarbone', region: 'left-shoulder', side: 'left' },
  { name: 'left chest by the breastbone', view: 'front', x: 0.54, y: 0.28, zone: 'left-chest-inner', region: 'left-chest', side: 'left' },
  { name: 'left chest by the armpit', view: 'front', x: 0.63, y: 0.28, zone: 'left-chest-outer', region: 'left-chest', side: 'left' },
  { name: 'above the navel', view: 'front', x: 0.55, y: 0.34, zone: 'left-belly-upper', region: 'belly-upper', side: 'left' },
  { name: 'below the navel', view: 'front', x: 0.45, y: 0.43, zone: 'right-belly-lower', region: 'belly-lower', side: 'right' },
  { name: 'left knee, inner', view: 'front', x: 0.585, y: 0.68, zone: 'left-knee-inner', region: 'left-knee', side: 'left' },
  { name: 'left knee, outer', view: 'front', x: 0.63, y: 0.68, zone: 'left-knee-outer', region: 'left-knee', side: 'left' },
  { name: 'left upper shin', view: 'front', x: 0.62, y: 0.76, zone: 'left-shin-upper', region: 'left-shin', side: 'left' },
  { name: 'left lower shin', view: 'front', x: 0.63, y: 0.86, zone: 'left-shin-lower', region: 'left-shin', side: 'left' },
  { name: 'left palm', view: 'front', x: 0.85, y: 0.51, zone: 'left-palm', region: 'left-wrist-hand', side: 'left' },
  { name: 'right forearm (no fine zones)', view: 'front', x: 0.22, y: 0.41, zone: 'right-forearm', region: 'right-forearm', side: 'right' },
  { name: 'back of head', view: 'back', x: 0.5, y: 0.07, zone: 'head-back-upper', region: 'head-back', side: 'midline' },
  { name: 'left skull base', view: 'back', x: 0.45, y: 0.13, zone: 'left-skull-base', region: 'head-back', side: 'left' },
  { name: 'right skull base', view: 'back', x: 0.55, y: 0.13, zone: 'right-skull-base', region: 'head-back', side: 'right' },
  { name: 'left blade, outer', view: 'back', x: 0.32, y: 0.23, zone: 'left-shoulder-blade-outer', region: 'left-shoulder-blade', side: 'left' },
  { name: 'left blade, middle', view: 'back', x: 0.385, y: 0.23, zone: 'left-shoulder-blade-mid', region: 'left-shoulder-blade', side: 'left' },
  { name: 'left blade, inner', view: 'back', x: 0.44, y: 0.23, zone: 'left-shoulder-blade-inner', region: 'left-shoulder-blade', side: 'left' },
  { name: 'left low back, beside the spine', view: 'back', x: 0.46, y: 0.38, zone: 'left-low-back-inner', region: 'left-low-back', side: 'left' },
  { name: 'left lower glute', view: 'back', x: 0.4, y: 0.525, zone: 'left-glute-lower', region: 'left-glute', side: 'left' },
  { name: 'left hamstring, upper inner', view: 'back', x: 0.44, y: 0.57, zone: 'left-hamstring-upper-inner', region: 'left-hamstring', side: 'left' },
  { name: 'left hamstring, lower outer', view: 'back', x: 0.35, y: 0.64, zone: 'left-hamstring-lower-outer', region: 'left-hamstring', side: 'left' },
  { name: 'left upper calf', view: 'back', x: 0.38, y: 0.74, zone: 'left-calf-upper', region: 'left-calf', side: 'left' },
  { name: 'left heel', view: 'back', x: 0.38, y: 0.94, zone: 'left-heel', region: 'left-ankle-heel', side: 'left' },
];

test('2. probes from the art landmarks give the expected zone, region and side on each female figure', () => {
  const f = files();
  for (const p of PROBES) {
    const at = locate(f[`female_${p.view}`], p.view, p.x, p.y);
    assert.equal(at.zone, p.zone, `${p.name}: zone`);
    assert.equal(at.region, p.region, `${p.name}: region`);
    assert.equal(at.side, p.side, `${p.name}: side`);
    assert.ok(at.zoneName && at.regionName, `${p.name}: names`);
  }
});

test('3. coverage: at most 0.1% of body pixels outside every leaf, no gap wider than 4 px', async () => {
  for (const name of FIGURES) {
    const view = viewOf(name);
    const file = zoneFile(name);
    const { mask, w, h } = await body(name);
    const covered = new Uint8Array(w * h);
    for (const z of file.zones) {
      const b = bbox(z.rings);
      for (let py = Math.max(0, Math.floor(b.y0 * h)); py <= Math.min(h - 1, Math.ceil(b.y1 * h)); py++) {
        for (let px = Math.max(0, Math.floor(b.x0 * w)); px <= Math.min(w - 1, Math.ceil(b.x1 * w)); px++) {
          if (!covered[py * w + px] && pointInPolygon([(px + 0.5) / w, (py + 0.5) / h], z.rings)) covered[py * w + px] = 1;
        }
      }
    }
    let bodyN = 0;
    let missed = 0;
    const gap = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      bodyN++;
      if (!covered[i]) {
        missed++;
        gap[i] = 1;
      }
    }
    assert.ok(bodyN > 50_000, `${name}: the silhouette was read (${bodyN} px)`);
    assert.ok(missed / bodyN <= 0.001, `${name} (${view}): ${missed} of ${bodyN} body pixels outside every leaf`);
    const seen = new Uint8Array(w * h);
    for (let i = 0; i < gap.length; i++) {
      if (!gap[i] || seen[i]) continue;
      const stack = [i];
      seen[i] = 1;
      let x0 = w, x1 = 0, y0 = h, y1 = 0;
      while (stack.length) {
        const k = stack.pop()!;
        const x = k % w, y = (k / w) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (gap[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
        }
      }
      assert.ok(Math.max(x1 - x0, y1 - y0) + 1 <= 4, `${name}: an uncovered patch ${x1 - x0 + 1}x${y1 - y0 + 1} px at ${x0},${y0}`);
    }
  }
});

test('4. file shape: version, leaf keys, anchors, polygons, left and right', async () => {
  for (const name of FIGURES) {
    const view = viewOf(name);
    const file = zoneFile(name);
    assert.equal(file.zoneSet, bodymap.zoneSet, `${name}: zoneSet`);
    assert.deepEqual(file.zones.map((z) => z.key).sort(), leafKeys(view).sort(), `${name}: exactly the view's leaves`);
    const { mask, w, h } = await body(name);
    for (const z of file.zones) {
      assert.equal(z.rings.length, 1, `${z.key}: exactly one ring (the lookup tests ring 0 with pointInRing)`);
      for (const ring of z.rings) {
        assert.ok(ring.length >= 3, `${z.key}: at least 3 points`);
        for (const [x, y] of ring) assert.ok(x >= -0.05 && x <= 1.05 && y >= -0.05 && y <= 1.05, `${z.key}: within -0.05 to 1.05`);
        assert.ok(simple(ring), `${z.key}: doesn't cross itself`);
      }
    }
    const leavesOfRegion = (region: string) => {
      const fine = bodymap.zones[view].filter((z) => z.region === region).map((z) => z.key);
      return fine.length ? fine : [region];
    };
    assert.deepEqual(Object.keys(file.anchors).sort(), bodymap.regions[view].map((r) => r.key).sort(), `${name}: one anchor per region`);
    for (const r of bodymap.regions[view]) {
      const [x, y] = file.anchors[r.key];
      const own = file.zones.filter((z) => leavesOfRegion(r.key).includes(z.key));
      assert.ok(own.some((z) => pointInPolygon([x, y], z.rings)), `${name}: the ${r.key} anchor is inside one of its own leaves`);
      assert.equal(mask[Math.min(h - 1, Math.floor(y * h)) * w + Math.min(w - 1, Math.floor(x * w))], 1, `${name}: the ${r.key} anchor is inside the body`);
      if (r.key.startsWith('left-')) assert.ok(view === 'front' ? x > 0.5 : x < 0.5, `${name}: ${r.key} anchor on the client's left`);
      if (r.key.startsWith('right-')) assert.ok(view === 'front' ? x < 0.5 : x > 0.5, `${name}: ${r.key} anchor on the client's right`);
    }
  }
});

test('4b. a list pin at each region anchor reports that region, no zone', () => {
  const f = files();
  for (const name of FIGURES) {
    const view = viewOf(name);
    for (const r of bodymap.regions[view]) {
      const [x, y] = f[name].anchors[r.key];
      const d = describePin(f[name], { view, x, y, fromList: true });
      assert.equal(d.region, r.key, `${name}: ${r.key}`);
      assert.equal(d.regionName, r.name);
      assert.equal(d.zone, null);
      assert.equal(d.side, sideOf(r.key));
    }
  }
});

test('5. sizes (BM-2): leaves at least 105 canvas units, regions at least 210 (ribs 170, shoulder-top 195)', () => {
  const exempt: Record<string, number> = { 'left-ribs-side': 170, 'right-ribs-side': 170, 'left-shoulder-top': 195, 'right-shoulder-top': 195 };
  for (const name of FIGURES) {
    const view = viewOf(name);
    const file = zoneFile(name);
    for (const z of file.zones) assert.ok(smaller(z.rings) >= 105, `${name}: ${z.key} is ${Math.round(smaller(z.rings))}`);
    for (const r of bodymap.regions[view]) {
      const keys = bodymap.zones[view].filter((z) => z.region === r.key).map((z) => z.key);
      const own = file.zones.filter((z) => (keys.length ? keys : [r.key]).includes(z.key));
      const floor = exempt[r.key] ?? 210;
      assert.ok(smaller(own.flatMap((z) => z.rings)) >= floor, `${name}: region ${r.key} is ${Math.round(smaller(own.flatMap((z) => z.rings)))}, floor ${floor}`);
    }
  }
});

test('6. sequence: a pin looked up again when the view or the figure changes; the list and outside cases', () => {
  const f = files();
  const sent = new Date('2026-12-01T17:00:00Z');
  const pin = (id: string, o: Partial<{ view: View; x: number; y: number; fromList: boolean }>) => ({
    id, view: 'front' as View, x: 0.55, y: 0.34, type: 'pain' as const, intensity: null, note: '', star: false, fromList: false, ...o,
  });
  const describe = (p: ReturnType<typeof pin>) => describePin(f[`female_${p.view}`], p);
  const state = (pins: ReturnType<typeof pin>[]) => ({ name: 'Test Client', apptDate: '2026-12-03', figure: 'female' as const, pins });

  const navel = pin('a', {});
  const r1 = buildReport(state([navel]), sent, describe);
  assert.equal(r1.v, 2);
  assert.equal(r1.pins[0].zone, 'left-belly-upper');
  assert.equal(r1.pins[0].region, 'belly-upper');
  assert.equal(r1.pins[0].side, 'left');
  assert.equal(r1.pins[0].zoneSet, 1);
  assert.equal(r1.pins[0].fromList, false);

  const moved = pin('a', { view: 'back', x: 0.45, y: 0.13 }); // the same pin on the back view's skull base
  const r2 = buildReport(state([moved]), sent, describe);
  assert.equal(r2.pins[0].zone, 'left-skull-base');
  assert.equal(r2.pins[0].regionName, bodymap.regions.back.find((r) => r.key === 'head-back')!.name);

  const listed = pin('b', { x: f.female_front.anchors['left-knee'][0], y: f.female_front.anchors['left-knee'][1], fromList: true });
  const r3 = buildReport(state([listed]), sent, describe);
  assert.equal(r3.pins[0].zone, null);
  assert.equal(r3.pins[0].zoneName, null);
  assert.equal(r3.pins[0].region, 'left-knee');
  assert.equal(r3.pins[0].regionName, 'Left knee');
  assert.equal(r3.pins[0].side, 'left');
  assert.equal(r3.pins[0].fromList, true);

  const outside = pin('c', { x: 0.02, y: 0.02 });
  const r4 = buildReport(state([outside]), sent, describe);
  const o = r4.pins[0];
  assert.deepEqual([o.zone, o.zoneName, o.region, o.regionName, o.side], [null, null, null, null, null]);
  assert.equal(o.zoneSet, 1);

  assert.deepEqual(
    Object.keys(r1.pins[0]),
    ['n', 'view', 'x', 'y', 'type', 'zone', 'zoneName', 'region', 'regionName', 'side', 'zoneSet', 'intensity', 'note', 'star', 'fromList'],
  );
});

test('7. static: the PDF module imports no zone file, and the page source never renders a zone', () => {
  const pdf = readFileSync(join(root, 'src/lib/bodymap-pdf.ts'), 'utf8');
  assert.doesNotMatch(pdf, /bodymap-zones/);
  // The built page's HTML is checked against the preview build in tools/bodymap-e2e.mjs (dist holds the closed page).
  const page = readFileSync(join(root, 'src/pages/body-map.astro'), 'utf8');
  assert.doesNotMatch(page, /bodymap\.zones|bodymap-zones|zoneName/);
  assert.ok(existsSync(join(root, 'src/data/bodymap-zones/female_front.json')));
});
