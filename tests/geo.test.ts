import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pointInRing,
  pointInPolygon,
  zoneFor,
  type Ring,
  type ZoneCollection,
  type ZoneFeature,
} from '../src/lib/geo.ts';

const square = (x0: number, y0: number, x1: number, y1: number): Ring => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const closed = (r: Ring): Ring => [...r, r[0]];

const feature = (zone: ZoneFeature['properties']['zone'], geometry: ZoneFeature['geometry']): ZoneFeature => ({
  type: 'Feature',
  properties: { zone },
  geometry,
});

test('point inside and outside a square', () => {
  const ring = square(0, 0, 10, 10);
  assert.equal(pointInRing([5, 5], ring), true);
  assert.equal(pointInRing([11, 5], ring), false);
  assert.equal(pointInRing([5, -1], ring), false);
});

test('closed and open rings give the same answer', () => {
  const open = square(0, 0, 10, 10);
  const shut = closed(open);
  for (const pt of [[5, 5], [11, 5], [-1, -1], [9.9, 0.1]] as [number, number][]) {
    assert.equal(pointInRing(pt, shut), pointInRing(pt, open));
  }
  assert.equal(pointInRing([5, 5], shut), true);
});

test('a point inside a hole is outside the polygon', () => {
  const rings = [closed(square(0, 0, 10, 10)), closed(square(4, 4, 6, 6))];
  assert.equal(pointInPolygon([5, 5], rings), false);
  assert.equal(pointInPolygon([2, 2], rings), true);
  assert.equal(pointInPolygon([20, 20], rings), false);
});

test('MultiPolygon matches any of its polygons', () => {
  const fc: ZoneCollection = {
    type: 'FeatureCollection',
    features: [
      feature('home', {
        type: 'MultiPolygon',
        coordinates: [[closed(square(0, 0, 1, 1))], [closed(square(10, 10, 11, 11))]],
      }),
    ],
  };
  assert.equal(zoneFor(0.5, 0.5, fc), 'home');
  assert.equal(zoneFor(10.5, 10.5, fc), 'home');
  assert.equal(zoneFor(5, 5, fc), 'out');
});

test('overlapping zones resolve by precedence: shared wins', () => {
  const big = [closed(square(0, 0, 10, 10))];
  const fc: ZoneCollection = {
    type: 'FeatureCollection',
    features: [
      feature('north', { type: 'Polygon', coordinates: big }),
      feature('home', { type: 'Polygon', coordinates: big }),
      feature('shared', { type: 'Polygon', coordinates: big }),
    ],
  };
  assert.equal(zoneFor(5, 5, fc), 'shared');

  const noShared: ZoneCollection = { type: 'FeatureCollection', features: fc.features.slice(0, 2) };
  assert.equal(zoneFor(5, 5, noShared), 'home');
});

test('zoneFor takes (lat, lng) and maps to [lng, lat]', () => {
  const fc: ZoneCollection = {
    type: 'FeatureCollection',
    features: [feature('north', { type: 'Polygon', coordinates: [closed(square(100, 0, 110, 10))] })],
  };
  assert.equal(zoneFor(5, 105, fc), 'north'); // lat 5, lng 105
  assert.equal(zoneFor(105, 5, fc), 'out');
});

test('a point in no polygon is out', () => {
  const fc: ZoneCollection = {
    type: 'FeatureCollection',
    features: [feature('home', { type: 'Polygon', coordinates: [closed(square(0, 0, 1, 1))] })],
  };
  assert.equal(zoneFor(50, 50, fc), 'out');
  assert.equal(zoneFor(0, 0, { type: 'FeatureCollection', features: [] }), 'out');
});
