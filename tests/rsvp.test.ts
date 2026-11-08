import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';
import { events, rsvpText } from '../src/data/events.ts';
import { dateLabel, timeLabel } from '../src/lib/events.ts';
import {
  NOJS_GUEST_ROWS,
  rulesOf,
  configOf,
  validateRsvp,
  toBody,
  parseReply,
  parseStatus,
  fill,
  spotsText,
  outcomeLine,
  errServer,
  createRsvp,
  TIP_MAX,
  TIPS_MAX,
  cleanTips,
  shuffle,
  tipDeck,
  resultView,
  confettiPieces,
  reelFor,
} from '../src/lib/rsvp.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const party = events.find((e) => e.slug === 'launch-party')!;
const SLUG = party.slug;

// ---- 1. Fixture cases (E3 runs the same file through the script's validate_) -------------------------------------
interface Case {
  label: string;
  event: 'session' | 'plain';
  input: Record<string, string>;
  ok: boolean;
  fields: string[];
  normalized?: unknown;
  bot?: boolean;
}
const cases: Case[] = JSON.parse(readFileSync(join(root, 'tests/fixtures/rsvp-cases.json'), 'utf8'));
const rules = { session: { maxGuests: 10, session: true }, plain: { maxGuests: 10, session: false } };

test('1. fixture file: at least 24 cases, both event kinds, labels unique', () => {
  assert.ok(cases.length >= 24, `${cases.length} cases`);
  assert.equal(new Set(cases.map((c) => c.label)).size, cases.length);
  assert.ok(cases.some((c) => c.event === 'plain') && cases.some((c) => c.event === 'session'));
});

test('1. every fixture case through validateRsvp gives ok, fields and normalized', () => {
  for (const c of cases) {
    const got = validateRsvp(c.input, rules[c.event]);
    assert.equal(got.ok, c.ok, `${c.label}: ok`);
    assert.deepEqual(got.fields, c.fields, `${c.label}: fields`);
    assert.equal(Boolean(got.bot), Boolean(c.bot), `${c.label}: bot`);
    if (c.normalized) assert.deepStrictEqual(got.normalized, c.normalized, `${c.label}: normalized`);
    else assert.equal(got.normalized, undefined, `${c.label}: no normalized`);
  }
});

test('1. rulesOf reads the launch party', () => {
  assert.deepEqual(rulesOf(party), { maxGuests: 10, session: true });
  assert.deepEqual(rulesOf({ rsvp: { closesAt: '', maxGuests: 4, reminderAt: '', showGoing: false } }), { maxGuests: 4, session: false });
});

// ---- 2. toBody ---------------------------------------------------------------------------------------------------
test('2. toBody: wire fields, slug, mode=json, kept guests only, optin only when ticked, no empty website', () => {
  const v = validateRsvp(
    { name: ' Alex ', email: 'Alex@Example.com', status: 'going', session: 'yes', g1name: '', g2name: 'Sam', g2session: 'no', g3name: 'Jo', g3session: 'yes', optin: 'yes' },
    rules.session,
  );
  assert.ok(v.ok && v.normalized);
  const body = toBody(SLUG, v.normalized!);
  assert.ok(body instanceof URLSearchParams);
  assert.deepEqual(Object.fromEntries(body), {
    slug: SLUG,
    mode: 'json',
    name: 'Alex',
    email: 'alex@example.com',
    status: 'going',
    session: 'yes',
    g1name: 'Sam',
    g1session: 'no',
    g2name: 'Jo',
    g2session: 'yes',
    optin: 'yes',
  });

  const plain = validateRsvp({ name: 'A', email: 'a@example.com', status: 'cant', optin: 'on' }, rules.session);
  const b2 = toBody(SLUG, plain.normalized!);
  assert.deepEqual(Object.fromEntries(b2), { slug: SLUG, mode: 'json', name: 'A', email: 'a@example.com', status: 'cant' });
  assert.ok(!b2.has('website') && !b2.has('optin') && !b2.has('session'));
  assert.equal(toBody(SLUG, plain.normalized!, 'x').get('website'), 'x');
});

// ---- 3. parseReply -----------------------------------------------------------------------------------------------
const json = (o: unknown) => JSON.stringify(o);
test('3. parseReply: every §B10 shape', () => {
  assert.deepEqual(parseReply(json({ ok: true, status: 'going', outcomes: ['confirmed', 'waitlist', 'full', 'maybe', 'no'] })), {
    ok: true,
    status: 'going',
    outcomes: ['confirmed', 'waitlist', 'full', 'maybe', 'no'],
    pending: false,
  });
  assert.deepEqual(parseReply(json({ ok: true, status: 'cant', outcomes: [] })), { ok: true, status: 'cant', outcomes: [], pending: false });
  assert.deepEqual(parseReply(json({ ok: true, status: 'maybe', outcomes: ['maybe'] })), { ok: true, status: 'maybe', outcomes: ['maybe'], pending: false });
  assert.deepEqual(parseReply(json({ ok: true, status: 'going', pending: true, outcomes: [] })), { ok: true, status: 'going', outcomes: [], pending: true });
  assert.deepEqual(parseReply(json({ ok: false, error: 'invalid', fields: ['email', 'g2session'] })), { ok: false, error: 'invalid', fields: ['email', 'g2session'] });
  assert.deepEqual(parseReply(json({ ok: false, error: 'invalid' })), { ok: false, error: 'invalid', fields: [] });
  for (const error of ['closed', 'unknown', 'busy', 'server']) assert.deepEqual(parseReply(json({ ok: false, error })), { ok: false, error });
});

test('3. parseReply: anything else is server', () => {
  const server = { ok: false, error: 'server' };
  assert.deepEqual(parseReply('<!DOCTYPE html><html><body>Error</body></html>'), server);
  assert.deepEqual(parseReply(''), server);
  assert.deepEqual(parseReply('{}'), server);
  assert.deepEqual(parseReply(json({ ok: true })), server); // no status, no outcomes
  assert.deepEqual(parseReply(json({ ok: true, status: 'going' })), server); // no outcomes
  assert.deepEqual(parseReply(json({ ok: true, status: 'going', outcomes: ['confirmed', 'later'] })), server);
  assert.deepEqual(parseReply(json({ ok: true, status: 'sure', outcomes: [] })), server);
  assert.deepEqual(parseReply(json({ ok: false, error: 'duplicate' })), server);
  assert.deepEqual(parseReply(json({ ok: false, error: 'mystery' })), server);
  assert.deepEqual(parseReply(json({ ok: true, status: 'going', outcomes: [] }), 500), server); // a non-200
  assert.deepEqual(parseReply(json({ ok: true, status: 'going', outcomes: [] }), 302), server);
});

test('3. parseStatus: the GET shapes', () => {
  assert.deepEqual(parseStatus(json({ ok: true, open: true, session: { spotsLeft: 2, full: false, waitlist: true } })), {
    ok: true,
    open: true,
    session: { spotsLeft: 2, full: false, waitlist: true },
    tips: [],
  });
  assert.deepEqual(parseStatus(json({ ok: true, open: false, session: null })), { ok: true, open: false, session: null, tips: [] });
  for (const bad of ['', '<html>', '{}', json({ ok: false, error: 'unknown' }), json({ ok: true, open: 'yes', session: null }), json({ ok: true, open: true, session: { spotsLeft: -1, full: false, waitlist: true } })])
    assert.deepEqual(parseStatus(bad), { ok: false }, bad);
  assert.deepEqual(parseStatus(json({ ok: true, open: true, session: null }), 500), { ok: false });
});

// ---- C1–C3 Tips: cleanTips, parseStatus, tipDeck (E6, I-082) -----------------------------------------------------
const X = (n: number) => 'x'.repeat(n);
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

test('C1. cleanTips: strings only, whitespace collapsed, case-insensitive duplicates, 280 characters, 100 tips', () => {
  assert.equal(TIP_MAX, 280);
  assert.equal(TIPS_MAX, 100);
  assert.deepEqual(cleanTips([' a ', 'A', '', 5, null, 'b\nc', X(281), X(280)]), ['a', 'b c', X(280)]);
  assert.deepEqual(cleanTips('a'), []);
  assert.deepEqual(cleanTips(undefined), []);
  assert.deepEqual(cleanTips({ 0: 'a' }), []);
  assert.deepEqual(cleanTips(['x\u0007y', '  z   w ']), ['x y', 'z w']);
  const many = Array.from({ length: 150 }, (_, i) => `tip ${i}`);
  const kept = cleanTips(many);
  assert.equal(kept.length, 100);
  assert.deepEqual(kept, many.slice(0, 100));
});

test('C2. parseStatus: tips are kept when they are strings, [] otherwise, and never fail the status', () => {
  const sess = { spotsLeft: 2, full: false, waitlist: true };
  const base = { ok: true, open: true, session: sess };
  assert.deepEqual(parseStatus(json(base)), { ok: true, open: true, session: sess, tips: [] });
  assert.deepEqual(parseStatus(json({ ...base, tips: ['A', 'B'] })), { ok: true, open: true, session: sess, tips: ['A', 'B'] });
  assert.deepEqual(parseStatus(json({ ok: true, open: false, session: null, tips: ['A'] })), { ok: true, open: false, session: null, tips: ['A'] });
  assert.deepEqual(parseStatus(json({ ...base, tips: 'A' })), { ok: true, open: true, session: sess, tips: [] });
  assert.deepEqual(parseStatus(json({ ...base, tips: [1, {}] })), { ok: true, open: true, session: sess, tips: [] });
  assert.deepEqual(parseStatus(json({ ...base, session: { spotsLeft: -1, full: false, waitlist: true }, tips: ['A'] })), { ok: false });
  assert.deepEqual(parseStatus(json({ ...base, open: 'yes', tips: ['A'] })), { ok: false });
});

test("C3. tipDeck: every block is a permutation, no repeat in a row, the first is the shuffle's first", () => {
  const tips = ['A', 'B', 'C'];
  const deck = tipDeck(tips, lcg(42));
  assert.equal(deck.size, 3);
  const got = Array.from({ length: 9 }, () => deck.next());
  assert.equal(got[0], shuffle(tips, lcg(42))[0]);
  for (let b = 0; b < 9; b += 3) assert.deepEqual([...got.slice(b, b + 3)].sort(), tips, `block ${b / 3}`);
  for (let i = 1; i < got.length; i++) assert.notEqual(got[i], got[i - 1], `repeat at ${i}: ${got.join('')}`);

  const two = tipDeck(['A', 'B'], lcg(5));
  const alt = Array.from({ length: 6 }, () => two.next());
  for (let i = 1; i < alt.length; i++) assert.notEqual(alt[i], alt[i - 1], alt.join(''));

  const one = tipDeck(['only'], lcg(1));
  assert.equal(one.size, 1);
  assert.deepEqual([one.next(), one.next()], ['only', 'only']);

  for (let seed = 1; seed <= 50; seed++) {
    const d = tipDeck(['a', 'b', 'c', 'd'], lcg(seed));
    const seq = Array.from({ length: 30 }, () => d.next());
    for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], `seed ${seed}: ${seq.join('')}`);
  }

  const src = ['a', 'b', 'c'];
  const sh = shuffle(src, lcg(3));
  assert.deepEqual(src, ['a', 'b', 'c'], 'shuffle returns a new array');
  assert.deepEqual([...sh].sort(), src);
});

// ---- 4. Text -----------------------------------------------------------------------------------------------------
test('4. fill: {session} is the lowercase label, {Session} the label as given, unknown keys stay', () => {
  assert.equal(fill('{Session} is full', { session: 'yoga', Session: 'Yoga' }), 'Yoga is full');
  assert.equal(fill('{a} {b}', { a: '1' }), '1 {b}');
});

test('4. spotsText, outcomeLine and errServer give the copy deck lines', () => {
  const t = rsvpText;
  assert.equal(spotsText(t, 'Yoga', 20, true), '20 yoga spots left');
  assert.equal(spotsText(t, 'Yoga', 2, true), '2 yoga spots left');
  assert.equal(spotsText(t, 'Yoga', 1, true), '1 yoga spot left');
  assert.equal(spotsText(t, 'Yoga', 0, true), 'Yoga is full. Answer yes to join the waitlist.');
  assert.equal(spotsText(t, 'Yoga', 0, false), 'Yoga is full.');
  assert.equal(spotsText(t, 'Yoga', 20, false), '20 yoga spots left');

  assert.equal(outcomeLine(t, 'Yoga', 'Alex', 'waitlist'), 'Alex · Yoga: waitlist');
  assert.equal(outcomeLine(t, 'Yoga', 'Alex', 'confirmed'), 'Alex · Yoga: confirmed');
  assert.equal(outcomeLine(t, 'Yoga', 'Alex', 'full'), 'Alex · Yoga: full');
  assert.equal(outcomeLine(t, 'Yoga', 'Alex', 'no'), 'Alex · Yoga: no');
  assert.equal(outcomeLine(t, 'Yoga', 'Alex', 'maybe'), 'Alex · Yoga: no spot held while Maybe');

  const e = errServer(t, site.email);
  assert.ok(e.includes(site.email) && !e.includes('{'), e);
  assert.equal(e, "Something went wrong and your RSVP wasn't saved. Try again in a minute, or email me at " + site.email + '.');
});

// ---- 5. The controller against a fake fetch ----------------------------------------------------------------------
type Res = { status: number; text: () => Promise<string> };
const reply = (o: unknown, status = 200): Res => ({ status, text: async () => (typeof o === 'string' ? o : json(o)) });
function fakeFetch(...queue: (Res | 'hang')[]) {
  const calls: { url: string; init?: Record<string, unknown> }[] = [];
  const fn = (url: string, init?: Record<string, unknown>): Promise<Res> => {
    calls.push({ url, init });
    const next = queue.shift();
    if (next === undefined) throw new Error('unexpected fetch ' + url);
    return next === 'hang' ? new Promise<Res>(() => {}) : Promise.resolve(next);
  };
  return { fn: fn as unknown as typeof fetch, calls };
}
const status = (spotsLeft: number, open = true) => ({ ok: true, open, session: { spotsLeft, full: spotsLeft === 0, waitlist: true } });
const make = (f: ReturnType<typeof fakeFetch>, over: Record<string, unknown> = {}) =>
  createRsvp({ fetch: f.fn, event: configOf(party), text: rsvpText, url: site.rsvpUrl, email: site.email, now: () => Date.parse('2026-11-10T12:00:00-07:00'), ...over });
const alex = { name: 'Alex', email: 'alex@example.com', status: 'going', session: 'yes' };

test('5. load reads the spots; submit posts form-urlencoded, pairs outcomes with names, re-reads', async () => {
  const f = fakeFetch(reply(status(2)), reply({ ok: true, status: 'going', outcomes: ['confirmed', 'waitlist', 'no'] }), reply(status(0)));
  const c = make(f);
  await c.load();
  assert.equal(f.calls[0].url, `${site.rsvpUrl}?slug=launch-party`);
  assert.equal(c.state.spots, '2 yoga spots left');
  assert.equal(c.state.closed, false);

  await c.submit({ ...alex, g1name: 'Sam', g1session: 'yes', g2name: 'Jo', g2session: 'no' });
  const post = f.calls[1];
  assert.equal(post.url, site.rsvpUrl);
  assert.equal(post.init!.method, 'POST');
  assert.ok(post.init!.body instanceof URLSearchParams);
  assert.ok(!('headers' in post.init!), 'no headers: a CORS-simple request');
  assert.deepEqual(Object.keys(post.init!).filter((k) => !['method', 'body', 'signal'].includes(k)), []);
  assert.equal((post.init!.body as URLSearchParams).get('mode'), 'json');
  assert.equal((post.init!.body as URLSearchParams).get('slug'), SLUG);

  const r = c.state.result!;
  assert.equal(r.title, rsvpText.doneTitle);
  assert.equal(r.text, rsvpText.doneText);
  assert.deepEqual(r.lines, ['Alex · Yoga: confirmed', 'Sam · Yoga: waitlist', 'Jo · Yoga: no']);
  assert.equal(r.calendar, true);
  assert.equal(r.note, undefined);
  assert.equal(c.state.sending, false);
  assert.equal(c.state.banner, null);
  assert.equal(f.calls[2].url, `${site.rsvpUrl}?slug=launch-party`); // the re-read
  assert.equal(c.state.spots, 'Yoga is full. Answer yes to join the waitlist.');
});

test('5. a maybe shows the maybe note and the no-spot line', async () => {
  const f = fakeFetch(reply({ ok: true, status: 'maybe', outcomes: ['maybe'] }), reply(status(5)));
  const c = make(f);
  await c.submit({ ...alex, status: 'maybe' });
  const r = c.state.result!;
  assert.deepEqual(r.lines, ['Alex · Yoga: no spot held while Maybe']);
  assert.equal(r.note, "A Maybe doesn't hold a yoga spot. If you decide to come, RSVP again on the event page with this email and choose Going.");
  assert.equal(r.calendar, true);
});

test("5. can't go shows the thanks, no lines, no calendar", async () => {
  const f = fakeFetch(reply({ ok: true, status: 'cant', outcomes: [] }), reply(status(5)));
  const c = make(f);
  await c.submit({ ...alex, status: 'cant' });
  const r = c.state.result!;
  assert.equal(r.title, rsvpText.cantTitle);
  assert.equal(r.text, rsvpText.cantText);
  assert.deepEqual(r.lines, []);
  assert.equal(r.calendar, false);
});

test('5. a repeat RSVP (pending) shows the change text, no outcome line, no calendar button', async () => {
  const f = fakeFetch(reply({ ok: true, status: 'going', pending: true, outcomes: [] }), reply(status(3)));
  const c = make(f);
  await c.submit(alex);
  const r = c.state.result!;
  assert.equal(r.title, rsvpText.changeTitle);
  assert.equal(r.text, rsvpText.changeText);
  assert.deepEqual(r.lines, []);
  assert.equal(r.calendar, false);
  assert.equal(r.note, undefined);
});

test('5. invalid input never reaches the network; messages sit by field, the banner above the form', async () => {
  const f = fakeFetch();
  const c = make(f);
  await c.submit({ name: '', email: 'a@b', status: '', g1name: 'Sam' });
  assert.equal(f.calls.length, 0);
  assert.equal(c.state.result, null);
  assert.equal(c.state.banner, rsvpText.errInvalid);
  assert.deepEqual(c.state.fieldErrors, {
    name: rsvpText.errName,
    email: rsvpText.errEmail,
    status: rsvpText.errStatus,
    session: 'Answer the yoga question.',
    g1session: 'Answer the yoga question for guest 1.',
  });
  assert.equal(c.state.focus, 'name');

  await c.submit({ ...alex, name: 'x'.repeat(81), g2session: 'yes' });
  assert.equal(c.state.fieldErrors.name, rsvpText.errLength);
  assert.equal(c.state.fieldErrors.g2name, "Enter guest 2's name, or remove the guest.");
});

test('5. a server-side invalid, closed or server error', async () => {
  const f = fakeFetch(reply({ ok: false, error: 'invalid', fields: ['email'] }), reply({ ok: false, error: 'busy' }), reply('<html>boom</html>'), reply({ ok: false, error: 'closed' }));
  const c = make(f);
  await c.submit(alex);
  assert.equal(c.state.banner, rsvpText.errInvalid);
  assert.deepEqual(c.state.fieldErrors, { email: rsvpText.errEmail });
  assert.equal(c.state.sending, false);
  await c.submit(alex);
  assert.equal(c.state.banner, errServer(rsvpText, site.email));
  assert.deepEqual(c.state.fieldErrors, {});
  await c.submit(alex);
  assert.equal(c.state.banner, errServer(rsvpText, site.email));
  await c.submit(alex);
  assert.equal(c.state.closed, true);
  assert.equal(c.state.result, null);
});

test('5. a filled honeypot shows a quiet success and sends nothing', async () => {
  const f = fakeFetch();
  const c = make(f);
  await c.submit({ ...alex, website: 'http://spam.example' });
  assert.equal(f.calls.length, 0);
  assert.equal(c.state.result?.title, rsvpText.doneTitle);
  assert.deepEqual(c.state.result?.lines, []);
});

test('5. a failed or closed load: spots stay hidden; after closesAt the form is closed', async () => {
  const bad = make(fakeFetch(reply('<html>', 500)));
  await bad.load();
  assert.equal(bad.state.spots, null);
  assert.equal(bad.state.closed, false);

  const late = make(fakeFetch(), { now: () => Date.parse('2026-11-22T14:00:00-07:00') });
  await late.load(); // no request once the client clock says closed
  assert.equal(late.state.closed, true);

  const serverClosed = make(fakeFetch(reply(status(4, false))));
  await serverClosed.load();
  assert.equal(serverClosed.state.closed, true);
});

test('5. a fetch that never settles gives errServer after 15 seconds', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const f = fakeFetch('hang');
    const c = make(f);
    const p = c.submit(alex);
    await new Promise((r) => setImmediate(r));
    assert.equal(c.state.sending, true);
    mock.timers.tick(14999);
    await new Promise((r) => setImmediate(r));
    assert.equal(c.state.sending, true, 'still waiting at 14.999 s');
    mock.timers.tick(1);
    await p;
    assert.equal(c.state.sending, false);
    assert.equal(c.state.banner, errServer(rsvpText, site.email));
    assert.ok(c.state.banner!.includes(site.email));
  } finally {
    mock.timers.reset();
  }
});

test('5. subscribers hear every state change', async () => {
  const f = fakeFetch(reply({ ok: true, status: 'cant', outcomes: [] }), reply(status(5)));
  const c = make(f);
  const seen: boolean[] = [];
  c.subscribe((s) => seen.push(s.sending));
  await c.submit({ ...alex, status: 'cant' });
  assert.ok(seen.includes(true) && seen.at(-1) === false, JSON.stringify(seen));
});

// ---- C4. The tip in the controller -------------------------------------------------------------------------------
const going = { ok: true, status: 'going', outcomes: ['confirmed'] };
const withTips = (tips?: unknown) => ({ ...status(5), ...(tips === undefined ? {} : { tips }) });

test('C4. a tip follows any ok reply; the button steps through a shuffled deck with no repeats in a row', async () => {
  const tips = ['A', 'B', 'C'];
  const f = fakeFetch(reply(withTips(tips)), reply(going), reply(withTips(tips)));
  const c = make(f, { random: lcg(9) });
  await c.load();
  assert.equal(c.state.tip, null, 'no result yet, no tip');
  assert.equal(c.state.moreTips, false);
  await c.submit(alex);
  assert.ok(tips.includes(c.state.tip!), String(c.state.tip));
  assert.equal(c.state.moreTips, true);
  const seen = [c.state.tip!];
  for (let i = 0; i < 6; i++) {
    c.nextTip();
    seen.push(c.state.tip!);
  }
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], seen.join(''));
  assert.deepEqual([...seen.slice(0, 3)].sort(), tips, 'the first three are all different');
  assert.deepEqual([...seen.slice(3, 6)].sort(), tips);
});

test("C4. can't go and a repeat RSVP also get a tip; invalid and server errors get none", async () => {
  for (const r of [{ ok: true, status: 'cant', outcomes: [] }, { ok: true, status: 'going', outcomes: [], pending: true }]) {
    const c = make(fakeFetch(reply(withTips(['A', 'B'])), reply(r), reply(withTips(['A', 'B']))), { random: lcg(1) });
    await c.load();
    await c.submit(r.status === 'cant' ? { ...alex, status: 'cant' } : alex);
    assert.ok(c.state.result, 'a result');
    assert.ok(['A', 'B'].includes(c.state.tip!), JSON.stringify(r));
  }
  for (const r of [{ ok: false, error: 'invalid', fields: ['name'] }, { ok: false, error: 'server' }]) {
    const c = make(fakeFetch(reply(withTips(['A', 'B'])), reply(r)));
    await c.load();
    await c.submit(alex);
    assert.equal(c.state.result, null, 'no result');
    assert.equal(c.state.tip, null, JSON.stringify(r));
    assert.equal(c.state.moreTips, false);
  }
});

test('C4. the honeypot success also gets a tip once a deck exists', async () => {
  const c = make(fakeFetch(reply(withTips(['A', 'B']))), { random: lcg(8) });
  await c.load();
  await c.submit({ ...alex, website: 'spam' });
  assert.ok(c.state.result);
  assert.ok(['A', 'B'].includes(c.state.tip!));
});

test('C4. no tips in the reply (the E3 script), one tip, a failed first read, and a later read with other tips', async () => {
  const e3 = make(fakeFetch(reply(withTips()), reply(going), reply(withTips())));
  await e3.load();
  await e3.submit(alex);
  assert.ok(e3.state.result);
  assert.equal(e3.state.tip, null, 'an E3-shape GET has no tips');
  assert.equal(e3.state.moreTips, false);

  const one = make(fakeFetch(reply(withTips(['Only'])), reply(going), reply(withTips(['Only']))));
  await one.load();
  await one.submit(alex);
  assert.equal(one.state.tip, 'Only');
  assert.equal(one.state.moreTips, false, 'one tip: no button');
  one.nextTip();
  assert.equal(one.state.tip, 'Only');

  // the first read fails; the re-read after the send has tips and the card appears then
  const late = make(fakeFetch(reply('<html>', 500), reply(going), reply(withTips(['A', 'B']))), { random: lcg(2) });
  await late.load();
  await late.submit(alex);
  assert.ok(['A', 'B'].includes(late.state.tip!));
  assert.equal(late.state.moreTips, true);

  // a later read with other tips does not reset the deck
  const first = make(fakeFetch(reply(withTips(['A', 'B', 'C'])), reply(going), reply(withTips(['X', 'Y'])), reply(withTips(['X', 'Y']))), { random: lcg(4) });
  await first.load();
  await first.submit(alex);
  const kept = first.state.tip;
  assert.ok(['A', 'B', 'C'].includes(kept!));
  await first.load();
  assert.equal(first.state.tip, kept, 'the tip stays');
  for (let i = 0; i < 6; i++) {
    first.nextTip();
    assert.ok(['A', 'B', 'C'].includes(first.state.tip!), 'still the first deck');
  }
});

test('C4. nextTip does nothing before a result; subscribers hear the tip', async () => {
  const c = make(fakeFetch(reply(withTips(['A', 'B'])), reply(going), reply(withTips(['A', 'B']))), { random: lcg(6) });
  await c.load();
  c.nextTip();
  assert.equal(c.state.tip, null);
  const tipsSeen: (string | null)[] = [];
  c.subscribe((s) => tipsSeen.push(s.tip));
  await c.submit(alex);
  assert.ok(tipsSeen.some((t) => t !== null));
});

// ---- E9. The result card: your answer, a line by answer, confetti, the reel (I-094, I-099, I-103, I-105, I-095) ------
type Ok = Extract<ReturnType<typeof parseReply>, { ok: true }>;
const ok = (status: 'going' | 'maybe' | 'cant', outcomes: Ok['outcomes'] = [], pending = false): Ok => ({ ok: true, status, outcomes, pending });

test('E9-1. resultView: the answer, the status line, the cheer and its emoji by answer; none for pending', () => {
  const t = rsvpText;
  const g = resultView(t, 'Yoga', ok('going', ['confirmed']), ['Alex']);
  assert.equal(g.answer, 'going');
  assert.equal(g.statusLine, 'RSVP: Going');
  assert.equal(g.cheer, "Can't wait to see you there!");
  assert.equal(g.cheerEmoji, '');
  assert.equal(g.calendar, true);
  assert.deepEqual(g.lines, ['Alex · Yoga: confirmed']);

  const m = resultView(t, 'Yoga', ok('maybe', ['maybe']), ['Alex']);
  assert.equal(m.answer, 'maybe');
  assert.equal(m.statusLine, 'RSVP: Maybe');
  assert.equal(m.cheer, 'Hope to see you there!');
  assert.equal(m.cheerEmoji, '🤞');
  assert.equal(m.calendar, true);

  const c = resultView(t, 'Yoga', ok('cant'), ['Alex']);
  assert.equal(c.title, t.cantTitle);
  assert.equal(c.text, t.cantText);
  assert.equal(c.answer, 'cant');
  assert.equal(c.statusLine, "RSVP: Can't go");
  assert.equal(c.cheer, "Sorry you can't make it!");
  assert.equal(c.cheerEmoji, '🥲');
  assert.equal(c.calendar, false);
  assert.deepEqual(c.lines, []);

  const p = resultView(t, 'Yoga', ok('going', [], true), ['Alex']);
  assert.equal(p.title, t.changeTitle);
  for (const k of ['answer', 'statusLine', 'cheer', 'cheerEmoji'] as const) assert.equal(p[k], undefined, k);
});

test('E9-2. flow: the honeypot result has no answer; a sent RSVP has one; allTips is the cleaned list and stays put', async () => {
  const bot = make(fakeFetch());
  await bot.submit({ ...alex, website: 'spam' });
  assert.ok(bot.state.result);
  assert.equal(bot.state.result!.answer, undefined);
  assert.equal(bot.state.result!.statusLine, undefined);

  const c = make(fakeFetch(reply(going), reply(withTips([' A ', 'B', 'a', 'C']))), { random: lcg(3) });
  assert.deepEqual(c.allTips(), [], 'no read yet');
  await c.submit(alex);
  assert.equal(c.state.result!.answer, 'going');
  assert.equal(c.state.result!.statusLine, 'RSVP: Going');
  assert.ok(['A', 'B', 'C'].includes(c.state.tip!), String(c.state.tip));
  assert.deepEqual(c.allTips(), ['A', 'B', 'C']);
  c.nextTip();
  c.nextTip();
  assert.deepEqual(c.allTips(), ['A', 'B', 'C']);
});

test('E9-3. confettiPieces: n pieces, every field in range, colour 0–3, the same seed gives the same pieces', () => {
  const a = confettiPieces(24, lcg(7));
  assert.equal(a.length, 24);
  for (const p of a) {
    assert.ok(p.x >= -1 && p.x <= 1, `x ${p.x}`);
    assert.ok(p.y >= -1 && p.y <= -0.4, `y ${p.y}`);
    assert.ok(p.r >= -540 && p.r <= 540, `r ${p.r}`);
    assert.ok(p.delay >= 0 && p.delay <= 150, `delay ${p.delay}`);
    assert.ok(Number.isInteger(p.colour) && p.colour >= 0 && p.colour <= 3, `colour ${p.colour}`);
  }
  assert.deepEqual(confettiPieces(24, lcg(7)), a);
  assert.notDeepEqual(confettiPieces(24, lcg(8)), a);
  assert.ok(new Set(a.map((p) => p.colour)).size > 1, 'more than one colour');
});

test('E9-4. reelFor: count items ending with the landing tip; fillers never the landing tip; no equal neighbours from three tips', () => {
  assert.deepEqual(reelFor(['a'], 'a', lcg(1), 6), ['a']);
  assert.deepEqual(reelFor([], 'a', lcg(1), 6), ['a']);
  assert.deepEqual(reelFor(['a', 'b'], 'a', lcg(1), 6), ['b', 'b', 'b', 'b', 'b', 'a']);
  for (let seed = 1; seed <= 40; seed++) {
    const tips = ['a', 'b', 'c', 'd', 'e'];
    const r = reelFor(tips, 'c', lcg(seed), 6);
    assert.equal(r.length, 6);
    assert.equal(r.at(-1), 'c');
    for (const f of r.slice(0, -1)) assert.notEqual(f, 'c', r.join(''));
    for (let i = 1; i < r.length; i++) assert.notEqual(r[i], r[i - 1], `seed ${seed}: ${r.join('')}`);
    assert.deepEqual(reelFor(tips, 'c', lcg(seed), 6), r, 'seeded runs repeat');
    const three = reelFor(['a', 'b', 'c'], 'a', lcg(seed), 6);
    for (let i = 1; i < three.length; i++) assert.notEqual(three[i], three[i - 1], three.join(''));
  }
});

// ---- 6. The built form -------------------------------------------------------------------------------------------
const built = existsSync(join(dist, 'events/launch-party.html')); // E8, I-092: the page moved under /events
const skipBuilt = built ? false : 'dist/events/launch-party.html is missing; run `npm run build` first';
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const has = (tag: string, name: string) => new RegExp(`\\s${name}(=|\\s|>|/)`).test(tag);
const decode = (s: string) => s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (html: string) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const html = () => readFileSync(join(dist, 'events/launch-party.html'), 'utf8');
const section = () => html().match(/<section\b[^>]*\bid="rsvp"[^>]*>[\s\S]*?<\/section>/)![0];
const form = () => section().match(/<form\b[\s\S]*?<\/form>/)![0];

test('6. dist: the form posts to site.rsvpUrl with slug and mode=html, required fields', { skip: skipBuilt }, () => {
  assert.match(section(), /^<section\b[^>]*\bband-light\b/);
  const f = form();
  const open = f.match(/^<form\b[^>]*>/)![0];
  assert.equal(attr(open, 'method'), 'post');
  assert.equal(decode(attr(open, 'action')!), site.rsvpUrl);
  const inputs = [...f.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
  const byName = (n: string) => inputs.filter((i) => attr(i, 'name') === n);
  assert.equal(attr(byName('slug')[0], 'value'), SLUG);
  assert.equal(attr(byName('slug')[0], 'type'), 'hidden');
  assert.equal(attr(byName('mode')[0], 'value'), 'html');
  for (const n of ['name', 'email']) assert.ok(has(byName(n)[0], 'required'), `${n} required`);
  assert.equal(byName('status').length, 3);
  assert.deepEqual(byName('status').map((i) => attr(i, 'value')), ['going', 'maybe', 'cant']);
  assert.ok(byName('status').every((i) => has(i, 'required')), 'status required');
  assert.deepEqual(byName('session').map((i) => attr(i, 'value')), ['yes', 'no']);
  assert.equal(attr(byName('email')[0], 'type'), 'email');
  assert.equal(attr(byName('email')[0], 'autocomplete'), 'email');
  assert.match(open, /\bdata-text=/);
  assert.deepEqual(JSON.parse(decode(attr(open, 'data-text')!)), rsvpText);
});

test('6. dist: ten guest rows, three visible, no text names a limit', { skip: skipBuilt }, () => {
  const f = form();
  const rows = [...f.matchAll(/<div\b[^>]*\bclass="[^"]*\bguest\b[^"]*"[^>]*>[\s\S]*?<\/div>/g)].map((m) => m[0]);
  assert.equal(rows.length, 10);
  rows.forEach((row, i) => {
    const n = i + 1;
    const tag = row.match(/^<div\b[^>]*>/)![0];
    assert.equal(has(tag, 'hidden'), n > NOJS_GUEST_ROWS, `row ${n} hidden`);
    assert.match(row, new RegExp(`name="g${n}name"`));
    assert.match(row, new RegExp(`name="g${n}session"`));
  });
  assert.equal(NOJS_GUEST_ROWS, 3);

  // Visible text: the whole section minus the hidden rows.
  let visible = section();
  for (const row of rows.slice(NOJS_GUEST_ROWS)) visible = visible.replace(row, '');
  const t = text(visible.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/\sdata-text="[^"]*"/g, ''));
  assert.ok(!/\b10\b|\bmax|\blimit|\bup to\b|\bceiling\b/i.test(t), `a guest limit is named: ${t}`);
});

test('6. dist: opt-in after the guests and before the submit; privacy last; honeypot hidden', { skip: skipBuilt }, () => {
  const f = form();
  const optin = f.match(/<input\b[^>]*\bname="optin"[^>]*>/)![0];
  assert.equal(attr(optin, 'type'), 'checkbox');
  assert.equal(attr(optin, 'value'), 'yes');
  assert.ok(!has(optin, 'checked'), 'not checked by default');
  const iOptin = f.indexOf(optin);
  assert.ok(iOptin > f.indexOf('name="g10session"'), 'after the guests');
  const submit = f.match(/<button\b[^>]*\btype="submit"[^>]*>[\s\S]*?<\/button>/)![0];
  assert.equal(text(submit), rsvpText.submit);
  const iSubmit = f.indexOf(submit);
  assert.ok(iOptin < iSubmit, 'before the submit button');
  const label = f.slice(f.lastIndexOf('<label', iOptin), f.indexOf('</label>', iOptin));
  assert.equal(text(label), rsvpText.optIn);

  const privacy = f.match(/<p\b[^>]*\brsvp-privacy\b[^>]*>[\s\S]*?<\/p>/)![0];
  assert.equal(text(privacy), rsvpText.privacy);
  assert.ok(f.indexOf(privacy) > iSubmit, 'after the submit button');
  assert.equal(f.lastIndexOf('<p'), f.indexOf(privacy), 'the last paragraph');
  assert.match(f.slice(f.indexOf(privacy) + privacy.length), /^\s*<\/form>$/, 'the form ends with the privacy line');

  const hp = f.match(/<input\b[^>]*\bname="website"[^>]*>/)![0];
  assert.equal(attr(hp, 'tabindex'), '-1');
  assert.equal(attr(hp, 'autocomplete'), 'off');
  const wrap = f.slice(f.lastIndexOf('<div', f.indexOf(hp))).match(/^<div\b[^>]*>/)![0];
  assert.match(wrap, /\bvisually-hidden\b/);
  assert.equal(attr(wrap, 'aria-hidden'), 'true');
});

test('6. dist: section order, one script, the hero RSVP button', { skip: skipBuilt }, () => {
  const h = html();
  const iRsvp = h.indexOf('id="rsvp"');
  const iNotice = h.indexOf('Important: Waiver Required');
  const iInfo = h.indexOf('What to wear');
  assert.ok(iInfo > 0 && iRsvp > iInfo && iNotice > iRsvp, 'info, then RSVP, then the notice');
  const scripts = [...h.matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/ld\+json/i.test(m[1]));
  assert.equal(scripts.length, 1);
  const hero = h.match(/<section\b[\s\S]*?<\/section>/)![0];
  const btn = hero.match(/<a\b[^>]*\bhref="#rsvp"[^>]*>[\s\S]*?<\/a>/)![0];
  assert.match(btn, /\bbtn\b/);
  assert.equal(text(btn), rsvpText.heading);
  assert.ok(hero.indexOf(btn) < hero.indexOf('.ics'), 'RSVP before Add to calendar');
  assert.match(section(), new RegExp(`<h2\\b[^>]*>\\s*${rsvpText.heading}\\s*</h2>`));
});

test("6. dist: each guest's yoga question is a visible legend (E4, I-078)", { skip: skipBuilt }, () => {
  const item = party.timeline[party.rsvp!.session!.item];
  const time = timeLabel(item.start, item.end, party.timeZone, 'auto');
  const want = fill(rsvpText.sessionQuestion, { session: 'yoga', Session: 'Yoga', time });
  assert.equal(want, 'Joining yoga (2–3 pm)?');
  for (let n = 1; n <= 10; n++) {
    const input = form().indexOf(`name="g${n}session"`);
    assert.ok(input > 0, `g${n}session`);
    const before = form().slice(0, input);
    const legend = before.slice(before.lastIndexOf('<legend')).match(/^<legend\b[^>]*>[\s\S]*?<\/legend>/)![0];
    assert.ok(!/visually-hidden/.test(legend), `guest ${n}'s legend is visible: ${legend}`);
    assert.equal(text(legend), want, `guest ${n}'s legend text`);
  }
});

test('6. dist: the session question carries the timeline time', { skip: skipBuilt }, () => {
  const item = party.timeline[party.rsvp!.session!.item];
  const time = timeLabel(item.start, item.end, party.timeZone, 'auto');
  const want = fill(rsvpText.sessionQuestion, { session: 'yoga', Session: 'Yoga', time });
  assert.ok(text(form()).includes(want), want);
  assert.ok(dateLabel(party.start, party.timeZone));
});

// ---- E5 (I-086): space between a guest's name and the yoga question ------------------------------------------------
test('6. dist: in every guest card the name field is followed directly by the yoga fieldset (E5, I-086)', { skip: skipBuilt }, () => {
  const rows = [...form().matchAll(/<div\b[^>]*\bclass="[^"]*\bguest\b[^"]*"[^>]*>[\s\S]*?<button\b[^>]*guest-remove/g)].map((m) => m[0]);
  assert.equal(rows.length, 10);
  rows.forEach((row, i) => {
    assert.match(row, /<span class="field"[^>]*>[\s\S]*?<\/span><\/span>\s*<fieldset class="group"[^>]*><legend/, `guest ${i + 1}: span.field then the session fieldset`);
    assert.ok(!/<\/fieldset>\s*<span class="field"/.test(row), `guest ${i + 1}: the name is not after the yoga fieldset`);
  });
});

test('source: the guest card spacing rule matches the markup (E5, I-086)', () => {
  const src = readFileSync(join(root, 'src/components/events/RsvpForm.astro'), 'utf8');
  assert.ok(!src.includes('.guest .group + .group'), 'the rule that never matched is gone');
  assert.match(src, /\.guest \.field \+ \.group\s*\{\s*margin-top: var\(--s-4\);\s*\}/);
});

// The whole <div …>…</div> whose opening tag matches `open` (nested divs counted), or null.
function divBlock(src: string, open: RegExp): string | null {
  const m = new RegExp(open.source, 'g').exec(src);
  if (!m) return null;
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = m.index;
  let depth = 0;
  for (let t = tags.exec(src); t; t = tags.exec(src)) {
    depth += t[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return src.slice(m.index, t.index + t[0].length);
  }
  return null;
}
// The opening tags of an element's direct children.
function childTags(block: string): string[] {
  const inner = block.slice(block.indexOf('>') + 1, block.lastIndexOf('<'));
  const out: string[] = [];
  let depth = 0;
  for (const t of inner.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/g)) {
    if (t[1]) depth--;
    else {
      if (depth === 0) out.push(t[0]);
      if (!t[3]) depth++;
    }
  }
  return out;
}
const RESULT_OPEN = /<div\b[^>]*\bclass="rsvp-result"[^>]*>/;
const TIP_OPEN = /<div\b[^>]*\bclass="rsvp-tip"[^>]*>/;

test('C5. dist: the tip card is a hidden sibling after the result, with a live text and a hidden button', { skip: skipBuilt }, () => {
  const sec = section();
  const result = [divBlock(sec, RESULT_OPEN)!];
  const tipBlock = divBlock(sec, TIP_OPEN);
  const tip = tipBlock ? [tipBlock] : null;
  assert.ok(tip, 'the .rsvp-tip card');
  assert.ok(sec.indexOf(tip![0]) >= sec.indexOf(result[0]) + result[0].length, 'after .rsvp-result ends, not inside it');
  assert.ok(!result[0].includes('rsvp-tip'), 'not inside the result');
  assert.ok(has(tip![0].match(/^<div\b[^>]*>/)![0], 'hidden'), 'hidden without JS');
  const h3 = tip![0].match(/<h3\b[^>]*>[\s\S]*?<\/h3>/)![0];
  assert.equal(text(h3), rsvpText.tipTitle);
  const p = tip![0].match(/<p\b[^>]*\brsvp-tip__text\b[^>]*>/)![0];
  assert.equal(attr(p, 'aria-live'), 'polite');
  const btn = tip![0].match(/<button\b[^>]*>[\s\S]*?<\/button>/)![0];
  assert.equal(attr(btn, 'type'), 'button');
  assert.ok(has(btn.match(/^<button\b[^>]*>/)![0], 'hidden'), 'the button starts hidden');
  assert.equal(text(btn), rsvpText.tipNext);
  const data = JSON.parse(decode(attr(form().match(/^<form\b[^>]*>/)![0], 'data-text')!));
  assert.equal(data.tipTitle, rsvpText.tipTitle);
  assert.equal(data.tipNext, rsvpText.tipNext);
});

test('E9-5. dist: the result card children in order, the emoji hidden, the actions row, the tip title and window', { skip: skipBuilt }, () => {
  const sec = section();
  const result = divBlock(sec, RESULT_OPEN)!;
  const cls = (tag: string) => attr(tag, 'class') ?? '';
  assert.deepEqual(
    childTags(result).map(cls),
    ['rsvp-result__title', 'rsvp-result__text', 'rsvp-result__status', 'rsvp-result__cheer', 'rsvp-lines', 'rsvp-result__note', 'rsvp-result__actions'],
  );
  const cheer = result.match(/<p\b[^>]*\brsvp-result__cheer\b[^>]*>[\s\S]*?<\/p>/)![0];
  assert.ok(/<span\b[^>]*class="rsvp-result__cheer-text"/.test(cheer), 'the cheer text span');
  const emoji = cheer.match(/<span\b[^>]*\brsvp-result__emoji\b[^>]*>/)![0];
  assert.equal(attr(emoji, 'aria-hidden'), 'true');
  assert.ok(cheer.indexOf('rsvp-result__cheer-text') < cheer.indexOf('rsvp-result__emoji'), 'text, then the emoji');

  const actions = divBlock(result, /<div\b[^>]*\brsvp-result__actions\b[^>]*>/)!;
  const links = [...actions.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);
  assert.equal(links.length, 2, 'the calendar link and one notice');
  assert.ok(links[0].includes('rsvp-result__calendar'));
  const waiver = party.notices.find((n) => n.id === 'waiver')!;
  assert.equal(waiver.inResult, true);
  const notice = links[1];
  const open = notice.match(/^<a\b[^>]*>/)![0];
  assert.ok(/\brsvp-result__notice\b/.test(cls(open)) && /\bbtn\b/.test(cls(open)), cls(open));
  assert.equal(decode(attr(open, 'href')!), waiver.link!.url);
  assert.equal(attr(open, 'target'), '_blank');
  assert.equal(attr(open, 'rel'), 'noopener');
  assert.ok(has(open, 'hidden'), 'hidden until a Going or Maybe result');
  assert.equal(text(notice), 'Fill out the waiver');

  const tip = divBlock(sec, TIP_OPEN)!;
  assert.equal(text(tip.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/)![0]), 'Self-care tip');
  const win = divBlock(tip, /<div\b[^>]*\brsvp-tip__window\b[^>]*>/);
  assert.ok(win && /\brsvp-tip__text\b/.test(win), 'the text sits inside the window');

  const data = JSON.parse(decode(attr(form().match(/^<form\b[^>]*>/)![0], 'data-text')!));
  for (const k of ['resultStatus', 'cheerGoing', 'cheerMaybe', 'cheerCant', 'cheerMaybeEmoji', 'cheerCantEmoji'] as const)
    assert.equal(data[k], rsvpText[k], k);
  assert.equal(data.tipTitle, 'Self-care tip');
  assert.equal(data.reminderTip, 'Self-care tip: {tip}');
});

// `@media (prefers-reduced-motion: no-preference) { … }` blocks, as [start, end) ranges (braces counted).
function noPreferenceRanges(css: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of css.matchAll(/@media[^{]*prefers-reduced-motion:\s*no-preference[^{]*\{/g)) {
    let depth = 0;
    for (let i = m.index! + m[0].length - 1; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) {
        out.push([m.index!, i + 1]);
        break;
      }
    }
  }
  return out;
}

test('E9-6. source: the keyframes sit under no-preference, one-shot, tokens only; the script gates motion and sets text only', () => {
  const read = (p: string) => readFileSync(join(root, p), 'utf8');
  const astro = read('src/components/events/RsvpForm.astro');
  const css = astro.slice(astro.indexOf('<style>'));
  const ranges = noPreferenceRanges(css);
  for (const name of ['ohm-confetti', 'ohm-wiggle', 'ohm-droop', 'ohm-reel']) {
    const at = css.indexOf(`@keyframes ${name}`);
    assert.ok(at >= 0, `@keyframes ${name}`);
    assert.ok(ranges.some(([a, b]) => at > a && at < b), `${name} inside a prefers-reduced-motion: no-preference block`);
  }
  assert.ok(!/\binfinite\b/.test(css), 'no infinite animation');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), 'no raw hex');
  const tipRule = css.match(/\.rsvp-tip\s*\{[^}]*\}/)![0];
  assert.match(tipRule, /background:\s*var\(--bg-dark\)/);
  assert.match(tipRule, /border-top:\s*3px solid var\(--accent\)/);

  const script = read('src/scripts/rsvp.ts');
  assert.ok(script.includes('prefers-reduced-motion: reduce'), 'one matchMedia check');
  assert.ok(script.includes('visually-hidden'), 'the heading is visually hidden, not hidden');
  for (const bad of ['.animate(', 'requestAnimationFrame', 'innerHTML']) assert.ok(!script.includes(bad), bad);
});

// ---- 7. Source ---------------------------------------------------------------------------------------------------
test('7. rsvp.ts keeps the visitor private; the URL lives only in site.ts', () => {
  const read = (p: string) => readFileSync(join(root, p), 'utf8');
  for (const p of ['src/scripts/rsvp.ts', 'src/lib/rsvp.ts']) {
    const src = read(p);
    for (const bad of ['localStorage', 'sessionStorage', 'document.cookie', 'console.', 'history.', 'location.search', 'headers:', 'indexedDB'])
      assert.ok(!src.includes(bad), `${p} uses ${bad}`);
    assert.ok(!src.includes('script.google.com'), `${p} holds the URL`);
  }
  assert.match(site.rsvpUrl, /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/);
  assert.ok(read('src/data/site.ts').includes(site.rsvpUrl));
  const others = ['src/components/events/RsvpForm.astro', 'src/components/events/EventHero.astro', 'src/pages/events/[event].astro', 'src/scripts/rsvp.ts', 'src/lib/rsvp.ts'];
  for (const p of others) assert.ok(!read(p).includes('script.google.com'), `${p} holds the URL`);
});

test('C6. source: the tip is shown as text; outside the no-preference block the tip card has no transition or animation (E9: the reel lives inside it)', () => {
  const read = (p: string) => readFileSync(join(root, p), 'utf8');
  const script = read('src/scripts/rsvp.ts');
  assert.ok(!script.includes('innerHTML') && !script.includes('insertAdjacentHTML'), 'textContent only');
  assert.ok(script.includes('.rsvp-tip'), 'the script drives the card');
  const full = read('src/components/events/RsvpForm.astro');
  let css = full;
  for (const [a, b] of noPreferenceRanges(full).reverse()) css = css.slice(0, a) + css.slice(b);
  const rules = [...css.matchAll(/[^{}]*\.rsvp-tip[^{}]*\{[^}]*\}/g)].map((m) => m[0]);
  assert.ok(rules.length >= 2, 'the card has CSS');
  for (const r of rules) assert.ok(!/transition|animation/.test(r), r);
});
