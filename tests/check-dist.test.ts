import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';
import { analytics } from '../src/data/analytics.ts';

const base = site.deploy.base.replace(/\/+$/, '');
const origin = site.deploy.site.replace(/\/+$/, '');
const script = fileURLToPath(new URL('../scripts/check-dist.mjs', import.meta.url));

// A1: every page except /body-map carries the Umami tag once.
const UMAMI = `<script defer src="${analytics.scriptSrc}" data-website-id="${analytics.websiteId}" data-domains="${analytics.domain}"></script>`;
const HELLO = `<!doctype html><html><head><meta name="robots" content="noindex"><link rel="canonical" href="${origin}${base}/hello"><script type="application/ld+json">{}</script>${UMAMI}</head><body><main><a href="${base}/">Enter</a></main></body></html>`;
const HOME = `<!doctype html><html><head>${UMAMI}</head><body><a href="${base}/book">Book</a></body></html>`;
// B4: the closed page (bodymap.open false): noindex, a self canonical, the closed line, nothing else.
const BODY_MAP = `<!doctype html><html><head><title>Body map</title><meta name="robots" content="noindex"><link rel="canonical" href="${origin}${base}/body-map"><script type="application/ld+json">{}</script></head><body><main><p>This page isn't open yet.</p></main></body></html>`;
// B4: the open page (preview build): the form, the honeypot, the endpoint in a data attribute, exactly one script.
const SCRIPT_PATH = '_astro/body-map.astro_astro_type_script_index_0_lang.abc123.js';
const BODY_MAP_OPEN = `<!doctype html><html><head><title>Body map</title><meta name="robots" content="noindex"><link rel="canonical" href="${origin}${base}/body-map"><script type="application/ld+json">{}</script></head><body><main><form id="bm-form" data-endpoint="https://script.google.com/macros/s/AKfake/exec"><input name="name"><input name="website" tabindex="-1"></form><svg xmlns="http://www.w3.org/2000/svg"></svg><noscript>This page needs JavaScript.</noscript><script type="module" src="${base}/${SCRIPT_PATH}"></script></main></body></html>`;
const BODY_MAP_JS = 'const a="fake";export{a};';
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
  ['hello.html with a script src', (t) => (t['hello.html'] = HELLO.replace('</body>', '<script src="/x.js"></script></body>')), /script src/],
  ['hello.html with two inline scripts', (t) => (t['hello.html'] = HELLO.replace('</body>', '<script>1</script><script>2</script></body>')), /2 inline scripts/],
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

test('check:dist allows one inline script on hello.html', () => {
  const t = good();
  t['hello.html'] = HELLO.replace('</body>', '<script>1</script></body>');
  assert.equal(run(t).status, 0);
});

test('check:dist allows the Umami tag on hello.html but not the bundled click script (A1)', () => {
  assert.equal(run(good()).status, 0);
  const t = good();
  t['hello.html'] = HELLO.replace('</body>', '<script type="module" src="/_astro/Base.astro_astro_type_script_index_0_lang.abc123.js"></script></body>');
  const r = run(t);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /script src/);
});

test('check:dist passes when body-map.html does not exist yet (I-115)', () => {
  assert.equal(run(good()).status, 0);
});

test('check:dist passes a body-map.html with no analytics (I-115)', () => {
  const t = good();
  t['body-map.html'] = BODY_MAP;
  assert.equal(run(t).status, 0);
});

// B4 / ARCHITECTURE §B12 Checks: noindex, a self canonical, out of the sitemap and robots.txt, no inbound links, one script
// while open and none while closed, no zone markup, same-origin src/href, and a JS chunk that names no foreign host.
const openTree = (): Tree => ({ ...good(), 'body-map.html': BODY_MAP_OPEN, [SCRIPT_PATH]: BODY_MAP_JS });

test('check:dist passes the closed body map page and the open (preview) one (B4)', () => {
  const closed = { ...good(), 'body-map.html': BODY_MAP };
  assert.equal(run(closed).status, 0, run(closed).stderr);
  const open = run(openTree());
  assert.equal(open.status, 0, open.stderr);
  const stub = { ...openTree(), 'body-map/index.html': '<!doctype html><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=../body-map"><a href="../body-map">Continue</a>' };
  assert.equal(run(stub).status, 0, 'the refresh stub links to the page it refreshes to, and that is allowed');
});

const bodyMapBad: Array<[string, (t: Tree) => void, RegExp]> = [
  ['no robots noindex', (t) => (t['body-map.html'] = BODY_MAP.replace('<meta name="robots" content="noindex">', '')), /body-map\.html.*noindex/],
  ['no canonical', (t) => (t['body-map.html'] = BODY_MAP.replace(/<link rel="canonical"[^>]*>/, '')), /body-map.html.*canonical/],
  ['a canonical to another page', (t) => (t['body-map.html'] = BODY_MAP.replace('/body-map"', '/hello"')), /body-map\.html.*canonical/],
  ['a mention in the sitemap', (t) => (t['sitemap.xml'] = SITEMAP.replace('</urlset>', `<url><loc>${origin}${base}/body-map</loc></url></urlset>`)), /sitemap.*body-map/],
  ['a robots.txt rule by name', (t) => (t['robots.txt'] = 'User-agent: *\nDisallow: /body-map\n'), /robots.*body-map/],
  ['a link from another page', (t) => (t['index.html'] = HOME.replace('</body>', `<a href="${base}/body-map">Body map</a></body>`)), /index\.html links to \/body-map/],
  ['a script while closed', (t) => (t['body-map.html'] = BODY_MAP.replace('</body>', '<script type="module" src="/x.js"></script></body>')), /closed.*script|script.*closed/i],
  ['an inline script while closed', (t) => (t['body-map.html'] = BODY_MAP.replace('</body>', '<script>1</script></body>')), /closed.*script|script.*closed/i],
  ['the endpoint URL while closed', (t) => (t['body-map.html'] = BODY_MAP.replace('</main>', '<span>https://script.google.com/macros/s/x/exec</span></main>')), /script\.google\.com/],
  ['two scripts while open', (t) => (t['body-map.html'] = BODY_MAP_OPEN.replace('</main>', '<script type="module" src="/y.js"></script></main>')), /exactly one script/],
  ['no script while open', (t) => (t['body-map.html'] = BODY_MAP_OPEN.replace(/<script type="module"[^>]*><\/script>/, '')), /exactly one script/],
  ['an inline script while open', (t) => (t['body-map.html'] = BODY_MAP_OPEN.replace(/<script type="module"[^>]*><\/script>/, '<script type="module">1</script>')), /inline|exactly one script/],
  ['zone markup', (t) => (t['body-map.html'] = BODY_MAP_OPEN.replace('</svg>', '<path data-zone="left-knee" d="M0 0"/></svg>')), /zone/],
  ['an external src', (t) => (t['body-map.html'] = BODY_MAP_OPEN.replace('</main>', '<img src="https://cdn.example.com/a.png"></main>')), /same-origin|cdn\.example\.com/],
  ['an external href', (t) => (t['body-map.html'] = BODY_MAP_OPEN.replace('</main>', '<link href="https://fonts.example.com/f.css">')), /same-origin|fonts\.example\.com/],
  ['a JS chunk that names another host', (t) => (t[SCRIPT_PATH] = 'fetch("https://tracker.example.com/x")'), /tracker\.example\.com/],
];
for (const [name, mutate, re] of bodyMapBad) {
  test(`check:dist fails a body map page with ${name} (B4)`, () => {
    const t = name.includes('while open') || name.includes('zone') || name.includes('external') || name.includes('JS chunk') || name.includes('inline script while open') ? openTree() : { ...good(), 'body-map.html': BODY_MAP };
    mutate(t);
    const r = run(t);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, re);
  });
}

test('check:dist lets an open body map chunk name the site, script.google.com and www.w3.org, and nothing else (B4)', () => {
  const t = openTree();
  t[SCRIPT_PATH] = `const a="${origin}/x",b="https://script.google.com/macros/s/x/exec",c="http://www.w3.org/2000/svg";`;
  assert.equal(run(t).status, 0, run(t).stderr);
});

for (const [name, snippet] of [
  ['the Umami script host', UMAMI],
  ['a data-website-id', '<div data-website-id="x"></div>'],
  ['a data-umami attribute', '<a data-umami-event="book">x</a>'],
  ['the analytics rules meta', '<meta name="analytics-rules" content="{}">'],
  ['Base\'s bundled click script', '<script type="module" src="/_astro/Base.astro_astro_type_script_index_0_lang.abc123.js"></script>'],
]) {
  for (const file of ['body-map.html', 'body-map/index.html']) {
    test(`check:dist fails when ${file} has ${name} (I-115)`, () => {
      const t = good();
      t[file] = BODY_MAP.replace('</head>', `${snippet}</head>`);
      const r = run(t);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stderr, /body-map/);
    });
  }
}

test('check:dist fails when a page lacks the Umami tag, or has the wrong data-domains (A1)', () => {
  const t = good();
  t['index.html'] = '<!doctype html><html><body><a href="/book">Book</a></body></html>';
  let r = run(t);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /index\.html has 0 Umami tags/);
  t['index.html'] = HOME.replace(`data-domains="${analytics.domain}"`, 'data-domains="localhost"');
  r = run(t);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /data-domains/);
});

test('check:dist allows the whole-site Disallow: / used before launch', () => {
  const t = good();
  t['robots.txt'] = 'User-agent: *\nDisallow: /\n';
  assert.equal(run(t).status, 0);
});
