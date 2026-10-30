import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Step V: on Home only, a plain click on the header logo spins it once instead of reloading.
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const built = existsSync(join(dist, 'index.html'));
const skip = built ? false : 'dist/index.html missing: run npm run build';
const rd = (p: string) => readFileSync(join(root, p), 'utf8');

function pages(dir = dist): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? pages(p) : e.name.endsWith('.html') ? [p] : [];
  });
}
// Module scripts a built page loads (client bundles), as file contents.
function bundles(file: string): string[] {
  const html = readFileSync(file, 'utf8');
  const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]); // Astro inlines small scripts
  return inline.concat([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  }));
}

test('logo spin: the script exists and only index.astro imports it', () => {
  assert.ok(existsSync(join(root, 'src/scripts/logo-spin.ts')), 'src/scripts/logo-spin.ts');
  assert.match(rd('src/pages/index.astro'), /scripts\/logo-spin\.ts/);
  for (const f of ['about', 'services', 'pricing', 'client-policies', 'hello', '404']) {
    assert.doesNotMatch(rd(`src/pages/${f}.astro`), /logo-spin/, f);
  }
  assert.doesNotMatch(rd('src/pages/book/index.astro'), /logo-spin/);
});

test('logo spin: respects reduced motion, modifier clicks and a spin in progress', () => {
  const s = rd('src/scripts/logo-spin.ts');
  assert.match(s, /prefers-reduced-motion/);
  assert.match(s, /ctrlKey|metaKey|shiftKey/);
  assert.match(s, /is-spinning/);
  assert.match(s, /animationend/);
  assert.doesNotMatch(s, /fetch\(|localStorage|sessionStorage|XMLHttpRequest/);
});

test('logo spin: the spin keyframes are in the header, tokens only, off under reduced motion', () => {
  const h = rd('src/components/Header.astro');
  assert.match(h, /@keyframes ohm-spin/);
  assert.match(h, /rotate\(-360deg\)/); // counter-clockwise, one turn
  assert.match(h, /is-spinning/);
  assert.doesNotMatch(h.replace(/data:image[^"]*"/g, ''), /#[0-9a-fA-F]{3,8}\b/);
});

test('logo spin: only the built Home page loads the script', { skip }, () => {
  const withSpin = pages().filter((f) => bundles(f).some((b) => b.includes('is-spinning')));
  assert.deepEqual(withSpin.map((f) => f.slice(dist.length + 1).replaceAll('\\', '/')), ['index.html']);
});
