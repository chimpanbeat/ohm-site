// The seven pin glyphs and the map-pin marker (B6; I-150, I-167; ARCHITECTURE §B12 Pins → Marker). Pure geometry, shared by the
// page and (from B7) the PDF, so a type looks the same in both. No DOM, no colours: the callers fill and stroke the paths.
// Glyph units: a 14-unit box with its centre at 0, 0, y down. Marker units are px at 1×: the spot is 0, 0 and the head sits above it.
// Every glyph is a filled area (rings and bands included), so one nonzero-winding test serves both the drawing and the tests.
import type { PinShape } from '../data/bodymap.ts';

type Pt = [number, number];
type Ring = Pt[];

const area = (r: Ring) => r.reduce((s, [x, y], i) => s + (x * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * y), 0) / 2;
/** Orient a ring: outer rings clockwise on screen (positive area in y-down), holes the other way. */
const orient = (r: Ring, hole = false): Ring => ((area(r) > 0) === !hole ? r : [...r].reverse());
const arc = (cx: number, cy: number, rx: number, from: number, to: number, steps: number): Ring =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + rx * Math.sin(a)] as Pt;
  });
const circle = (r: number, steps = 72): Ring => arc(0, 0, r, 0, 360, steps).slice(0, -1);
/** A regular hexagon with a vertex straight up (pointy-top). */
const hexagon = (r: number): Ring => Array.from({ length: 6 }, (_, i) => {
  const a = ((-90 + 60 * i) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)] as Pt;
});
/** A rounded rectangle, corners as arcs. */
function roundRect(x0: number, y0: number, x1: number, y1: number, cr: number): Ring {
  return [
    ...arc(x1 - cr, y0 + cr, cr, -90, 0, 8),
    ...arc(x1 - cr, y1 - cr, cr, 0, 90, 8),
    ...arc(x0 + cr, y1 - cr, cr, 90, 180, 8),
    ...arc(x0 + cr, y0 + cr, cr, 180, 270, 8),
  ];
}
/** A bar of the given width centred on 0, 0 along (1, 1)/√2: "from upper left to lower right". */
function bar(halfLength: number, width: number): Ring {
  const d = Math.SQRT1_2;
  const [px, py] = [-d, d]; // perpendicular
  const h = width / 2;
  return [
    [-d * halfLength + px * h, -d * halfLength + py * h],
    [d * halfLength + px * h, d * halfLength + py * h],
    [d * halfLength - px * h, d * halfLength - py * h],
    [-d * halfLength - px * h, -d * halfLength - py * h],
  ];
}
function star4(outer: number, waist: number): Ring {
  return Array.from({ length: 8 }, (_, i) => {
    const a = ((-90 + 45 * i) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : waist;
    return [r * Math.cos(a), r * Math.sin(a)] as Pt;
  });
}

/** Glyph geometry, from ARCHITECTURE §B12 Marker (measured by the architect, Nov 14, 2026). */
const glyphRings: Record<PinShape, Ring[]> = {
  circle: [orient(circle(6.5))],
  diamond: [orient([[0, -7], [7, 0], [0, 7], [-7, 0]])],
  triangle: [orient([[0, -7], [7, 5.5], [-7, 5.5]])],
  star4: [orient(star4(7, 2.6))],
  // A ring of radii 7 and 4.6 with a 2.4-wide bar inside it from upper left to lower right.
  'ring-slash': [orient(circle(7)), orient(circle(4.6), true), orient(bar(5.2, 2.4))],
  // A band between pointy-top regular hexagons of circumradius 7 and 4.2: an outline, because a filled hexagon is 0.92 against the circle.
  hexagon: [orient(hexagon(7)), orient(hexagon(4.2), true)],
  bubble: [orient(roundRect(-7, -6.25, 7, 3.25, 2.5)), orient([[-4, 2], [-1, 2], [-5.5, 6.5]])],
};

/** The glyph keys in `bodymap.types` order. */
export const shapeKeys = ['circle', 'diamond', 'hexagon', 'triangle', 'star4', 'ring-slash', 'bubble'] as const satisfies readonly PinShape[];

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
const pathOf = (rings: Ring[]) => rings.map((r) => `M${r.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`).join('');

/** The glyph as an SVG path in glyph units. Fill it with the default (nonzero) rule; the holes are wound the other way. */
export const glyphPath = (shape: PinShape): string => pathOf(glyphRings[shape]);

/**
 * Just the glyph's outside edge: the one ring for the hexagon and the ring-slash (whose hole and bar are left out), every ring
 * for the rest. The page draws the halo and edge round this, so a hollow glyph keeps its hole instead of the halo filling it in.
 */
export const glyphOutlinePath = (shape: PinShape): string => pathOf(shape === 'hexagon' || shape === 'ring-slash' ? glyphRings[shape].slice(0, 1) : glyphRings[shape]);

function winding(rings: Ring[], px: number, py: number): number {
  let w = 0;
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const [x0, y0] = r[i];
      const [x1, y1] = r[(i + 1) % r.length];
      if ((y0 <= py) === (y1 <= py)) continue;
      const x = x0 + ((py - y0) / (y1 - y0)) * (x1 - x0);
      if (x > px) w += y1 > y0 ? 1 : -1;
    }
  }
  return w;
}
export const glyphContains = (shape: PinShape, x: number, y: number): boolean => winding(glyphRings[shape], x, y) !== 0;

export function glyphBounds(shape: PinShape): { minX: number; maxX: number; minY: number; maxY: number } {
  const pts = glyphRings[shape].flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// --- the marker (the map-pin) ------------------------------------------------------------------------------------------
// A round head 28 px across over a body that narrows with a slight inward curve on each side to a sharp point, the point on
// the spot; 40 px from the top of the head to the point.
const HEAD = { x: 0, y: -26, r: 14 };
const ATTACH_DEG = 30; // where the sides meet the head, measured below its horizontal
const attach = { x: HEAD.r * Math.cos((ATTACH_DEG * Math.PI) / 180), y: HEAD.y + HEAD.r * Math.sin((ATTACH_DEG * Math.PI) / 180) };
const CONTROL = { x: 1.8, y: -9 }; // inside the straight line from the point to the head: the concave curve

function markerPoints(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const bez = (sx: number, from: 0 | 1) => {
    // point (0, 0) -> control -> attach, on side sx (-1 left, +1 right)
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      out.push({ x: sx * (2 * u * t * CONTROL.x + t * t * attach.x), y: 2 * u * t * CONTROL.y + t * t * attach.y });
    }
    return from === 0 ? out : out.reverse();
  };
  pts.push(...bez(-1, 0)); // the point up the left side to the head
  for (let k = 0; k <= 96; k++) {
    // over the top, left attach point to right attach point: φ from 150° (left) decreasing... drawn as left -> top -> right
    const phi = 150 + 2.5 * k; // 150° -> 390° (≡ 30°), through 270° (the top, y down)
    const a = (phi * Math.PI) / 180;
    pts.push({ x: HEAD.x + HEAD.r * Math.cos(a), y: HEAD.y + HEAD.r * Math.sin(a) });
  }
  pts.push(...bez(1, 1)); // down the right side to the point
  return pts;
}

const pts = markerPoints();
const head = HEAD;
/** The map-pin. `path` is an SVG path in px at 1× with the spot at 0, 0; `points` is the same outline as a polygon. */
export const marker = {
  point: { x: 0, y: 0 },
  head,
  width: 2 * HEAD.r,
  height: 40,
  points: pts,
  path: `M0 0Q${-CONTROL.x} ${CONTROL.y} ${fmt(-attach.x)} ${fmt(attach.y)}A${HEAD.r} ${HEAD.r} 0 1 1 ${fmt(attach.x)} ${fmt(attach.y)}Q${CONTROL.x} ${CONTROL.y} 0 0Z`,
};

/** Is (x, y) inside the map-pin? Even-odd over the outline polygon. */
export function markerContains(x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
