// Body map art import (B1, I-074).
//   npm run bodymap:art -- <extracted folder> [--out <dir>] [--partial]
// Copies the delivered figures into src/assets/bodymap/ under their delivered names:
//   svg/<sex>_<view>.svg   cleaned: no metadata, editor markup or comments; path numbers at most 1 decimal
//   png/<sex>_<view>.png   the 2048x4096 set, with any text chunks removed (no re-encode)
//   webp/<sex>_<view>.webp a transparent 1024x2048 render, only for a v1 (front or back) SVG still over 400 KB
//   README.md              the art's own README plus the dated hosting line
// The 887x1774 sources are never copied. Running it twice gives identical files.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const SEXES = ['female', 'male'];
export const VIEWS = ['front', 'back', 'left_side', 'right_side'];
export const V1_VIEWS = ['front', 'back'];
export const WEBP_OVER = 400 * 1024;
export const artName = (sex, view) => `${sex}_${view}`;

const HOSTING_LINE =
  'Hosting: Brian decided on Nov 7, 2026 to keep this set in the public ohm-site repo, with a copy in his Workspace Drive.';

/** One decimal at most, no trailing zeros, no negative zero. */
const round1 = (s) => {
  const n = Math.round(parseFloat(s) * 10) / 10;
  return Object.is(n, -0) ? '0' : String(n);
};

/** Strip metadata, comments, editor attributes and file links; round path data to one decimal. */
export function cleanSvg(text) {
  return text
    .replace(/<\?xml[\s\S]*?\?>\s*/g, '')
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>\s*/gi, '')
    .replace(/<(sodipodi|inkscape):[^>]*?(\/>|>[\s\S]*?<\/\1:[^>]*>)\s*/g, '')
    .replace(/\s(sodipodi|inkscape|xmlns:sodipodi|xmlns:inkscape|xmlns:xlink|xlink:href):?[\w.-]*\s*=\s*"[^"]*"/g, '')
    .replace(/\sd="([^"]*)"/g, (_, d) => ` d="${d.replace(/-?\d*\.\d+/g, round1)}"`);
}

/** The PNG with tEXt, iTXt, zTXt, eXIf and tIME chunks dropped; other chunks are copied byte for byte. */
export function stripPngText(buf) {
  const drop = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME']);
  const parts = [buf.subarray(0, 8)];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    if (!drop.has(type)) parts.push(buf.subarray(p, p + 12 + len));
    p += 12 + len;
  }
  return Buffer.concat(parts);
}

const kb = (n) => `${n} B (${(n / 1024).toFixed(1)} KB)`;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

export async function run(srcDir, outDir, { partial = false } = {}) {
  const files = walk(srcDir);
  const wanted = new Set(SEXES.flatMap((s) => VIEWS.map((v) => artName(s, v))));
  const svgs = new Map();
  const pngs = new Map();
  for (const f of files) {
    const stem = basename(f).replace(/\.[^.]+$/, '');
    if (!wanted.has(stem)) continue;
    if (f.endsWith('.svg')) svgs.set(stem, f);
    else if (f.endsWith('.png')) {
      const m = await sharp(f).metadata();
      if (m.width === 2048 && m.height === 4096) pngs.set(stem, f); // the 887x1774 sources stay out
    }
  }
  const missing = [...wanted].filter((n) => !svgs.has(n) || !pngs.has(n));
  if (!svgs.size) {
    console.error(`bodymap-art: no figure SVGs found under ${srcDir}`);
    return 1;
  }
  if (missing.length && !partial) {
    console.error(`bodymap-art: missing SVG or 2048x4096 PNG for: ${missing.join(', ')}`);
    return 1;
  }

  for (const d of ['svg', 'png', 'webp']) mkdirSync(join(outDir, d), { recursive: true });
  const report = [];
  for (const [name, file] of [...svgs].sort()) {
    const before = statSync(file).size;
    const clean = cleanSvg(readFileSync(file, 'utf8'));
    const after = Buffer.byteLength(clean);
    writeFileSync(join(outDir, 'svg', `${name}.svg`), clean);
    const webp = join(outDir, 'webp', `${name}.webp`);
    const v1 = V1_VIEWS.some((v) => name.endsWith(`_${v}`));
    let note = '';
    if (v1 && after > WEBP_OVER) {
      await sharp(Buffer.from(clean), { density: 72 }).resize(1024, 2048).webp({ quality: 90, alphaQuality: 100 }).toFile(webp);
      note = `  -> webp ${kb(statSync(webp).size)}`;
    } else if (existsSync(webp)) rmSync(webp);
    report.push(`${name}.svg  before ${kb(before)}  after ${kb(after)}${note}`);
  }
  for (const [name, file] of [...pngs].sort()) {
    writeFileSync(join(outDir, 'png', `${name}.png`), stripPngText(readFileSync(file)));
  }

  const own = files.find((f) => basename(f) === 'README.md');
  const base = own
    ? readFileSync(own, 'utf8').replace(/\r\n/g, '\n').replace(/^Source:.*?Keep out of the public repo[^\n]*$/m, (line) => line.replace(/\s*Keep out of the public repo[^\n]*$/, ''))
    : '# Ohm body map art set\n';
  writeFileSync(join(outDir, 'README.md'), `${base.trimEnd()}\n\n${HOSTING_LINE}\n`);

  console.log(report.join('\n'));
  console.log(`${svgs.size} SVG, ${pngs.size} PNG${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const take = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : args.splice(i, 2)[1];
  };
  const out = take('--out') ?? join(dirname(fileURLToPath(import.meta.url)), '../src/assets/bodymap');
  const partial = args.includes('--partial');
  const src = args.find((a) => !a.startsWith('--'));
  if (!src) {
    console.error('usage: npm run bodymap:art -- <extracted folder> [--out <dir>] [--partial]');
    process.exit(2);
  }
  process.exit(await run(resolve(src), resolve(out), { partial }));
}
