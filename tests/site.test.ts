import { test } from 'node:test';
import assert from 'node:assert/strict';
import { site, bookingUrl, indexable, isPlaceholder, type LinkKey, type ZoneKey } from '../src/data/site.ts';
import { w, wording } from '../src/data/wording.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('w() returns the licensed variant (I-035)', () => {
  assert.equal(site.licensed, true);
  assert.equal(w('role'), 'Licensed Massage Therapist');
  assert.equal(w('deepTissue'), 'deep tissue massage');
  assert.equal(w('credential'), 'Brian Clarke, LMT, CNMT');
});

test('site is not indexable yet', () => {
  assert.equal(site.deploy.live, false);
  assert.equal(indexable, false);
});

test('Home text is unchanged by licensure (Brian, Oct 29 2026)', () => {
  for (const k of ['heroLine', 'deepTissueHome'] as const) assert.equal(wording[k][1], wording[k][0]);
  assert.equal(w('heroLine'), site.tagline);
  assert.equal(w('heroLine'), 'Reduce resistance. Restore movement.');
  assert.equal(w('deepTissueHome'), 'deep tissue work');
});

test('the license number is empty and read nowhere outside site.ts', () => {
  assert.equal(site.licenseNumber, '');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const hits: string[] = [];
  for (const dir of ['src', 'scripts']) {
    for (const f of readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })) {
      const rel = f.replaceAll('\\', '/');
      if (!/\.(ts|astro|mjs)$/.test(rel)) continue;
      if (`${dir}/${rel}` === 'src/data/site.ts' || `${dir}/${rel}` === 'scripts/check-wording.mjs') continue;
      if (readFileSync(join(root, dir, f), 'utf8').includes('licenseNumber')) hits.push(`${dir}/${rel}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('the license verification link is the https DORA license lookup and the unlicensed credential words are empty', () => {
  const u = new URL(site.licenseVerifyUrl);
  assert.equal(u.protocol, 'https:');
  assert.equal(u.hostname, 'apps2.colorado.gov');
  assert.equal(wording.credential[0], '');
  assert.equal(wording.licensedIn[0], '');
  assert.equal(wording.verifyLicense[0], '');
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

test('the office mark is approximate: two decimals', () => {
  const { lat, lng } = site.office.mapArea;
  assert.equal(Number(lat.toFixed(2)), lat);
  assert.equal(Number(lng.toFixed(2)), lng);
});

test('the out zone has no booking link', () => {
  const out: ZoneKey = 'out';
  assert.equal(site.zones[out].linkKey, null);
});
