// Checks the reviewer page source (tools/reviewer/page.html) before it is published:
// the inline script must parse, and card ids must be unique.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./reviewer/page.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) { console.error('check:reviewer: no <script> found'); process.exit(1); }
for (const s of scripts) {
  try { new vm.Script(s); } catch (e) { console.error('check:reviewer: script does not parse: ' + e.message); process.exit(1); }
}
const ids = [...html.matchAll(/^\s*\{ id: "([^"]+)"/gm)].map((m) => m[1]);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) { console.error('check:reviewer: duplicate card ids: ' + [...new Set(dup)].join(', ')); process.exit(1); }
console.log(`check:reviewer: ok (${ids.length} cards)`);
