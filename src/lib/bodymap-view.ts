// Body map zoom and pan, pure (B4, ARCHITECTURE §B12 Coordinates and zoom). No DOM: an element's rect and a matrix
// (the shape of getScreenCTM()) stand in for it, so the maths is tested without a browser.
//
// One <svg viewBox> shows the figure and the pins. Zoom and pan change only the viewBox. The view is kept as a zoom and the
// centre of the visible part, in canvas units (the art's 2048 x 4096). The visible box is always inside the canvas.
import { bodymap } from '../data/bodymap.ts';

export const CANVAS = { w: bodymap.viewBox.width, h: bodymap.viewBox.height };
export const ZOOM = { min: 1, max: 6 };

export interface ViewState { zoom: number; cx: number; cy: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Rect { left: number; top: number; width: number; height: number }
/** A scale and a shift, like DOMMatrix (b and c are 0): screen = a * canvas + e, screen = d * canvas + f. */
export interface Matrix { a: number; b: number; c: number; d: number; e: number; f: number }

export const initialView = (): ViewState => ({ zoom: 1, cx: CANVAS.w / 2, cy: CANVAS.h / 2 });

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Zoom to 1-6 (NaN becomes 1), and the centre moved so the visible box stays inside the canvas. */
export function clampView(v: ViewState): ViewState {
  const zoom = Number.isFinite(v.zoom) ? clamp(v.zoom, ZOOM.min, ZOOM.max) : ZOOM.min;
  const halfW = CANVAS.w / zoom / 2;
  const halfH = CANVAS.h / zoom / 2;
  const cx = clamp(Number.isFinite(v.cx) ? v.cx : CANVAS.w / 2, halfW, CANVAS.w - halfW);
  const cy = clamp(Number.isFinite(v.cy) ? v.cy : CANVAS.h / 2, halfH, CANVAS.h - halfH);
  return { zoom, cx, cy };
}

/** The viewBox for a view. */
export function boxOf(v: ViewState): Box {
  const c = clampView(v);
  const w = CANVAS.w / c.zoom;
  const h = CANVAS.h / c.zoom;
  return { x: c.cx - w / 2, y: c.cy - h / 2, w, h };
}

/** The matrix that maps the box into the element the way preserveAspectRatio="xMidYMid meet" does. */
export function matrixFor(box: Box, rect: Rect): Matrix {
  const s = Math.min(rect.width / box.w, rect.height / box.h);
  const e = rect.left + (rect.width - box.w * s) / 2 - box.x * s;
  const f = rect.top + (rect.height - box.h * s) / 2 - box.y * s;
  return { a: s, b: 0, c: 0, d: s, e, f };
}

export const toScreen = (m: Matrix, x: number, y: number) => ({ x: m.a * x + m.e, y: m.d * y + m.f });
/** The inverse of toScreen: a screen point (client coordinates) to canvas units. */
export const toCanvas = (m: Matrix, px: number, py: number) => ({ x: (px - m.e) / m.a, y: (py - m.f) / m.d });

/** Canvas units to 0-1 of the canvas, and back. Pins are stored this way, so a different export of the art still fits. */
export const toNorm = (x: number, y: number): [number, number] => [x / CANVAS.w, y / CANVAS.h];
export const fromNorm = (nx: number, ny: number) => ({ x: nx * CANVAS.w, y: ny * CANVAS.h });

/** Multiply the zoom by `factor` (clamped to 1-6) and keep the canvas point `anchor` where it is on screen. */
export function zoomAt(v: ViewState, factor: number, anchor: { x: number; y: number }): ViewState {
  const from = clampView(v);
  const zoom = clamp(from.zoom * factor, ZOOM.min, ZOOM.max);
  const k = from.zoom / zoom; // the box shrinks (or grows) by k around the anchor
  return clampView({ zoom, cx: anchor.x + (from.cx - anchor.x) * k, cy: anchor.y + (from.cy - anchor.y) * k });
}

/** Drag the picture by a screen distance: the box moves the other way. At zoom 1 there is nothing to move. */
export function panBy(v: ViewState, dxScreen: number, dyScreen: number, m: Matrix): ViewState {
  const from = clampView(v);
  return clampView({ zoom: from.zoom, cx: from.cx - dxScreen / m.a, cy: from.cy - dyScreen / m.d });
}

/** Pins keep their size on screen: their scale is 1/zoom of their size at zoom 1. */
export const pinScale = (zoom: number) => 1 / zoom;
/** A pin's radius in canvas units for a radius in screen pixels, from the live matrix. */
export const pinRadius = (px: number, m: Matrix) => px / m.a;
