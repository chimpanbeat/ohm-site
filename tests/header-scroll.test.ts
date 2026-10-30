import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const src = readFileSync(join(root, 'src/components/Header.astro'), 'utf8');

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
const scroll = inner(supports.body, MEDIA).body;
const outside = src.slice(0, supports.start) + src.slice(supports.end);

function rule(b: string, sel: string): string {
  const esc = sel.replace(/[.:()]/g, '\\$&');
  const m = b.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `rule ${sel}`);
  return m[1];
}
function keyframes(b: string, name: string): string {
  const m = b.match(new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?\\})\\s*\\}`));
  assert.ok(m, `@keyframes ${name}`);
  return m[1];
}

test('hairline: ::after, green-300, 1px, scroll(root block) over 0 to 40px, ends at opacity 1', () => {
  const r = rule(scroll, '.site-header::after');
  assert.match(r, /background:\s*var\(--green-300\)/);
  assert.match(r, /height:\s*1px/);
  assert.match(r, /animation-timeline:\s*scroll\(root block\)/);
  assert.match(r, /animation-range:\s*0(px)? 40px/);
  assert.match(keyframes(scroll, 'ohm-header-line'), /to\s*\{[^}]*opacity:\s*1/);
});

test('logo: scales from the left edge, same timeline and range, ends at scale 0.88', () => {
  const r = rule(scroll, '.site-header__logo');
  assert.match(r, /transform-origin:\s*left center/);
  assert.match(r, /animation-timeline:\s*scroll\(root block\)/);
  assert.match(r, /animation-range:\s*0(px)? 40px/);
  assert.match(keyframes(scroll, 'ohm-header-logo'), /to\s*\{[^}]*scale:\s*0\.88/);
});

test('both rules use animation longhands, never the shorthand (the minifier folds shorthand + timeline)', () => {
  for (const [sel, name] of [['.site-header::after', 'ohm-header-line'], ['.site-header__logo', 'ohm-header-logo']]) {
    const r = rule(scroll, sel);
    assert.doesNotMatch(r, /(^|[\s;])animation\s*:/, `${sel} shorthand`);
    assert.match(r, new RegExp(`animation-name:\\s*${name}`));
    assert.match(r, /animation-timing-function:\s*linear/);
    assert.match(r, /animation-fill-mode:\s*both/);
  }
});

test('the scroll block never touches the Omega, the icon or transform; no box property animates', () => {
  assert.doesNotMatch(scroll, /logo-omega|logo-icon/);
  assert.doesNotMatch(scroll, /(^|[\s;{])transform\s*:/);
  for (const name of ['ohm-header-line', 'ohm-header-logo']) {
    assert.doesNotMatch(keyframes(scroll, name), /\b(height|padding|margin|width|border)/, name);
  }
  assert.match(rule(outside, '.site-header'), /height:\s*var\(--header-h\)/);
});

test('sequence (spin while scrolled): the spin rule is unchanged and composes with the link scale', () => {
  assert.match(
    src,
    /\.site-header__logo\.is-spinning \.logo-omega,\s*\.site-header__logo\.is-spinning \.logo-icon\s*\{\s*animation:\s*ohm-spin 0\.9s ease-in-out 1;\s*\}/,
  );
  assert.match(keyframes(outside, 'ohm-spin'), /transform:\s*rotate\(-360deg\)/);
  assert.doesNotMatch(keyframes(scroll, 'ohm-header-logo'), /transform:/);
});

test('nothing in the scroll block sits outside the @supports and no-preference blocks', () => {
  assert.doesNotMatch(outside, /animation-timeline|ohm-header-line|ohm-header-logo/);
});

const skip = existsSync(join(dist, 'index.html')) ? false : 'dist/index.html missing: run npm run build';

test('dist: Home CSS carries the scroll timeline and the logo keyframes', { skip }, () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
  const c = [...inline, ...linked].join('\n');
  // The minifier folds the timeline into the shorthand and drops the default block axis.
  assert.match(c, /scroll\(root( block)?\)/);
  assert.match(c, /ohm-header-logo/);
  // Chromium rejects a timeline inside the animation shorthand: the built CSS must keep it out.
  assert.doesNotMatch(c, /animation:[^;}]*(scroll\(|--ohm-hero)/);
});
