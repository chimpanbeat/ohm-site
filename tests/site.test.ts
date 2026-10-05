import { test } from 'node:test';
import assert from 'node:assert/strict';
import { site, bookingUrl, indexable, isPlaceholder, type LinkKey, type ZoneKey } from '../src/data/site.ts';
import { w } from '../src/data/wording.ts';

test('placeholder links fall back to the general PS page', () => {
  const keys = Object.keys(site.links) as LinkKey[];
  for (const key of keys.filter((k) => isPlaceholder(site.links[k]))) {
    const r = bookingUrl(key);
    assert.equal(r.href, site.links.general);
    assert.equal(r.placeholder, true);
  }
});

test('general link is a real URL, not a placeholder', () => {
  assert.deepEqual(bookingUrl('general'), { href: site.links.general, placeholder: false });
});

test('w() returns the unlicensed variant while unlicensed', () => {
  assert.equal(site.licensed, false);
  assert.equal(w('role'), 'practitioner');
  assert.equal(w('heroLine'), site.tagline);
});

test('site is not indexable yet', () => {
  assert.equal(indexable, false);
});

test('every zone key matches its record key', () => {
  for (const [k, z] of Object.entries(site.zones)) assert.equal(z.key, k);
});

test('the out zone has no booking link', () => {
  const out: ZoneKey = 'out';
  assert.equal(site.zones[out].linkKey, null);
});
