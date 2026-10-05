import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zoneFor, type ZoneCollection } from '../src/lib/geo.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const zones = JSON.parse(read('../src/data/zones.geojson')) as ZoneCollection;
const fixtures = JSON.parse(read('./fixtures/addresses.json')) as {
  label: string;
  lat: number;
  lng: number;
  expect: string;
}[];

test('zones.geojson has exactly home, shared and north', () => {
  assert.equal(zones.features.length, 3);
  assert.deepEqual(zones.features.map((f) => f.properties.zone).sort(), ['home', 'north', 'shared']);
});

test('zones.geojson carries no properties other than zone', () => {
  for (const f of zones.features) {
    assert.deepEqual(Object.keys(f.properties), ['zone']);
    assert.deepEqual(Object.keys(f).sort(), ['geometry', 'properties', 'type']);
  }
});

for (const { label, lat, lng, expect } of fixtures) {
  test(`fixture: ${label} -> ${expect}`, () => {
    assert.equal(zoneFor(lat, lng, zones), expect);
  });
}
