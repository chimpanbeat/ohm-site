import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysIn, WEEK } from '../src/lib/days.ts';
import { site } from '../src/data/site.ts';

const names = (text: string) => daysIn(text).map((i) => WEEK[i].name);

test('the office text reads as Tuesday, Wednesday, Friday, Saturday', () => {
  assert.deepEqual(names(site.office.days), ['Tuesday', 'Wednesday', 'Friday', 'Saturday']);
});

test('each zone text reads as its days; out has none', () => {
  assert.deepEqual(names(site.zones.central.days), ['Tuesday', 'Friday']);
  assert.deepEqual(names(site.zones.midnorth.days), ['Tuesday', 'Wednesday', 'Friday']);
  assert.deepEqual(names(site.zones.north.days), ['Wednesday']);
  assert.deepEqual(names(site.zones.out.days), []);
});

test('the week runs Monday to Sunday with distinct two-letter labels', () => {
  assert.equal(WEEK[0].name, 'Monday');
  assert.equal(WEEK[6].name, 'Sunday');
  assert.equal(new Set(WEEK.map((d) => d.abbr)).size, 7);
});
