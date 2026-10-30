import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const built = existsSync(join(dist, '404.html'));
const skip = built ? false : 'dist/404.html missing: run npm run build';
const omega = JSON.parse(readFileSync(join(root, 'src/data/omega.json'), 'utf8'));
const src = readFileSync(join(root, 'src/pages/404.astro'), 'utf8');

// The page's CSS: inline <style> blocks plus any linked stylesheet.
function css(): string {
  const html = readFileSync(join(dist, '404.html'), 'utf8');
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
  return [...inline, ...linked].join('\n');
}

test('404 source: the traced Ω above an unchanged H1 and paragraph', () => {
  assert.match(src, /import omega from '\.\.\/data\/omega\.json'/);
  assert.match(src, /class="nf-mark"/);
  assert.match(src, /aria-hidden="true"/);
  assert.equal((src.match(/d=\{omega\.d\}/g) || []).length, 2);
  assert.match(src, /class="nf-mark__line"[^>]*pathLength="1"|pathLength="1"[^>]*class="nf-mark__line"/);
  assert.doesNotMatch(src, /<script/);
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(src, /omega-/);
  assert.match(src, /<h1>Page not found<\/h1>/);
  assert.ok(src.includes("That page doesn't exist, or it has moved."));
});

test('404 dist: noindex, the svg before the H1, both paths equal omega.d', { skip }, () => {
  const html = readFileSync(join(dist, '404.html'), 'utf8');
  assert.match(html, /<meta[^>]+name="robots"[^>]+noindex|<meta[^>]+noindex[^>]+name="robots"/);
  const svg = html.indexOf('<svg class="nf-mark"');
  assert.ok(svg >= 0, 'svg.nf-mark present');
  assert.ok(svg < html.indexOf('<h1'), 'svg before the h1');
  const ds = [...html.slice(svg, html.indexOf('</svg>', svg)).matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ds.length, 2);
  for (const d of ds) assert.equal(d, omega.d);
});

test('404 CSS: trace and fill keyframes, timings, finite', { skip }, () => {
  const c = css();
  assert.match(c, /@keyframes ohm-trace\{[^@]*?stroke-dashoffset/);
  assert.match(c, /@keyframes ohm-trace-fill\{[^@]*?opacity/);
  assert.match(c, /\.nf-mark__line(?:\[[^\]]+\])?\{[^}]*animation:[^;}]*(?:\.7s|700ms)[^;}]*(?:\.2s|200ms)[^;}]*ohm-trace\b/);
  assert.match(c, /\.nf-mark__fill(?:\[[^\]]+\])?\{[^}]*animation:[^;}]*(?:\.3s|300ms)[^;}]*(?:\.9s|900ms)[^;}]*ohm-trace-fill/);
  for (const m of c.matchAll(/\.nf-mark[^{]*\{[^}]*\}/g)) assert.doesNotMatch(m[0], /infinite/);
  assert.match(c, /prefers-reduced-motion:\s*no-preference/);
});

test('404 CSS: resting state equals the finished state', { skip }, () => {
  const c = css();
  assert.match(c, /\.nf-mark__line(?:\[[^\]]+\])?\{[^}]*stroke-dashoffset:0/);
  assert.match(c, /@keyframes ohm-trace\{[^@]*?(?:0%|from)\{[^}]*stroke-dashoffset:1/);
  assert.match(c, /@keyframes ohm-trace-fill\{[^@]*?(?:0%|from)\{[^}]*opacity:0/);
  const fill = c.match(/\.nf-mark__fill(?:\[[^\]]+\])?\{[^}]*\}/);
  assert.ok(fill);
  assert.doesNotMatch(fill[0], /opacity:0/);
  // the animation is only set inside the no-preference wrapper
  const outside = c.replace(/@media \(prefers-reduced-motion:\s*no-preference\)\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  assert.doesNotMatch(outside, /\.nf-mark[^{]*\{[^}]*animation:/);
});
