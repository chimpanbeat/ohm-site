import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';
import { wording } from '../src/data/wording.ts';

const script = fileURLToPath(new URL('../scripts/check-wording.mjs', import.meta.url));

const name = wording.credential[1];
const block = `<div class="credentials"><p>${name}</p><p>${wording.licensedIn[1]} <a href="${site.licenseVerifyUrl}">${wording.verifyLicense[1]}</a>.</p></div>`;
const page = (blocks: number, extra = '') => `<!doctype html><html><body><main>${extra}</main>${block.repeat(blocks)}</body></html>`;

type Tree = Record<string, string>;
const good = (): Tree => ({
  'index.html': page(1, '<p>Massage therapy with a licensed LMT.</p>'),
  '404.html': page(1),
  'about.html': page(2),
  'book.html': page(2),
  'book/out.html': page(1),
  'hello.html': page(0),
});

function run(tree: Tree, licensed: boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'check-wording-'));
  try {
    for (const [file, body] of Object.entries(tree)) {
      const p = join(dir, file);
      mkdirSync(join(p, '..'), { recursive: true });
      writeFileSync(p, body);
    }
    return spawnSync(process.execPath, [script, '--dist', dir, '--licensed', String(licensed)], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a good licensed tree passes despite "LMT" and "massage therapy"', () => {
  const r = run(good(), true);
  assert.equal(r.status, 0, r.stderr);
});

test('licensed-only words fail unlicensed and pass licensed with the blocks', () => {
  assert.equal(run({ 'index.html': '<p>LMT</p>' }, false).status, 1);
  assert.equal(run(good(), true).status, 0);
});

test('licensed: book/out.html without the credential fails and is named', () => {
  const t = good();
  t['book/out.html'] = page(0);
  const r = run(t, true);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /book\/out\.html/);
});

test('licensed: a page without the verify href fails', () => {
  const t = good();
  t['index.html'] = page(1).replace(`href="${site.licenseVerifyUrl}"`, 'href="/x"');
  assert.equal(run(t, true).status, 1);
});

test('licensed: about with the credential once, or book missing, fails', () => {
  const a = good();
  a['about.html'] = page(1);
  assert.equal(run(a, true).status, 1);
  const b = good();
  delete b['book.html'];
  assert.equal(run(b, true).status, 1);
});

test('licensed: hello pages need no credential', () => {
  const t = good();
  t['hello/index.html'] = page(0);
  assert.equal(run(t, true).status, 0);
});

test('either state: JSON-LD hasCredential or identifier fails', () => {
  for (const key of ['hasCredential', 'identifier']) {
    const t = good();
    t['index.html'] = page(1, `<script type="application/ld+json">{"${key}":{}}</script>`);
    assert.equal(run(t, true).status, 1, key);
    assert.equal(run({ 'index.html': `<script type="application/ld+json">{"${key}":{}}</script>` }, false).status, 1, key);
  }
});

test('either state: a visible license number fails; the verify link text alone passes', () => {
  for (const text of ['License #', 'license number']) {
    const t = good();
    t['index.html'] = page(1, `<p>${text} 12345</p>`);
    assert.equal(run(t, true).status, 1, text);
    assert.equal(run({ 'index.html': `<p>${text} 12345</p>` }, false).status, 1, text);
  }
  assert.equal(run({ 'index.html': '<p>Verify my license.</p>' }, false).status, 0);
});

test('unlicensed: "heal" only warns', () => {
  const r = run({ 'index.html': '<p>heal</p>' }, false);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /WARN/);
});

test('a missing --dist exits 2', () => {
  const r = spawnSync(process.execPath, [script, '--dist', join(tmpdir(), 'no-such-wording-dir')], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});
