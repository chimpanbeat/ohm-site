import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');

const OPEN = '@media (hover: hover) and (prefers-reduced-motion: no-preference) {';
function block(): string {
  const start = css.indexOf(OPEN);
  assert.ok(start >= 0, 'hover + no-preference media block');
  let depth = 0;
  for (let i = start + OPEN.length - 1; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start + OPEN.length, i);
  }
  throw new Error('unterminated block');
}
function rule(b: string, sel: string): string {
  const esc = sel.replace(/[.:]/g, '\\$&');
  const m = b.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `rule ${sel}`);
  return m[1];
}

test('ohm-settle keyframes hold only translate: 0, -3px at 60%, -2px', () => {
  const m = css.match(/@keyframes ohm-settle\s*\{([\s\S]*?\})\s*\}/);
  assert.ok(m);
  assert.match(m[1], /0%\s*\{\s*translate:\s*0 0;?\s*\}/);
  assert.match(m[1], /60%\s*\{\s*translate:\s*0 -3px;?\s*\}/);
  assert.match(m[1], /100%\s*\{\s*translate:\s*0 -2px;?\s*\}/);
  assert.doesNotMatch(m[1].replace(/translate:[^;}]*/g, ''), /[a-z-]+\s*:/);
});

test('hover and press rules', () => {
  const b = block();
  const h = rule(b, '.btn:hover');
  assert.match(h, /translate:\s*0 -2px/);
  assert.match(h, /animation:\s*ohm-settle 260ms ease-out/);
  const a = rule(b, '.btn:active');
  assert.match(a, /translate:\s*0 0/);
  assert.match(a, /animation:\s*none/);
});

test('transition sequence: leave 150ms, hover has no translate, press 60ms, all <= 300ms', () => {
  const b = block();
  assert.match(rule(b, '.btn'), /transition:[^;]*translate 150ms/);
  assert.doesNotMatch(rule(b, '.btn:hover').match(/transition:[^;]*/)?.[0] ?? '', /translate/);
  assert.match(rule(b, '.btn:active'), /transition:[^;]*translate 60ms/);
  for (const m of b.matchAll(/(\d+)ms/g)) assert.ok(Number(m[1]) <= 300, `${m[0]} > 300ms`);
});

test('outside the block, .btn rules do not move and the original transition stays', () => {
  const at = css.indexOf(OPEN);
  const outside = css.slice(0, at) + css.slice(at + OPEN.length + block().length + 1);
  for (const m of outside.matchAll(/(?:^|\n)([^{}\n@]*\.btn[^{}\n]*)\{([^}]*)\}/g)) {
    assert.doesNotMatch(m[2], /\b(translate|transform|animation)\s*:/, m[1]);
  }
  assert.ok(
    outside.includes('transition: background-color var(--transition), border-color var(--transition), color var(--transition);'),
  );
});

const skip = existsSync(join(dist, 'index.html')) ? false : 'dist/index.html missing: run npm run build';

test('dist: the built CSS keeps ohm-settle and hover:hover', { skip }, () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
  const c = [...inline, ...linked].join('\n');
  assert.match(c, /ohm-settle/);
  assert.match(c, /hover:\s*hover/);
});
