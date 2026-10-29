// Commit gate: blocks `git commit` unless `npm run check` passes. Exit 2 = block.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR;
const pkgPath = join(root, 'package.json');
const hasCheck = existsSync(pkgPath) && JSON.parse(readFileSync(pkgPath, 'utf8')).scripts?.check;
if (!hasCheck) {
  process.stderr.write('Commit blocked: package.json has no "check" script. Add one (that asks Brian) or escalate to the architect.\n');
  process.exit(2);
}
const r = spawnSync('npm', ['run', 'check'], {
  cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
});
if (r.status === 0) process.exit(0);
const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-30).join('\n');
process.stderr.write(`Commit blocked: npm run check failed.\n${tail}\n`);
process.exit(2);
