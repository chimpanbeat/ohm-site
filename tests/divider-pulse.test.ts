import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Step V: the H1 resistor divider carries a light that travels along the zigzag (CSS only).
const css = readFileSync(join(fileURLToPath(new URL('..', import.meta.url)), 'src/styles/global.css'), 'utf8');

test('divider pulse: plays once on load, again on hover and press, with its own keyframes each', () => {
  assert.match(css, /h1::after\s*\{[^}]*animation:[^;}]*ohm-pulse\b/);
  assert.match(css, /h1:hover::after[^{]*\{[^}]*animation:[^;}]*ohm-pulse-hover/);
  assert.match(css, /h1:active::after/);
  assert.match(css, /@keyframes ohm-pulse\s*\{/);
  assert.match(css, /@keyframes ohm-pulse-hover\s*\{/);
});

test('divider pulse: the light is a token gradient, no raw hex', () => {
  const block = css.slice(css.indexOf('h1::after'), css.indexOf('h1 + *'));
  assert.match(block, /linear-gradient\(.*var\(--text-on-dark\)/);
  assert.doesNotMatch(block.replace(/data:image[^"]*"/g, ''), /#[0-9a-fA-F]{3,8}\b/);
});

test('divider pulse: off under reduced motion', () => {
  const rm = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?h1::after[^}]*\}/);
  assert.ok(rm, 'reduced-motion rule for h1::after');
  assert.match(rm[0], /animation:\s*none/);
});

test('divider pulse: only the symbol answers the pointer, not the H1 row', () => {
  assert.match(css, /\nh1\s*\{\s*pointer-events:\s*none;/);
  assert.match(css, /h1::after\s*\{[^}]*pointer-events:\s*auto/);
});
