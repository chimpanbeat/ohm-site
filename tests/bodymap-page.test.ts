// B4 (I-073, BM-13): the /body-map page. Closed while bodymap.open is false (dist/), real behind OHM_BODYMAP_PREVIEW=1
// (a second build into a temp folder, so dist/ is never touched). ARCHITECTURE §B12 Page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bodymap } from '../src/data/bodymap.ts';
import { site } from '../src/data/site.ts';
import { RESERVED_SLUGS } from '../src/lib/events.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const text = bodymap.text;

const scripts = (html: string) => [...html.matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/application\/ld\+json/i.test(m[1]));
const decode = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const plain = (html: string) => decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

let previewDir = '';
let preview = '';
before(() => {
  previewDir = mkdtempSync(join(tmpdir(), 'ohm-bodymap-preview-'));
  const r = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', previewDir], {
    cwd: root,
    env: { ...process.env, OHM_BODYMAP_PREVIEW: '1' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  preview = readFileSync(join(previewDir, 'body-map.html'), 'utf8');
});
after(() => previewDir && rmSync(previewDir, { recursive: true, force: true }));

test('the page, its refresh stub and the reserved slug exist', () => {
  assert.ok(RESERVED_SLUGS.includes('body-map'));
  const stub = readFileSync(join(root, 'public/body-map/index.html'), 'utf8');
  assert.match(stub, /http-equiv="refresh"[^>]*url=\.\.\/body-map/);
  assert.match(stub, /name="robots" content="noindex"/);
  assert.ok(existsSync(join(root, 'src/pages/body-map.astro')));
});

test('bodymap.open is false until B10', () => {
  assert.equal(bodymap.open, false);
});

const closedSkip = existsSync(join(dist, 'body-map.html')) ? false : 'dist/body-map.html missing: run npm run build';
test('closed (dist): the closed line only: no script, no form, no endpoint URL, noindex, not bare of a title', { skip: closedSkip }, () => {
  const html = readFileSync(join(dist, 'body-map.html'), 'utf8');
  if (/<form\b/i.test(html)) return assert.fail('dist/ is a preview build; run npm run build and then npm run check');
  assert.deepEqual(scripts(html).map((m) => m[0]), [], 'no script (the JSON-LD data block is not one)');
  assert.doesNotMatch(html, /<form\b|<input\b|<button\b|<textarea\b/i);
  assert.doesNotMatch(html, /script\.google\.com/);
  assert.ok(!html.includes(site.bodymapUrl), 'the endpoint URL is not in the closed page');
  assert.match(html, /<meta name="robots" content="noindex"/);
  assert.match(plain(html), new RegExp(text.closed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(plain(html), new RegExp(text.send));
  assert.doesNotMatch(html, /cloud\.umami\.is|data-website-id/);
});

test('closed: the page is in no sitemap and no robots rule, and nothing in dist/ links to it', { skip: closedSkip }, () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  for (const f of walk(dist)) {
    const rel = relative(dist, f).replaceAll('\\', '/');
    if (/^body-map(\/index)?\.html$/.test(rel)) continue;
    if (rel === 'sitemap.xml' || rel === 'robots.txt') assert.doesNotMatch(readFileSync(f, 'utf8'), /body-map/, rel);
    if (rel.endsWith('.html')) assert.doesNotMatch(readFileSync(f, 'utf8'), /href="[^"]*\/body-map(\.html)?["#?]/, `${rel} links to /body-map`);
  }
});

test('preview: exactly one script, the form fields, the honeypot and the endpoint as a data attribute', () => {
  const found = scripts(preview);
  assert.equal(found.length, 1, found.map((m) => m[0]).join('\n'));
  assert.match(found[0][1], /\bsrc="[^"]*body-map[^"]*\.js"/);
  assert.match(found[0][1], /type="module"/);
  const form = preview.match(/<form\b[^>]*>/i)?.[0] ?? '';
  assert.ok(form, 'a form');
  assert.ok(form.includes(`data-endpoint="${site.bodymapUrl}"`), 'the endpoint rides on the form, not in the script');
  assert.doesNotMatch(form, /\baction=/, 'no action: the page never posts without its script');
  assert.match(preview, /<input\b[^>]*\bname="name"/);
  assert.match(preview, /<input\b[^>]*\btype="date"/);
  const honeypot = preview.match(/<input\b[^>]*\bname="website"[^>]*>/)?.[0] ?? '';
  assert.ok(honeypot, 'the honeypot field');
  assert.match(honeypot, /tabindex="-1"/);
  assert.match(honeypot, /autocomplete="off"/);
  assert.match(preview, /class="[^"]*\bbm-trap\b[^"]*"[^>]*aria-hidden="true"/, 'its wrapper is hidden from people and screen readers');
  assert.match(preview, /<noscript>[\s\S]*?<\/noscript>/);
  assert.match(plain(preview.match(/<noscript>([\s\S]*?)<\/noscript>/)![1]), new RegExp(text.noscript.slice(0, 30)));
});

test('preview: every visible string comes from bodymap.text, and no analytics, footer or header', () => {
  const t = plain(preview);
  for (const s of [text.h1, text.intro, text.name, text.apptDate, text.tapHint, text.zoomHint, text.send, text.privacy, text.savedNote, text.sharedNote, text.startOver, text.zoomReset, text.marksEmpty]) {
    assert.ok(t.includes(s), `missing: ${s}`);
  }
  assert.doesNotMatch(preview, /cloud\.umami\.is|data-website-id|analytics-rules/);
  assert.doesNotMatch(preview, /<footer\b|<header\b/i);
  assert.match(preview, /<meta name="robots" content="noindex"/);
  assert.match(preview, /rel="canonical" href="[^"]*\/body-map"/);
});

test('preview: the figure wrapper is the only touch-action: none, the figure is capped at 70% of the screen, inputs are 16px or more', () => {
  const css = [...preview.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*touch-action:\s*none[^{}]*)\}/g)];
  assert.equal(rules.length, 1, 'one rule sets touch-action: none');
  assert.match(rules[0][1], /bm-stage|bm-figure/);
  assert.match(css, /max-height:\s*70(dvh|vh|svh)/);
  assert.match(css, /font-size:\s*max\(16px|font-size:\s*1rem|font-size:\s*16px/);
  const own = [...css.matchAll(/[^{}]*\.bm[^{}]*\{[^{}]*\}/g)].map((m) => m[0]).join('\n');
  assert.match(own, /\.bm-stage/, 'found the page\'s own rules');
  assert.doesNotMatch(own.replace(/#0000\b/g, ''), /#[0-9a-fA-F]{3,8}\b/, 'no raw hex in the page styles (#0000 is the minifier\'s "transparent")');
});

test('preview: the figure URLs for the v1 figures are in the page data and none is a data URL', () => {
  const stage = preview.match(/<[^>]*\bdata-figures="([^"]*)"[^>]*>/)?.[1] ?? '';
  const map = JSON.parse(decode(stage)) as Record<string, string>;
  for (const key of ['female_front', 'female_back', 'male_front', 'male_back']) {
    assert.ok(map[key], key);
    assert.doesNotMatch(map[key], /^data:/);
  }
  assert.equal(Object.keys(map).some((k) => /side/.test(k)), false, 'the side views are not shown in v1');
});

test('preview (B5b): the figure picker has Female and Male, the view tabs have Front and Back, and the picker starts on Female', () => {
  const picker = preview.match(/<div\b[^>]*\bid="bm-figures"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.ok(picker, 'a figure picker group');
  assert.match(preview, /<div\b[^>]*\bid="bm-figures"[^>]*\baria-labelledby="bm-figures-label"/, 'the group is named by its question');
  assert.ok(plain(preview.match(/<p\b[^>]*\bid="bm-figures-label"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '').trim() === bodymap.text.figure, 'the question is bodymap.text.figure');
  const options = [...picker.matchAll(/<button\b[^>]*\bdata-figure="([^"]+)"[^>]*aria-pressed="([^"]+)"[^>]*>([^<]*)</g)];
  assert.deepEqual(options.map((m) => [m[1], m[3]]), [['female', bodymap.text.figures.female], ['male', bodymap.text.figures.male]]);
  assert.deepEqual(options.map((m) => m[2]), ['true', 'false']);
  const tabs = preview.match(/<div\b[^>]*\bid="bm-tabs"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.deepEqual([...tabs.matchAll(/\bdata-view="([^"]+)"/g)].map((m) => m[1]), ['front', 'back']);
  assert.equal([...preview.matchAll(/\bdata-figure="/g)].length, 2, 'no other element carries a figure choice');
});

test('the only importer of the body map script is body-map.astro', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  for (const f of walk(join(root, 'src')).filter((p) => /\.(astro|ts)$/.test(p))) {
    if (f.endsWith('body-map.astro')) continue;
    assert.doesNotMatch(readFileSync(f, 'utf8'), /scripts\/bodymap(\.ts)?['"]/, relative(root, f));
  }
  assert.match(readFileSync(join(root, 'src/pages/body-map.astro'), 'utf8'), /scripts\/bodymap\.ts/);
});
