// B2 (I-109): scripts/push-apps-script.mjs --dry for both targets, run in a temp folder against a temp IDs file.
// It never touches the real .apps-script-ids.json, the real staging folder, clasp or Google. The IDs are fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const script = join(root, 'scripts/push-apps-script.mjs');
const read = (...p: string[]) => readFileSync(join(...p), 'utf8');
const IDS = {
  scriptId: 'fake-rsvp-script-id',
  deploymentId: 'fake-rsvp-deployment-id',
  bodymap: { scriptId: 'fake-bodymap-script-id', deploymentId: 'fake-bodymap-deployment-id' },
};

function sandbox(ids?: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'ohm-push-'));
  cpSync(join(root, 'apps-script'), join(dir, 'apps-script'), { recursive: true });
  if (ids !== undefined) writeFileSync(join(dir, '.apps-script-ids.json'), JSON.stringify(ids));
  const run = (...args: string[]) => {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8' });
    const build = join(dir, '.apps-script-build');
    return { code: r.status, out: r.stdout + r.stderr, build, files: existsSync(build) ? readdirSync(build).sort() : [] };
  };
  return { dir, run };
}

test('rsvp (the default) stages Code.js from rsvp.js plus its manifest, and nothing of the body map', () => {
  const { run } = sandbox(IDS);
  const r = run('--dry');
  assert.equal(r.code, 0, r.out);
  assert.equal(r.out.trim(), 'Staged .apps-script-build/Code.js and appsscript.json', 'the RSVP dry run prints what it always did');
  assert.deepEqual(r.files, ['.clasp.json', 'Code.js', 'appsscript.json']);
  assert.equal(read(r.build, 'Code.js'), read(root, 'apps-script/rsvp.js'));
  assert.equal(read(r.build, 'appsscript.json'), read(root, 'apps-script/appsscript.json'));
  assert.deepEqual(JSON.parse(read(r.build, '.clasp.json')), { scriptId: IDS.scriptId, rootDir: '.' });
  assert.equal(run('--target', 'rsvp', '--dry', 'a message').code, 0, 'naming the default target is the same');
});

test('bodymap stages Code.js from bodymap.js plus its own manifest, with its own Script ID', () => {
  const { run } = sandbox(IDS);
  const r = run('--target', 'bodymap', '--dry');
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.files, ['.clasp.json', 'Code.js', 'appsscript.json']);
  assert.equal(read(r.build, 'Code.js'), read(root, 'apps-script/bodymap/bodymap.js'));
  assert.equal(read(r.build, 'appsscript.json'), read(root, 'apps-script/bodymap/appsscript.json'));
  assert.deepEqual(JSON.parse(read(r.build, '.clasp.json')), { scriptId: IDS.bodymap.scriptId, rootDir: '.' });
  assert.notEqual(read(r.build, 'Code.js'), read(root, 'apps-script/rsvp.js'));
  assert.notEqual(read(r.build, 'appsscript.json'), read(root, 'apps-script/appsscript.json'));
});

test('in sequence, each stage is fresh: neither holds the other target\'s file or ID', () => {
  const { run } = sandbox(IDS);
  const stages = [['--dry'], ['--target', 'bodymap', '--dry'], ['--dry']].map((args) => {
    const r = run(...args);
    assert.equal(r.code, 0, r.out);
    return { files: r.files, code: read(r.build, 'Code.js'), clasp: read(r.build, '.clasp.json') };
  });
  for (const s of stages) assert.deepEqual(s.files, ['.clasp.json', 'Code.js', 'appsscript.json']);
  assert.equal(stages[0].code, stages[2].code);
  assert.notEqual(stages[0].code, stages[1].code);
  assert.ok(stages[1].clasp.includes(IDS.bodymap.scriptId) && !stages[1].clasp.includes(IDS.scriptId));
  assert.ok(stages[2].clasp.includes(IDS.scriptId) && !stages[2].clasp.includes(IDS.bodymap.scriptId));
});

test('the IDs file: bodymap may wait for its first deployment; placeholders, a missing entry and an unknown target stop the run', () => {
  const first = sandbox({ ...IDS, bodymap: { scriptId: 'fake-bodymap-script-id', deploymentId: '' } }).run('--target', 'bodymap', '--dry');
  assert.equal(first.code, 0, 'before the first web-app deployment there is no Deployment ID yet');

  const none = sandbox({ scriptId: IDS.scriptId, deploymentId: IDS.deploymentId }).run('--target', 'bodymap', '--dry');
  assert.equal(none.code, 1);
  assert.match(none.out, /bodymap/);
  assert.deepEqual(none.files, [], 'nothing is staged');

  const example = JSON.parse(read(root, '.apps-script-ids.example.json'));
  for (const args of [['--dry'], ['--target', 'bodymap', '--dry']]) {
    const r = sandbox(example).run(...args);
    assert.equal(r.code, 1, `the example file's placeholder sentences are refused (${args.join(' ')})`);
    assert.deepEqual(r.files, []);
  }
  assert.ok(example.bodymap && 'scriptId' in example.bodymap && 'deploymentId' in example.bodymap, 'the example file has a bodymap entry');

  const rsvpNeedsBoth = sandbox({ scriptId: IDS.scriptId, deploymentId: '' }).run('--dry');
  assert.equal(rsvpNeedsBoth.code, 1, 'RSVP still needs both IDs');

  const unknown = sandbox(IDS).run('--target', 'other', '--dry');
  assert.equal(unknown.code, 1);
  assert.match(unknown.out, /rsvp.*bodymap|bodymap.*rsvp/);
  assert.equal(sandbox(IDS).run('--dry', '--target').code, 1, '--target needs a name');
  assert.equal(sandbox().run('--dry').code, 1, 'no IDs file');
});
