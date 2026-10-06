import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';

const base = site.deploy.base.replace(/\/+$/, '');
const origin = site.deploy.site.replace(/\/+$/, '');
const script = fileURLToPath(new URL('../scripts/check-dist.mjs', import.meta.url));

const HELLO = `<!doctype html><html><head><meta name="robots" content="noindex"><link rel="canonical" href="${origin}${base}/hello"><script type="application/ld+json">{}</script></head><body><main><a href="${base}/">Enter</a></main></body></html>`;
const HOME = `<!doctype html><html><body><a href="${base}/book">Book</a></body></html>`;
const SITEMAP = `<urlset><url><loc>${origin}${base}/</loc></url></urlset>`;
const ROBOTS = 'User-agent: *\nAllow: /\n';

type Tree = Record<string, string>;
const good = (): Tree => ({
  'hello.html': HELLO,
  'hello/index.html': '<!doctype html><meta http-equiv="refresh" content="0; url=../hello"><a href="../hello">Continue</a>',
  'index.html': HOME,
  'sitemap.xml': SITEMAP,
  'robots.txt': ROBOTS,
});

function run(tree: Tree) {
  const dir = mkdtempSync(join(tmpdir(), 'check-dist-'));
  try {
    for (const [name, body] of Object.entries(tree)) {
      const p = join(dir, name);
      mkdirSync(join(p, '..'), { recursive: true });
      writeFileSync(p, body);
    }
    return spawnSync(process.execPath, [script, '--dist', dir], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('check:dist passes a good tree', () => {
  const r = run(good());
  assert.equal(r.status, 0, r.stderr);
});

test('check:dist exits 2 when dist is missing', () => {
  const r = spawnSync(process.execPath, [script, '--dist', join(tmpdir(), 'no-such-dist-dir')], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});

const bad: Array<[string, (t: Tree) => void, RegExp]> = [
  ['hello.html without the robots meta', (t) => (t['hello.html'] = HELLO.replace('<meta name="robots" content="noindex">', '')), /noindex/],
  ['hello.html canonical to another page', (t) => (t['hello.html'] = HELLO.replace('/hello"', '/services"')), /canonical/],
  ['hello.html with a script', (t) => (t['hello.html'] = HELLO.replace('</body>', '<script>1</script></body>')), /script/],
  ['sitemap.xml listing /hello', (t) => (t['sitemap.xml'] = SITEMAP.replace('</urlset>', `<url><loc>${origin}${base}/hello</loc></url></urlset>`)), /sitemap/],
  ['another page linking to /hello', (t) => (t['index.html'] = HOME.replace('</body>', `<a href="${base}/hello">Hi</a></body>`)), /links to \/hello/],
  ['an indexable robots.txt that disallows /hello', (t) => (t['robots.txt'] = 'User-agent: *\nAllow: /\nDisallow: /hello\n'), /robots\.txt/],
  ['a splash on Home', (t) => (t['index.html'] = HOME.replace('<a', '<div class="hello"></div><a')), /splash|class="hello"/],
];
for (const [name, mutate, message] of bad) {
  test(`check:dist fails for ${name}`, () => {
    const t = good();
    mutate(t);
    const r = run(t);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, message);
  });
}

test('check:dist allows the whole-site Disallow: / used before launch', () => {
  const t = good();
  t['robots.txt'] = 'User-agent: *\nDisallow: /\n';
  assert.equal(run(t).status, 0);
});
