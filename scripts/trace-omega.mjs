// Traces the Ω from src/assets/icon.png into src/data/omega.json (steps/9C-hello.md). Run: npm run omega
// Own marching squares + Douglas-Peucker, no dependency beyond sharp. Replace with JohnMark's SVG when it arrives.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SOURCE = 'src/assets/icon.png';
const OUT = 'src/data/omega.json';

const { data, info } = await sharp(SOURCE).ensureAlpha().extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;

// 1. Binary mask, then the largest 4-connected component.
const solid = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) solid[i] = data[i] >= 128 ? 1 : 0;

const label = new Int32Array(W * H).fill(-1);
const sizes = [];
for (let start = 0; start < W * H; start++) {
  if (!solid[start] || label[start] !== -1) continue;
  const id = sizes.length;
  let n = 0;
  const stack = [start];
  label[start] = id;
  while (stack.length) {
    const p = stack.pop();
    n++;
    const x = p % W;
    const y = (p - x) / W;
    if (x > 0 && solid[p - 1] && label[p - 1] === -1) (label[p - 1] = id), stack.push(p - 1);
    if (x < W - 1 && solid[p + 1] && label[p + 1] === -1) (label[p + 1] = id), stack.push(p + 1);
    if (y > 0 && solid[p - W] && label[p - W] === -1) (label[p - W] = id), stack.push(p - W);
    if (y < H - 1 && solid[p + W] && label[p + W] === -1) (label[p + W] = id), stack.push(p + W);
  }
  sizes.push(n);
}
const main = sizes.indexOf(Math.max(...sizes));
const droppedComponents = sizes.length - 1;

// 2. Field: alpha for the main component and a 2 px fringe around it (keeps the antialiased edge), 0 elsewhere.
// A 1 px zero border is added so every contour closes.
const FW = W + 2;
const FH = H + 2;
const field = new Float32Array(FW * FH);
const R = 2;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (label[y * W + x] !== main) continue;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        field[(ny + 1) * FW + nx + 1] = data[ny * W + nx] / 255;
      }
    }
  }
}

// 3. Marching squares at 0.5. Corners sit on pixel centres; edge points are keyed so segments chain.
const f = (x, y) => field[y * FW + x];
const pts = new Map(); // key -> [x, y] in source-pixel coordinates
const adj = new Map(); // key -> [key, key]
const link = (a, b) => {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push(b);
  adj.get(b).push(a);
};
const hEdge = (x, y) => {
  const key = `h${x},${y}`;
  if (!pts.has(key)) {
    const t = (0.5 - f(x, y)) / (f(x + 1, y) - f(x, y));
    pts.set(key, [x + t - 1 + 0.5, y - 1 + 0.5]);
  }
  return key;
};
const vEdge = (x, y) => {
  const key = `v${x},${y}`;
  if (!pts.has(key)) {
    const t = (0.5 - f(x, y)) / (f(x, y + 1) - f(x, y));
    pts.set(key, [x - 1 + 0.5, y + t - 1 + 0.5]);
  }
  return key;
};
for (let y = 0; y < FH - 1; y++) {
  for (let x = 0; x < FW - 1; x++) {
    const tl = f(x, y) >= 0.5;
    const tr = f(x + 1, y) >= 0.5;
    const br = f(x + 1, y + 1) >= 0.5;
    const bl = f(x, y + 1) >= 0.5;
    const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const top = () => hEdge(x, y);
    const bottom = () => hEdge(x, y + 1);
    const left = () => vEdge(x, y);
    const right = () => vEdge(x + 1, y);
    switch (code) {
      case 1: case 14: link(left(), bottom()); break;
      case 2: case 13: link(bottom(), right()); break;
      case 3: case 12: link(left(), right()); break;
      case 4: case 11: link(top(), right()); break;
      case 6: case 9: link(top(), bottom()); break;
      case 7: case 8: link(top(), left()); break;
      case 5: // tr + bl solid: saddle
      case 10: { // tl + br solid: saddle. Join by the centre value.
        const centre = (f(x, y) + f(x + 1, y) + f(x, y + 1) + f(x + 1, y + 1)) / 4 >= 0.5;
        if ((code === 5) === centre) { link(top(), left()); link(bottom(), right()); }
        else { link(top(), right()); link(left(), bottom()); }
        break;
      }
    }
  }
}

// 4. Chain segments into closed loops; the outer contour is the loop with the largest area.
const seen = new Set();
const loops = [];
for (const startKey of adj.keys()) {
  if (seen.has(startKey)) continue;
  const loop = [];
  let prev = null;
  let cur = startKey;
  while (!seen.has(cur)) {
    seen.add(cur);
    loop.push(pts.get(cur));
    const [a, b] = adj.get(cur);
    const next = a !== prev && !seen.has(a) ? a : !seen.has(b) ? b : null;
    prev = cur;
    if (next === null) break;
    cur = next;
  }
  loops.push(loop);
}
const area = (loop) => {
  let s = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
};
loops.sort((p, q) => area(q) - area(p));
let outer = loops[0];
const holes = loops.length - 1;

// 4b. Orientation and start. The light on /hello runs clockwise on screen (positive shoelace area, y down)
// from the right foot's inner corner, where the hand cut-out meets the baseline on the right.
{
  let signed = 0;
  for (let i = 0; i < outer.length; i++) {
    const [x1, y1] = outer[i];
    const [x2, y2] = outer[(i + 1) % outer.length];
    signed += x1 * y2 - x2 * y1;
  }
  if (signed < 0) outer = [...outer].reverse();

  const oxs = outer.map((p) => p[0]);
  const oys = outer.map((p) => p[1]);
  const centreX = (Math.min(...oxs) + Math.max(...oxs)) / 2;
  const maxY = Math.max(...oys);
  const baseline = maxY - 0.06 * (maxY - Math.min(...oys));
  const onBase = outer.map((p) => p[1] >= baseline);
  const n = outer.length;
  // Runs of non-baseline vertices, walked circularly from a baseline vertex.
  const first = onBase.indexOf(true);
  if (first === -1) throw new Error('trace-omega: no baseline vertices');
  const candidates = [];
  let runStart = -1;
  for (let k = 1; k <= n; k++) {
    const i = (first + k) % n;
    if (!onBase[i]) {
      if (runStart === -1) runStart = i;
    } else if (runStart !== -1) {
      const last = (i - 1 + n) % n;
      if (outer[runStart][0] > centreX && outer[last][0] < centreX) candidates.push((runStart - 1 + n) % n);
      runStart = -1;
    }
  }
  if (candidates.length !== 1) throw new Error(`trace-omega: expected one cut-out run, found ${candidates.length}`);
  // The vertex before the run is where the cut-out edge leaves the baseline band. Walk back down that edge
  // (y rising, x within 25) to where it meets the foot's bottom edge. The corner is the leftmost vertex
  // within 12 of the lowest one reached: the bottom edge runs off to the right of it.
  const from = candidates[0];
  const [x0] = outer[from];
  const walked = [from];
  for (let k = 1, y = outer[from][1]; k < n; k++) {
    const j = (from - k + n) % n;
    const [x, yj] = outer[j];
    if (Math.abs(x - x0) > 25 || yj < y - 2) break;
    y = Math.max(y, yj);
    walked.push(j);
  }
  const lowest = Math.max(...walked.map((j) => outer[j][1]));
  const start = walked
    .filter((j) => outer[j][1] >= lowest - 12)
    .reduce((a, b) => (outer[b][0] < outer[a][0] ? b : a));
  outer = [...outer.slice(start), ...outer.slice(0, start)];
}

// 5. Douglas-Peucker on a closed loop: split at the point farthest from point 0, simplify both halves.
const dist = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / len;
};
const dp = (line, tol) => {
  if (line.length < 3) return line;
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = dist(line[i], line[s], line[e]);
      if (d > max) (max = d), (idx = i);
    }
    if (max > tol && idx !== -1) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return line.filter((_, i) => keep[i]);
};
const simplifyLoop = (loop, tol) => {
  let far = 0;
  let farD = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > farD) (farD = d), (far = i);
  }
  const a = dp(loop.slice(0, far + 1), tol);
  const b = dp([...loop.slice(far), loop[0]], tol);
  const merged = [...a.slice(0, -1), ...b.slice(0, -1)].map(([x, y]) => [Math.round(x), Math.round(y)]);
  return merged.filter((p, i) => i === 0 || p[0] !== merged[i - 1][0] || p[1] !== merged[i - 1][1]);
};
const toPath = (loop) => `M${loop.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

const trace = (tol, limit, retryTol) => {
  let out = simplifyLoop(outer, tol);
  let used = tol;
  if (out.length > limit) (out = simplifyLoop(outer, retryTol)), (used = retryTol);
  return { loop: out, tol: used };
};
const full = trace(1.5, 1500, 2.5);
const map = trace(6, 250, 8);

// 6. viewBox: bbox of the full path, padded 2% each side.
const xs = full.loop.map((p) => p[0]);
const ys = full.loop.map((p) => p[1]);
const minX = Math.min(...xs);
const minY = Math.min(...ys);
const bw = Math.max(...xs) - minX;
const bh = Math.max(...ys) - minY;
const padX = Math.round(bw * 0.02);
const padY = Math.round(bh * 0.02);
const viewBox = `${minX - padX} ${minY - padY} ${bw + 2 * padX} ${bh + 2 * padY}`;

const result = {
  source: SOURCE,
  viewBox,
  d: toPath(full.loop),
  points: full.loop.length,
  dMap: toPath(map.loop),
  pointsMap: map.loop.length,
};
writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
console.log(`Wrote ${OUT}`);
console.log(`  d: ${result.points} points (tolerance ${full.tol} px); dMap: ${result.pointsMap} points (tolerance ${map.tol} px)`);
console.log(`  dropped components: ${droppedComponents}; holes ignored: ${holes}; viewBox: ${viewBox}`);
console.log(`  start vertex (right foot's inner corner): ${full.loop[0].join(', ')}`);
