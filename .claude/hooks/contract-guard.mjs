// Contract guard: protected paths may be edited only by the architect subagent,
// or by anyone when the current step's file lists the path under "## Files". Exit 2 = block.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, matchesGlob, relative } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const root = process.env.CLAUDE_PROJECT_DIR;
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);
const rel = relative(root, target).replaceAll('\\', '/');

// fail closed: without the protected list, only the architect may edit
const listFile = join(root, '.claude/hooks/protected.json');
if (!existsSync(listFile)) {
  if (input.agent_type === 'architect') process.exit(0);
  process.stderr.write('contract-guard: .claude/hooks/protected.json is missing. Escalate to the architect subagent.\n');
  process.exit(2);
}
const globs = JSON.parse(readFileSync(listFile, 'utf8')).protected ?? [];
if (!globs.some((g) => matchesGlob(rel, g))) process.exit(0);
if (input.agent_type === 'architect') process.exit(0);

function currentStepFiles() {
  const statusFile = join(root, 'docs/build/STATUS.md');
  if (!existsSync(statusFile)) return { step: null, files: [] };
  // current step = the step-table row with a cell reading "doing"
  const step = readFileSync(statusFile, 'utf8').match(/^\|\s*([\w.-]+)\s*\|.*\|\s*doing\s*\|/m)?.[1] ?? null;
  const dir = join(root, 'docs/build/steps');
  if (!step || !existsSync(dir)) return { step, files: [] };
  const file = readdirSync(dir).find((f) => f.startsWith(`${step}-`));
  if (!file) return { step, files: [] };
  const section = (readFileSync(join(dir, file), 'utf8').split(/^## Files\s*$/m)[1] ?? '').split(/^## /m)[0];
  const files = section.split('\n')
    .map((l) => l.replace(/^\s*[-*]\s*/, '').replaceAll('`', '').trim())
    .filter(Boolean);
  return { step, files };
}

const { step, files } = currentStepFiles();
if (files.includes(rel)) process.exit(0);
process.stderr.write(`contract-guard: ${rel} is protected and step ${step ?? '(none)'} doesn't list it under Files. Escalate to the architect subagent.\n`);
process.exit(2);
