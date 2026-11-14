import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bodymap, sideOf, type View } from '../src/data/bodymap.ts';
import { describePin, leafKeys, locate, type Ring, type ZoneFile } from '../src/lib/bodymap-zones.ts';
import { pointInPolygon } from '../src/lib/geo.ts';
import { extractText, getDocumentProxy } from 'unpdf';
import { buildPdf, buildReport } from '../src/lib/bodymap-pdf.ts';
import { createStore } from '../src/lib/bodymap.ts';

// B5, B5b (I-073, I-156, I-157): two zone levels, the lookup and the zone files of all four v1 figures. ARCHITECTURE §B12 Zones.
// B5c (I-160): the back shoulder, zone set 2. B5d (I-161, I-163, I-164): the hands and the further splits, zone set 3.
const root = fileURLToPath(new URL('..', import.meta.url));
const FIGURES = ['female_front', 'female_back', 'male_front', 'male_back'] as const;
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
  assert.equal(bodymap.zoneSet, 3);
  assert.equal(bodymap.reportVersion, 2);
  assert.equal(bodymap.regions.front.length, 28);
  assert.equal(bodymap.regions.back.length, 31);
  assert.equal(bodymap.zones.front.length, 74);
  assert.equal(bodymap.zones.back.length, 80);
  assert.equal(leafKeys('front').length, 78);
  assert.equal(leafKeys('back').length, 84);
  // B5d (I-161, I-164): six fine zones per hand, four per forearm
  const fineOf = (view: View, region: string) => bodymap.zones[view].filter((z) => z.region === region).length;
  for (const side of ['left', 'right']) {
    assert.equal(fineOf('front', `${side}-wrist-hand`), 6, `${side}-wrist-hand`);
    assert.equal(fineOf('back', `${side}-hand-back`), 6, `${side}-hand-back`);
    assert.equal(fineOf('front', `${side}-forearm`), 4, `${side}-forearm`);
    assert.equal(fineOf('back', `${side}-forearm-back`), 4, `${side}-forearm-back`);
  }
  const bare = (view: View) => bodymap.regions[view].filter((r) => fineOf(view, r.key) === 0).map((r) => r.key).sort();
  assert.deepEqual(bare('front'), ['left-ribs-side', 'left-upper-arm', 'right-ribs-side', 'right-upper-arm']);
  assert.deepEqual(bare('back'), ['left-shoulder-top', 'left-upper-arm-back', 'right-shoulder-top', 'right-upper-arm-back']);
  // I-163: no leaf is midline from zone set 3
  for (const view of bodymap.views) for (const k of leafKeys(view)) assert.notEqual(sideOf(k), 'midline', `${view}: leaf ${k} is sided`);
  // Brian's overlay look (Nov 13, 2026): names say medial/lateral, keys keep inner/outer
  const nameOf = (key: string) => [...bodymap.zones.front, ...bodymap.zones.back].find((z) => z.key === key)?.name;
  for (const z of [...bodymap.zones.front, ...bodymap.zones.back]) {
    assert.doesNotMatch(z.name, /\b(inner|outer)\b|finger side|thumb side|toe side|by the (little finger|thumb)/, `${z.key}: ${z.name}`);
  }
  assert.equal(nameOf('left-elbow-inner'), 'Left front of elbow, medial');
  assert.equal(nameOf('right-elbow-outer'), 'Right front of elbow, lateral');
  assert.equal(nameOf('left-knee-inner'), 'Left knee, medial');
  assert.equal(nameOf('right-foot-top-inner'), 'Right top of foot, medial');
  assert.equal(nameOf('left-wrist-front-outer'), 'Left wrist, palm side, lateral');
  assert.equal(nameOf('left-glute-lower-inner'), 'Left lower glute, medial, by the sit bone');
  assert.equal(nameOf('left-shoulder-blade-inner'), 'Left shoulder blade, medial border, by the spine');
  assert.equal(nameOf('left-glute-outer'), 'Left lateral hip');
  assert.equal(bodymap.regions.front.find((r) => r.key === 'left-knee')?.name, 'Left knee', 'region names unchanged');
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
  assert.equal(sideOf('head-face'), 'midline');
  assert.equal(sideOf('belly-upper'), 'midline');
});

type Probe = { name: string; view: View; x: number; y: number; zone: string; region: string; side: 'left' | 'right' | 'midline' };
// Written from the art's landmarks (navel, xiphoid, collarbones, knee caps, skull base, blade edges, sit-bone lines).
// On a front view the client's left is the viewer's right (x above 0.5); on a back view it is x below 0.5.
const PROBES: Probe[] = [
  { name: 'left forehead', view: 'front', x: 0.55, y: 0.07, zone: 'left-forehead', region: 'head-face', side: 'left' },
  { name: 'right forehead', view: 'front', x: 0.45, y: 0.07, zone: 'right-forehead', region: 'head-face', side: 'right' },
  { name: 'forehead on the centreline (female files only)', view: 'front', x: 0.5, y: 0.07, zone: 'left-forehead', region: 'head-face', side: 'left' },
  { name: 'left collarbone', view: 'front', x: 0.58, y: 0.195, zone: 'left-collarbone', region: 'left-shoulder', side: 'left' },
  { name: 'left chest by the breastbone', view: 'front', x: 0.54, y: 0.28, zone: 'left-chest-inner', region: 'left-chest', side: 'left' },
  { name: 'left chest by the armpit', view: 'front', x: 0.63, y: 0.28, zone: 'left-chest-outer', region: 'left-chest', side: 'left' },
  { name: 'above the navel', view: 'front', x: 0.55, y: 0.34, zone: 'left-belly-upper', region: 'belly-upper', side: 'left' },
  { name: 'below the navel', view: 'front', x: 0.45, y: 0.43, zone: 'right-belly-lower', region: 'belly-lower', side: 'right' },
  { name: 'left knee, inner', view: 'front', x: 0.585, y: 0.68, zone: 'left-knee-inner', region: 'left-knee', side: 'left' },
  { name: 'left knee, outer', view: 'front', x: 0.63, y: 0.68, zone: 'left-knee-outer', region: 'left-knee', side: 'left' },
  { name: 'left upper shin, inner', view: 'front', x: 0.58, y: 0.76, zone: 'left-shin-upper-inner', region: 'left-shin', side: 'left' },
  { name: 'left upper shin, outer', view: 'front', x: 0.67, y: 0.76, zone: 'left-shin-upper-outer', region: 'left-shin', side: 'left' },
  { name: 'right upper shin, inner', view: 'front', x: 0.42, y: 0.76, zone: 'right-shin-upper-inner', region: 'right-shin', side: 'right' },
  { name: 'left lower shin, inner', view: 'front', x: 0.60, y: 0.82, zone: 'left-shin-lower-inner', region: 'left-shin', side: 'left' },
  { name: 'left lower shin, outer', view: 'front', x: 0.655, y: 0.82, zone: 'left-shin-lower-outer', region: 'left-shin', side: 'left' },
  { name: 'left top of foot, big-toe side', view: 'front', x: 0.60, y: 0.94, zone: 'left-foot-top-inner', region: 'left-ankle-foot', side: 'left' },
  { name: 'left top of foot, little-toe side', view: 'front', x: 0.665, y: 0.94, zone: 'left-foot-top-outer', region: 'left-ankle-foot', side: 'left' },
  { name: 'left palm', view: 'front', x: 0.85, y: 0.51, zone: 'left-palm', region: 'left-wrist-hand', side: 'left' },
  { name: 'right upper arm (no fine zones)', view: 'front', x: 0.30, y: 0.30, zone: 'right-upper-arm', region: 'right-upper-arm', side: 'right' },
  { name: 'left upper forearm, little-finger side', view: 'front', x: 0.748, y: 0.402, zone: 'left-forearm-upper-inner', region: 'left-forearm', side: 'left' },
  { name: 'left upper forearm, thumb side', view: 'front', x: 0.795, y: 0.402, zone: 'left-forearm-upper-outer', region: 'left-forearm', side: 'left' },
  { name: 'right upper forearm, thumb side', view: 'front', x: 0.206, y: 0.402, zone: 'right-forearm-upper-outer', region: 'right-forearm', side: 'right' },
  { name: 'left lower forearm, medial', view: 'front', x: 0.775, y: 0.432, zone: 'left-forearm-lower-inner', region: 'left-forearm', side: 'left' },
  { name: 'left lower forearm, lateral', view: 'front', x: 0.816, y: 0.432, zone: 'left-forearm-lower-outer', region: 'left-forearm', side: 'left' },
  { name: 'left wrist, medial', view: 'front', x: 0.802, y: 0.462, zone: 'left-wrist-front-inner', region: 'left-wrist-hand', side: 'left' },
  { name: 'left wrist, lateral', view: 'front', x: 0.84, y: 0.462, zone: 'left-wrist-front-outer', region: 'left-wrist-hand', side: 'left' },
  { name: 'left front of ankle, inner', view: 'front', x: 0.61, y: 0.887, zone: 'left-ankle-front-inner', region: 'left-ankle-foot', side: 'left' },
  { name: 'left front of ankle, outer', view: 'front', x: 0.649, y: 0.887, zone: 'left-ankle-front-outer', region: 'left-ankle-foot', side: 'left' },
  { name: 'left back of head', view: 'back', x: 0.45, y: 0.07, zone: 'left-head-back-upper', region: 'head-back', side: 'left' },
  { name: 'right back of head', view: 'back', x: 0.55, y: 0.07, zone: 'right-head-back-upper', region: 'head-back', side: 'right' },
  { name: 'back of head on the centreline (female files only)', view: 'back', x: 0.5, y: 0.07, zone: 'right-head-back-upper', region: 'head-back', side: 'right' },
  { name: 'left skull base', view: 'back', x: 0.45, y: 0.13, zone: 'left-skull-base', region: 'head-back', side: 'left' },
  { name: 'right skull base', view: 'back', x: 0.55, y: 0.13, zone: 'right-skull-base', region: 'head-back', side: 'right' },
  { name: 'left back of shoulder, by the armpit', view: 'back', x: 0.32, y: 0.23, zone: 'left-shoulder-back-lower', region: 'left-shoulder-back', side: 'left' },
  { name: 'left back of shoulder, upper', view: 'back', x: 0.30, y: 0.19, zone: 'left-shoulder-back-upper', region: 'left-shoulder-back', side: 'left' },
  { name: 'right back of shoulder, upper', view: 'back', x: 0.70, y: 0.19, zone: 'right-shoulder-back-upper', region: 'right-shoulder-back', side: 'right' },
  { name: 'left top of shoulder, by the neck', view: 'back', x: 0.40, y: 0.185, zone: 'left-shoulder-top', region: 'left-shoulder-top', side: 'left' },
  { name: 'left blade, middle', view: 'back', x: 0.385, y: 0.23, zone: 'left-shoulder-blade-mid', region: 'left-shoulder-blade', side: 'left' },
  { name: 'left blade, inner', view: 'back', x: 0.44, y: 0.23, zone: 'left-shoulder-blade-inner', region: 'left-shoulder-blade', side: 'left' },
  { name: 'left low back, beside the spine', view: 'back', x: 0.46, y: 0.38, zone: 'left-low-back-inner', region: 'left-low-back', side: 'left' },
  { name: 'left lower glute, inner', view: 'back', x: 0.44, y: 0.52, zone: 'left-glute-lower-inner', region: 'left-glute', side: 'left' },
  { name: 'left lower glute, outer', view: 'back', x: 0.33, y: 0.52, zone: 'left-glute-lower-outer', region: 'left-glute', side: 'left' },
  { name: 'left hamstring, upper inner', view: 'back', x: 0.44, y: 0.57, zone: 'left-hamstring-upper-inner', region: 'left-hamstring', side: 'left' },
  { name: 'left hamstring, lower outer', view: 'back', x: 0.35, y: 0.64, zone: 'left-hamstring-lower-outer', region: 'left-hamstring', side: 'left' },
  { name: 'left upper calf, inner', view: 'back', x: 0.42, y: 0.74, zone: 'left-calf-upper-inner', region: 'left-calf', side: 'left' },
  { name: 'left upper calf, outer', view: 'back', x: 0.335, y: 0.74, zone: 'left-calf-upper-outer', region: 'left-calf', side: 'left' },
  { name: 'right upper calf, outer', view: 'back', x: 0.665, y: 0.74, zone: 'right-calf-upper-outer', region: 'right-calf', side: 'right' },
  { name: 'left upper calf, inner, below the old border', view: 'back', x: 0.42, y: 0.79, zone: 'left-calf-upper-inner', region: 'left-calf', side: 'left' },
  { name: 'left lower calf', view: 'back', x: 0.38, y: 0.83, zone: 'left-calf-lower', region: 'left-calf', side: 'left' },
  { name: 'left heel', view: 'back', x: 0.38, y: 0.94, zone: 'left-heel', region: 'left-ankle-heel', side: 'left' },
  { name: 'left back of upper forearm, little-finger side', view: 'back', x: 0.253, y: 0.402, zone: 'left-forearm-back-upper-inner', region: 'left-forearm-back', side: 'left' },
  { name: 'left back of upper forearm, thumb side', view: 'back', x: 0.206, y: 0.402, zone: 'left-forearm-back-upper-outer', region: 'left-forearm-back', side: 'left' },
  { name: 'left back of lower forearm, medial', view: 'back', x: 0.226, y: 0.432, zone: 'left-forearm-back-lower-inner', region: 'left-forearm-back', side: 'left' },
  { name: 'left back of lower forearm, lateral', view: 'back', x: 0.184, y: 0.432, zone: 'left-forearm-back-lower-outer', region: 'left-forearm-back', side: 'left' },
  { name: 'left back of elbow, inner', view: 'back', x: 0.279, y: 0.357, zone: 'left-elbow-back-inner', region: 'left-elbow-back', side: 'left' },
  { name: 'left back of elbow, outer', view: 'back', x: 0.236, y: 0.357, zone: 'left-elbow-back-outer', region: 'left-elbow-back', side: 'left' },
  { name: 'left back of knee, inner', view: 'back', x: 0.421, y: 0.677, zone: 'left-knee-back-inner', region: 'left-knee-back', side: 'left' },
  { name: 'left back of knee, outer', view: 'back', x: 0.365, y: 0.677, zone: 'left-knee-back-outer', region: 'left-knee-back', side: 'left' },
  { name: 'right back of knee, outer', view: 'back', x: 0.636, y: 0.677, zone: 'right-knee-back-outer', region: 'right-knee-back', side: 'right' },
];

// B5b: written from the male art's own landmarks (not from the female probes or the zone files): the male navel is at
// y 0.384, the pectoral edge at y 0.285, the briefs' top edge at y 0.433, the knee caps at y 0.64 to 0.69, the shoulder
// blades at y 0.19 to 0.265 and x 0.32 to 0.435 (viewer's left), the gluteal fold at y 0.505, the hands at y 0.47 to 0.57.
const MALE_PROBES: Probe[] = [
  { name: 'left forehead', view: 'front', x: 0.55, y: 0.07, zone: 'left-forehead', region: 'head-face', side: 'left' },
  { name: 'right forehead', view: 'front', x: 0.45, y: 0.07, zone: 'right-forehead', region: 'head-face', side: 'right' },
  { name: 'left collarbone', view: 'front', x: 0.58, y: 0.195, zone: 'left-collarbone', region: 'left-shoulder', side: 'left' },
  { name: 'left chest by the breastbone', view: 'front', x: 0.54, y: 0.26, zone: 'left-chest-inner', region: 'left-chest', side: 'left' },
  { name: 'left chest by the armpit', view: 'front', x: 0.62, y: 0.26, zone: 'left-chest-outer', region: 'left-chest', side: 'left' },
  { name: 'above the navel', view: 'front', x: 0.55, y: 0.34, zone: 'left-belly-upper', region: 'belly-upper', side: 'left' },
  { name: 'below the navel', view: 'front', x: 0.45, y: 0.42, zone: 'right-belly-lower', region: 'belly-lower', side: 'right' },
  { name: 'left knee, inner', view: 'front', x: 0.585, y: 0.665, zone: 'left-knee-inner', region: 'left-knee', side: 'left' },
  { name: 'left knee, outer', view: 'front', x: 0.645, y: 0.665, zone: 'left-knee-outer', region: 'left-knee', side: 'left' },
  { name: 'left upper shin, inner', view: 'front', x: 0.58, y: 0.75, zone: 'left-shin-upper-inner', region: 'left-shin', side: 'left' },
  { name: 'left upper shin, outer', view: 'front', x: 0.67, y: 0.75, zone: 'left-shin-upper-outer', region: 'left-shin', side: 'left' },
  { name: 'left lower shin, inner', view: 'front', x: 0.60, y: 0.82, zone: 'left-shin-lower-inner', region: 'left-shin', side: 'left' },
  { name: 'left lower shin, outer', view: 'front', x: 0.655, y: 0.82, zone: 'left-shin-lower-outer', region: 'left-shin', side: 'left' },
  { name: 'left top of foot, big-toe side', view: 'front', x: 0.60, y: 0.94, zone: 'left-foot-top-inner', region: 'left-ankle-foot', side: 'left' },
  { name: 'left top of foot, little-toe side', view: 'front', x: 0.67, y: 0.94, zone: 'left-foot-top-outer', region: 'left-ankle-foot', side: 'left' },
  { name: 'right top of foot, big-toe side', view: 'front', x: 0.40, y: 0.94, zone: 'right-foot-top-inner', region: 'right-ankle-foot', side: 'right' },
  { name: 'left palm', view: 'front', x: 0.845, y: 0.505, zone: 'left-palm', region: 'left-wrist-hand', side: 'left' },
  { name: 'right upper arm (no fine zones)', view: 'front', x: 0.28, y: 0.29, zone: 'right-upper-arm', region: 'right-upper-arm', side: 'right' },
  { name: 'left upper forearm, little-finger side', view: 'front', x: 0.755, y: 0.40, zone: 'left-forearm-upper-inner', region: 'left-forearm', side: 'left' },
  { name: 'left upper forearm, thumb side', view: 'front', x: 0.801, y: 0.40, zone: 'left-forearm-upper-outer', region: 'left-forearm', side: 'left' },
  { name: 'left lower forearm, medial', view: 'front', x: 0.779, y: 0.431, zone: 'left-forearm-lower-inner', region: 'left-forearm', side: 'left' },
  { name: 'left lower forearm, lateral', view: 'front', x: 0.822, y: 0.431, zone: 'left-forearm-lower-outer', region: 'left-forearm', side: 'left' },
  { name: 'left wrist, medial', view: 'front', x: 0.801, y: 0.46, zone: 'left-wrist-front-inner', region: 'left-wrist-hand', side: 'left' },
  { name: 'left wrist, lateral', view: 'front', x: 0.84, y: 0.46, zone: 'left-wrist-front-outer', region: 'left-wrist-hand', side: 'left' },
  // Brian's overlay look: both reported the wrist before the wrist/hand border moved up
  { name: 'right base of thumb, by the wrist', view: 'front', x: 262 / 2048, y: 1962 / 4096, zone: 'right-thumb', region: 'right-wrist-hand', side: 'right' },
  { name: 'right palm, by the wrist', view: 'front', x: 380 / 2048, y: 1995 / 4096, zone: 'right-palm', region: 'right-wrist-hand', side: 'right' },
  { name: 'left front of ankle, inner', view: 'front', x: 0.608, y: 0.888, zone: 'left-ankle-front-inner', region: 'left-ankle-foot', side: 'left' },
  { name: 'left front of ankle, outer', view: 'front', x: 0.647, y: 0.888, zone: 'left-ankle-front-outer', region: 'left-ankle-foot', side: 'left' },
  { name: 'right front of ankle, inner', view: 'front', x: 0.39, y: 0.888, zone: 'right-ankle-front-inner', region: 'right-ankle-foot', side: 'right' },
  { name: 'left back of head', view: 'back', x: 0.45, y: 0.07, zone: 'left-head-back-upper', region: 'head-back', side: 'left' },
  { name: 'right back of head', view: 'back', x: 0.55, y: 0.07, zone: 'right-head-back-upper', region: 'head-back', side: 'right' },
  { name: 'left skull base', view: 'back', x: 0.46, y: 0.13, zone: 'left-skull-base', region: 'head-back', side: 'left' },
  { name: 'right skull base', view: 'back', x: 0.54, y: 0.13, zone: 'right-skull-base', region: 'head-back', side: 'right' },
  { name: 'left back of shoulder, by the armpit', view: 'back', x: 0.29, y: 0.225, zone: 'left-shoulder-back-lower', region: 'left-shoulder-back', side: 'left' },
  { name: 'left back of shoulder, upper', view: 'back', x: 0.30, y: 0.19, zone: 'left-shoulder-back-upper', region: 'left-shoulder-back', side: 'left' },
  { name: 'right back of shoulder, upper', view: 'back', x: 0.70, y: 0.19, zone: 'right-shoulder-back-upper', region: 'right-shoulder-back', side: 'right' },
  { name: 'left top of shoulder, by the neck', view: 'back', x: 0.40, y: 0.185, zone: 'left-shoulder-top', region: 'left-shoulder-top', side: 'left' },
  { name: 'left blade, middle', view: 'back', x: 0.38, y: 0.225, zone: 'left-shoulder-blade-mid', region: 'left-shoulder-blade', side: 'left' },
  { name: 'left blade, inner', view: 'back', x: 0.415, y: 0.225, zone: 'left-shoulder-blade-inner', region: 'left-shoulder-blade', side: 'left' },
  { name: 'left low back, beside the spine', view: 'back', x: 0.46, y: 0.38, zone: 'left-low-back-inner', region: 'left-low-back', side: 'left' },
  { name: 'left lower glute, inner', view: 'back', x: 0.44, y: 0.505, zone: 'left-glute-lower-inner', region: 'left-glute', side: 'left' },
  { name: 'left lower glute, outer', view: 'back', x: 0.33, y: 0.505, zone: 'left-glute-lower-outer', region: 'left-glute', side: 'left' },
  { name: 'right lower glute, inner', view: 'back', x: 0.56, y: 0.505, zone: 'right-glute-lower-inner', region: 'right-glute', side: 'right' },
  { name: 'left hamstring, upper inner', view: 'back', x: 0.45, y: 0.57, zone: 'left-hamstring-upper-inner', region: 'left-hamstring', side: 'left' },
  { name: 'left hamstring, lower outer', view: 'back', x: 0.36, y: 0.62, zone: 'left-hamstring-lower-outer', region: 'left-hamstring', side: 'left' },
  { name: 'left upper calf, inner', view: 'back', x: 0.42, y: 0.74, zone: 'left-calf-upper-inner', region: 'left-calf', side: 'left' },
  { name: 'left upper calf, outer', view: 'back', x: 0.34, y: 0.74, zone: 'left-calf-upper-outer', region: 'left-calf', side: 'left' },
  { name: 'left upper calf, inner, below the old border', view: 'back', x: 0.42, y: 0.78, zone: 'left-calf-upper-inner', region: 'left-calf', side: 'left' },
  { name: 'left lower calf', view: 'back', x: 0.38, y: 0.82, zone: 'left-calf-lower', region: 'left-calf', side: 'left' },
  { name: 'left heel', view: 'back', x: 0.37, y: 0.94, zone: 'left-heel', region: 'left-ankle-heel', side: 'left' },
  { name: 'left back of upper forearm, little-finger side', view: 'back', x: 0.241, y: 0.391, zone: 'left-forearm-back-upper-inner', region: 'left-forearm-back', side: 'left' },
  { name: 'left back of upper forearm, thumb side', view: 'back', x: 0.188, y: 0.391, zone: 'left-forearm-back-upper-outer', region: 'left-forearm-back', side: 'left' },
  { name: 'left back of lower forearm, little-finger side', view: 'back', x: 0.215, y: 0.424, zone: 'left-forearm-back-lower-inner', region: 'left-forearm-back', side: 'left' },
  { name: 'left back of lower forearm, thumb side', view: 'back', x: 0.173, y: 0.424, zone: 'left-forearm-back-lower-outer', region: 'left-forearm-back', side: 'left' },
  { name: 'right back of lower forearm, thumb side', view: 'back', x: 0.823, y: 0.424, zone: 'right-forearm-back-lower-outer', region: 'right-forearm-back', side: 'right' },
  { name: 'left back of elbow, inner', view: 'back', x: 0.259, y: 0.348, zone: 'left-elbow-back-inner', region: 'left-elbow-back', side: 'left' },
  { name: 'left back of elbow, outer', view: 'back', x: 0.213, y: 0.348, zone: 'left-elbow-back-outer', region: 'left-elbow-back', side: 'left' },
  { name: 'right back of elbow, inner', view: 'back', x: 0.737, y: 0.348, zone: 'right-elbow-back-inner', region: 'right-elbow-back', side: 'right' },
  { name: 'left back of knee, inner', view: 'back', x: 0.418, y: 0.672, zone: 'left-knee-back-inner', region: 'left-knee-back', side: 'left' },
  { name: 'left back of knee, outer', view: 'back', x: 0.361, y: 0.672, zone: 'left-knee-back-outer', region: 'left-knee-back', side: 'left' },
];

/**
 * B5d (I-161, I-164): the hands, in canvas units, on the viewer's left hand (the client's right on the front, left on the
 * back), checked on the art by the architect (Nov 13, 2026). Columns: wrist little-finger side, wrist thumb side, thumb,
 * thumb base, palm or back of hand, index, middle, ring, little.
 */
const HANDS: Record<'female_front' | 'male_front' | 'female_back' | 'male_back', [number, number][]> = {
  female_front: [[411, 1890], [333, 1890], [165, 2070], [255, 2005], [370, 2080], [188, 2240], [245, 2280], [310, 2260], [375, 2240]],
  male_front: [[405, 1880], [327, 1880], [165, 2070], [255, 2015], [360, 2090], [185, 2240], [248, 2270], [309, 2260], [370, 2250]],
  female_back: [[408, 1894], [330, 1894], [165, 2085], [235, 2030], [345, 2045], [185, 2240], [243, 2290], [302, 2290], [362, 2275]],
  male_back: [[391, 1868], [319, 1868], [155, 2090], [220, 2020], [320, 2020], [177, 2245], [235, 2285], [295, 2285], [360, 2265]],
};
const HAND_ZONES = {
  front: ['wrist-front-inner', 'wrist-front-outer', 'thumb', 'thumb', 'palm', 'index-middle-fingers', 'index-middle-fingers', 'ring-little-fingers', 'ring-little-fingers'],
  back: ['wrist-back-inner', 'wrist-back-outer', 'thumb-back', 'thumb-back', 'knuckles', 'index-middle-fingers-back', 'index-middle-fingers-back', 'ring-little-fingers-back', 'ring-little-fingers-back'],
};
/** The other hand, in canvas units, on one figure each. */
const HAND_TWINS: { figure: keyof typeof HANDS; x: number; y: number; zone: string }[] = [
  { figure: 'female_front', x: 1743, y: 2260, zone: 'left-ring-little-fingers' },
  { figure: 'female_front', x: 1885, y: 2075, zone: 'left-thumb' },
  { figure: 'male_back', x: 1863, y: 2245, zone: 'right-index-middle-fingers-back' },
  { figure: 'male_back', x: 1880, y: 2085, zone: 'right-thumb-back' },
];

test('2. probes from the art landmarks give the expected zone, region and side on every figure', () => {
  const f = files();
  for (const [sex, probes] of [['female', PROBES], ['male', MALE_PROBES]] as const) {
    for (const p of probes) {
      const at = locate(f[`${sex}_${p.view}`], p.view, p.x, p.y);
      assert.equal(at.zone, p.zone, `${sex} ${p.name}: zone`);
      assert.equal(at.region, p.region, `${sex} ${p.name}: region`);
      assert.equal(at.side, p.side, `${sex} ${p.name}: side`);
      assert.ok(at.zoneName && at.regionName, `${sex} ${p.name}: names`);
    }
  }
  // B5d: the hands on all four figures, their twins, and a point beside the hand
  for (const figure of FIGURES) {
    const view = viewOf(figure);
    const side = view === 'front' ? 'right' : 'left';
    HANDS[figure].forEach(([cx, cy], i) => {
      const at = locate(f[figure], view, cx / W, cy / H);
      assert.equal(at.zone, `${side}-${HAND_ZONES[view][i]}`, `${figure} hand probe ${i + 1} at ${cx},${cy}`);
      assert.equal(at.region, `${side}-${view === 'front' ? 'wrist-hand' : 'hand-back'}`, `${figure} hand probe ${i + 1}: region`);
    });
    assert.equal(locate(f[figure], view, 40 / W, 2300 / H).zone, null, `${figure}: (40, 2300) is beside the hand`);
  }
  for (const t of HAND_TWINS) assert.equal(locate(f[t.figure], viewOf(t.figure), t.x / W, t.y / H).zone, t.zone, `${t.figure} ${t.x},${t.y}`);
});

test('2b. both sexes have the same leaf keys and the same anchor keys for each view', () => {
  const f = files();
  for (const view of bodymap.views) {
    const keys = (n: (typeof FIGURES)[number]) => f[n].zones.map((z) => z.key).sort();
    assert.deepEqual(keys(`male_${view}`), keys(`female_${view}`), `${view}: leaf keys`);
    assert.deepEqual(Object.keys(f[`male_${view}`].anchors).sort(), Object.keys(f[`female_${view}`].anchors).sort(), `${view}: anchor keys`);
  }
});

test('2c. no male polygon equals a female polygon, or its mirror image, point for point', () => {
  const f = files();
  const same = (a: Ring, b: Ring) => a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);
  const mirror = (r: Ring): Ring => r.map(([x, y]) => [Math.round((1 - x) * 10000) / 10000, y]);
  const round = (r: Ring): Ring => r.map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
  for (const view of bodymap.views) {
    const female = f[`female_${view}`].zones.map((z) => round(z.rings[0]));
    for (const z of f[`male_${view}`].zones) {
      const ring = round(z.rings[0]);
      for (const g of female) {
        assert.ok(!same(ring, g), `male_${view} ${z.key} equals a female polygon`);
        assert.ok(!same(ring, mirror(g)), `male_${view} ${z.key} equals a mirrored female polygon`);
      }
    }
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

test('5. sizes (BM-2): leaves at least 105 canvas units, regions at least 210 (ribs 170, shoulder-top 180)', () => {
  const exempt: Record<string, number> = { 'left-ribs-side': 170, 'right-ribs-side': 170, 'left-shoulder-top': 180, 'right-shoulder-top': 180 };
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
  assert.equal(r1.pins[0].zoneSet, bodymap.zoneSet);
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
  assert.equal(o.zoneSet, bodymap.zoneSet);

  assert.deepEqual(
    Object.keys(r1.pins[0]),
    ['n', 'view', 'x', 'y', 'type', 'zone', 'zoneName', 'region', 'regionName', 'side', 'zoneSet', 'intensity', 'note', 'star', 'fromList'],
  );
});

test('6b. changing the figure keeps the marks, looks the zone up again in the other figure\'s file, and drops the send id', () => {
  const f = files();
  const store = createStore({ storage: null, now: () => Date.now(), random: (b) => crypto.getRandomValues(b) });
  store.setName('Test Client');
  store.setApptDate('2026-12-03');
  // A spot where the two figures' files disagree (the female thigh runs lower than the male one), so a lookup in the
  // wrong file cannot pass: the female file names the lower outer thigh, the male file the outer knee.
  store.addPin({ view: 'front', x: 0.65, y: 0.635, type: 'pain' });
  const describe = () => describePin(f[`${store.state.figure}_front` as 'female_front' | 'male_front'], store.state.pins[0]);

  const first = describe();
  assert.equal(store.state.figure, 'female');
  assert.equal(first.zone, 'left-thigh-front-lower-outer');
  const id = store.sendId();
  assert.ok(id, 'a send id was made');

  store.setFigure('male');
  assert.equal(store.state.id, null, 'the figure is an edit: the send id is dropped');
  assert.equal(store.state.pins.length, 1, 'the pin is kept');
  assert.deepEqual([store.state.pins[0].x, store.state.pins[0].y, store.state.pins[0].view], [0.65, 0.635, 'front'], 'the same spot');
  assert.deepEqual([store.state.name, store.state.apptDate], ['Test Client', '2026-12-03'], 'name and date are kept');
  const male = describe();
  assert.equal(male.zone, 'left-knee-outer', 'looked up in the male file');
  assert.equal(male.region, 'left-knee');
  assert.notEqual(male.zone, first.zone, 'a different answer from the female file');
  assert.deepEqual(male, locate(f.male_front, 'front', 0.65, 0.635), 'exactly the male file\'s lookup');

  store.sendId();
  store.setFigure('female');
  assert.equal(store.state.id, null, 'and back: the id is dropped again');
  assert.deepEqual(describe(), first, 'back to the first answer');
});

test('6c. BM-9 (male): the PDF names a male figure\'s marks from the male files, and a list mark by its region', async () => {
  const f = files();
  const nameOf = (view: View, key: string) => (bodymap.zones[view].find((z) => z.key === key) ?? bodymap.regions[view].find((r) => r.key === key))!.name;
  const probe = (name: string) => MALE_PROBES.find((p) => p.name === name)!;
  const navel = probe('above the navel');
  const calf = probe('left upper calf, outer');
  const knee = f.male_front.anchors['left-knee'];
  const pin = (id: string, over: Record<string, unknown>) => ({ id, view: 'front' as View, x: 0.5, y: 0.5, type: 'pain' as const, intensity: null, note: '', star: false, fromList: false, ...over });
  const pins = [
    pin('a', { view: navel.view, x: navel.x, y: navel.y }),
    pin('b', { view: calf.view, x: calf.x, y: calf.y }),
    pin('c', { x: knee[0], y: knee[1], fromList: true }),
    pin('d', { x: 0.65, y: 0.635 }), // the female file names the lower outer thigh here, so only the male file gives the knee
  ];
  const state = { name: 'Test Client', apptDate: '2026-12-03', figure: 'male' as const, pins, id: null };
  const describe = (p: (typeof pins)[number]) => describePin(f[`male_${p.view}` as 'male_front' | 'male_back'], p);
  const sent = new Date('2026-12-01T17:00:00Z');
  const doc = await getDocumentProxy(new Uint8Array(buildPdf(state, sent, {}, { describe })));
  const { text } = (await extractText(doc, { mergePages: true })) as { text: string };
  assert.ok(text.includes(nameOf('front', navel.zone)), `${nameOf('front', navel.zone)} in: ${text}`);
  assert.ok(text.includes(nameOf('back', calf.zone)), `${nameOf('back', calf.zone)} in: ${text}`);
  assert.ok(text.includes(`${nameOf('front', 'left-knee')}, ${bodymap.text.pdf.fromList}`), text);
  const report = buildReport(state, sent, describe);
  assert.equal(report.figure, 'male');
  assert.ok(text.includes(nameOf('front', 'left-knee-outer')), `${nameOf('front', 'left-knee-outer')} in: ${text}`);
  assert.deepEqual(report.pins.map((p) => p.zone), [navel.zone, calf.zone, null, 'left-knee-outer']);
  assert.equal(report.pins[2].region, 'left-knee');
});

test('7. static: the PDF module imports no zone file, and the page source never renders a zone', () => {
  const pdf = readFileSync(join(root, 'src/lib/bodymap-pdf.ts'), 'utf8');
  assert.doesNotMatch(pdf, /bodymap-zones/);
  // The built page's HTML is checked against the preview build in tools/bodymap-e2e.mjs (dist holds the closed page).
  const page = readFileSync(join(root, 'src/pages/body-map.astro'), 'utf8');
  assert.doesNotMatch(page, /bodymap\.zones|bodymap-zones|zoneName/);
  for (const n of FIGURES) assert.ok(existsSync(join(root, `src/data/bodymap-zones/${n}.json`)), n);
});

test('8. zone sets 2 and 3: no old key survives, shoulder-back has its twins and no region has exactly one fine zone', () => {
  const old = ['shoulder-top-inner', 'shoulder-top-outer', 'shoulder-blade-outer'];
  const f = files();
  for (const name of FIGURES) {
    const keys = [...f[name].zones.map((z) => z.key), ...Object.keys(f[name].anchors)];
    for (const k of keys) for (const o of old) assert.ok(!k.endsWith(o), `${name}: old key ${k}`);
  }
  for (const z of bodymap.zones.back) for (const o of old) assert.ok(!z.key.endsWith(o), `contract: old key ${z.key}`);
  // Zone set 3 (B5d): by exact key, since `left-head-back-upper` ends with an old key and `left-wrist-front-inner` starts
  // with one. forearm, forearm-back, elbow-back and knee-back stay region keys and anchors, so only zones are checked.
  const paired = ['fingers', 'fingers-back', 'glute-lower', 'calf-upper', 'shin-upper', 'shin-lower', 'foot-top', 'wrist-front', 'wrist-back', 'ankle-front', 'forearm', 'forearm-back', 'elbow-back', 'knee-back'];
  const gone = ['forehead', 'head-back-upper', ...paired.flatMap((k) => [`left-${k}`, `right-${k}`])];
  const contract = new Set([...bodymap.zones.front, ...bodymap.zones.back].map((z) => z.key));
  for (const k of gone) {
    assert.ok(!contract.has(k), `contract: old leaf ${k}`);
    for (const name of FIGURES) assert.ok(!f[name].zones.some((z) => z.key === k), `${name}: old leaf ${k}`);
  }
  assert.ok(bodymap.regions.back.some((r) => r.key === 'left-shoulder-back') && bodymap.regions.back.some((r) => r.key === 'right-shoulder-back'));
  for (const view of bodymap.views) {
    for (const r of bodymap.regions[view]) assert.notEqual(bodymap.zones[view].filter((z) => z.region === r.key).length, 1, `${view}: ${r.key} has exactly one fine zone`);
  }
});

test('9. back of shoulder: a pin at (0.30, 0.19) is the same on both figures, and a list pin names the region only', () => {
  const f = files();
  for (const name of ['female_back', 'male_back'] as const) {
    const d = describePin(f[name], { view: 'back', x: 0.3, y: 0.19, fromList: false });
    assert.equal(d.zone, 'left-shoulder-back-upper', name);
    assert.equal(d.region, 'left-shoulder-back', name);
    const [x, y] = f[name].anchors['right-shoulder-back'];
    const l = describePin(f[name], { view: 'back', x, y, fromList: true });
    assert.equal(l.region, 'right-shoulder-back', name);
    assert.equal(l.zone, null, name);
  }
});

test('10. zone set 3 sequences: a finger across figures, list pins on split regions, a sided forehead, the back of the knee', () => {
  const f = files();
  const sent = new Date('2026-12-01T17:00:00Z');
  const store = createStore({ storage: null, now: () => Date.now(), random: (b) => crypto.getRandomValues(b) });
  store.setName('Test Client');
  store.setApptDate('2026-12-03');
  const fileOf = (view: View) => f[`${store.state.figure}_${view}` as (typeof FIGURES)[number]];
  const describe = (p: { view: View; x: number; y: number; fromList: boolean }) => describePin(fileOf(p.view), p);
  const report = () => buildReport(store.state, sent, describe);

  // (a) the female front ring finger, then the male figure: the same leaf both times
  store.addPin({ view: 'front', x: 310 / W, y: 2260 / H, type: 'pain' });
  const ring = report().pins[0];
  assert.equal(ring.zone, 'right-ring-little-fingers');
  assert.equal(ring.zoneName, 'Right ring and little fingers');
  assert.equal(ring.regionName, 'Right wrist and hand');
  assert.equal(ring.side, 'right');
  assert.equal(ring.zoneSet, 3);
  store.setFigure('male');
  assert.equal(report().pins[0].zone, 'right-ring-little-fingers', 'male figure');
  store.setFigure('female');

  // (b) a list pin on the back of the hand names the region only
  for (const figure of ['female', 'male'] as const) {
    const [x, y] = f[`${figure}_back`].anchors['left-hand-back'];
    const d = describePin(f[`${figure}_back`], { view: 'back', x, y, fromList: true });
    assert.deepEqual([d.zone, d.region, d.regionName, d.side], [null, 'left-hand-back', 'Left back of hand', 'left'], figure);
  }

  // (c) a tapped forehead is sided; a list pin on the head is the only way to get midline
  const tapped = describePin(f.female_front, { view: 'front', x: 0.55, y: 0.07, fromList: false });
  assert.deepEqual([tapped.zone, tapped.side], ['left-forehead', 'left']);
  const [hx, hy] = f.female_front.anchors['head-face'];
  const listed = describePin(f.female_front, { view: 'front', x: hx, y: hy, fromList: true });
  assert.deepEqual([listed.zone, listed.region, listed.side], [null, 'head-face', 'midline']);

  // (d) the back of the knee, on both figures, then the old leaf key as a list pin's region
  for (const figure of ['female', 'male'] as const) {
    const d = describePin(f[`${figure}_back`], { view: 'back', x: 0.421, y: 0.677, fromList: false });
    assert.deepEqual([d.zone, d.zoneName, d.region, d.regionName], ['left-knee-back-inner', 'Left back of knee, medial', 'left-knee-back', 'Left back of knee'], figure);
    const [x, y] = f[`${figure}_back`].anchors['left-knee-back'];
    const l = describePin(f[`${figure}_back`], { view: 'back', x, y, fromList: true });
    assert.deepEqual([l.zone, l.region, l.side], [null, 'left-knee-back', 'left'], figure);
  }
});
