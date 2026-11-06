// AC-3: without JavaScript or the Google key, /book still shows the map and the zone buttons.
// Reads the built page, so it skips when dist is missing (run npm run build).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, bookingUrl } from '../src/data/site.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const file = join(root, 'dist', 'book.html');
const skip = existsSync(file) ? false : 'dist/book.html missing: run npm run build';
const html = () => readFileSync(file, 'utf8');

test('AC-3: /book ships the static service map, no iframe', { skip }, () => {
  const h = html();
  assert.match(h, /<svg [^>]*aria-labelledby="map-title map-desc"/); // the service map, not an icon
  assert.match(h, /id="map-title"/);
  assert.doesNotMatch(h, /<iframe\b/);
});

test('AC-3: /book has a plain link to every zone page', { skip }, () => {
  const h = html();
  for (const zone of ['central', 'midnorth', 'north', 'out']) {
    assert.match(h, new RegExp(`<a [^>]*href="${site.deploy.base.replace(/\/$/, '')}/book/${zone}"`), zone);
  }
});

test('AC-3: /book links straight to the office booking page', { skip }, () => {
  const url = bookingUrl(site.office.linkKey).replace(/&/g, '&amp;');
  assert.ok(html().includes(`href="${url}"`), url);
});

test('AC-3: the office and mobile sections are not hidden in the markup', { skip }, () => {
  const h = html();
  for (const id of ['office', 'mobile']) {
    const tag = h.match(new RegExp(`<[a-z]+ [^>]*id="${id}"[^>]*>`));
    assert.ok(tag, `#${id} present`);
    assert.doesNotMatch(tag[0], /\bhidden\b/, `#${id} not hidden`);
  }
});
