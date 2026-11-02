import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const built = existsSync(join(dist, 'hello.html'));
const skip = built ? false : 'dist/hello.html missing: run npm run build';

// The page's CSS: inline <style> blocks plus any linked stylesheet.
function css(): string {
  const html = readFileSync(join(dist, 'hello.html'), 'utf8');
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map((m) => {
    const p = join(dist, m[1].replace(/^\/[^/]+\//, ''));
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
  return [...inline, ...linked].join('\n');
}

// Astro minifies and scopes the rules: .hello-line[data-astro-cid-x]{...animation:<reveal>,<breathe>...}
const LINE = String.raw`\.hello-line(?:\[[^\]]+\])?`;

test('hello: the line breathes (scale keyframe, 6s, after the reveal)', { skip }, () => {
  const c = css();
  assert.match(c, /@keyframes ohm-breathe\{[^@]*?scale\(1\.08\)/);
  assert.match(c, new RegExp(`${LINE}\\{[^}]*animation:[^;}]*ohm-breathe 6s ease-in-out var\\(--breathe-delay\\) infinite`));
});

test('hello: reduced motion turns the breathing off', { skip }, () => {
  const c = css();
  const rm = c.match(new RegExp(String.raw`@media \(prefers-reduced-motion:\s*reduce\)\{[^@]*?${LINE}\{[^}]*\}`));
  assert.ok(rm, 'reduced-motion rule for .hello-line');
  assert.match(rm[0], /animation:none/);
});

// The Ω and the Enter cue breathe as one: the wrapper carries the animation.
const OMEGA = String.raw`\.hello-mark(?:\[[^\]]+\])?`;

test('hello: the Ω breathes in step with the line (same keyframes, 6s, same delay variable)', { skip }, () => {
  const c = css();
  assert.match(c, new RegExp(`${OMEGA}\\{[^}]*animation:[^;}]*ohm-breathe 6s ease-in-out var\\(--breathe-delay\\) infinite`));
});

test('hello: the breath delay is one variable, and the Ω lights up on each inhale', { skip }, () => {
  const c = css();
  assert.match(c, /--breathe-delay:1\.5s/);
  assert.match(c, new RegExp(String.raw`\.omega-pulse(?:\[[^\]]+\])?\{[^}]*animation:[^;}]*6s ease-in-out var\(--breathe-delay\) infinite`));
});

test('hello: the Enter cue is there and hidden from assistive tech', { skip }, () => {
  const html = readFileSync(join(dist, 'hello.html'), 'utf8');
  assert.match(html, /<span[^>]*class="hello-cue[^"]*"[^>]*aria-hidden="true"[^>]*>\(Enter\)<\/span>/);
  assert.match(html, /<div[^>]*class="hello-mark[^"]*"[^>]*>[\s\S]*?<svg[\s\S]*?<\/svg>\s*<span[^>]*class="hello-cue/, 'the cue sits inside the breathing wrapper');
});

test('hello: reduced motion turns the Ω breathing off too', { skip }, () => {
  const c = css();
  const rm = c.match(new RegExp(String.raw`@media \(prefers-reduced-motion:\s*reduce\)\{[^@]*?${OMEGA}\{[^}]*\}`));
  assert.ok(rm, 'reduced-motion rule for .hello-omega');
  assert.match(rm[0], /animation:none/);
});
