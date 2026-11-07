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
  });
  assert.deepEqual(parseStatus(json({ ok: true, open: false, session: null })), { ok: true, open: false, session: null });
  for (const bad of ['', '<html>', '{}', json({ ok: false, error: 'unknown' }), json({ ok: true, open: 'yes', session: null }), json({ ok: true, open: true, session: { spotsLeft: -1, full: false, waitlist: true } })])
    assert.deepEqual(parseStatus(bad), { ok: false }, bad);
  assert.deepEqual(parseStatus(json({ ok: true, open: true, session: null }), 500), { ok: false });
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

// ---- 6. The built form -------------------------------------------------------------------------------------------
const built = existsSync(join(dist, 'launch-party.html'));
const skipBuilt = built ? false : 'dist/launch-party.html is missing; run `npm run build` first';
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const has = (tag: string, name: string) => new RegExp(`\\s${name}(=|\\s|>|/)`).test(tag);
const decode = (s: string) => s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (html: string) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const html = () => readFileSync(join(dist, 'launch-party.html'), 'utf8');
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
  const others = ['src/components/events/RsvpForm.astro', 'src/components/events/EventHero.astro', 'src/pages/[event].astro', 'src/scripts/rsvp.ts', 'src/lib/rsvp.ts'];
  for (const p of others) assert.ok(!read(p).includes('script.google.com'), `${p} holds the URL`);
});
