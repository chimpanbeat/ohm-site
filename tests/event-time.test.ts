import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdown, currentItem } from '../src/lib/event-time.ts';

// E10 (I-100, I-101; ARCHITECTURE §B10 E8–E11). The launch party's times, in America/Denver.
const TZ = 'America/Denver';
const START = '2026-11-22T14:00:00-07:00';
const END = '2026-11-22T18:00:00-07:00';
const at = (iso: string) => Date.parse(iso);
const count = (iso: string) => countdown(at(iso), START, END, TZ);

test('1. countdown: calendar days in the event time zone, tomorrow, today, then nothing', () => {
  assert.deepEqual(count('2026-11-20T10:00:00-07:00'), { kind: 'days', n: 2 });
  // Nov 20, 8 pm in Denver is already Nov 21 in UTC: still two days, not tomorrow
  assert.deepEqual(count('2026-11-21T03:00:00Z'), { kind: 'days', n: 2 });
  assert.deepEqual(count('2026-11-21T23:59:00-07:00'), { kind: 'tomorrow' });
  assert.deepEqual(count('2026-11-22T00:00:00-07:00'), { kind: 'today' });
  assert.deepEqual(count('2026-11-22T17:59:00-07:00'), { kind: 'today' });
  assert.equal(count('2026-11-22T18:00:00-07:00'), null);
  assert.equal(count('2026-11-23T09:00:00-07:00'), null);
  // before the Nov 1 DST change (MDT): 22 calendar days, whatever the hours between
  assert.deepEqual(count('2026-10-31T12:00:00-06:00'), { kind: 'days', n: 22 });
});

test('2. currentItem: start <= now < end, -1 when none; no state between calls', () => {
  const items = [
    { start: '2026-11-22T13:45:00-07:00', end: '2026-11-22T14:00:00-07:00' },
    { start: '2026-11-22T14:00:00-07:00', end: '2026-11-22T15:00:00-07:00' },
    { start: '2026-11-22T15:00:00-07:00', end: '2026-11-22T18:00:00-07:00' },
    { start: '2026-11-22T18:00:00-07:00', end: '2026-11-22T20:00:00-07:00' },
  ];
  const cases: [string, number][] = [
    ['2026-11-22T13:44:00-07:00', -1],
    ['2026-11-22T13:45:00-07:00', 0],
    ['2026-11-22T14:00:00-07:00', 1],
    ['2026-11-22T15:00:00-07:00', 2],
    ['2026-11-22T18:00:00-07:00', 3],
    ['2026-11-22T19:59:00-07:00', 3],
    ['2026-11-22T20:00:00-07:00', -1],
  ];
  for (const [iso, want] of cases) assert.equal(currentItem(items, at(iso)), want, iso);
});
