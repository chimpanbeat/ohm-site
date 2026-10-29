import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';
import { wording } from '../src/data/wording.ts';
import { clientPolicies } from '../src/data/client-policies.ts';

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

// A tree that passes on its own in both states: no credential, no licensed-only words.
const cleanTree = (body: string, file = 'services.html'): Tree => ({ [file]: `<!doctype html><html><body><main>${body}</main></body></html>` });
// The licensed good tree with the same body on one page.
const licensedTree = (body: string, file = 'services.html'): Tree => ({ ...good(), [file]: page(1, body) });
const both = (body: string, file = 'services.html') => [
  { licensed: false, tree: cleanTree(body, file) },
  { licensed: true, tree: licensedTree(body, file) },
];

test('either state: "home office", "home visits", "home-office" and "Home mobile" fail and name the file (I-040)', () => {
  assert.equal(run(cleanTree('<p>Sessions are at my office.</p>'), false).status, 0);
  for (const phrase of ['my home office', 'Home visits', 'home-office', 'Home mobile']) {
    for (const { licensed, tree } of both(`<p>Sessions are at ${phrase} or at your place.</p>`)) {
      const r = run(tree, licensed);
      assert.equal(r.status, 1, `${phrase} ${licensed}`);
      assert.match(r.stderr, /services\.html/);
      assert.match(r.stderr, /I-040/);
    }
  }
});

test('either state: the banned phrase in alt or meta fails; inside script or style it passes', () => {
  for (const [body, status] of [
    ['<img alt="a home office" src="x.png">', 1],
    ['<meta name="description" content="Home visits in town">', 1],
    ['<script>var a = "home office";</script><style>/* home visit */</style>', 0],
  ] as const) {
    for (const { licensed, tree } of both(body)) assert.equal(run(tree, licensed).status, status, `${body} ${licensed}`);
  }
});

test('either state: the client policies text passes (warning on "health"), and "my home office" in it fails', () => {
  const flat = (x: unknown): string =>
    typeof x === 'string' ? x : Array.isArray(x) ? x.map(flat).join(' ') : x && typeof x === 'object' && 'href' in x ? String(x.text) : x && typeof x === 'object' ? Object.values(x).map(flat).join(' ') : '';
  const body = `<p>${flat(clientPolicies).replaceAll('&', '&amp;')}</p>`;
  for (const { licensed, tree } of both(body, 'client-policies.html')) {
    const r = run(tree, licensed);
    assert.equal(r.status, 0, `${licensed}: ${r.stderr}`);
    assert.match(r.stderr + r.stdout, /medical-claim word "health"/);
  }
  for (const { licensed, tree } of both(`${body}<p>my home office</p>`, 'client-policies.html')) assert.equal(run(tree, licensed).status, 1, String(licensed));
});

test('either state: "home page", the logo label, "mobile visit" and "office session" pass', () => {
  const body =
    '<a aria-label="Ohm Precision Bodywork, home">Ohm Precision Bodywork</a><nav aria-label="Main">x</nav><img alt="Office desk" src="x.png">' +
    '<p>Go back to the home page. A mobile visit or an office session.</p>';
  for (const { licensed, tree } of both(body, '404.html')) assert.equal(run(tree, licensed).status, 0, String(licensed));
});

test('either state: a tree with "my home office" fails, then passes once rewritten to "my office"', () => {
  for (const licensed of [true, false]) {
    const at = (phrase: string) => both(`<p>Sessions are at ${phrase}.</p>`).find((b) => b.licensed === licensed)!.tree;
    assert.equal(run(at('my home office'), licensed).status, 1);
    assert.equal(run(at('my office'), licensed).status, 0);
  }
});
