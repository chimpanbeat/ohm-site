// MF (I-117, I-118): the commit gate and the reviewer read-only guard, run as the harness runs them:
// the tool call as JSON on stdin, CLAUDE_PROJECT_DIR pointing at a throwaway project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = (name: string) => fileURLToPath(new URL(`../.claude/hooks/${name}.mjs`, import.meta.url));

function project(check: 'red' | 'green', e16: 'todo' | 'done') {
  const dir = mkdtempSync(join(tmpdir(), 'ohm-hooks-'));
  const exit = check === 'red' ? 1 : 0;
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { check: `node -e "process.exit(${exit})"` } }));
  mkdirSync(join(dir, 'docs', 'build'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'build', 'STATUS.md'),
    '| Step | Scope | Effort | Command | State | Commit |\n|---|---|---|---|---|---|\n' +
    `| E16 | the E16 step | medium | /next | ${e16} | |\n`);
  return dir;
}

function run(name: string, dir: string, stdin: string) {
  const r = spawnSync(process.execPath, [hook(name)], {
    input: stdin, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  return { code: r.status, err: r.stderr };
}
const call = (command: string) => JSON.stringify({ tool_input: { command } });

const red = project('red', 'todo');
const green = project('green', 'todo');
const redDone = project('red', 'done');

const heredocAppend =
  "cat >> tests/x.test.ts <<'EOF'\n// run npm run check, then git commit -m \"E16: x\" when green\nEOF";
const notCommits = [
  heredocAppend,
  "cat >> notes.md <<EOF\ngit commit -m 'E16: x'\nEOF\necho done",
  `node -e "console.log('git commit E16')"`,
  'echo $VAR',
  'echo "git commit -m E16"',
  'grep "git commit" CLAUDE.md',
  'npm test',
  'npm run check',
  'git status',
  'git log --oneline',
  'git log --grep="git commit"',
  'git commit-tree abc',
  'bash -c "echo hi"',
  'eval "ls"',
];
const commits = [
  'git commit -m x',
  'git add -A && git commit -m x',
  'git status; git commit -m x',
  'git -c user.name=a commit -m x',
  'git -C . commit -m x',
  'GIT_AUTHOR_NAME=a git commit -m x',
  "git commit -m \"$(cat <<'EOF'\nStep MF: x\nEOF\n)\"",
  "cat > m.txt <<'EOF'\nhello\nEOF\ngit commit -F m.txt",
  "git commit -m \"$(cat <<'EOF'\nStep \"MF\": it's x\nEOF\n)\"",
];
const wrapped = [
  'bash -c "git commit -m x"',
  "sh -c 'git add -A && git commit -m x'",
  'eval "git commit -m x"',
  'bash -c "echo git commit"',
  'echo "$(git commit -m x)"',
  'git commit -m "unterminated',
];

test('check-before-commit lets every call without a real commit through, even with check red', () => {
  for (const c of notCommits) {
    const r = run('check-before-commit', red, call(c));
    assert.equal(r.code, 0, `should not block: ${c}\n${r.err}`);
  }
});

test('check-before-commit blocks real commits while check is red, and names the failure', () => {
  for (const c of commits) {
    const r = run('check-before-commit', red, call(c));
    assert.equal(r.code, 2, `should block: ${c}`);
    assert.match(r.err, /npm run check failed/);
  }
});

test('check-before-commit lets real commits through when check is green', () => {
  for (const c of commits) assert.equal(run('check-before-commit', green, call(c)).code, 0, c);
});

test('a commit inside bash -c, sh -c or eval quotes still counts (fail closed)', () => {
  for (const c of wrapped) {
    const r = run('check-before-commit', red, call(c));
    assert.equal(r.code, 2, `should block: ${c}`);
    assert.match(r.err, /npm run check failed/);
    assert.equal(run('check-before-commit', green, call(c)).code, 0, c);
  }
});

test('check-before-commit with unparseable stdin still runs the check', () => {
  assert.equal(run('check-before-commit', red, 'not json').code, 2);
  assert.equal(run('check-before-commit', green, 'not json').code, 0);
});

test('status-closeout ignores calls without a real commit, even when they mention E16', () => {
  for (const c of notCommits) assert.equal(run('status-closeout', red, call(c)).code, 0, c);
});

test('status-closeout still blocks a commit that names a step still at todo', () => {
  for (const c of [
    'git commit -m "E16: x"',
    'git add -A && git commit -m "Step E16: x"',
    "git commit -m \"$(cat <<'EOF'\nStep E16: x\nEOF\n)\"",
  ]) {
    const r = run('status-closeout', red, call(c));
    assert.equal(r.code, 2, `should block: ${c}`);
    assert.match(r.err, /step E16 as todo/);
  }
  for (const c of ['bash -c "git commit -m E16"', "sh -c 'git add -A && git commit -m E16'", 'eval "git commit -m E16"']) {
    assert.equal(run('status-closeout', red, call(c)).code, 2, c);
  }
});

test('status-closeout lets through wip, a done row, and a commit that names no step', () => {
  assert.equal(run('status-closeout', red, call('git commit -m "E16: wip x"')).code, 0);
  assert.equal(run('status-closeout', red, call('git commit -m "partial E16"')).code, 0);
  assert.equal(run('status-closeout', redDone, call('git commit -m "E16: x"')).code, 0);
  assert.equal(run('status-closeout', red, call('git commit -m "tidy the footer"')).code, 0);
});

test('status-closeout with unparseable stdin lets the call through', () => {
  assert.equal(run('status-closeout', red, 'not json').code, 0);
});

test('reviewer-readonly allows plain read-only commands and blocks cd, git -C and | inside a pattern (I-118)', () => {
  const dir = red;
  for (const c of ['cd src && ls', 'git -C . status', "grep 'a\\|b' f", "grep -E 'a|b' f", 'echo hi > f', 'npm install']) {
    assert.equal(run('reviewer-readonly', dir, call(c)).code, 2, `should block: ${c}`);
  }
  for (const c of ['grep -E ab f', 'grep -e a -e b f', 'git status', 'git diff abc..HEAD', 'npm run check', 'grep -n x f | head']) {
    assert.equal(run('reviewer-readonly', dir, call(c)).code, 0, `should pass: ${c}`);
  }
});
