import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const globalCss = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
const header = readFileSync(join(root, 'src/components/Header.astro'), 'utf8');

function walk(d: string, ext: RegExp): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = join(d, e.name);
    return e.isDirectory() ? walk(p, ext) : ext.test(e.name) ? [p] : [];
  });
}
function pageCss(file: string): string {
  const html = readFileSync(file, 'utf8');
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
  return [...inline, ...linked].join('\n');
}

test('global.css: one @view-transition, inside no-preference, 200ms on the three groups', () => {
  assert.equal((globalCss.match(/@view-transition\s*\{\s*navigation:\s*auto;?\s*\}/g) || []).length, 1);
  const m = globalCss.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/);
  assert.ok(m, 'no-preference block');
  assert.match(m[1], /@view-transition\s*\{\s*navigation:\s*auto;?\s*\}/);
  assert.match(
    m[1],
    /::view-transition-group\(\*\),\s*::view-transition-old\(\*\),\s*::view-transition-new\(\*\)\s*\{[^}]*animation-duration:\s*200ms/,
  );
});

test('Header: view-transition-name site-header, ohm-spin unchanged', () => {
  assert.match(header, /\.site-header\s*\{[^}]*view-transition-name:\s*site-header/);
  assert.match(header, /animation:\s*ohm-spin 0\.9s ease-in-out 1/);
});

test('src: no Astro client router or transition directives', () => {
  for (const f of walk(join(root, 'src'), /\.(astro|ts|js|mjs|css|md|mdx)$/)) {
    const t = readFileSync(f, 'utf8');
    assert.doesNotMatch(t, /ClientRouter|ViewTransitions|astro:transitions|transition:(name|animate|persist)/, relative(root, f));
  }
});

const skip = existsSync(join(dist, 'index.html')) ? false : 'dist/index.html missing: run npm run build';

test('dist: script inventory per page', { skip }, () => {
  const want: Record<string, number> = { 'index.html': 1, 'book.html': 2, 'client-policies.html': 1, 'hello.html': 1 };
  for (const f of walk(dist, /\.html$/)) {
    const rel = relative(dist, f).split(sep).join('/');
    const html = readFileSync(f, 'utf8');
    const n = [...html.matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/application\/ld\+json/i.test(m[1])).length;
    assert.equal(n, want[rel] ?? 0, `${rel} scripts`);
  }
});

test('dist: index, 404 and hello load @view-transition', { skip }, () => {
  for (const p of ['index.html', '404.html', 'hello.html']) {
    const c = pageCss(join(dist, p));
    assert.match(c, /@view-transition/, p);
    assert.match(c, /navigation:\s*auto/, p);
  }
});
