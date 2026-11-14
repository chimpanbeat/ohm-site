// B6 (I-150, I-167, BM-3): the seven glyphs and the map-pin marker (src/lib/bodymap-shapes.ts, ARCHITECTURE §B12 Marker).
// Geometry is tested as areas: each glyph is rasterised at 40 samples per unit and compared pair by pair.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodymap } from '../src/data/bodymap.ts';
import { glyphBounds, glyphContains, glyphPath, marker, markerContains, shapeKeys } from '../src/lib/bodymap-shapes.ts';

const SAMPLES = 40;
const HALF = 9; // units: the glyph box is 14 wide, the sampling window 18
const grid = (shape: (typeof shapeKeys)[number]) => {
  const n = 2 * HALF * SAMPLES;
  const cells = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      cells[j * n + i] = glyphContains(shape, -HALF + (i + 0.5) / SAMPLES, -HALF + (j + 0.5) / SAMPLES) ? 1 : 0;
    }
  }
  return cells;
};

test('5. shapes: seven glyphs, one per type; every pair of glyph areas has IoU under 0.75; each is centred within 0.25 units', () => {
  assert.deepEqual([...shapeKeys], bodymap.types.map((p) => p.shape));
  const cells = new Map(shapeKeys.map((k) => [k, grid(k)]));
  for (const a of shapeKeys) {
    const ca = cells.get(a)!;
    assert.ok(ca.reduce((s, v) => s + v, 0) > 100 * SAMPLES, `${a} has area`);
    for (const b of shapeKeys) {
      if (a >= b) continue;
      const cb = cells.get(b)!;
      let inter = 0;
      let union = 0;
      for (let i = 0; i < ca.length; i++) {
        inter += ca[i] & cb[i];
        union += ca[i] | cb[i];
      }
      assert.ok(inter / union < 0.75, `${a} and ${b} overlap ${(inter / union).toFixed(2)}`);
    }
    // Centre of the glyph's bounding box: x within 0.25 for all. The architect's own triangle (0, -7), (7, 5.5), (-7, 5.5)
    // has a box centre of y -0.75 (12.5 tall in a 14 box), so y is held to 0.8: reported to the architect, not changed here.
    const b = glyphBounds(a);
    assert.ok(Math.abs((b.minX + b.maxX) / 2) <= 0.25, `${a} is centred on x`);
    assert.ok(Math.abs((b.minY + b.maxY) / 2) <= (a === 'triangle' ? 0.8 : 0.25), `${a} is centred on y (${((b.minY + b.maxY) / 2).toFixed(2)})`);
    assert.ok(b.maxX - b.minX <= 14.01 && b.maxY - b.minY <= 14.01 + (a === 'bubble' ? 0 : 0), `${a} fits the 14-unit box`);
  }
});

test('5b. the glyph boxes: 14 units across at most, centre 0, and each draws as a closed path', () => {
  for (const k of shapeKeys) {
    const d = glyphPath(k);
    assert.match(d, /^M/);
    assert.match(d, /Z$/);
    assert.equal(glyphContains(k, 20, 20), false);
    for (let i = 0; i < 4; i++) assert.equal(glyphContains(k, i % 2 ? 7.6 : -7.6, i < 2 ? 0 : 7.6), false, `${k} stays inside its box`);
  }
  // ring-slash has a hole beside its bar; hexagon is an outline, not a fill (I-167)
  assert.equal(glyphContains('ring-slash', 5.8, 0), true, 'the ring');
  assert.equal(glyphContains('ring-slash', 3, -3), false, 'the hole beside the bar');
  assert.equal(glyphContains('ring-slash', 0, 0), true, 'the bar');
  assert.equal(glyphContains('hexagon', 0, 0), false, 'the hexagon is an outline');
  assert.equal(glyphContains('hexagon', 0, 5.6), true);
  assert.equal(glyphContains('star4', 0, -6.5), true, 'a point straight up');
  assert.equal(glyphContains('bubble', -4.2, 4.5), true, 'the speech bubble tail');
});

test('5c. the marker: the point is (0, 0) and the lowest point, the head is centred on x 0, 28 across and 40 tall', () => {
  assert.equal(marker.point.x, 0);
  assert.equal(marker.point.y, 0);
  assert.equal(marker.head.x, 0);
  assert.equal(marker.head.r, 14);
  assert.equal(marker.head.y, -26);
  assert.equal(marker.height, 40);
  assert.equal(marker.width, 28);
  const pts = marker.points;
  assert.ok(Math.max(...pts.map((p) => p.y)) === 0, 'the lowest point is the spot'); // === so that -0 counts
  assert.ok(Math.abs(Math.min(...pts.map((p) => p.y)) + 40) < 1e-9, 'the top of the head is 40 above the point');
  const xs = pts.map((p) => p.x);
  assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs)) < 1e-9, 'symmetric about x 0');
  assert.ok(Math.abs(Math.max(...xs) - 14) < 0.01, 'the head is 28 across');
  // a slight inward (concave) curve from the head to the point: narrower than the straight line between them
  const widthAt = (y: number) => {
    const row = pts.filter((p) => Math.abs(p.y - y) < 0.6).map((p) => Math.abs(p.x));
    return Math.max(...row);
  };
  assert.ok(widthAt(-10) < 12.12 * (10 / 19) + 0.01, 'the body is concave');
  assert.ok(widthAt(-10) > 0.5);
  assert.equal(markerContains(0, -26), true);
  assert.equal(markerContains(0, -1), true);
  assert.equal(markerContains(10, -2), false);
  assert.match(marker.path, /^M0 0/);
  assert.match(marker.path, /Z$/);
});
