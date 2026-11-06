// I-054 (decision I-055, option A): the terrain shading is fetched by src/scripts/terrain.ts after the
// page's load event and only once its map is on screen, so it never competes with text and fonts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';

const base = site.deploy.base.replace(/\/+$/, '');
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const script = join(root, 'src/scripts/terrain.ts');
const mapPages = ['book.html', 'book/central.html', 'book/midnorth.html', 'book/north.html', 'book/office.html', 'book/out.html'];

test('src: terrain.ts waits for load, then sets href per map as it comes into view', () => {
  assert.ok(existsSync(script), 'src/scripts/terrain.ts');
  const t = readFileSync(script, 'utf8');
  assert.match(t, /addEventListener\('load'/);
  assert.match(t, /readyState === 'complete'/);
  assert.match(t, /IntersectionObserver/);
  assert.match(t, /setAttribute\('href'/);
});

const skip = existsSync(join(dist, 'book.html')) ? false : 'dist/book.html missing: run npm run build';

test('dist: map pages ship the terrain image with data-href and no href', { skip }, () => {
  for (const p of mapPages) {
    const html = readFileSync(join(dist, p), 'utf8');
    const images = [...html.matchAll(/<image\b[^>]*class="terrain"[^>]*>/g)].map((m) => m[0]);
    assert.ok(images.length > 0, `${p}: terrain image`);
    for (const img of images) {
      assert.doesNotMatch(img, /\shref=/, `${p}: no href at load`);
      const src = img.match(/data-href="([^"]+)"/)?.[1];
      assert.ok(src, `${p}: data-href`);
      assert.ok(existsSync(join(dist, src.slice(base.length + 1))), `${p}: ${src} exists`);
    }
  }
});
