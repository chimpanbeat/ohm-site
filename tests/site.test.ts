import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('map URLs are built from site.map', () => {
  assert.equal(
    site.mapEmbedUrl,
    'https://www.google.com/maps/d/embed?mid=1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc&noprof=1&ll=38.89985450733466%2C-104.8154571&z=12&ehbc=125245',
  );
  assert.equal(
    site.mapViewerUrl,
    'https://www.google.com/maps/d/viewer?mid=1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc&ll=38.89985450733466%2C-104.8154571&z=12',
  );
});

test('map header colour is a bare hex equal to --green-700', () => {
  assert.match(site.map.headerColor, /^[0-9a-f]{6}$/i);
  const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  const green = css.match(/--green-700:\s*#([0-9a-f]{6})\s*;/i)?.[1];
  assert.ok(green, '--green-700 not found in tokens.css');
  assert.equal(site.map.headerColor.toLowerCase(), green.toLowerCase());
});

test('Monument is not named in the service area copy', () => {
  const regular = [site.zones.home, site.zones.shared, site.zones.north].flatMap((z) => [z.name, z.days, z.area]);
  for (const s of [site.areaServed, site.serviceAreaSummary, ...regular]) {
    assert.doesNotMatch(JSON.stringify(s), /monument/i);
  }
});

test('out-of-region note shows no amount while the fee is unset', () => {
  assert.equal(site.outOfRegionFee, null);
  assert.doesNotMatch(site.outOfRegionFeeNote, /[$\d]/);
});

test('the out zone has no booking link', () => {
  const out: ZoneKey = 'out';
  assert.equal(site.zones[out].linkKey, null);
});
