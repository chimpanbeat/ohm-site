import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

type Pt = [number, number];
interface Feature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: Pt | Pt[][] };
}

const osm = JSON.parse(readFileSync(new URL('../src/data/osm.geojson', import.meta.url), 'utf8')) as {
  features: Feature[];
};
const roads = osm.features.filter((f) => f.properties.kind === 'road');
const minor = osm.features.filter((f) => f.properties.kind === 'minor');
const places = osm.features.filter((f) => f.properties.kind === 'place');

// ARCHITECTURE §B5 box: S, W, N, E.
const [S, W, N, E] = [38.63, -105.09, 39.17, -104.54];

test('osm.geojson has every road short name', () => {
  assert.deepEqual(
    roads.map((f) => f.properties.name),
    ['I-25', 'US 24', 'Hwy 83', 'Academy', 'Woodmen', 'Powers', 'Garden of the Gods', 'Austin Bluffs', 'Templeton Gap', 'Baptist'],
  );
  for (const f of roads) assert.ok((f.geometry.coordinates as Pt[][]).length > 0, String(f.properties.name));
});

test('only I-25 is a major road', () => {
  assert.deepEqual(roads.filter((f) => f.properties.major).map((f) => f.properties.name), ['I-25']);
});

test('osm.geojson has the 7 places', () => {
  assert.deepEqual(
    places.map((f) => f.properties.name).sort(),
    ['Black Forest', 'Colorado Springs', 'Falcon', 'Fountain', 'Manitou Springs', 'Monument', 'Security-Widefield'],
  );
});

test('features carry only kind, name and (for roads) major, no OSM ids or tags', () => {
  for (const f of roads) assert.deepEqual(Object.keys(f.properties).sort(), ['kind', 'major', 'name']);
  for (const f of places) assert.deepEqual(Object.keys(f.properties).sort(), ['kind', 'name']);
  for (const f of minor) assert.deepEqual(Object.keys(f.properties), ['kind']);
});

test('osm.geojson has one unnamed minor-roads feature with at least 50 lines', () => {
  assert.equal(minor.length, 1);
  const [f] = minor;
  assert.equal(f.geometry.type, 'MultiLineString');
  assert.ok(!('name' in f.properties));
  assert.ok((f.geometry.coordinates as Pt[][]).length >= 50);
});

test('every coordinate lies in the §B5 box', () => {
  const points: Pt[] = [
    ...[...minor, ...roads].flatMap((f) => (f.geometry.coordinates as Pt[][]).flat()),
    ...places.map((f) => f.geometry.coordinates as Pt),
  ];
  assert.ok(points.length > 0);
  for (const [lng, lat] of points) {
    assert.ok(lng >= W && lng <= E && lat >= S && lat <= N, `${lng},${lat} outside the box`);
  }
});
