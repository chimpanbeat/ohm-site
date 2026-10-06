import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const terrain = JSON.parse(readFileSync(new URL('../src/data/terrain.json', import.meta.url), 'utf8')) as {
  bbox: number[];
  width: number;
  height: number;
};

test('terrain.json covers the OSM box (west, south, east, north)', () => {
  assert.deepEqual(terrain.bbox, [-105.09, 38.63, -104.54, 39.17]);
});

test('terrain.json has integer pixel dimensions', () => {
  assert.ok(Number.isInteger(terrain.width) && terrain.width > 0);
  assert.ok(Number.isInteger(terrain.height) && terrain.height > 0);
});

test('terrain.webp exists and is under 200 KB', () => {
  const { size } = statSync(new URL('../src/assets/terrain.webp', import.meta.url));
  assert.ok(size > 0 && size < 200 * 1024, `${size} bytes`);
});
