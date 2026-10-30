import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const src = readFileSync(join(root, 'src/pages/index.astro'), 'utf8');

const SUPPORTS = '@supports (animation-timeline: scroll()) {';
const MEDIA = '@media (prefers-reduced-motion: no-preference) {';

function inner(text: string, open: string): { body: string; start: number; end: number } {
  const start = text.indexOf(open);
  assert.ok(start >= 0, `block ${open}`);
  let depth = 0;
  for (let i = start + open.length - 1; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return { body: text.slice(start + open.length, i), start, end: i + 1 };
  }
  throw new Error(`unterminated ${open}`);
}
const supports = inner(src, SUPPORTS);
const drift = inner(supports.body, MEDIA).body;

function rule(b: string, sel: string): string {
  const esc = sel.replace(/[.:()]/g, '\\$&');
  const m = b.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `rule ${sel}`);
  return m[1];
}

test('the hero names a view timeline; the art follows it over the hero exit', () => {
  assert.match(rule(drift, '.hero'), /view-timeline:\s*--ohm-hero block/);
  const r = rule(drift, '.hero-art');
  // Longhands, not the shorthand: the minifier folds shorthand + timeline into one declaration Chromium rejects.
  assert.doesNotMatch(r, /(^|[\s;])animation\s*:/, 'no animation shorthand');
  assert.match(r, /animation-name:\s*ohm-drift/);
  assert.match(r, /animation-timing-function:\s*linear/);
  assert.match(r, /animation-fill-mode:\s*both/);
  assert.match(r, /animation-timeline:\s*--ohm-hero/);
  assert.match(r, /animation-range:\s*exit 0% exit 100%/);
});

test('ohm-drift animates only translate, ending between 10 and 20px', () => {
  const m = drift.match(/@keyframes ohm-drift\s*\{([\s\S]*?\})\s*\}/);
  assert.ok(m);
  assert.doesNotMatch(m[1].replace(/translate:[^;}]*/g, ''), /[a-z-]+\s*:/);
  const to = m[1].match(/to\s*\{\s*translate:\s*0 (\d+)px/);
  assert.ok(to, 'to translate');
  assert.ok(Number(to[1]) >= 10 && Number(to[1]) <= 20, `${to[1]}px`);
});

test('no anonymous view() or scroll(), no animation on the hero text, desktop transform kept', () => {
  assert.doesNotMatch(src, /\bview\(/);
  assert.doesNotMatch(src, /^\s*animation-timeline:\s*scroll\(/m, 'no scroll() timeline');
  for (const sel of ['.hero-text', '.hero-text h1', '.subline', '.cta-row']) {
    for (const m of src.matchAll(new RegExp(`${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'g'))) {
      assert.doesNotMatch(m[1], /animation/, sel);
    }
  }
  assert.match(src, /\.hero-art\s*\{[^}]*transform:\s*translateY\(-50%\)/);
});

const skip = existsSync(join(dist, 'index.html')) ? false : 'dist/index.html missing: run npm run build';

test('dist: Home CSS carries the named hero view timeline', { skip }, () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
  const c = [...inline, ...linked].join('\n');
  assert.match(c, /view-timeline:\s*--ohm-hero/);
  assert.match(c, /animation-timeline:\s*--ohm-hero/);
  assert.doesNotMatch(c, /animation:[^;}]*--ohm-hero/, 'the timeline is not folded into the shorthand');
});
