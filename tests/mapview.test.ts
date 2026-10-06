import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bboxOf, type Ring, type ZoneCollection } from '../src/lib/geo.ts';
import { makeFrame, viewBoxAttr, type View } from '../src/lib/mapview.ts';

const zones = JSON.parse(
  readFileSync(new URL('../src/data/zones.geojson', import.meta.url), 'utf8'),
) as ZoneCollection;
const frame = makeFrame(zones);
const regions = ['home', 'shared', 'north'] as const;

/** Every outer-ring vertex of a zone (or of all zones), projected. */
function vertices(zone?: (typeof regions)[number]): [number, number][] {
  return zones.features
    .filter((f) => !zone || f.properties.zone === zone)
    .flatMap((f) => {
      const polys: Ring[][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      return polys.flatMap((rings) => rings.flat());
    })
    .map(([lng, lat]) => frame.project(lng, lat));
}

const contains = (v: View, [x, y]: [number, number]) => x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h;
const containsView = (outer: View, inner: View) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w + 1e-9 &&
  inner.y + inner.h <= outer.y + outer.h + 1e-9;

test('the full view is 4:5 and 1000 units wide', () => {
  assert.ok(Math.abs(frame.full.w / frame.full.h - 0.8) < 0.001);
  assert.ok(Math.abs(frame.full.w - 1000) < 0.5);
});

test('every zone vertex lies inside the full view', () => {
  for (const p of vertices()) assert.ok(contains(frame.full, p), `${p} outside ${viewBoxAttr(frame.full)}`);
});

test('viewFor each zone is 4:5 and contains all of that zone', () => {
  for (const zone of regions) {
    const box = bboxOf(zones, zone);
    assert.ok(box, zone);
    const view = frame.viewFor(box);
    assert.ok(Math.abs(view.w / view.h - 0.8) < 0.001, `${zone} is not 4:5`);
    for (const p of vertices(zone)) assert.ok(contains(view, p), `${zone}: ${p} outside ${viewBoxAttr(view)}`);
  }
});

test('include() widens to a 4:5 view holding the old view and the point', () => {
  const [x, y] = frame.project(-104.3, 38.9); // far east of the zones
  const view = frame.include(frame.full, x, y);
  assert.ok(Math.abs(view.w / view.h - 0.8) < 0.001);
  assert.ok(containsView(view, frame.full));
  assert.ok(contains(view, [x, y]));
  assert.ok(view.w > frame.full.w);
});

test('include() leaves the view alone when the point is well inside it', () => {
  const cx = frame.full.x + frame.full.w / 2;
  const cy = frame.full.y + frame.full.h / 2;
  assert.deepEqual(frame.include(frame.full, cx, cy), frame.full);
});

test('unitsPerKm: 0.1° of latitude is 11.057 km on the map', () => {
  const [, y0] = frame.project(-104.8, 38.9);
  const [, y1] = frame.project(-104.8, 39.0);
  assert.ok(Math.abs((y0 - y1) - 11.057 * frame.unitsPerKm) < 0.5, `${y0 - y1} vs ${11.057 * frame.unitsPerKm}`);
});

test('viewAround is 4:5, centred on the point and 2 × the half-width in km wide', () => {
  const [lng, lat, km] = [-104.86, 38.79, 6];
  const view = frame.viewAround(lng, lat, km);
  const [x, y] = frame.project(lng, lat);
  assert.ok(Math.abs(view.w / view.h - 0.8) < 0.001);
  assert.ok(Math.abs(view.x + view.w / 2 - x) < 0.2, `centre x ${view.x + view.w / 2} vs ${x}`);
  assert.ok(Math.abs(view.y + view.h / 2 - y) < 0.2, `centre y ${view.y + view.h / 2} vs ${y}`);
  assert.ok(Math.abs(view.w - 2 * km * frame.unitsPerKm) < 0.5, `width ${view.w} vs ${2 * km * frame.unitsPerKm}`);
});

test('project: east is larger x, north is smaller y', () => {
  const [x0, y0] = frame.project(-104.8, 38.9);
  const [x1] = frame.project(-104.7, 38.9);
  const [, y1] = frame.project(-104.8, 39.0);
  assert.ok(x1 > x0);
  assert.ok(y1 < y0);
});

test('viewBoxAttr lists x y w h', () => {
  assert.equal(viewBoxAttr({ x: 1, y: 2.5, w: 3, h: 4.123 }), '1 2.5 3 4.12');
});
