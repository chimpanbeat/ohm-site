// Reviewer read-only guard (registered in the reviewer's frontmatter). Exit 2 = block.
import { readFileSync } from 'node:fs';

const { tool_input } = JSON.parse(readFileSync(0, 'utf8'));
const cmd = (tool_input?.command ?? '').replaceAll(' 2>&1', '');
const allowed = [
  /^npm run check\b/, /^npm test\b/, /^node --test\b/,
  /^git (diff|log|show|status|rev-parse)\b/,
  /^(ls|cat|head|tail|wc|grep|rg)\b/,
];
const banned = /[>]|\btee\b|\bsed\s+-i\b|-delete\b|-exec\b/;
const parts = cmd.split(/&&|\|\||;|\|/).map((s) => s.trim()).filter(Boolean);
if (cmd && !banned.test(cmd) && parts.every((p) => allowed.some((a) => a.test(p)))) process.exit(0);
process.stderr.write('Reviewer is read-only: put this in the fix list instead.\n');
process.exit(2);
