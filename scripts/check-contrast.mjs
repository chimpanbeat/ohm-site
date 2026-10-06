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

/** `fg` at fraction `p` over `bg`, per sRGB channel: what CSS color-mix(in srgb, fg p%, bg) gives. */
const mix = (fg, bg, p) =>
  '#' +
  [1, 3, 5]
    .map((i) => {
      const c = Math.round(parseInt(fg.slice(i, i + 2), 16) * p + parseInt(bg.slice(i, i + 2), 16) * (1 - p));
      return c.toString(16).padStart(2, '0');
    })
    .join('');

// The zone tints (tokens.css --zone-*-tint): each zone colour at 40% over cream.
const tint = {
  'home tint': mix(hex('green-700'), hex('cream'), 0.4),
  'shared tint': mix(hex('green-300'), hex('cream'), 0.4),
  'north tint': mix(hex('terra-500'), hex('cream'), 0.4),
};

const pairs = [
  ['cream', hex('cream'), 'green-900', hex('green-900'), 4.5],
  ['cream', hex('cream'), 'green-700', hex('green-700'), 4.5],
  ['ink', hex('ink'), 'cream', hex('cream'), 4.5],
  ['cream', hex('cream'), 'terra-700', hex('terra-700'), 4.5],
  ['terra-500', hex('terra-500'), 'green-900', hex('green-900'), 3.0], // large text only
  // Zone buttons: ink text on each tint, and each tint against the page (the button's edge).
  ...Object.entries(tint).flatMap(([name, color]) => [
    ['ink', hex('ink'), name, color, 4.5],
    [name, color, 'green-900', hex('green-900'), 3.0],
  ]),
];

let failed = false;
for (const [fgName, fg, bgName, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${fgName} on ${bgName}: ${r.toFixed(2)} (min ${min})`);
}
process.exit(failed ? 1 : 0);
