// B4 (I-073, BM-7): the body map's state, storage and wire payload (src/lib/bodymap.ts, ARCHITECTURE §B12 Storage,
// Wire contract, Retries). The clock, storage and random source are injected. Names, dates and notes are fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bodymap } from '../src/data/bodymap.ts';
import { buildPayload, createStore, dateWindow, fieldsOf, makeId, sendMap, validate, type StorageLike } from '../src/lib/bodymap.ts';

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
  assert.deepEqual(Object.keys(saved).sort(), ['apptDate', 'figure', 'firstAt', 'forWhom', 'helperName', 'id', 'name', 'pins', 'savedAt', 'v', 'visit', 'whole']);
  assert.equal(saved.v, 2, 'B6: v is 2');
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
    JSON.stringify({ v: 3, savedAt: T0, name: 'Test Client', apptDate: '', figure: 'female', pins: [], id: null }),
    // B6: a v1 entry used the 1-5 scale, so it is deleted, never re-read on the new one
    JSON.stringify({ v: 1, savedAt: T0, name: 'Test Client', apptDate: '', figure: 'female', pins: [{ id: 'p1', view: 'front', x: 0.1, y: 0.1, type: 'pain', intensity: 4, note: '', star: false, fromList: false }], id: null }),
    '{not json',
    JSON.stringify({ v: 2, savedAt: T0, name: 5, apptDate: '', figure: 'female', pins: 'x', id: null }),
    JSON.stringify({ v: 2, savedAt: T0, name: '', apptDate: '', figure: 'alien', pins: [], id: null }),
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
  assert.deepEqual([pin.quality, pin.worst, pin.course, pin.started, pin.worse, pin.better, pin.since, pin.mirror], [[], [], null, '', '', '', null, null], 'B6: every detail empty');
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

// --- B6: the pin model (stars, fields, storage v2) --------------------------------------------------------------------

const place = (s: ReturnType<ReturnType<typeof setup>['make']>, type: 'pain' | 'discomfort' | 'tight' | 'injury' | 'numb' | 'avoid' | 'other' = 'pain', x = 0.4) =>
  s.addPin({ view: 'front', x, y: 0.3, type })!;

test('2. stars: three at most, avoid never, other yes, and a starred pin changed to avoid is unstarred', () => {
  const s = setup().make();
  const [a, b, c, d] = [place(s, 'pain', 0.1), place(s, 'pain', 0.2), place(s, 'tight', 0.3), place(s, 'pain', 0.4)];
  assert.equal(s.toggleStar(a.id), 'ok');
  assert.equal(s.toggleStar(b.id), 'ok');
  assert.equal(s.toggleStar(c.id), 'ok');
  assert.equal(s.toggleStar(d.id), 'star-limit', 'a 4th star');
  assert.equal(d.star, false);
  assert.equal(s.toggleStar(a.id), 'ok', 'a tap on a starred pin unstars it');
  assert.equal(a.star, false);
  assert.equal(s.toggleStar(d.id), 'ok');
  const av = place(s, 'avoid', 0.5);
  assert.equal(s.toggleStar(av.id), 'star-avoid', 'avoid is checked before the limit');
  assert.equal(av.star, false);
  assert.equal(s.toggleStar(b.id), 'ok'); // 2 starred: c, d
  const other = place(s, 'other', 0.6);
  assert.equal(s.toggleStar(other.id), 'ok', 'other can be starred');
  assert.equal(other.star, true);
  assert.equal(s.setType(other.id, 'avoid'), true);
  assert.equal(other.star, false, 'a starred pin changed to avoid is unstarred');
  assert.equal(s.toggleStar('nope'), 'none');
});

test('3. fields: intensity 1-10, the per-type lists in list order, caps, control characters, refused values keep the old one', () => {
  const s = setup().make();
  const p = place(s);
  const sendId = () => {
    s.sendId();
    assert.ok(s.state.id);
  };
  assert.equal(s.setIntensity(p.id, 1), true);
  assert.equal(p.intensity, 1);
  assert.equal(s.setIntensity(p.id, 10), true);
  assert.equal(p.intensity, 10);
  for (const bad of [0, 11, 5.5, '7', NaN, -1]) {
    assert.equal(s.setIntensity(p.id, bad as number), false, String(bad));
    assert.equal(p.intensity, 10, 'the old value is kept');
  }
  assert.equal(s.setIntensity(p.id, 10), true, 'the same value again clears it');
  assert.equal(p.intensity, null);
  // quality: in the order of the type's list, any number; a quality of another type's list is refused
  assert.equal(s.toggleQuality(p.id, 'burning'), true);
  assert.equal(s.toggleQuality(p.id, 'sharp'), true);
  assert.deepEqual(fieldsOf(p).quality, ['sharp', 'burning']);
  assert.equal(s.toggleQuality(p.id, 'tingling'), false, 'tingling is not a pain quality');
  assert.equal(s.setType(p.id, 'numb'), true);
  assert.deepEqual(fieldsOf(p).quality, [], 'numb has none of the pain qualities');
  assert.deepEqual([...p.quality].sort(), ['burning', 'sharp'], 'the state keeps them');
  assert.equal(s.toggleQuality(p.id, 'tingling'), true);
  assert.deepEqual(fieldsOf(p).quality, ['tingling']);
  assert.equal(s.setType(p.id, 'pain'), true);
  assert.deepEqual(fieldsOf(p).quality, ['sharp', 'burning'], 'changing back restores the pain answers');
  // tight: worst times in order, any number; refused on pain
  assert.equal(s.toggleWorst(p.id, 'worst' as never), false);
  assert.equal(s.toggleWorst(p.id, 'mornings'), false, 'worst is a tight-only field');
  const t = place(s, 'tight', 0.7);
  assert.equal(s.toggleWorst(t.id, 'evenings'), true);
  assert.equal(s.toggleWorst(t.id, 'mornings'), true);
  assert.deepEqual(fieldsOf(t).worst, ['mornings', 'evenings']);
  assert.equal(s.toggleQuality(t.id, 'stiff'), true);
  assert.equal(s.toggleQuality(t.id, 'sharp'), false);
  // avoid and other: no intensity, the note kept
  for (const type of ['avoid', 'other'] as const) {
    const q = place(s, type, 0.8);
    assert.equal(s.setIntensity(q.id, 5), false, `${type}: intensity refused`);
    assert.equal(s.toggleQuality(q.id, 'sharp'), false);
    assert.equal(s.setText(q.id, 'worse', 'fake'), false, `${type}: no worse field`);
    assert.equal(s.setText(q.id, 'note', 'fake note'), true);
    assert.equal(fieldsOf(q).note, 'fake note');
    assert.equal(fieldsOf(q).intensity, null);
  }
  // course and since
  assert.equal(s.setCourse(p.id, 'acute'), true);
  assert.equal(p.course, 'acute');
  assert.equal(s.setCourse(p.id, 'gone' as never), false);
  assert.equal(p.course, 'acute');
  assert.equal(s.setCourse(p.id, 'acute'), true, 'the same chip again clears it');
  assert.equal(p.course, null);
  assert.equal(s.setSince(p.id, 'better'), true);
  assert.equal(p.since, 'better');
  assert.equal(s.setSince(p.id, 'gone' as never), false);
  assert.equal(p.since, 'better');
  assert.equal(s.setSince(p.id, 'better'), true);
  assert.equal(p.since, null);
  // caps: started 40, worse and better 80, note 140; control characters become a space
  assert.equal(s.setText(p.id, 'started', 'x'.repeat(100)), true);
  assert.equal(p.started.length, bodymap.limits.startedChars);
  assert.equal(s.setText(p.id, 'worse', 'y'.repeat(200)), true);
  assert.equal(p.worse.length, bodymap.limits.detailChars);
  assert.equal(s.setText(p.id, 'better', 'z'.repeat(200)), true);
  assert.equal(p.better.length, bodymap.limits.detailChars);
  assert.equal(s.setText(p.id, 'note', 'n'.repeat(300)), true);
  assert.equal(p.note.length, bodymap.limits.noteChars);
  assert.equal(s.setText(p.id, 'note', 'a\nb\tc\u0007d'), true);
  assert.equal(p.note, 'a b c d');
  // a pin has fieldsOf(): the fields of its type, the rest empty
  const fo = fieldsOf(p);
  assert.deepEqual(Object.keys(fo), ['intensity', 'quality', 'worst', 'course', 'started', 'worse', 'better', 'since', 'note']);
  assert.deepEqual(fo.worst, [], 'a pain pin has no worst times');
  // every change drops the send id
  for (const change of [
    () => s.setIntensity(p.id, 4),
    () => s.toggleQuality(p.id, 'dull'),
    () => s.setCourse(p.id, 'chronic'),
    () => s.setSince(p.id, 'worse'),
    () => s.setText(p.id, 'better', 'fake'),
    () => s.setType(p.id, 'discomfort'),
    () => s.toggleStar(p.id),
  ]) {
    sendId();
    change();
    assert.equal(s.state.id, null);
  }
  // remove, add again: a new id and no answers
  s.removePin(p.id);
  const again = place(s);
  assert.notEqual(again.id, p.id);
  assert.deepEqual([again.intensity, again.quality, again.note], [null, [], '']);
});

test('4. storage v2: every pin and entry key survives a reload; bad values are cleared field by field; a v1 entry is deleted', () => {
  const { make, storage } = setup();
  const a = make();
  const t = place(a, 'tight', 0.2);
  a.setIntensity(t.id, 7);
  a.toggleQuality(t.id, 'knotted');
  a.toggleWorst(t.id, 'still');
  a.setCourse(t.id, 'chronic');
  a.setSince(t.id, 'same');
  a.setText(t.id, 'started', 'last spring');
  a.setText(t.id, 'worse', 'sitting');
  a.setText(t.id, 'better', 'heat');
  a.setText(t.id, 'note', 'fake note');
  a.toggleStar(t.id);
  const o = place(a, 'other', 0.6);
  a.setText(o.id, 'note', 'something odd');
  a.setVisit('followup');
  a.setForWhom('helper');
  a.setHelperName('Sam Sample');
  a.setFirstAt(T0 + 5);
  a.setWhole({ type: 'pain', intensity: 3, quality: ['dull'], worst: [], course: null, started: '', worse: '', better: '', since: null, note: 'fake whole', star: false });
  const b = make(99);
  assert.deepEqual(b.state, a.state, 'reload gives the same state');
  assert.equal(b.state.visit, 'followup');
  assert.equal(b.state.forWhom, 'helper');
  assert.equal(b.state.helperName, 'Sam Sample');
  assert.equal(b.state.firstAt, T0 + 5);
  assert.equal(b.state.whole?.note, 'fake whole');
  // bad values: cleared, field by field
  const raw = JSON.parse((storage as ReturnType<typeof memoryStorage>).data.get(KEY)!);
  raw.pins[0].intensity = 11;
  raw.pins[0].quality = ['knotted', 'bogus'];
  raw.pins[0].worst = ['sometimes'];
  raw.pins[0].since = 'gone';
  raw.pins[0].course = 'maybe';
  raw.visit = 'later';
  raw.forWhom = 'nobody';
  raw.firstAt = 'soon';
  (storage as ReturnType<typeof memoryStorage>).data.set(KEY, JSON.stringify(raw));
  const c = make(5).state;
  assert.deepEqual([c.pins[0].intensity, c.pins[0].quality, c.pins[0].worst, c.pins[0].since, c.pins[0].course], [null, [], [], null, null]);
  assert.equal(c.pins[0].note, 'fake note', 'the good fields stay');
  assert.deepEqual([c.visit, c.forWhom, c.firstAt], [null, null, null]);
  // an unknown type drops that pin only; a whole-body item of type avoid is dropped
  raw.pins[1].type = 'sparkle';
  raw.whole.type = 'avoid';
  (storage as ReturnType<typeof memoryStorage>).data.set(KEY, JSON.stringify(raw));
  const d = make(6).state;
  assert.equal(d.pins.length, 1);
  assert.equal(d.whole, null);
  // Start over and a send empty the new keys too
  const e = make(7);
  e.startOver();
  assert.deepEqual([e.state.whole, e.state.visit, e.state.forWhom, e.state.helperName, e.state.firstAt], [null, null, null, '', null]);
});
