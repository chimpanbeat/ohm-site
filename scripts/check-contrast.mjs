// Contrast guard for the brand tokens (step 5A). Exit 0 ok, 1 a pair fails.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const hex = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
  if (!m) {
    console.error(`check:contrast: --${name} not found as a hex value in tokens.css`);
    process.exit(1);
  }
  return m[1];
};

const lum = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const pairs = [
  ['cream', 'green-900', 4.5],
  ['cream', 'green-700', 4.5],
  ['ink', 'cream', 4.5],
  ['cream', 'terra-700', 4.5],
  ['terra-500', 'green-900', 3.0], // large text only
];

let failed = false;
for (const [fg, bg, min] of pairs) {
  const r = ratio(hex(fg), hex(bg));
  const ok = r >= min;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`);
}
process.exit(failed ? 1 : 0);
