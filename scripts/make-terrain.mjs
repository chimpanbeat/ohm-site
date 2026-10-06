// Builds the hillshade for the service-area map from USGS 3DEP elevation (AWS Terrain Tiles) and
// writes src/assets/terrain.webp (black with alpha: shadow only) and src/data/terrain.json.
// Run by hand, rarely; commit the result. Never part of CI or the build.
// See docs/build/ARCHITECTURE.md §B5.
//
// 3DEP data courtesy of the U.S. Geological Survey.
//
// Usage: npm run terrain

import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER_AGENT = 'ohm-site map builder (https://github.com/chimpanbeat/ohm-site)';
const TILE_URL = (x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`;
const Z = 12;
const TILE = 256;

// [west, south, east, north]: the same box as `npm run osm`.
const BBOX = [-105.09, 38.63, -104.54, 39.17];
const [W, S, E, N] = BBOX;
const WIDTH = 1024;
const LAT0 = (S + N) / 2;
const HEIGHT = Math.round((WIDTH * (N - S)) / ((E - W) * Math.cos((LAT0 * Math.PI) / 180)));

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const CACHE = root('.cache/terrain');
const OUT_IMG = root('src/assets/terrain.webp');
const OUT_JSON = root('src/data/terrain.json');

// Web Mercator, in pixels of the whole world at zoom Z.
const WORLD = TILE * 2 ** Z;
const px = (lng) => ((lng + 180) / 360) * WORLD;
const py = (lat) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD;
};

const [tx0, tx1] = [Math.floor(px(W) / TILE), Math.floor(px(E) / TILE)];
const [ty0, ty1] = [Math.floor(py(N) / TILE), Math.floor(py(S) / TILE)];

// 1. Tiles, cached, one at a time.
const tiles = new Map(); // "x,y" → Float32Array of elevation in metres
let downloaded = 0;
let cached = 0;
let lo = Infinity;
let hi = -Infinity;

for (let ty = ty0; ty <= ty1; ty++) {
  for (let tx = tx0; tx <= tx1; tx++) {
    const file = `${CACHE}/${Z}/${tx}/${ty}.png`;
    if (existsSync(file)) cached++;
    else {
      const res = await fetch(TILE_URL(tx, ty), { headers: { 'User-Agent': USER_AGENT } });
      if (res.status !== 200) {
        console.error(`Tile ${Z}/${tx}/${ty} answered HTTP ${res.status}`);
        process.exit(1);
      }
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      downloaded++;
    }
    // 3. Decode: elevation = R × 256 + G + B / 256 − 32768.
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const elev = new Float32Array(TILE * TILE);
    for (let i = 0; i < elev.length; i++) {
      const o = i * info.channels;
      elev[i] = data[o] * 256 + data[o + 1] + data[o + 2] / 256 - 32768;
    }
    tiles.set(`${tx},${ty}`, elev);
  }
}

/** Elevation at global pixel (gx, gy), clamped to the fetched tiles. */
function at(gx, gy) {
  const x = Math.min(Math.max(gx, tx0 * TILE), (tx1 + 1) * TILE - 1);
  const y = Math.min(Math.max(gy, ty0 * TILE), (ty1 + 1) * TILE - 1);
  const tile = tiles.get(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`);
  return tile[(y % TILE) * TILE + (x % TILE)];
}

// 4. Output grid, regular in lng/lat; bilinear sampling at each pixel centre.
const elev = new Float32Array(WIDTH * HEIGHT);
for (let j = 0; j < HEIGHT; j++) {
  const lat = N - ((j + 0.5) / HEIGHT) * (N - S);
  const gy = py(lat) - 0.5;
  const y0 = Math.floor(gy);
  const fy = gy - y0;
  for (let i = 0; i < WIDTH; i++) {
    const gx = px(W + ((i + 0.5) / WIDTH) * (E - W)) - 0.5;
    const x0 = Math.floor(gx);
    const fx = gx - x0;
    const v =
      at(x0, y0) * (1 - fx) * (1 - fy) +
      at(x0 + 1, y0) * fx * (1 - fy) +
      at(x0, y0 + 1) * (1 - fx) * fy +
      at(x0 + 1, y0 + 1) * fx * fy;
    elev[j * WIDTH + i] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
}

// 5. Horn hillshade. Sun azimuth 315°, altitude 45°, z-factor 1.
const dx = ((E - W) / WIDTH) * 111320 * Math.cos((LAT0 * Math.PI) / 180);
const dy = ((N - S) / HEIGHT) * 110570;
const alt = (45 * Math.PI) / 180;
const zenith = Math.PI / 2 - alt;
const sun = ((360 - 315 + 90) * Math.PI) / 180; // compass azimuth 315° as a math angle
const flat = Math.sin(alt);
const e = (i, j) => elev[Math.min(Math.max(j, 0), HEIGHT - 1) * WIDTH + Math.min(Math.max(i, 0), WIDTH - 1)];

// 6. Shadow alpha: sunlit and flat ground → 0.
const alpha = Buffer.alloc(WIDTH * HEIGHT);
for (let j = 0; j < HEIGHT; j++) {
  for (let i = 0; i < WIDTH; i++) {
    const a = e(i - 1, j - 1), b = e(i, j - 1), c = e(i + 1, j - 1);
    const d = e(i - 1, j), f = e(i + 1, j);
    const g = e(i - 1, j + 1), h = e(i, j + 1), k = e(i + 1, j + 1);
    const dzdx = (c + 2 * f + k - (a + 2 * d + g)) / (8 * dx);
    const dzdy = (g + 2 * h + k - (a + 2 * b + c)) / (8 * dy); // image y runs south
    const slope = Math.atan(Math.hypot(dzdx, dzdy));
    const aspect = Math.atan2(dzdy, -dzdx);
    const shade = Math.max(
      0,
      Math.cos(zenith) * Math.cos(slope) + Math.sin(zenith) * Math.sin(slope) * Math.cos(sun - aspect),
    );
    const shadow = Math.min(Math.max(1 - shade / flat, 0), 1);
    alpha[j * WIDTH + i] = Math.round(255 * shadow ** 0.8);
  }
}

// 7. A light blur on the alpha, then WebP with alpha. sharp hands a blurred one-channel image back
// as three channels, so take one back out; otherwise the rows interleave into stripes.
const blurred = await sharp(alpha, { raw: { width: WIDTH, height: HEIGHT, channels: 1 } })
  .blur(1)
  .extractChannel(0)
  .raw()
  .toBuffer();
if (blurred.length !== WIDTH * HEIGHT) throw new Error(`blurred alpha is ${blurred.length} bytes, expected ${WIDTH * HEIGHT}`);
const rgba = Buffer.alloc(WIDTH * HEIGHT * 4); // RGB stays 0 (black)
for (let i = 0; i < blurred.length; i++) rgba[i * 4 + 3] = blurred[i];
await sharp(rgba, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
  .webp({ quality: 70, alphaQuality: 50 })
  .toFile(OUT_IMG);

// 8. The box and size, for ServiceMap.
writeFileSync(OUT_JSON, JSON.stringify({ bbox: BBOX, width: WIDTH, height: HEIGHT }, null, 2) + '\n');

// 9. Report.
const bytes = statSync(OUT_IMG).size;
console.log(`tiles ${downloaded + cached} (${downloaded} downloaded, ${cached} cached)`);
console.log(`grid ${WIDTH}×${HEIGHT}, elevation ${Math.round(lo)}–${Math.round(hi)} m`);
console.log(`${OUT_IMG} ${(bytes / 1024).toFixed(1)} KB, ${OUT_JSON}`);
if (bytes > 200 * 1024) {
  console.error('terrain.webp is over 200 KB: lower alphaQuality.');
  process.exit(1);
}
