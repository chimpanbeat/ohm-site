import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const omega = JSON.parse(readFileSync(new URL('../src/data/omega.json', import.meta.url), 'utf8')) as {
  viewBox: string;
  d: string;
  points: number;
  dMap: string;
  pointsMap: number;
};

const [vx, vy, vw, vh] = omega.viewBox.split(' ').map(Number);

function checkPath(d: string) {
  assert.ok(d.startsWith('M'), 'starts with M');
  assert.ok(d.endsWith('Z'), 'ends with Z');
  assert.equal(d.match(/M/g)?.length, 1, 'a single M (one closed path)');
  const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  assert.equal(nums.length % 2, 0);
  for (let i = 0; i < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    assert.ok(x >= vx && x <= vx + vw && y >= vy && y <= vy + vh, `(${x}, ${y}) is outside the viewBox`);
  }
  return nums.length / 2;
}

// The light on /hello runs clockwise from the right foot's inner corner (steps/10B-hello-map-spacing.md).
function vertices(d: string): number[][] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const out: number[][] = [];
  for (let i = 0; i < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

for (const key of ['d', 'dMap'] as const) {
  test(`omega.json ${key} runs clockwise and starts at the right foot's inner corner`, () => {
    const v = vertices(omega[key]);
    let area = 0;
    for (let i = 0; i < v.length; i++) {
      const [x1, y1] = v[i];
      const [x2, y2] = v[(i + 1) % v.length];
      area += x1 * y2 - x2 * y1;
    }
    assert.ok(area > 0, `shoelace area ${area} (positive = clockwise on screen, y down)`);
    const maxY = Math.max(...v.map((p) => p[1]));
    assert.ok(v[0][1] >= maxY - 0.06 * vh, `first vertex y ${v[0][1]} is on the baseline`);
    assert.ok(v[0][0] > vx + vw / 2, `first vertex x ${v[0][0]} is right of the centre`);
    assert.ok(v[1][1] < v[0][1], 'the second vertex is higher than the first');
  });
}

test('omega.json viewBox is four numbers with a positive width and height', () => {
  const parts = omega.viewBox.split(' ');
  assert.equal(parts.length, 4);
  assert.ok(parts.every((p) => Number.isFinite(Number(p))));
  assert.ok(vw > 0 && vh > 0);
});

test('omega.json d is one closed path inside the viewBox with a sane point count', () => {
  const n = checkPath(omega.d);
  assert.equal(n, omega.points);
  assert.ok(omega.points >= 150 && omega.points <= 1500, `${omega.points} points`);
});

test('omega.json dMap is one closed path inside the viewBox, at most 300 points', () => {
  const n = checkPath(omega.dMap);
  assert.equal(n, omega.pointsMap);
  assert.ok(omega.pointsMap <= 300, `${omega.pointsMap} points`);
});
