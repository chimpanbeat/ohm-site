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
  assert.match(c, /@keyframes ohm-breathe\{[^@]*?scale\(1\.05\)/);
  assert.match(c, new RegExp(`${LINE}\\{[^}]*animation:[^;}]*6s ease-in-out 4\\.4s infinite ohm-breathe`));
});

test('hello: reduced motion turns the breathing off', { skip }, () => {
  const c = css();
  const rm = c.match(new RegExp(String.raw`@media \(prefers-reduced-motion:\s*reduce\)\{[^@]*?${LINE}\{[^}]*\}`));
  assert.ok(rm, 'reduced-motion rule for .hello-line');
  assert.match(rm[0], /animation:none/);
});
