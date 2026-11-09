// A1 (I-113, I-114, I-115): the analytics helpers, the data file and the built pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analytics } from '../src/data/analytics.ts';
import { site, bookingUrl } from '../src/data/site.ts';
import { policiesPdfPath } from '../src/data/client-policies.ts';
import { classifyHref, isExcluded, trackEvent, type Rules } from '../src/lib/analytics.ts';

const origin = site.deploy.site;
const rules: Rules = {
  book: (['office', 'central', 'midnorth', 'north'] as const).map(bookingUrl),
  contact: [site.contact.lead, site.contact.chat],
  policies: '/ohm-client-policies.pdf',
};

test('the tag counts only the production hostname', () => {
  assert.equal(analytics.domain, new URL(site.deploy.customDomain).hostname);
  assert.match(analytics.websiteId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(analytics.scriptSrc, 'https://cloud.umami.is/script.js');
});

test('isExcluded: /body-map and below, with or without .html, a slash or the base (I-115)', () => {
  const ex = analytics.excludedPaths;
  for (const p of ['/body-map', '/body-map/', '/body-map.html', '/body-map/index.html', '/body-map/front']) {
    assert.equal(isExcluded(p, ex), true, p);
  }
  assert.equal(isExcluded('/ohm/body-map', ex, '/ohm/'), true);
  for (const p of ['/', '/book', '/body-maps', '/about', '/events/launch-party']) assert.equal(isExcluded(p, ex), false, p);
});

test('classifyHref: every booking link is book; request and chat are contact', () => {
  for (const url of rules.book) assert.equal(classifyHref(url, rules, origin), 'book', url);
  assert.equal(classifyHref(site.contact.lead, rules, origin), 'contact');
  assert.equal(classifyHref(site.contact.chat, rules, origin), 'contact');
});

test('classifyHref: email, call, text, policies PDF', () => {
  assert.equal(classifyHref(`mailto:${site.email}`, rules, origin), 'email');
  assert.equal(classifyHref('tel:+15555550100', rules, origin), 'call');
  assert.equal(classifyHref('sms:+15555550100', rules, origin), 'text');
  assert.equal(classifyHref(policiesPdfPath, rules, origin), 'policies');
  assert.equal(classifyHref(`${origin}${policiesPdfPath}`, rules, origin), 'policies');
});

test('classifyHref: everything else is not an event', () => {
  for (const h of ['/book', '/about', '#rsvp', 'https://example.com/', 'javascript:void(0)', 'https://pocketsuite.io/book/other/items?keyword=office']) {
    assert.equal(classifyHref(h, rules, origin), null, h);
  }
});

test('trackEvent sends the name and the page path only, and never throws', () => {
  const calls: unknown[][] = [];
  trackEvent('book', { umami: { track: (...a: unknown[]) => void calls.push(a) }, location: { pathname: '/book/central' } });
  assert.deepEqual(calls, [['book', { page: '/book/central' }]]);
  trackEvent('rsvp', { location: { pathname: '/' } }); // tracker absent
  trackEvent('rsvp', { umami: { track: () => { throw new Error('x'); } }, location: { pathname: '/' } });
});

test('the click script and rsvp.ts send events through trackEvent only', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const click = readFileSync(join(root, 'src/scripts/analytics.ts'), 'utf8');
  const rsvp = readFileSync(join(root, 'src/scripts/rsvp.ts'), 'utf8');
  assert.doesNotMatch(click, /umami\.track|fetch\(|localStorage|sessionStorage|document\.cookie/);
  assert.match(rsvp, /trackEvent\('rsvp'\)/);
  assert.doesNotMatch(rsvp, /umami/);
});

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const skip = existsSync(join(dist, 'index.html')) ? false : 'dist missing: run npm run build';

test('built pages: one tag, production domain only, and the rules meta', { skip }, () => {
  for (const page of ['index.html', 'book.html', 'hello.html', 'events/launch-party.html', 'client-policies.html']) {
    const h = readFileSync(join(dist, page), 'utf8');
    const tags = h.match(new RegExp(`<script\\b[^>]*src="${analytics.scriptSrc.replace(/\./g, '\\.')}"[^>]*>`, 'g')) ?? [];
    assert.equal(tags.length, 1, page);
    assert.match(tags[0], new RegExp(`data-domains="${analytics.domain}"`), page);
    // /hello is bare: the tag only, no click script and no rules.
    if (page === 'hello.html') assert.doesNotMatch(h, /analytics-rules/, page);
    else assert.match(h, /<meta name="analytics-rules" content="/, page);
    assert.doesNotMatch(h, /data-exclude-search/, `${page}: UTM tags need the query string`);
  }
});

test('built pages carry no form field, address or query string in the rules meta', { skip }, () => {
  const h = readFileSync(join(dist, 'index.html'), 'utf8');
  const meta = h.match(/<meta name="analytics-rules" content="([^"]*)"/)![1].replaceAll('&#34;', '"').replaceAll('&quot;', '"');
  const parsed = JSON.parse(meta.replaceAll('&amp;', '&'));
  assert.deepEqual(Object.keys(parsed).sort(), ['book', 'contact', 'policies']);
});
