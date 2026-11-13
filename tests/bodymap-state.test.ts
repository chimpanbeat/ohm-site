// B4 (I-073, BM-7): the body map's state, storage and wire payload (src/lib/bodymap.ts, ARCHITECTURE §B12 Storage,
// Wire contract, Retries). The clock, storage and random source are injected. Names, dates and notes are fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bodymap } from '../src/data/bodymap.ts';
import { buildPayload, createStore, dateWindow, makeId, sendMap, validate, type StorageLike } from '../src/lib/bodymap.ts';

const HOUR = 3_600_000;
const MIN = 60_000;
const T0 = Date.parse('2026-12-01T17:00:00Z');
const KEY = bodymap.storageKey;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
// A deterministic stand-in for crypto.getRandomValues (the real one is covered by the format check below).
function seededRandom(seed = 1) {
  let s = seed;
  return (bytes: Uint8Array) => {
    for (let i = 0; i < bytes.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      bytes[i] = (s >> 16) & 255;
    }
    return bytes;
  };
}
function setup(over: { storage?: StorageLike | null; now?: () => number } = {}) {
  let t = T0;
  const clock = { now: over.now ?? (() => t), set: (v: number) => (t = v) };
  const storage = over.storage === undefined ? memoryStorage() : over.storage;
  const make = (seed = 7) => createStore({ storage, now: clock.now, random: seededRandom(seed) });
  return { storage, clock, make };
}
const tap = (store: ReturnType<ReturnType<typeof setup>['make']>, x = 0.4, y = 0.3) => store.addPin({ view: 'front', x, y, type: 'pain' });

test('add a pin, reload: the same pins, name, date and figure come back', () => {
  const { make, storage } = setup();
  const a = make();
  a.setName('Test Client');
  a.setApptDate('2026-12-03');
  a.setFigure('female');
  const pin = tap(a);
  assert.ok(pin);
  const b = make(99); // a new page load
  assert.deepEqual(b.state.pins, a.state.pins);
  assert.equal(b.state.name, 'Test Client');
  assert.equal(b.state.apptDate, '2026-12-03');
  assert.equal(b.state.figure, 'female');
  assert.equal((storage as ReturnType<typeof memoryStorage>).data.has(KEY), true);
  const saved = JSON.parse((storage as ReturnType<typeof memoryStorage>).data.get(KEY)!);
  assert.deepEqual(Object.keys(saved).sort(), ['apptDate', 'figure', 'id', 'name', 'pins', 'savedAt', 'v']);
  assert.equal(saved.v, 1);
  assert.equal(saved.id, null, 'no id until the first send');
});

test('saved at T and loaded at T+23h59m: kept; at T+24h01m: deleted from the device', () => {
  const kept = setup();
  const a = kept.make();
  tap(a);
  kept.clock.set(T0 + 23 * HOUR + 59 * MIN);
  assert.equal(kept.make().state.pins.length, 1);

  const gone = setup();
  const b = gone.make();
  tap(b);
  gone.clock.set(T0 + 24 * HOUR + 1 * MIN);
  const c = gone.make();
  assert.equal(c.state.pins.length, 0);
  assert.equal((gone.storage as ReturnType<typeof memoryStorage>).data.has(KEY), false, 'the old entry is removed, not just ignored');
});

test('each change moves the 24 hours: the clock runs from the last change', () => {
  const s = setup();
  const a = s.make();
  tap(a);
  s.clock.set(T0 + 20 * HOUR);
  tap(a, 0.5, 0.5); // saved again at T+20h
  s.clock.set(T0 + 40 * HOUR); // 20h after the last change
  assert.equal(s.make().state.pins.length, 2);
});

test('an unknown version, broken JSON or a wrong shape is deleted, and the page starts empty', () => {
  for (const bad of [
    JSON.stringify({ v: 2, savedAt: T0, name: 'Test Client', apptDate: '', figure: 'female', pins: [], id: null }),
    '{not json',
    JSON.stringify({ v: 1, savedAt: T0, name: 5, apptDate: '', figure: 'female', pins: 'x', id: null }),
    JSON.stringify({ v: 1, savedAt: T0, name: '', apptDate: '', figure: 'alien', pins: [], id: null }),
    JSON.stringify(null),
  ]) {
    const storage = memoryStorage();
    storage.setItem(KEY, bad);
    const store = setup({ storage }).make();
    assert.deepEqual(store.state.pins, []);
    assert.equal(storage.data.has(KEY), false, `deleted: ${bad.slice(0, 30)}`);
  }
});

test('send ok clears the marks, the name and the id, and a reload is empty', () => {
  const { make, storage } = setup();
  const a = make();
  a.setName('Test Client');
  tap(a);
  a.sendId();
  a.sent();
  assert.deepEqual(a.state.pins, []);
  assert.equal(a.state.name, '');
  assert.equal(a.state.id, null);
  assert.equal((storage as ReturnType<typeof memoryStorage>).data.has(KEY), false);
  assert.deepEqual(make().state.pins, []);
});

test('a storage that throws leaves the state in memory and throws nothing', () => {
  const boom = () => {
    throw new Error('blocked');
  };
  const storage: StorageLike = { getItem: boom, setItem: boom, removeItem: boom };
  const { make } = setup({ storage });
  const store = make();
  store.setName('Test Client');
  const pin = tap(store);
  assert.ok(pin);
  store.removePin(pin!.id);
  tap(store);
  store.sendId();
  store.startOver();
  assert.deepEqual(store.state.pins, []);
  // no storage at all (a private window that has none)
  const bare = setup({ storage: null }).make();
  tap(bare);
  assert.equal(bare.state.pins.length, 1);
});

test('a failed send keeps the marks, and the retry reuses the same id, also after a reload', () => {
  const { make } = setup();
  const a = make();
  a.setName('Test Client');
  a.setApptDate('2026-12-03');
  tap(a);
  const id = a.sendId();
  assert.match(id, UUID_V4);
  assert.equal(a.sendId(), id, 'asking again gives the same id');
  assert.equal(a.state.pins.length, 1, 'a failed send changes nothing');
  const reloaded = make(500);
  assert.equal(reloaded.state.id, id, 'the id survives a reload');
  assert.equal(reloaded.sendId(), id);
});

test('an edit to the name, date, figure or pins, Start over and ok each drop the id; the next send has a new one', () => {
  const edits: [string, (s: ReturnType<ReturnType<typeof setup>['make']>) => void][] = [
    ['name', (s) => s.setName('Test Clients')],
    ['date', (s) => s.setApptDate('2026-12-04')],
    ['figure', (s) => s.setFigure('male')],
    ['add a pin', (s) => void tap(s, 0.6, 0.6)],
    ['remove a pin', (s) => s.removePin(s.state.pins[0].id)],
    ['start over', (s) => s.startOver()],
    ['ok', (s) => s.sent()],
  ];
  for (const [label, edit] of edits) {
    const { make } = setup();
    const s = make();
    s.setName('Test Client');
    s.setApptDate('2026-12-03');
    s.setFigure('female');
    tap(s);
    const first = s.sendId();
    edit(s);
    assert.equal(s.state.id, null, `${label}: the id is dropped`);
    const second = s.sendId();
    assert.match(second, UUID_V4);
    assert.notEqual(second, first, `${label}: the next send has a new id`);
  }
  // setting the same value again is not an edit
  const { make } = setup();
  const s = make();
  s.setName('Test Client');
  const id = s.sendId();
  s.setName('Test Client');
  assert.equal(s.state.id, id);
});

test('the id is a lower-case v4 UUID from getRandomValues, never randomUUID', () => {
  const seen = new Set<string>();
  const rnd = seededRandom(3);
  for (let i = 0; i < 50; i++) {
    const id = makeId(rnd);
    assert.match(id, UUID_V4);
    assert.equal(id, id.toLowerCase());
    seen.add(id);
  }
  assert.equal(seen.size, 50);
  const real = makeId((bytes) => crypto.getRandomValues(bytes));
  assert.match(real, UUID_V4);
  const src = readFileSync(new URL('../src/lib/bodymap.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /randomUUID/, 'the LAN preview is plain http, where randomUUID does not exist');
  assert.match(src, /getRandomValues|random\(/);
});

test('limits: 60 pins, a 140-character note, an 80-character name; coordinates are clamped to 0-1', () => {
  const { make } = setup();
  const s = make();
  for (let i = 0; i < bodymap.limits.pins; i++) assert.ok(tap(s, 0.5, 0.5));
  assert.equal(tap(s), null, 'the 61st pin is refused');
  assert.equal(s.state.pins.length, 60);
  s.setName('x'.repeat(200));
  assert.equal(s.state.name.length, bodymap.limits.nameChars);
  const one = setup().make();
  const pin = one.addPin({ view: 'front', x: -3, y: 9, type: 'pain' })!;
  assert.deepEqual([pin.x, pin.y], [0, 1]);
  assert.equal(pin.note, '');
  assert.equal(pin.star, false);
  assert.equal(pin.intensity, null);
  assert.equal(pin.fromList, false);
});

test('the date window is today -14 to +365 days, and validate() names what is missing', () => {
  assert.deepEqual(dateWindow('2026-12-01'), { min: '2026-11-17', max: '2027-12-01' });
  assert.deepEqual(dateWindow('2027-03-01'), { min: '2027-02-15', max: '2028-02-29' }, 'across a leap day');
  const today = '2026-12-01';
  const base = { name: 'Test Client', apptDate: '2026-12-03', figure: 'female' as const, pins: [{ id: 'p', view: 'front' as const, x: 0.1, y: 0.1, type: 'pain' as const, intensity: null, note: '', star: false, fromList: false }], id: null };
  assert.deepEqual(validate(base, today), []);
  assert.deepEqual(validate({ ...base, name: '   ' }, today), ['errName']);
  assert.deepEqual(validate({ ...base, apptDate: '' }, today), ['errDate']);
  assert.deepEqual(validate({ ...base, apptDate: '2026-11-16' }, today), ['errDate'], '15 days back is out');
  assert.deepEqual(validate({ ...base, apptDate: '2026-11-17' }, today), []);
  assert.deepEqual(validate({ ...base, apptDate: '2027-12-02' }, today), ['errDate']);
  assert.deepEqual(validate({ ...base, apptDate: '2026-02-30' }, today), ['errDate'], 'not a real date');
  assert.deepEqual(validate({ ...base, pins: [] }, today), ['errEmpty']);
  assert.deepEqual(validate({ ...base, name: '', apptDate: '', pins: [] }, today), ['errName', 'errDate', 'errEmpty']);
});

test('the payload has exactly the script\'s keys, an empty honeypot, a trimmed name and the pdf as given', () => {
  const state = { name: '  Test Client ', apptDate: '2026-12-03', figure: 'female' as const, pins: [], id: '3f2a9c1e-5b7d-4e8a-9c0b-1a2b3c4d5e6f' };
  const report = { v: 1, pins: [] };
  const p = buildPayload(state, report, 'JVBERi0x');
  assert.deepEqual(Object.keys(p).sort(), ['apptDate', 'figure', 'id', 'kind', 'name', 'pdf', 'report', 'v', 'website']);
  assert.equal(p.v, 1);
  assert.equal(p.kind, 'ohm-bodymap');
  assert.equal(p.website, '');
  assert.equal(p.name, 'Test Client');
  assert.equal(p.id, state.id);
  assert.equal(p.pdf, 'JVBERi0x');
  assert.throws(() => buildPayload({ ...state, id: null }, report, 'JVBERi0x'), /id/);
  assert.throws(() => buildPayload(state, report, 'A'.repeat(bodymap.limits.pdfBytes + 1)), /pdf/);
  assert.throws(() => buildPayload(state, { v: 1, pins: [], big: 'x'.repeat(bodymap.limits.reportBytes) }, 'JVBERi0x'), /report/);
});

test('the send: one POST of a JSON string with no custom headers; ok, busy, invalid, server, a network failure and a non-JSON reply', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const reply = (body: string, status = 200) => async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(body, { status });
  };
  const payload = buildPayload({ name: 'Test Client', apptDate: '2026-12-03', figure: 'female', pins: [], id: '3f2a9c1e-5b7d-4e8a-9c0b-1a2b3c4d5e6f' }, { v: 1, pins: [] }, 'JVBERi0x');
  const URL = 'https://example.invalid/exec';
  assert.equal(await sendMap({ fetch: reply('{"ok":true}'), url: URL, payload }), 'ok');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, URL);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(typeof calls[0].init.body, 'string');
  assert.deepEqual(JSON.parse(calls[0].init.body as string), payload);
  assert.deepEqual(calls[0].init.headers, { 'Content-Type': 'text/plain;charset=UTF-8' }, 'a simple request: no preflight');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.redirect, 'follow');

  assert.equal(await sendMap({ fetch: reply('{"ok":false,"error":"busy"}'), url: URL, payload }), 'busy');
  assert.equal(await sendMap({ fetch: reply('{"ok":false,"error":"invalid"}'), url: URL, payload }), 'server');
  assert.equal(await sendMap({ fetch: reply('{"ok":false,"error":"server"}'), url: URL, payload }), 'server');
  assert.equal(await sendMap({ fetch: reply('{"ok":false,"error":"surprise"}'), url: URL, payload }), 'server');
  assert.equal(await sendMap({ fetch: reply('<html>Error</html>'), url: URL, payload }), 'network', 'a non-JSON reply');
  assert.equal(await sendMap({ fetch: reply('{"ok":true}', 500), url: URL, payload }), 'network', 'a failed HTTP status');
  assert.equal(await sendMap({ fetch: async () => { throw new TypeError('Failed to fetch'); }, url: URL, payload }), 'network');
  assert.equal(await sendMap({ fetch: reply('{"ok":"yes"}'), url: URL, payload }), 'server', 'ok must be true');
});
