import { test } from 'node:test';
import assert from 'node:assert/strict';
import { site, bookingUrl, indexable, zoneOrder, type LinkKey, type ZoneKey } from '../src/data/site.ts';
import { w, wording } from '../src/data/wording.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('zone keys, order, precedence and names (I-040)', () => {
  const keys = ['central', 'midnorth', 'north', 'out'];
  assert.deepEqual(Object.keys(site.zones), keys);
  assert.deepEqual(zoneOrder, keys);
  assert.deepEqual(site.zonePrecedence, ['midnorth', 'central', 'north']);
  assert.deepEqual(
    keys.map((k) => site.zones[k as ZoneKey].name),
    ['Central & Southwest', 'Mid-north', 'North', 'Outside my regular area'],
  );
  for (const z of Object.values(site.zones)) assert.doesNotMatch(z.name, /Springs|home/i);
  assert.equal(site.zones.central.days, 'Tuesdays and Fridays');
  assert.equal(site.zones.midnorth.days, 'Tuesdays, Wednesdays, and Fridays');
  assert.equal(site.zones.north.days, 'Wednesdays');
});

test('each booking link is the PocketSuite items page filtered by its key', () => {
  assert.deepEqual(Object.keys(site.links), ['office', 'central', 'midnorth', 'north']);
  for (const k of Object.keys(site.links) as LinkKey[]) {
    const url = bookingUrl(k);
    assert.equal(url, `https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=${k}`);
    assert.equal(new URL(url).searchParams.get('keyword'), k);
    assert.ok(!url.startsWith('TODO_'));
  }
});

test('zone -> link: each zone and the office reach their own link; out has none', () => {
  for (const z of Object.values(site.zones)) {
    assert.equal(z.linkKey, z.key === 'out' ? null : z.key);
    if (z.linkKey) assert.equal(bookingUrl(z.linkKey), site.links[z.key as LinkKey]);
  }
  assert.equal(bookingUrl(site.office.linkKey), site.links.office);
  assert.equal(bookingUrl('central'), bookingUrl('central'));
});

test('no old zone keys, tokens or placeholder machinery under src/ or scripts/', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const bad = /['"](?:home|shared)['"]|zone-(?:home|shared)|isPlaceholder|data-placeholder|links\.general|TODO_PS/;
  const hits: string[] = [];
  for (const dir of ['src', 'scripts']) {
    for (const f of readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })) {
      if (!/\.(ts|astro|mjs|css)$/.test(f)) continue;
      if (bad.test(readFileSync(join(root, dir, f), 'utf8'))) hits.push(`${dir}/${f.replaceAll('\\', '/')}`);
    }
  }
  assert.deepEqual(hits, []);
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

test('the travel-fee note is short and leaves the group rule to the Pricing intro (Oct 29)', () => {
  assert.equal(site.travelFee.note, 'Flat, per visit, as my schedule allows.');
  assert.doesNotMatch(site.travelFee.note, /back-to-back|household|group|partner|neither/i);
});

test('days: Central has no Wednesdays; the office has Wednesday evenings', () => {
  assert.doesNotMatch(site.zones.central.days, /wed/i);
  assert.match(site.office.days, /wednesday evenings/i);
});

test('Monument is not named in the service area copy', () => {
  const regular = [site.zones.central, site.zones.midnorth, site.zones.north].flatMap((z) => [z.name, z.days, z.area]);
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
