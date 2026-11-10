// Commit gate: a commit that names a step (E16) or item (I-107) is blocked while that
// step's row in docs/build/STATUS.md is still `todo`. Exit 2 = block.
// Partial work: put "wip" or "partial" in the commit message to skip the check.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let cmd = '';
try { cmd = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? ''; } catch { process.exit(0); }
if (/\b(wip|partial)\b/i.test(cmd)) process.exit(0);

const statusPath = join(process.env.CLAUDE_PROJECT_DIR, 'docs/build/STATUS.md');
if (!existsSync(statusPath)) process.exit(0);

const ids = new Set(cmd.match(/\b[A-Z]\d{1,2}\b/g) ?? []);
const items = new Set(cmd.match(/\bI-\d{3}\b/g) ?? []);
const open = [];
for (const line of readFileSync(statusPath, 'utf8').split('\n')) {
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length < 8 || !/^[A-Za-z0-9]+$/.test(cells[1])) continue;
  const [, step, what, , , state] = cells;
  if (state !== 'todo') continue;
  const itemsHit = [...items].some((i) => what.includes(`${i}:`) || what.includes(`${i} `) || what.includes(`${i},`));
  if (ids.has(step) || itemsHit) open.push(step);
}
if (!open.length) process.exit(0);
process.stderr.write(
  `Commit blocked: STATUS.md still shows step ${open.join(', ')} as todo, and this commit names it.\n` +
  'If the step is finished, set its state to done and its commit column in docs/build/STATUS.md (and add the change-log line), then retry.\n' +
  'If more commits are needed first, put "wip" in the message.\n');
process.exit(2);
