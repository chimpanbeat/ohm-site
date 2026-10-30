import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');

const SUPPORTS = '@supports (animation-trigger: --t play-once) {';
const MEDIA = '@media screen and (prefers-reduced-motion: no-preference) {';

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
const supports = inner(css, SUPPORTS);
const rise = inner(supports.body, MEDIA).body;
const withoutSupports = css.slice(0, supports.start) + css.slice(supports.end);

function rule(b: string, sel: string): string {
  const esc = sel.replace(/[.:()+]/g, '\\$&');
  const m = b.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `rule ${sel}`);
  return m[1];
}

test('ohm-rise keyframes: a from only, opacity 0 and translate 0 8px', () => {
  const m = css.match(/@keyframes ohm-rise\s*\{([\s\S]*?\})\s*\}/);
  assert.ok(m);
  assert.match(m[1], /^\s*from\s*\{\s*opacity:\s*0;\s*translate:\s*0 8px;?\s*\}\s*$/);
});

test('.rise is set only inside @supports animation-trigger and screen no-preference', () => {
  const r = rule(rise, '.rise');
  assert.match(r, /animation:\s*ohm-rise 400ms ease-out both/);
  assert.match(r, /animation-delay:\s*calc\(var\(--rise-i, 0\) \* 60ms\)/);
  assert.match(r, /timeline-trigger:\s*--ohm-rise view\(\)/);
  assert.match(r, /animation-trigger:\s*--ohm-rise play-once/);
  assert.ok(r.indexOf('animation-trigger') > r.search(/\banimation:/), 'animation-trigger after the shorthand');
  assert.doesNotMatch(rise, /infinite/);
  assert.match(rule(rise, '.rise:nth-of-type(2)'), /--rise-i:\s*1/);
  assert.match(rule(rise, '.rise:nth-of-type(3)'), /--rise-i:\s*2/);
  assert.match(rule(rise, '.rise:nth-of-type(n + 4)'), /--rise-i:\s*3/);
  assert.doesNotMatch(withoutSupports, /\.rise\b/, 'no .rise rule outside the block');
});

test('sequence (no support, then support): only the keyframe from hides an item', () => {
  // Without support the block is gone: no rule gives .rise opacity, translate or animation.
  assert.doesNotMatch(withoutSupports, /\.rise/);
  // With it, the hidden state lives only in the keyframe: no rule sets opacity or translate on .rise.
  for (const m of rise.matchAll(/\.rise[^{]*\{([^}]*)\}/g)) {
    assert.doesNotMatch(m[1], /(^|[\s;])(opacity|translate)\s*:/);
  }
});

const skip = existsSync(join(dist, 'index.html')) ? false : 'dist/index.html missing: run npm run build';

function riseTags(file: string): { tag: string; cls: string }[] {
  const html = readFileSync(join(dist, file), 'utf8');
  const out: { tag: string; cls: string }[] = [];
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const c = m[2].match(/\bclass=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const cls = c ? (c[1] ?? c[2] ?? c[3]) : '';
    if (/(^|\s)rise(\s|$)/.test(cls)) out.push({ tag: m[1].toLowerCase(), cls });
  }
  return out;
}
function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)).map((f) => join(e.name, f)) : e.name.endsWith('.html') ? [e.name] : [],
  );
}

test('dist: nine items, 3 on Home, 2 on Pricing, 4 on Services, none elsewhere', { skip }, () => {
  const want: Record<string, number> = { 'index.html': 3, 'pricing.html': 2, 'services.html': 4 };
  const files = htmlFiles(dist);
  assert.ok(files.includes('index.html'));
  for (const f of files) {
    const key = f.replace(/\\/g, '/');
    const n = riseTags(f).length;
    assert.equal(n, want[key] ?? 0, `${key} rise count`);
  }
  assert.ok(existsSync(join(dist, 'pricing.html')) || existsSync(join(dist, 'pricing', 'index.html')), 'pricing page built');
});

test('dist: never an H1, the hero, the header or the footer; not the Travel info dropdown', { skip }, () => {
  for (const f of htmlFiles(dist)) {
    for (const t of riseTags(f)) {
      assert.notEqual(t.tag, 'h1', f);
      assert.doesNotMatch(t.cls, /\bhero\b|site-header|site-footer/, `${f} ${t.cls}`);
    }
  }
  const pricing = existsSync(join(dist, 'pricing.html')) ? 'pricing.html' : join('pricing', 'index.html');
  assert.equal(riseTags(pricing).filter((t) => t.tag === 'details').length, 0, 'pricing details carry no rise');
});

test('dist: the CSS Home loads keeps animation-trigger after minifying', { skip }, () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
  assert.match([...inline, ...linked].join('\n'), /animation-trigger:\s*--ohm-rise play-once/);
});
