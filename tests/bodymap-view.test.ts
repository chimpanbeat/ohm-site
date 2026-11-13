// B4 (I-073, BM-2): the pure zoom and pan math of the body map (src/lib/bodymap-view.ts, ARCHITECTURE §B12 Coordinates and zoom).
// No DOM: a screen rect and a matrix stand in for the <svg> element and getScreenCTM().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS, ZOOM, boxOf, clampView, fromNorm, initialView, matrixFor, panBy, pinRadius, pinScale, toCanvas, toNorm, toScreen, zoomAt } from '../src/lib/bodymap-view.ts';
import { bodymap } from '../src/data/bodymap.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

/** The element's rect for a phone width and a device pixel ratio: the figure wrapper is 1:2 like the art. */
const rectFor = (cssWidth: number, dpr: number, left = 13, top = 87) => ({ left: left * dpr, top: top * dpr, width: cssWidth * dpr, height: cssWidth * 2 * dpr });

test('the canvas is the art\'s 2048 x 4096 and the zoom range is 1 to 6', () => {
  assert.deepEqual(CANVAS, { w: bodymap.viewBox.width, h: bodymap.viewBox.height });
  assert.deepEqual(ZOOM, { min: 1, max: 6 });
  assert.deepEqual(boxOf(initialView()), { x: 0, y: 0, w: 2048, h: 4096 });
});

test('screen to 0-1 and back: error under 1e-6 at zoom 1, 3 and 6, with pans, at DPR 1, 2 and 3', () => {
  for (const dpr of [1, 2, 3]) {
    for (const zoom of [1, 3, 6]) {
      for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.3], [0.85, 0.9], [0, 0], [1, 1]]) {
        const v = clampView({ zoom, cx: fx * CANVAS.w, cy: fy * CANVAS.h });
        const box = boxOf(v);
        const m = matrixFor(box, rectFor(375, dpr));
        // sample points across the visible box
        for (const [u, w] of [[0.1, 0.1], [0.5, 0.5], [0.9, 0.2], [0.33, 0.77]]) {
          const x = box.x + u * box.w;
          const y = box.y + w * box.h;
          const s = toScreen(m, x, y);
          const back = toCanvas(m, s.x, s.y);
          near(back.x / CANVAS.w, x / CANVAS.w);
          near(back.y / CANVAS.h, y / CANVAS.h);
          const [nx, ny] = toNorm(back.x, back.y);
          const again = fromNorm(nx, ny);
          near(again.x, x, 1e-6 * CANVAS.w);
          near(again.y, y, 1e-6 * CANVAS.h);
        }
      }
    }
  }
});

test('the matrix is the meet-fit of the box in the element, centred (a letterboxed element still converts)', () => {
  const box = boxOf(initialView());
  const m = matrixFor(box, { left: 10, top: 20, width: 400, height: 400 }); // wider than 1:2
  near(m.a, 400 / 4096);
  near(m.d, 400 / 4096);
  const topLeft = toScreen(m, 0, 0);
  near(topLeft.y, 20);
  near(topLeft.x, 10 + (400 - 2048 * (400 / 4096)) / 2); // centred sideways
  const mid = toCanvas(m, 10 + 200, 20 + 200);
  near(mid.x, 1024);
  near(mid.y, 2048);
});

test('zoom clamps to 1-6', () => {
  const v = initialView();
  assert.equal(zoomAt(v, 100, { x: 1024, y: 2048 }).zoom, 6);
  assert.equal(zoomAt(v, 0.001, { x: 1024, y: 2048 }).zoom, 1);
  assert.equal(clampView({ zoom: 99, cx: 0, cy: 0 }).zoom, 6);
  assert.equal(clampView({ zoom: 0.2, cx: 0, cy: 0 }).zoom, 1);
  assert.equal(clampView({ zoom: Number.NaN, cx: 0, cy: 0 }).zoom, 1, 'NaN falls back to 1');
  assert.equal(zoomAt(zoomAt(v, 2, { x: 1024, y: 2048 }), 2, { x: 1024, y: 2048 }).zoom, 4);
});

test('zooming at a point keeps that point under the finger', () => {
  const rect = rectFor(375, 2);
  let v = initialView();
  const anchor = { x: 900, y: 1500 };
  for (const factor of [2, 1.5, 1.25]) {
    const before = toScreen(matrixFor(boxOf(v), rect), anchor.x, anchor.y);
    v = zoomAt(v, factor, anchor);
    const after = toScreen(matrixFor(boxOf(v), rect), anchor.x, anchor.y);
    near(after.x, before.x, 1e-6);
    near(after.y, before.y, 1e-6);
  }
  assert.ok(v.zoom > 3.7 && v.zoom < 3.8, 'the factors multiply (2 x 1.5 x 1.25 = 3.75)');
});

test('a pan can\'t push the figure off screen', () => {
  const rect = rectFor(375, 1);
  for (const zoom of [1, 2, 6]) {
    let v = clampView({ zoom, cx: 1024, cy: 2048 });
    for (const [dx, dy] of [[5000, 5000], [-5000, -5000], [5000, -5000], [-3, 4]]) {
      v = panBy(v, dx, dy, matrixFor(boxOf(v), rect));
      const b = boxOf(v);
      assert.ok(b.x >= -1e-9 && b.y >= -1e-9, `zoom ${zoom}: box starts inside the canvas`);
      assert.ok(b.x + b.w <= CANVAS.w + 1e-9 && b.y + b.h <= CANVAS.h + 1e-9, `zoom ${zoom}: box ends inside the canvas`);
    }
  }
  const flat = panBy(initialView(), 200, 200, matrixFor(boxOf(initialView()), rect));
  assert.deepEqual(boxOf(flat), { x: 0, y: 0, w: 2048, h: 4096 }, 'at zoom 1 there is nothing to pan');
});

test('dragging right by N screen px moves the picture right by N px (the box moves left)', () => {
  const rect = rectFor(375, 1);
  const v0 = clampView({ zoom: 3, cx: 1024, cy: 2048 });
  const m0 = matrixFor(boxOf(v0), rect);
  const p0 = toScreen(m0, 1000, 2000);
  const v1 = panBy(v0, 40, -25, m0);
  const p1 = toScreen(matrixFor(boxOf(v1), rect), 1000, 2000);
  near(p1.x - p0.x, 40, 1e-6);
  near(p1.y - p0.y, -25, 1e-6);
});

test('pin scale is 1/zoom, and a pin\'s size in canvas units follows the matrix', () => {
  for (const zoom of [1, 2, 3, 6]) near(pinScale(zoom), 1 / zoom);
  const rect = rectFor(375, 2);
  const r1 = pinRadius(14, matrixFor(boxOf(initialView()), rect));
  const r3 = pinRadius(14, matrixFor(boxOf(clampView({ zoom: 3, cx: 1024, cy: 2048 })), rect));
  near(r3, r1 / 3, 1e-9);
});
