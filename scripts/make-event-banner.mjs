// Makes the sharper desktop banner for the launch party (E11, I-104; ARCHITECTURE §B10 "Sharper desktop banner").
// Run by hand: npm run event-banner [-- --out <dir>]. Not part of `check`; tests run it with --out a temp dir.
// Inputs (committed, never edited): src/assets/events/launch-party/header-green.png, launch-mark-on-dark.png.
// Outputs (default: that same folder): banner-bg.png (1240x400 RGB: the header with its artwork filled in, cropped to
// the page's 31:10 view, a soft dark-green scrim baked in) and banner-mark.json (the launch mark traced to two
// even-odd SVG paths, plus the art's box in percent of the banner). Interim until JohnMark sends a 2x file:
// replace with JohnMark's file then. Deterministic: no randomness, no dates.
import sharp from 'sharp';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';

const DIR = 'src/assets/events/launch-party';
const argOut = process.argv.indexOf('--out');
const OUT = argOut > 0 ? process.argv[argOut + 1] : DIR;
mkdirSync(OUT, { recursive: true });

const CROP = { x: 190, y: 125, w: 620, h: 200 }; // today's view of the 1000x450 header
const MARK_CROP = { left: 39, top: 15, width: 694, height: 203 };

async function raw(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// ---- background ----
function blurAxis(src, w, h, sigma, horizontal) {
  const r = Math.ceil(sigma * 3);
  const k = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); sum += v; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++) {
      const xx = horizontal ? Math.min(w - 1, Math.max(0, x + i)) : x;
      const yy = horizontal ? y : Math.min(h - 1, Math.max(0, y + i));
      a += src[yy * w + xx] * k[i + r];
    }
    out[y * w + x] = a;
  }
  return out;
}
const blur = (src, w, h, s) => blurAxis(blurAxis(src, w, h, s, true), w, h, s, false);

async function background(img) {
  const { data, w, h } = img;
  const px = (x, y, c) => data[(y * w + x) * 4 + c];
  const isArt = (x, y) => {
    const r = px(x, y, 0), g = px(x, y, 1), b = px(x, y, 2);
    return r - g > 25 || (r + g + b) / 3 > 120;
  };
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 100; y < 350; y++) for (let x = 150; x < 850; x++) if (isArt(x, y)) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const art = { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  // mask, dilated 4 px (square window), as weight 0 where art
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x >= 150 && x < 850 && y >= 100 && y < 350 && isArt(x, y)) mask[y * w + x] = 1;
  const dil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) dil[yy * w + xx] = 1;
    }
  }
  const wt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) wt[i] = dil[i] ? 0 : 1;
  const chans = [0, 1, 2].map((c) => { const a = new Float32Array(w * h); for (let i = 0; i < w * h; i++) a[i] = data[i * 4 + c] * wt[i]; return a; });
  const sigmas = [6, 14, 30];
  const bw = sigmas.map((s) => blur(wt, w, h, s));
  const bc = sigmas.map((s) => chans.map((a) => blur(a, w, h, s)));
  const filled = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) {
      let v = data[i * 4 + c];
      if (dil[i]) {
        v = null;
        for (let s = 0; s < sigmas.length; s++) if (bw[s][i] > 0.02) { v = bc[s][c][i] / bw[s][i]; break; }
        if (v === null) v = bc[2][c][i] / Math.max(bw[2][i], 1e-4);
      }
      filled[i * 3 + c] = v;
    }
  }
  const base = [px(0, 0, 0), px(0, 0, 1), px(0, 0, 2)];
  // crop, then 2x lanczos3
  const crop = Buffer.alloc(CROP.w * CROP.h * 3);
  for (let y = 0; y < CROP.h; y++) for (let x = 0; x < CROP.w; x++) for (let c = 0; c < 3; c++) {
    crop[(y * CROP.w + x) * 3 + c] = Math.max(0, Math.min(255, Math.round(filled[((CROP.y + y) * w + CROP.x + x) * 3 + c])));
  }
  const big = await sharp(crop, { raw: { width: CROP.w, height: CROP.h, channels: 3 } }).resize(1240, 400, { kernel: 'lanczos3' }).raw().toBuffer();
  // scrim: ellipse centred on the art box, radii 0.62 / 0.78 of its width / height; 0.92 centre, 0.85 at 70%, 0 at edge
  const cx = ((art.x0 + art.x1 + 1) / 2 - CROP.x) * 2, cy = ((art.y0 + art.y1 + 1) / 2 - CROP.y) * 2;
  const rx = 0.62 * art.w * 2, ry = 0.78 * art.h * 2;
  const stops = [[0, 0.92], [0.7, 0.85], [1, 0]];
  const alphaAt = (t) => {
    if (t >= 1) return 0;
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [t0, a0] = stops[i - 1], [t1, a1] = stops[i];
      return a0 + ((a1 - a0) * (t - t0)) / (t1 - t0);
    }
    return 0;
  };
  const out = Buffer.alloc(1240 * 400 * 3);
  for (let y = 0; y < 400; y++) for (let x = 0; x < 1240; x++) {
    const t = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
    const a = alphaAt(t);
    for (let c = 0; c < 3; c++) {
      const i = (y * 1240 + x) * 3 + c;
      out[i] = Math.round(big[i] * (1 - a) + base[c] * a);
    }
  }
  await sharp(out, { raw: { width: 1240, height: 400, channels: 3 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/banner-bg.png`);
  const pct = (v) => Math.round(v * 10000) / 100;
  const box = {
    left: pct((art.x0 - CROP.x) / CROP.w), top: pct((art.y0 - CROP.y) / CROP.h),
    width: pct(art.w / CROP.w), height: pct(art.h / CROP.h),
  };
  return { art, box };
}

// ---- tracing ----
// marching squares at 0.5 on a padded alpha grid; saddles resolved by the centre value (joined when centre >= 0.5)
function trace(alpha, w, h) {
  const W = w + 2, H = h + 2;
  const f = (x, y) => (x < 1 || y < 1 || x > w || y > h ? 0 : alpha[(y - 1) * w + (x - 1)]);
  const segs = new Map(); // start key -> list of ends
  const key = (x, y) => `${x},${y}`;
  const add = (a, b) => { const k = key(...a); if (!segs.has(k)) segs.set(k, []); segs.get(k).push(b); };
  const lerp = (p, q, vp, vq) => {
    if (p[0] > q[0] || (p[0] === q[0] && p[1] > q[1])) [p, q, vp, vq] = [q, p, vq, vp]; // same float from both cells
    const t = (0.5 - vp) / (vq - vp); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const v = [f(x, y), f(x + 1, y), f(x + 1, y + 1), f(x, y + 1)];
    const P = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const idx = (v[0] >= 0.5 ? 1 : 0) | (v[1] >= 0.5 ? 2 : 0) | (v[2] >= 0.5 ? 4 : 0) | (v[3] >= 0.5 ? 8 : 0);
    if (idx === 0 || idx === 15) continue;
    const e = (i) => lerp(P[i], P[(i + 1) % 4], v[i], v[(i + 1) % 4]); // edge i: corner i -> i+1
    // inside on the left of travel direction
    const table = {
      1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]],
      9: [[2, 0]], 11: [[2, 1]], 12: [[1, 3]], 13: [[1, 0]], 14: [[0, 3]],
    };
    let list = table[idx];
    if (idx === 5 || idx === 10) {
      const centre = (v[0] + v[1] + v[2] + v[3]) / 4 >= 0.5;
      if (idx === 5) list = centre ? [[3, 2], [1, 0]] : [[3, 0], [1, 2]];
      else list = centre ? [[0, 3], [2, 1]] : [[0, 1], [2, 3]];
    }
    for (const [a, b] of list) add(e(a), e(b));
  }
  const loops = [];
  const used = new Set();
  for (const [k, ends] of segs) {
    for (let si = 0; si < ends.length; si++) {
      const id = `${k}#${si}`;
      if (used.has(id)) continue;
      const loop = [k.split(',').map(Number)];
      let curK = k, curI = si;
      for (;;) {
        used.add(`${curK}#${curI}`);
        const next = segs.get(curK)[curI];
        const nk = key(...next);
        if (nk === k) break;
        loop.push(next);
        const nl = segs.get(nk);
        if (!nl) break;
        const j = nl.findIndex((_, i) => !used.has(`${nk}#${i}`));
        if (j < 0) break;
        curK = nk; curI = j;
      }
      loops.push(loop.map(([px, py]) => [px - 1, py - 1]));
    }
  }
  return loops.filter((l) => l.length > 6);
}

function chaikin(loop) {
  const out = [];
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i], q = loop[(i + 1) % loop.length];
    out.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]], [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]);
  }
  return out;
}

function dp(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  let max = -1, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len === 0 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, idx + 1), eps).slice(0, -1), ...dp(pts.slice(idx), eps)];
}

function simplifyLoop(loop, eps) {
  // split at the point farthest from the start; a closed loop's ends coincide
  let far = 0, fd = -1;
  for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = dp(loop.slice(0, far + 1), eps);
  const b = dp([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const n1 = (v) => String(Math.round(v * 10) / 10);
function pathOf(loops) {
  return loops.map((l) => `M${l.map(([x, y]) => `${n1(x)} ${n1(y)}`).join('L')}Z`).join('');
}

async function mark(file) {
  const { data, w, h } = await raw(file);
  const { left, top, width, height } = MARK_CROP;
  const acc = new Float32Array(width * height), lit = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = ((top + y) * w + left + x) * 4;
    const a = data[i + 3] / 255;
    if (data[i] - data[i + 1] > 30) acc[y * width + x] = a; else lit[y * width + x] = a;
  }
  const make = (alpha) => pathOf(trace(alpha, width, height).map((l) => simplifyLoop(chaikin(chaikin(l)), 0.1)));
  return { accent: make(acc), light: make(lit) };
}

const bgImg = await raw(`${DIR}/header-green.png`);
const { art, box } = await background(bgImg);
const m = await mark(`${DIR}/launch-mark-on-dark.png`);
const json = { source: 'launch-mark-on-dark.png', viewBox: `0 0 ${MARK_CROP.width} ${MARK_CROP.height}`, box, accent: m.accent, light: m.light };
writeFileSync(`${OUT}/banner-mark.json`, JSON.stringify(json) + '\n');
console.log('art box', JSON.stringify(art), 'percent', JSON.stringify(box));
console.log('banner-bg.png', statSync(`${OUT}/banner-bg.png`).size, 'bytes; banner-mark.json', statSync(`${OUT}/banner-mark.json`).size, 'bytes');
