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

test('the map viewer URL is built from site.map', () => {
  assert.equal(
    site.mapViewerUrl,
    'https://www.google.com/maps/d/viewer?mid=1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc&ll=38.89985450733466%2C-104.8154571&z=11',
  );
});

test('there is no phone number; contact is the PocketSuite lead form and chat', () => {
  assert.equal('phone' in site, false);
  assert.ok(site.contact.lead.startsWith('https://pocketsuite.io/'));
  assert.ok(site.contact.chat.startsWith('https://pocketsuite.io/'));
});

test('rates are the 60- and 90-minute sessions only', () => {
  assert.deepEqual(Object.keys(site.rates), ['s60', 's90']);
});

test('the travel-fee note holds no amount (the amount is site.travelFee.amount)', () => {
  assert.doesNotMatch(site.travelFee.note, /[\d$]/);
});

test('days: Central & Southwest has no Wednesdays; the office has Wednesday evenings', () => {
  assert.doesNotMatch(site.zones.home.days, /wed/i);
  assert.match(site.office.days, /wednesday evenings/i);
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

test('the office map circle is approximate: two decimals, at least 1 km', () => {
  const { lat, lng, radiusKm } = site.office.mapArea;
  assert.equal(Number(lat.toFixed(2)), lat);
  assert.equal(Number(lng.toFixed(2)), lng);
  assert.ok(radiusKm >= 1);
});

test('the out zone has no booking link', () => {
  const out: ZoneKey = 'out';
  assert.equal(site.zones[out].linkKey, null);
});
