// Projection and view boxes for the service-area SVG map (docs/build/ARCHITECTURE.md §B4).
// Pure functions, no DOM. ServiceMap.astro (build) and book.ts (client) both call makeFrame()
// on the same zones.geojson, so they always agree.

import { bboxOf, type BBox, type ZoneCollection } from './geo.ts';

/** An SVG viewBox, in map units. */
export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapFrame {
  project(lng: number, lat: number): [number, number];
  /** Every zone, padded 6%. 4:5, 1000 units wide. */
  full: View;
  /** 4:5 view containing `box` padded by `pad` (default 10%), centred on it. */
  viewFor(box: BBox, pad?: number): View;
  /** The smallest 4:5 view that contains `view` and the point (x, y) with `margin` around it. */
  include(view: View, x: number, y: number, margin?: number): View;
}

const FULL_WIDTH = 1000;
const FULL_PAD = 0.06;
const ASPECT = 4 / 5; // w:h

const tenth = (n: number) => Math.round(n * 10) / 10;
const up = (n: number) => Math.ceil(n * 10) / 10;

/** A 4:5 view that contains the box, centred on it. Rounded outward so containment survives rounding. */
function fit(x0: number, y0: number, x1: number, y1: number): View {
  const w = up(Math.max(x1 - x0, (y1 - y0) * ASPECT));
  const h = w / ASPECT;
  return { x: tenth((x0 + x1) / 2 - w / 2), y: tenth((y0 + y1) / 2 - h / 2), w, h };
}

export function makeFrame(zones: ZoneCollection): MapFrame {
  const all = bboxOf(zones);
  if (!all) throw new Error('makeFrame: no zones');
  const [west, south, east, north] = all;
  const cos0 = Math.cos((((south + north) / 2) * Math.PI) / 180);

  // Degree-ish units (longitude scaled by cos(lat0)); `k` turns them into map units.
  const bw = (east - west) * cos0;
  const bh = north - south;
  const padded = Math.max(bw * (1 + 2 * FULL_PAD), (bh * (1 + 2 * FULL_PAD)) * ASPECT);
  const k = FULL_WIDTH / padded;

  const project = (lng: number, lat: number): [number, number] => [
    tenth((lng - west) * cos0 * k),
    tenth((north - lat) * k),
  ];

  const [fx0, fy1] = project(west, south);
  const [fx1, fy0] = project(east, north);
  const full: View = {
    x: tenth((fx0 + fx1) / 2 - FULL_WIDTH / 2),
    y: tenth((fy0 + fy1) / 2 - FULL_WIDTH / ASPECT / 2),
    w: FULL_WIDTH,
    h: FULL_WIDTH / ASPECT,
  };

  return {
    project,
    full,
    viewFor([w, s, e, n], pad = 0.1) {
      const [x0, y1] = project(w, s);
      const [x1, y0] = project(e, n);
      const px = (x1 - x0) * pad;
      const py = (y1 - y0) * pad;
      return fit(x0 - px, y0 - py, x1 + px, y1 + py);
    },
    include(view, x, y, margin = 60) {
      return fit(
        Math.min(view.x, x - margin),
        Math.min(view.y, y - margin),
        Math.max(view.x + view.w, x + margin),
        Math.max(view.y + view.h, y + margin),
      );
    },
  };
}

const num = (n: number) => Number(n.toFixed(2));
export const viewBoxAttr = (v: View) => `${num(v.x)} ${num(v.y)} ${num(v.w)} ${num(v.h)}`;
