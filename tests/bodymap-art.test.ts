import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { artName, SEXES, VIEWS } from '../scripts/bodymap-art.mjs';

// B1 (I-074): the delivered body map art under src/assets/bodymap/, and the §A1 pin contrast rules.
const root = fileURLToPath(new URL('..', import.meta.url));
const art = join(root, 'src/assets/bodymap');
const artScript = join(root, 'scripts/bodymap-art.mjs');
const contrastScript = join(root, 'scripts/check-contrast.mjs');
const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');

const NAMES = SEXES.flatMap((s: string) => VIEWS.map((v: string) => artName(s, v)));
const V1_VIEWS = ['front', 'back'];
const LIMIT = 400 * 1024;

const svgOf = (name: string) => readFileSync(join(art, 'svg', `${name}.svg`), 'utf8');

test('1. exactly the 8 SVG and 8 PNG names; a WebP only for a v1 SVG over 400 KB', () => {
  assert.deepEqual(
    NAMES,
    [
      'female_front',
      'female_back',
      'female_left_side',
      'female_right_side',
      'male_front',
      'male_back',
      'male_left_side',
      'male_right_side',
    ],
  );
  assert.deepEqual(readdirSync(join(art, 'svg')).sort(), NAMES.map((n: string) => `${n}.svg`).sort());
  assert.deepEqual(readdirSync(join(art, 'png')).sort(), NAMES.map((n: string) => `${n}.png`).sort());
  for (const n of NAMES) {
    const v1 = V1_VIEWS.some((v) => n.endsWith(`_${v}`));
    const over = statSync(join(art, 'svg', `${n}.svg`)).size > LIMIT;
    assert.equal(existsSync(join(art, 'webp', `${n}.webp`)), v1 && over, `${n}: WebP only for a v1 SVG over 400 KB`);
  }
});

test('2. viewBox 0 0 2048 4096, groups silhouette, landmarks, outline in order, silhouette fill is --bodymap-figure', () => {
  const figure = tokens.match(/--bodymap-figure:\s*(#[0-9a-fA-F]{6})/)?.[1];
  assert.ok(figure, '--bodymap-figure is a hex in tokens.css');
  for (const n of NAMES) {
    const svg = svgOf(n);
    assert.match(svg, /<svg[^>]*viewBox="0 0 2048 4096"/, `${n}: viewBox`);
    const ids = [...svg.matchAll(/<g\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, ['silhouette', 'landmarks', 'outline'], `${n}: groups`);
    const fill = svg.match(/<g\b[^>]*\bid="silhouette"[^>]*\bfill="(#[0-9a-fA-F]{6})"/)?.[1];
    assert.equal(fill?.toLowerCase(), figure.toLowerCase(), `${n}: silhouette fill`);
  }
});

/** The type of every chunk in a PNG, in order. */
function pngChunks(buf: Buffer): string[] {
  const out: string[] = [];
  let p = 8;
  while (p < buf.length) {
    out.push(buf.toString('latin1', p + 4, p + 8));
    p += 12 + buf.readUInt32BE(p);
  }
  return out;
}

test('3. hygiene: no metadata, editor markup, comments, file links or local paths; PNGs are 2048x4096 with no text chunks', async () => {
  const banned = [/<metadata/i, /sodipodi:/, /inkscape:/, /<!--/, /xlink:href/, /\bhref\s*=/, /C:\\/, /\/Users\//, /\\Users\\/];
  for (const n of NAMES) {
    const svg = svgOf(n);
    for (const re of banned) assert.doesNotMatch(svg, re, `${n}.svg matches ${re}`);
    const buf = readFileSync(join(art, 'png', `${n}.png`));
    const meta = await sharp(buf).metadata();
    assert.equal(`${meta.width}x${meta.height}`, '2048x4096', `${n}.png size`);
    const chunks = pngChunks(buf);
    for (const bad of ['tEXt', 'iTXt', 'zTXt']) assert.ok(!chunks.includes(bad), `${n}.png has a ${bad} chunk`);
  }
});

test('4. the 8 silhouettes share one centreline within 4 units', async () => {
  const centres: number[] = [];
  for (const n of NAMES) {
    // Rasterise the silhouette group alone at half size, then take the bounding box of the opaque pixels.
    const only = svgOf(n).replace(/<g\b[^>]*\bid="(landmarks|outline)"[\s\S]*?<\/g>/g, '');
    const { data, info } = await sharp(Buffer.from(only)).resize(1024, 2048).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let min = info.width;
    let max = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels + 3] > 127) {
          if (x < min) min = x;
          if (x > max) max = x;
        }
      }
    }
    assert.ok(max >= 0, `${n}: silhouette drew nothing`);
    centres.push(((min + max + 1) / 2) * 2); // back to 2048-wide units
  }
  const mid = (Math.min(...centres) + Math.max(...centres)) / 2;
  centres.forEach((c, i) => assert.ok(Math.abs(c - mid) <= 4, `${NAMES[i]}: centre ${c} vs ${mid}`));
});

test('5. sequence: bodymap-art.mjs cleans a synthetic SVG, and a second run gives identical bytes', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'bodymap-art-'));
  try {
    const src = join(tmp, 'src');
    mkdirSync(src);
    writeFileSync(
      join(src, 'female_front.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 2048 4096">' +
        '<!-- made on C:\\Users\\x -->\n<metadata>work of someone</metadata>\n' +
        '<g id="silhouette" fill="#D3D7DC" inkscape:label="body"><path d="M0 0 C1.234 5.678 -0.04 9.999 10.25 20"/></g>' +
        '<g id="landmarks"/><g id="outline"/></svg>',
    );
    const out = join(tmp, 'out');
    const run = () => spawnSync(process.execPath, [artScript, src, '--out', out, '--partial'], { encoding: 'utf8' });
    const first = run();
    assert.equal(first.status, 0, first.stderr + first.stdout);
    const svg = readFileSync(join(out, 'svg/female_front.svg'));
    const text = svg.toString('utf8');
    for (const re of [/<metadata/, /<!--/, /inkscape/, /Users/]) assert.doesNotMatch(text, re);
    assert.match(text, /d="M0 0 C1\.2 5\.7 0 10 10\.3 20"/, 'path numbers at most 1 decimal');
    assert.match(first.stdout, /female_front\.svg/, 'the report names the file');
    assert.match(first.stdout, /\d+ B/, 'and its size');
    const readme = readFileSync(join(out, 'README.md'), 'utf8');
    assert.match(readme, /Hosting: Brian decided on Nov 7, 2026 to keep this set in the public ohm-site repo, with a copy in his Workspace Drive\./);
    assert.doesNotMatch(readme, /Keep out of the public repo/);
    assert.equal(run().status, 0);
    assert.ok(svg.equals(readFileSync(join(out, 'svg/female_front.svg'))), 'second run changed the SVG');
    assert.equal(readFileSync(join(out, 'README.md'), 'utf8'), readme, 'second run changed the README');
    // Without --partial a missing figure is a failure.
    assert.equal(spawnSync(process.execPath, [artScript, src, '--out', out], { encoding: 'utf8' }).status, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('6. check:contrast pin rules: a pin fill under 3:1 against --pin-halo fails, the real tokens pass', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pin-contrast-'));
  try {
    const run = (css: string) => {
      const file = join(tmp, 'tokens.css');
      writeFileSync(file, css);
      return spawnSync(process.execPath, [contrastScript, '--tokens', file], { encoding: 'utf8', cwd: root });
    };
    const real = run(tokens);
    assert.equal(real.status, 0, real.stdout + real.stderr);
    assert.match(real.stdout, /pin-pain/);
    const bad = run(tokens.replace(/--pin-pain:[^;]+;/, '--pin-pain: #f0e8d8;'));
    assert.equal(bad.status, 1, bad.stdout);
    assert.match(bad.stdout, /FAIL.*pin-pain/);
    // The edge must stand off the figure too.
    const edge = run(tokens.replace(/--pin-edge:[^;]+;/, '--pin-edge: #d6dade;'));
    assert.equal(edge.status, 1, edge.stdout);
    // B6: seven types. Every type has a rule; injury's yellow needs its dark edge; a head glyph (-on) needs 3:1 on its head.
    for (const t of ['pain', 'discomfort', 'tight', 'injury', 'numb', 'avoid', 'other']) assert.match(real.stdout, new RegExp(`pin-${t}`), t);
    const noEdge = run(tokens.replace(/--pin-injury-edge:[^;]+;/, '--pin-injury-edge: #f2c12e;'));
    assert.equal(noEdge.status, 1, noEdge.stdout);
    assert.match(noEdge.stdout, /FAIL.*pin-injury/);
    const bareYellow = run(tokens.replace(/--pin-injury-edge:[^;]+;/, ''));
    assert.equal(bareYellow.status, 1, 'an injury colour with no edge token fails');
    const faint = run(tokens.replace(/--pin-on:[^;]+;/, '--pin-on: #9aa0a8;'));
    assert.equal(faint.status, 1, faint.stdout);
    assert.match(faint.stdout, /FAIL.*pin-on/);
    const faintInjury = run(tokens.replace(/--pin-injury-on:[^;]+;/, '--pin-injury-on: #f2c12e;'));
    assert.equal(faintInjury.status, 1, faintInjury.stdout);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
