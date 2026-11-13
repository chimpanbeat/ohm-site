// I-147: printed short links (the launch-party fridge magnet's QR code encodes https://ohmprecisionbodywork.com/shrug).
// The table lives in src/data/analytics.ts; astro.config.mjs merges it into `redirects`, next to the event /<slug> pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as analyticsData from '../src/data/analytics.ts';
import { site } from '../src/data/site.ts';
import { events } from '../src/data/events.ts';
import { RESERVED_SLUGS } from '../src/lib/events.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const base = site.deploy.base.replace(/\/+$/, '');
const origin = site.deploy.customDomain;
const shortLinks = (analyticsData as { shortLinks?: Record<string, string> }).shortLinks ?? {};
const SHRUG = '/book?utm_source=magnet&utm_medium=print&utm_campaign=launch-party&utm_content=shrug';

test('I-147. the table: /shrug goes to /book with the four magnet tags', () => {
  assert.equal(shortLinks['/shrug'], SHRUG);
  for (const [from, to] of Object.entries(shortLinks)) {
    assert.match(from, /^\/[a-z0-9-]+$/, `${from}: one lowercase segment`);
    assert.ok(to.startsWith('/') && !to.startsWith('//'), `${from}: an internal target`);
    const url = new URL(to, origin);
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) assert.ok(url.searchParams.get(k), `${from}: ${k}`);
    for (const [k, v] of url.searchParams) assert.match(v, /^[a-z0-9-]+$/, `${from}: ${k} is lowercase with hyphens`);
  }
  const shrug = new URL(SHRUG, origin);
  assert.equal(shrug.pathname, '/book');
  assert.deepEqual([...shrug.searchParams], [
    ['utm_source', 'magnet'],
    ['utm_medium', 'print'],
    ['utm_campaign', 'launch-party'],
    ['utm_content', 'shrug'],
  ]);
});

test('I-147. no short link collides with a page, a file or an event', () => {
  for (const from of Object.keys(shortLinks)) {
    const name = from.slice(1);
    assert.ok(!RESERVED_SLUGS.includes(name), `${from} is a page or file name`);
    assert.ok(!events.some((e) => e.slug === name), `${from} is an event slug`);
  }
});

test('I-147. astro.config merges the table into redirects, with the base, and holds no link itself', async () => {
  const { default: config } = await import('../astro.config.mjs');
  const redirects = config.redirects as Record<string, string>;
  for (const [from, to] of Object.entries(shortLinks)) assert.equal(redirects[from], `${base}${to}`, from);
  for (const e of events) assert.equal(redirects[`/${e.slug}`], `${base}/events/${e.slug}`, e.slug);
  const text = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
  assert.match(text, /shortLinks/);
  assert.doesNotMatch(text, /utm_|\/book|shrug/);
  // A string target, never { status }: a static build writes a meta refresh page either way, and status 302 adds a 2 s delay.
  for (const from of Object.keys(shortLinks)) assert.equal(typeof redirects[from], 'string', from);
});

const skipBuilt = existsSync(join(dist, 'index.html')) ? false : 'dist missing: run npm run build';

test('I-147. built: dist/shrug.html is a redirect page to the tagged /book', { skip: skipBuilt }, () => {
  const html = readFileSync(join(dist, 'shrug.html'), 'utf8');
  const amp = `${base}${SHRUG}`.replaceAll('&', '&amp;');
  assert.ok(html.includes(`<meta http-equiv="refresh" content="0;url=${amp}">`), 'meta refresh, delay 0, query intact with &amp;');
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${amp}">`), 'canonical');
  assert.match(html, /<meta\b[^>]*\bname="robots"[^>]*\bcontent="noindex"/);
  assert.ok(!/<script\b/.test(html), 'no script (no Umami tag: the visit is counted on /book, tags and all)');
  assert.ok(!/<main\b/.test(html), 'no page content');
  assert.doesNotMatch(html.replaceAll('&amp;', ''), /&(?!#?\w+;)/, 'every & in the HTML is escaped');
  const map = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  assert.ok(!map.includes('shrug') && !map.includes('utm_'), 'not in the sitemap');
});
