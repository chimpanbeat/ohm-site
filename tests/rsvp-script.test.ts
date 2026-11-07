// E3: the RSVP Apps Script (apps-script/rsvp.js), run in node:vm with fakes for every Google service and a settable
// clock. No network, no dist/. Fixture emails use example.com only (check:secrets). ARCHITECTURE §B10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';
import { events, rsvpText } from '../src/data/events.ts';
import { feedFor } from '../src/lib/events.ts';
import { fill, words, outcomeLine } from '../src/lib/rsvp.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = join(root, 'apps-script/rsvp.js');
const manifestPath = join(root, 'apps-script/appsscript.json');
const src = readFileSync(scriptPath, 'utf8');
const party = events.find((e) => e.slug === 'launch-party')!;
const SLUG = party.slug;
const SHEET_ID = 'fake-sheet-id-0123456789abcdef';
const EXEC = 'https://exec.example.com/macros/exec';
const HOUR = 3_600_000;
const MIN = 60_000;
const CLOCK0 = Date.parse('2026-11-10T12:00:00-07:00');
const REMINDER_AT = Date.parse(party.rsvp!.reminderAt);
const CLOSES_AT = Date.parse(party.rsvp!.closesAt);
const HEADER = ['Submitted', 'Changed', 'RSVP', 'Who', 'Name', 'Email', 'Opt-in', 'Status', 'Yoga', 'Waitlist #', 'Reminder sent'];
const COL = { submitted: 0, changed: 1, id: 2, who: 3, name: 4, email: 5, optin: 6, status: 7, cell: 8, wait: 9, reminder: 10 };
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ---- The fakes ---------------------------------------------------------------------------------------------------

class FakeSheet {
  rows: unknown[][] = [];
  name: string;
  env: { log: string[]; state: { failSetValues: boolean; realSheets?: boolean } };
  constructor(name: string, env: { log: string[]; state: { failSetValues: boolean } }) {
    this.name = name;
    this.env = env;
  }
  getName() {
    return this.name;
  }
  getMaxRows() {
    return 1000;
  }
  getLastRow() {
    return this.rows.length;
  }
  getDataRange() {
    return {
      getValues: () => {
        this.env.log.push('read');
        // realSheets: Sheets hands back Date objects for time-looking text and numbers for digits
        const real = (r: unknown[]) =>
          r.map((v, c) => {
            if (!this.env.state.realSheets) return v;
            if ((c === 0 || c === 1 || c === 10) && typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v)) return new Date(v);
            if (c === 9 && v !== '') return Number(v);
            return v;
          });
        return this.rows.map((r, i) => (i === 0 ? [...r] : real(r)));
      },
    };
  }
  getRange(r: number, c: number, h = 1, w = 1) {
    return {
      setValues: (vals: unknown[][]) => {
        this.env.log.push('setValues');
        if (this.env.state.failSetValues) throw new Error('sheet write failed');
        assert.equal(vals.length, h, 'setValues height');
        for (let i = 0; i < h; i++) {
          assert.equal(vals[i].length, w, 'setValues width');
          while (this.rows.length < r - 1 + i + 1) this.rows.push([]);
          const row = this.rows[r - 1 + i];
          for (let j = 0; j < w; j++) row[c - 1 + j] = vals[i][j];
        }
      },
      setNumberFormat: () => {
        this.env.log.push('numberFormat');
      },
    };
  }
  deleteRow(n: number) {
    this.env.log.push('deleteRow');
    this.rows.splice(n - 1, 1);
  }
}

type Feed = ReturnType<typeof feedFor> & Record<string, any>;

function makeEnv(tweak?: (feed: any) => void) {
  const feed: any = plain(feedFor(party, site.deploy.site));
  tweak?.(feed);
  const clock = { now: CLOCK0 };
  const log: string[] = [];
  const state: any = { lockBusy: false, realSheets: false, failSetValues: false, failMail: false, quota: 1500, fetches: 0, feedStatus: 200 };
  const mails: Record<string, string>[] = [];
  const sheets = new Map<string, FakeSheet>();
  const cacheStore = new Map<string, { v: string; exp: number }>();
  const props: Record<string, string> = { SHEET_ID };
  const triggers: any[] = [];
  const logger: string[] = [];
  const jsonReplies: string[] = [];
  const htmlReplies: string[] = [];
  const fetched: string[] = [];

  class FakeDate extends Date {
    constructor(...a: any[]) {
      if (a.length === 0) super(clock.now);
      else super(...(a as [any]));
    }
    static now() {
      return clock.now;
    }
  }

  const ss = {
    getSheetByName: (n: string) => sheets.get(n) ?? null,
    insertSheet: (n: string) => {
      log.push('insertSheet');
      const s = new FakeSheet(n, { log, state });
      sheets.set(n, s);
      return s;
    },
    getSheets: () => [...sheets.values()],
  };
  const out = (kind: 'json' | 'html', body: string) => {
    const o: any = {
      kind,
      body,
      title: '',
      getContent: () => body,
      setMimeType: () => o,
      setTitle: (t: string) => {
        o.title = t;
        return o;
      },
      addMetaTag: () => o,
    };
    return o;
  };
  const globals = {
    Date: FakeDate,
    SpreadsheetApp: {
      openById: (id: string) => {
        log.push('openById');
        if (id !== SHEET_ID) throw new Error('wrong sheet id');
        return ss;
      },
      flush: () => {
        log.push('flush');
      },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          log.push('tryLock');
          return !state.lockBusy;
        },
        releaseLock: () => {
          log.push('releaseLock');
        },
      }),
    },
    MailApp: {
      sendEmail: (m: Record<string, string>) => {
        if (state.failMail) throw new Error('mail down');
        mails.push(plain(m));
        state.quota--;
      },
      getRemainingDailyQuota: () => state.quota,
    },
    UrlFetchApp: {
      fetch: (url: string) => {
        state.fetches++;
        fetched.push(url);
        const ok = state.feedStatus === 200 && url === `${site.deploy.site}/events/${feed.slug}.json`;
        return { getResponseCode: () => (ok ? 200 : 404), getContentText: () => (ok ? JSON.stringify(feed) : 'not found') };
      },
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => {
          const e = cacheStore.get(k);
          if (!e) return null;
          if (clock.now >= e.exp) {
            cacheStore.delete(k);
            return null;
          }
          return e.v;
        },
        put: (k: string, v: string, sec = 600) => {
          cacheStore.set(k, { v: String(v), exp: clock.now + sec * 1000 });
        },
        remove: (k: string) => {
          cacheStore.delete(k);
        },
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null }) },
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (s: string) => out('json', s) },
    HtmlService: { createHtmlOutput: (s: string) => out('html', s) },
    ScriptApp: {
      getService: () => ({ getUrl: () => EXEC }),
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t: any) => {
        triggers.splice(triggers.indexOf(t), 1);
      },
      newTrigger: (fn: string) => ({
        timeBased: () => ({
          everyMinutes: (n: number) => ({
            create: () => {
              const t = { fn, every: n, getHandlerFunction: () => fn };
              triggers.push(t);
              return t;
            },
          }),
        }),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      getUuid: () => randomUUID(),
      computeDigest: (_a: string, s: string) => Array.from(createHash('sha256').update(String(s)).digest(), (b) => (b > 127 ? b - 256 : b)),
      base64Encode: (bytes: number[]) => Buffer.from(bytes.map((b) => b & 255)).toString('base64'),
    },
    Logger: { log: (s: string) => logger.push(String(s)) },
  };
  const ctx = vm.createContext(globals);
  const api: any = vm.runInContext(`${src}\n;({ doGet, doPost, sendDueReminders, setup, validate_ })`, ctx);

  const record = (o: any) => {
    if (o.kind === 'json') jsonReplies.push(o.getContent());
    else htmlReplies.push(o.getContent());
    return o;
  };
  const env = {
    feed: feed as Feed,
    clock,
    log,
    state,
    mails,
    sheets,
    props,
    triggers,
    logger,
    jsonReplies,
    htmlReplies,
    fetched,
    api,
    /** POST → the parsed JSON reply. */
    post(params: Record<string, string>) {
      const o = record(api.doPost({ parameter: params }));
      assert.equal(o.kind, 'json', `expected a JSON reply, got ${o.kind}`);
      return JSON.parse(o.getContent());
    },
    /** POST → the HTML page. */
    postHtml(params: Record<string, string>): string {
      const o = record(api.doPost({ parameter: { ...params, mode: 'html' } }));
      assert.equal(o.kind, 'html', `expected an HTML page, got ${o.kind}`);
      return o.getContent();
    },
    /** POST the confirm form of a change link. */
    applyChange(token: string): string {
      return env.postHtml({ change: token });
    },
    get(params: Record<string, string>) {
      const o = record(api.doGet({ parameter: params }));
      return o.kind === 'json' ? JSON.parse(o.getContent()) : (o.getContent() as string);
    },
    getPage(params: Record<string, string>): string {
      const o = record(api.doGet({ parameter: params }));
      assert.equal(o.kind, 'html');
      return o.getContent();
    },
    sheet(slug = SLUG): FakeSheet {
      return sheets.get(slug)!;
    },
    /** Data rows (no header), as plain arrays. */
    data(slug = SLUG): unknown[][] {
      return (sheets.get(slug)?.rows ?? []).slice(1).map((r) => [...r]);
    },
    status() {
      return env.get({ slug: SLUG }) as any;
    },
    /** The change token in the last mail to `to`. */
    token(to: string): string {
      const m = [...mails].reverse().find((x) => x.to === to && /\?change=/.test(x.body));
      assert.ok(m, `no change mail to ${to}`);
      return /\?change=([0-9a-f-]+)/.exec(m!.body)![1];
    },
    iso: () => new Date(clock.now).toISOString(),
  };
  return env;
}
type Env = ReturnType<typeof makeEnv>;

interface P {
  name?: string;
  email: string;
  status?: string;
  session?: string;
  guests?: [string, string][];
  optin?: boolean;
}
function params(p: P): Record<string, string> {
  const status = p.status ?? 'going';
  const o: Record<string, string> = { slug: SLUG, name: p.name ?? 'Pat Doe', email: p.email, status };
  const session = p.session ?? (status === 'cant' ? undefined : 'yes');
  if (session) o.session = session;
  (p.guests ?? []).forEach(([n, a], i) => {
    o[`g${i + 1}name`] = n;
    o[`g${i + 1}session`] = a;
  });
  if (p.optin) o.optin = 'yes';
  return o;
}
const rsvp = (env: Env, p: P) => env.post(params(p));
/** Request a change from the stored address and press Confirm; returns the confirm page's reply. */
function change(env: Env, stored: string, p: P): string {
  const r = env.post(params({ ...p, email: stored }));
  assert.equal(r.pending, true, 'the repeat RSVP is pending');
  return env.applyChange(env.token(stored));
}

// ---- Expected email text, built from the copy deck's layout (§Emails) --------------------------------------------

const T = rsvpText as Record<string, string>;
const vars = (f: Feed) => ({ title: f.title, dateLabel: f.dateLabel, timeLabel: f.timeLabel, venue: f.venue.name, address: f.venue.address, icsUrl: f.icsUrl, pageUrl: f.pageUrl, siteName: f.sender.name });
const OUT_KEY: Record<string, string> = { confirmed: 'confirmed', waitlist: 'waitlist', full: 'full', maybe: 'maybe', no: 'no' };
const noticeBlocks = (f: Feed) => f.notices.map((n: any) => [n.title, n.text, n.url].filter(Boolean).join('\n'));
function expectConfirm(f: Feed, name: string, status: 'going' | 'maybe', people: [string, string][], opts: { waitlist?: boolean; maybe?: boolean } = {}): string {
  const v = vars(f);
  const lines = people.map(([n, o]) => `- ${outcomeLine(T, 'Yoga', n, OUT_KEY[o] as any)}`);
  if (opts.waitlist) lines.push(T.waitlistNote);
  if (opts.maybe) lines.push(fill(T.maybeNote, words('Yoga')));
  return [
    fill(T.hi, { name }),
    fill(T.confirmLead, { ...v, status: T[status] }),
    [fill(T.when, v), fill(T.where, v)].join('\n'),
    lines.length ? lines.join('\n') : '',
    ...noticeBlocks(f),
    [fill(T.calendarLine, v), fill(T.detailsLine, v)].join('\n'),
    T.changeLine,
    fill(T.signoff, v),
  ]
    .filter(Boolean)
    .join('\n\n');
}
function expectReminder(f: Feed, name: string, people: [string, string][], maybe = false): string {
  const v = vars(f);
  const lines = people.map(([n, o]) => `- ${outcomeLine(T, 'Yoga', n, OUT_KEY[o] as any)}`);
  if (maybe) lines.push(fill(T.maybeNote, words('Yoga')));
  return [
    fill(T.hi, { name }),
    fill(T.reminderLead, v),
    [fill(T.when, v), fill(T.where, v)].join('\n'),
    ...f.reminderInfo.map((b: any) => [b.title, b.text ?? '', ...(b.items ?? []).map((i: string) => `- ${i}`)].filter(Boolean).join('\n')),
    lines.join('\n'),
    ...noticeBlocks(f),
    [fill(T.detailsLine, v), fill(T.calendarLine, v)].join('\n'),
    fill(T.signoff, v),
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ---- 1. Parity ---------------------------------------------------------------------------------------------------

test('1. every rsvp-cases.json case through validate_ matches validateRsvp (incl. optin)', () => {
  const env = makeEnv();
  const cases = JSON.parse(readFileSync(join(root, 'tests/fixtures/rsvp-cases.json'), 'utf8'));
  assert.ok(cases.length >= 24);
  const evs = { session: { maxGuests: 10, session: { key: 'yoga', label: 'Yoga', limit: 20, waitlist: true, time: '2–3 pm' } }, plain: { maxGuests: 10, session: null } };
  for (const c of cases) {
    const got = plain(env.api.validate_(c.input, evs[c.event as 'session' | 'plain']));
    assert.equal(got.ok, c.ok, `${c.label}: ok`);
    assert.deepStrictEqual(got.fields, c.fields, `${c.label}: fields`);
    assert.equal(Boolean(got.bot), Boolean(c.bot), `${c.label}: bot`);
    if (c.normalized) assert.deepStrictEqual(got.normalized, c.normalized, `${c.label}: normalized`);
    else assert.equal(got.normalized, undefined, `${c.label}: no normalized`);
  }
});

// ---- 2. Cap sequence ---------------------------------------------------------------------------------------------

test('2. cap sequence: limit 20 with a waitlist, the queue, maybe, Brian\'s hand edits', () => {
  const env = makeEnv();
  for (let i = 1; i <= 19; i++) {
    const r = rsvp(env, { name: `Person ${i}`, email: `p${i}@example.com` });
    assert.deepStrictEqual(r, { ok: true, status: 'going', outcomes: ['confirmed'] }, `RSVP ${i}`);
  }
  assert.deepStrictEqual(env.sheet().rows[0], HEADER);
  assert.deepStrictEqual(env.status(), { ok: true, open: true, session: { spotsLeft: 1, full: false, waitlist: true } });

  const r = rsvp(env, { name: 'You One', email: 'you@example.com', guests: [['Gee One', 'yes'], ['Gee Two', 'no']] });
  assert.deepStrictEqual(r.outcomes, ['confirmed', 'waitlist', 'no']);
  const rows = env.data();
  const mine = rows.filter((x) => x[COL.name] === 'You One' || x[COL.name] === 'Gee One' || x[COL.name] === 'Gee Two');
  assert.deepStrictEqual(mine.map((x) => x[COL.who]), ['you', 'guest', 'guest']);
  assert.equal(new Set(mine.map((x) => x[COL.id])).size, 1, 'one RSVP id');
  assert.deepStrictEqual(mine.map((x) => x[COL.cell]), ['confirmed', 'waitlist', 'no']);
  assert.equal(Number(mine[1][COL.wait]), 1);
  assert.equal(mine[1][COL.email], '', 'guest rows carry no email');
  assert.deepStrictEqual(env.status().session, { spotsLeft: 0, full: true, waitlist: true });

  assert.deepStrictEqual(rsvp(env, { name: 'Late', email: 'late@example.com' }).outcomes, ['waitlist']);
  assert.equal(Number(env.data().find((x) => x[COL.name] === 'Late')![COL.wait]), 2);

  const before = JSON.stringify(env.status());
  assert.deepStrictEqual(rsvp(env, { name: 'Maybe Yes', email: 'mb@example.com', status: 'maybe', guests: [['Mb Guest', 'yes']] }).outcomes, ['maybe', 'maybe']);
  assert.equal(JSON.stringify(env.status()), before, 'a maybe holds no spot');

  // Brian edits one confirmed cell to no: the queue still holds, so GET stays 0 and the next yes joins the waitlist
  const sheet = env.sheet();
  const firstConfirmed = sheet.rows.findIndex((x, i) => i > 0 && x[COL.cell] === 'confirmed');
  sheet.rows[firstConfirmed][COL.cell] = 'no';
  assert.equal(env.status().session.spotsLeft, 0);
  assert.deepStrictEqual(rsvp(env, { name: 'Third', email: 'third@example.com' }).outcomes, ['waitlist']);
  assert.equal(Number(env.data().find((x) => x[COL.name] === 'Third')![COL.wait]), 3);

  // Brian sets #1-#3 to confirmed, no, no: nobody waits and the session is at its limit
  const setWait = (n: number, v: string) => {
    const row = sheet.rows.find((x, i) => i > 0 && Number(x[COL.wait]) === n)!;
    row[COL.cell] = v;
  };
  setWait(1, 'confirmed');
  setWait(2, 'no');
  setWait(3, 'no');
  assert.deepStrictEqual(env.status().session, { spotsLeft: 0, full: true, waitlist: true });

  assert.deepStrictEqual(rsvp(env, { name: 'Nope', email: 'no@example.com', session: 'no' }).outcomes, ['no']);
});

// ---- 3. Waitlist off ---------------------------------------------------------------------------------------------

test('3. waitlist off: a yes at the limit is full, and full and spotsLeft read 0', () => {
  const env = makeEnv((f) => {
    f.session.limit = 2;
    f.session.waitlist = false;
  });
  assert.deepStrictEqual(rsvp(env, { email: 'a@example.com', guests: [['B', 'yes']] }).outcomes, ['confirmed', 'confirmed']);
  assert.deepStrictEqual(rsvp(env, { email: 'c@example.com' }).outcomes, ['full']);
  assert.deepStrictEqual(env.status().session, { spotsLeft: 0, full: true, waitlist: false });
  assert.ok(env.data().every((x) => x[COL.wait] === '' || x[COL.wait] === undefined), 'no Waitlist # when off');
});

// ---- 4. Lock -----------------------------------------------------------------------------------------------------

test('4. lock: before the first read, after the flush; a write error releases and replies server; busy writes nothing', () => {
  const env = makeEnv();
  rsvp(env, { email: 'lock@example.com' });
  const first = Math.min(...['openById', 'read', 'insertSheet'].map((k) => env.log.indexOf(k)).filter((i) => i >= 0));
  assert.ok(env.log.indexOf('tryLock') >= 0 && env.log.indexOf('tryLock') < first, `tryLock before the first sheet access: ${env.log.join(',')}`);
  assert.ok(env.log.lastIndexOf('flush') < env.log.lastIndexOf('releaseLock'), 'flush before releaseLock');
  assert.equal(env.log.filter((x) => x === 'tryLock').length, env.log.filter((x) => x === 'releaseLock').length, 'every lock is released');

  const mailsBefore = env.mails.length;
  const rowsBefore = JSON.stringify(env.sheet().rows);
  env.state.failSetValues = true;
  env.log.length = 0;
  assert.deepStrictEqual(env.post(params({ email: 'boom@example.com' })), { ok: false, error: 'server' });
  assert.ok(env.log.includes('releaseLock'), 'lock released after a throw');
  assert.equal(env.mails.length, mailsBefore, 'no mail');
  env.state.failSetValues = false;

  env.state.lockBusy = true;
  assert.deepStrictEqual(env.post(params({ email: 'busy@example.com' })), { ok: false, error: 'busy' });
  assert.equal(JSON.stringify(env.sheet().rows), rowsBefore, 'nothing written');
  assert.equal(env.mails.length, mailsBefore);

  // change apply while busy
  env.state.lockBusy = false;
  env.post(params({ email: 'lock@example.com', status: 'maybe' }));
  const token = env.token('lock@example.com');
  const snapshot = JSON.stringify(env.sheet().rows);
  const mailCount = env.mails.length;
  env.state.lockBusy = true;
  const reply = env.api.doPost({ parameter: { change: token, mode: 'html' } });
  const text = reply.getContent();
  assert.ok(text.includes('Something went wrong'), 'a busy apply shows the server line');
  assert.equal(JSON.stringify(env.sheet().rows), snapshot);
  assert.equal(env.mails.length, mailCount);
  env.state.lockBusy = false;
  assert.ok(env.applyChange(token).includes(T.changeDoneTitle), 'the token still works after a busy try');
});

// ---- 5. Change request -------------------------------------------------------------------------------------------

test('5. change request: nothing written, one mail to the stored address, 3 per 6 hours', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Alex Rivera', email: 'alex@example.com', guests: [['Sam', 'yes']] });
  const rows = JSON.stringify(env.sheet().rows);
  const mails0 = env.mails.length;

  const r = env.post(params({ name: 'Someone Else', email: ' ALEX@example.com ', status: 'maybe' }));
  assert.deepStrictEqual(r, { ok: true, status: 'maybe', pending: true, outcomes: [] });
  assert.equal(JSON.stringify(env.sheet().rows), rows, 'rows unchanged');
  assert.equal(env.mails.length, mails0 + 1);
  const m = env.mails[env.mails.length - 1];
  assert.equal(m.to, 'alex@example.com');
  assert.ok(m.body.startsWith('Hi Alex Rivera,'), 'greets the stored name');
  assert.ok(new RegExp(`${EXEC.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\?change=[0-9a-f-]{36}`).test(m.body), 'link is getUrl() + ?change= + uuid');
  assert.equal(m.subject, fill(T.changeSubject, { title: env.feed.title }));
  assert.equal(m.name, env.feed.sender.name);
  assert.equal(m.replyTo, env.feed.sender.replyTo);

  env.post(params({ email: 'alex@example.com', status: 'maybe' }));
  env.post(params({ email: 'alex@example.com', status: 'maybe' }));
  assert.equal(env.mails.length, mails0 + 3, 'three change mails');
  const fourth = env.post(params({ email: 'alex@example.com', status: 'maybe' }));
  assert.deepStrictEqual(fourth, { ok: true, status: 'maybe', pending: true, outcomes: [] }, 'same reply');
  assert.equal(env.mails.length, mails0 + 3, 'the 4th sends nothing');
  assert.equal(JSON.stringify(env.sheet().rows), rows);

  env.clock.now += 6 * HOUR + MIN;
  env.post(params({ email: 'alex@example.com', status: 'maybe' }));
  assert.equal(env.mails.length, mails0 + 4, 'mail resumes after 6 hours');
});

// ---- 6. Change confirm and apply ---------------------------------------------------------------------------------

test('6. change confirm page, apply, single use, expiry, closing', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Alex Rivera', email: 'alex@example.com', guests: [['Sam', 'yes']] });
  const old = env.data();
  assert.equal(env.status().session.spotsLeft, 18);
  env.post(params({ name: 'Alex R', email: 'alex@example.com', status: 'maybe', guests: [['Sam', 'yes']] }));
  const token = env.token('alex@example.com');

  const rowsBefore = JSON.stringify(env.sheet().rows);
  const page = env.getPage({ change: token });
  assert.equal(JSON.stringify(env.sheet().rows), rowsBefore, 'a GET writes nothing');
  assert.ok(page.includes(T.changeConfirmLead));
  assert.ok(page.includes(fill(T.newAnswer, { status: T.maybe })));
  for (const n of ['Alex R', 'Sam']) assert.ok(page.includes(fill(T.answerLine, { name: n, Session: 'Yoga', answer: T.yes })), `answer line for ${n}`);
  const form = /<form[^>]*>/.exec(page)![0];
  assert.ok(/method="post"/i.test(form) && /target="_top"/.test(form), form);
  assert.ok(form.includes(EXEC));
  assert.ok(new RegExp(`<input[^>]*type="hidden"[^>]*name="change"[^>]*value="${token}"`).test(page) || new RegExp(`<input[^>]*name="change"[^>]*value="${token}"`).test(page), 'hidden change');
  assert.ok(/name="mode"[^>]*value="html"/.test(page) || /value="html"[^>]*name="mode"/.test(page), 'hidden mode=html');

  const mailsBefore = env.mails.length;
  const done = env.applyChange(token);
  assert.ok(done.includes(T.changeDoneTitle));
  const rows = env.data();
  assert.equal(rows.length, 2);
  assert.deepStrictEqual(rows.map((x) => x[COL.name]), ['Alex R', 'Sam']);
  assert.ok(!JSON.stringify(rows).includes('Rivera'), 'old rows are gone');
  assert.deepStrictEqual(rows.map((x) => x[COL.cell]), ['maybe', 'maybe']);
  assert.equal(rows[0][COL.submitted], old[0][COL.submitted], 'Submitted kept');
  assert.equal(rows[0][COL.changed], env.iso(), 'Changed set');
  assert.equal(rows[0][COL.reminder], old[0][COL.reminder], 'Reminder sent kept');
  assert.equal(rows[0][COL.id], old[0][COL.id], 'same RSVP id');
  assert.equal(env.status().session.spotsLeft, 20, 'GET +2');
  const conf = env.mails[env.mails.length - 1];
  assert.equal(env.mails.length, mailsBefore + 1);
  assert.ok(conf.body.includes(fill(T.maybeNote, words('Yoga'))), 'the maybe confirmation has maybeNote');

  assert.ok(env.applyChange(token).includes(T.changeExpired), 'the same token again');

  // two tokens, one applied
  env.clock.now += MIN;
  env.post(params({ name: 'Alex R', email: 'alex@example.com', status: 'going', guests: [['Sam', 'yes']] }));
  const a = env.token('alex@example.com');
  env.post(params({ name: 'Alex R', email: 'alex@example.com', status: 'going', guests: [['Sam', 'no']] }));
  const b = env.token('alex@example.com');
  assert.notEqual(a, b);
  assert.ok(env.applyChange(a).includes(T.changeDoneTitle));
  assert.ok(env.applyChange(b).includes(T.changeExpired), 'the other token is expired');

  // an expired cache entry (a fresh throttle window first: three change mails per 6 hours)
  env.clock.now += 6 * HOUR + MIN;
  env.post(params({ name: 'Alex R', email: 'alex@example.com', status: 'maybe' }));
  const c = env.token('alex@example.com');
  env.clock.now += 6 * HOUR + MIN;
  assert.ok(env.getPage({ change: c }).includes(T.changeExpired), 'GET after expiry');
  assert.ok(env.applyChange(c).includes(T.changeExpired), 'POST after expiry');

  // after closesAt (the link is still inside its 6 hours)
  env.clock.now = CLOSES_AT - 2 * HOUR;
  env.post(params({ name: 'Alex R', email: 'alex@example.com', status: 'maybe' }));
  const d = env.token('alex@example.com');
  env.clock.now = CLOSES_AT;
  assert.ok(env.getPage({ change: d }).includes(T.closed), 'GET after closesAt');
  const rowsClosed = JSON.stringify(env.sheet().rows);
  assert.ok(env.applyChange(d).includes(T.closed), 'POST after closesAt');
  assert.equal(JSON.stringify(env.sheet().rows), rowsClosed);
});

// ---- 7. Change assignment ----------------------------------------------------------------------------------------

test('7. change assignment: keep, renamed, maybe to going, going to cant, spot-freed note', () => {
  const env = makeEnv((f) => {
    f.session.limit = 3;
  });
  rsvp(env, { name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cy', 'yes']] });
  rsvp(env, { name: 'Dee', email: 'dee@example.com' });
  rsvp(env, { name: 'Eve', email: 'eve@example.com' });
  const cellOf = (n: string) => env.data().find((x) => x[COL.name] === n);
  assert.equal(cellOf('Dee')![COL.cell], 'waitlist');
  assert.equal(Number(cellOf('Eve')![COL.wait]), 2);

  // Ann keeps Ann and Bea; Cy is renamed (a new person) and queues behind the waitlist
  const mails0 = env.mails.length;
  change(env, 'ann@example.com', { name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cyrus', 'yes']] });
  assert.equal(cellOf('Ann')![COL.cell], 'confirmed');
  assert.equal(cellOf('Bea')![COL.cell], 'confirmed');
  assert.equal(cellOf('Cyrus')![COL.cell], 'waitlist');
  assert.equal(Number(cellOf('Cyrus')![COL.wait]), 3, 'next Waitlist #');
  assert.equal(cellOf('Cy'), undefined);
  const freed = env.mails.slice(mails0).filter((m) => m.to === env.feed.sender.replyTo);
  assert.equal(freed.length, 1, 'one spot-freed mail');
  assert.equal(freed[0].subject, fill(T.spotFreedSubject, { session: 'yoga', title: env.feed.title }));
  assert.equal(freed[0].body, [fill(T.spotFreedText, { session: 'yoga', n: 1 }), fill(T.detailsLine, vars(env.feed))].join('\n\n'));
  assert.ok(!/Ann|Bea|Cyrus|@/.test(freed[0].body), 'no guest name or email in it');
  assert.deepStrictEqual(env.status().session, { spotsLeft: 0, full: true, waitlist: true });
  assert.equal(cellOf('Dee')![COL.cell], 'waitlist', 'nobody is promoted');

  // a waitlisted guest who stays going keeps their Waitlist #, even though a spot is free
  change(env, 'dee@example.com', { name: 'Dee', email: 'dee@example.com' });
  assert.equal(cellOf('Dee')![COL.cell], 'waitlist');
  assert.equal(Number(cellOf('Dee')![COL.wait]), 1);

  // maybe -> going at a session where people wait: waitlist
  rsvp(env, { name: 'Gus', email: 'gus@example.com', status: 'maybe' });
  assert.equal(cellOf('Gus')![COL.cell], 'maybe');
  change(env, 'gus@example.com', { name: 'Gus', email: 'gus@example.com', status: 'going' });
  assert.equal(cellOf('Gus')![COL.cell], 'waitlist');
  assert.equal(Number(cellOf('Gus')![COL.wait]), 4);

  // going -> can't go: guests dropped, cells blank, the short note, the spot-freed mail for the two spots
  const m1 = env.mails.length;
  change(env, 'ann@example.com', { name: 'Ann', email: 'ann@example.com', status: 'cant' });
  const annRows = env.data().filter((x) => x[COL.email] === 'ann@example.com' || x[COL.name] === 'Bea' || x[COL.name] === 'Cyrus');
  assert.equal(annRows.length, 1);
  assert.equal(annRows[0][COL.status], 'cant');
  assert.equal(annRows[0][COL.cell], '');
  const sent = env.mails.slice(m1);
  assert.ok(sent.some((m) => m.to === 'ann@example.com' && m.subject === fill(T.cantSubject, { title: env.feed.title })), "can't-go note");
  const f2 = sent.filter((m) => m.to === env.feed.sender.replyTo);
  assert.equal(f2.length, 1);
  assert.ok(f2[0].body.includes(fill(T.spotFreedText, { session: 'yoga', n: 2 })));

  // with no waitlist, a freed spot shows in GET and no spot-freed mail goes
  const e2 = makeEnv((f) => {
    f.session.limit = 3;
  });
  rsvp(e2, { name: 'Hal', email: 'hal@example.com', guests: [['Ivy', 'yes']] });
  assert.equal(e2.status().session.spotsLeft, 1);
  change(e2, 'hal@example.com', { name: 'Hal', email: 'hal@example.com', guests: [['Ivy', 'no']] });
  assert.equal(e2.status().session.spotsLeft, 2);
  assert.ok(!e2.mails.some((m) => m.to === e2.feed.sender.replyTo), 'no spot-freed mail');
});

// ---- 8. Opt-in ---------------------------------------------------------------------------------------------------

function optinScenario(optin: boolean): Record<string, string>[] {
  const env = makeEnv((f) => {
    f.session.limit = 1;
  });
  rsvp(env, { name: 'Twin', email: 'twin@example.com', optin });
  rsvp(env, { name: 'Wait', email: 'wait@example.com', optin });
  change(env, 'twin@example.com', { name: 'Twin', email: 'twin@example.com', status: 'cant', optin });
  env.clock.now = REMINDER_AT + MIN;
  env.api.sendDueReminders();
  return env.mails.map((m) => ({ ...m, body: m.body.replace(/\?change=[0-9a-f-]+/g, '?change=TOKEN') }));
}

test('8. opt-in: stored on the you row only, latest answer wins, never in a reply, gates no script mail', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Opt', email: 'opt@example.com', optin: true, guests: [['Opt Guest', 'yes']] });
  rsvp(env, { name: 'Plain', email: 'plain@example.com' });
  const row = (n: string) => env.data().find((x) => x[COL.name] === n)!;
  assert.equal(row('Opt')[COL.optin], 'yes');
  assert.equal(row('Opt Guest')[COL.optin], '');
  assert.equal(row('Plain')[COL.optin], '');
  change(env, 'opt@example.com', { name: 'Opt', email: 'opt@example.com', guests: [['Opt Guest', 'yes']] });
  assert.equal(row('Opt')[COL.optin], '', 'a confirmed change applies the new answer (yes to blank)');
  change(env, 'plain@example.com', { name: 'Plain', email: 'plain@example.com', optin: true });
  assert.equal(row('Plain')[COL.optin], 'yes');
  for (const reply of [...env.jsonReplies, ...env.htmlReplies]) assert.ok(!/optin|opt-in/i.test(reply), 'the answer never reaches a reply or a page');

  assert.deepStrictEqual(optinScenario(true), optinScenario(false), 'the same emails go whatever the opt-in');
});

// ---- 9. No leaks -------------------------------------------------------------------------------------------------

test('9. no leaks: JSON replies carry no email, name, token or sheet id; GET keys; change pages show requested names only', () => {
  const env = makeEnv((f) => {
    f.session.limit = 2;
  });
  rsvp(env, { name: 'Zed Quill', email: 'zed@example.com', guests: [['Yara Stone', 'yes'], ['Xan Moss', 'yes']] });
  env.post(params({ name: 'Nova Plume', email: 'zed@example.com', status: 'maybe', guests: [['Wren Ash', 'yes']] }));
  const token = env.token('zed@example.com');
  env.status();
  env.get({ slug: SLUG });
  env.get({ slug: 'nope' });
  env.post(params({ email: 'bad' }));
  env.post({ ...params({ email: 'x@example.com' }), slug: '../x' });
  env.post({ ...params({ email: 'y@example.com' }), website: 'spam' });
  rsvp(env, { name: 'Vik Dune', email: 'vik@example.com', status: 'cant' });

  const page = env.getPage({ change: token });
  assert.ok(page.includes('Nova Plume') && page.includes('Wren Ash'), 'the requested names');
  for (const stored of ['Zed Quill', 'Yara Stone', 'Xan Moss']) assert.ok(!page.includes(stored), `the confirm page never shows stored name ${stored}`);
  const done = env.applyChange(token);
  for (const stored of ['Zed Quill', 'Yara Stone', 'Xan Moss']) assert.ok(!done.includes(stored), 'the apply page never shows a stored name');
  assert.ok(env.applyChange(token).includes(T.changeExpired));

  const names = ['Zed Quill', 'Yara Stone', 'Xan Moss', 'Nova Plume', 'Wren Ash', 'Vik Dune'];
  for (const r of env.jsonReplies) {
    assert.ok(!r.includes('@'), `no email in ${r}`);
    for (const n of names) assert.ok(!r.includes(n), `no name in ${r}`);
    assert.ok(!r.includes(token) && !r.includes(SHEET_ID), `no token or sheet id in ${r}`);
  }
  const get = env.status();
  assert.deepStrictEqual(Object.keys(get).sort(), ['ok', 'open', 'session']);
  assert.deepStrictEqual(Object.keys(get.session).sort(), ['full', 'spotsLeft', 'waitlist']);
});

// ---- 10. Honeypot ------------------------------------------------------------------------------------------------

test('10. honeypot: success shape, no row, no mail, no change mail for a known email', () => {
  const env = makeEnv();
  const r = env.post({ ...params({ email: 'bot@example.com' }), website: 'http://spam.example' });
  assert.deepStrictEqual(r, { ok: true, status: 'going', outcomes: [] });
  assert.equal(env.mails.length, 0);
  assert.equal(env.data().length, 0);
  rsvp(env, { email: 'known@example.com' });
  const mails0 = env.mails.length;
  const rows = JSON.stringify(env.sheet().rows);
  const r2 = env.post({ ...params({ email: 'known@example.com', status: 'maybe' }), website: 'x' });
  assert.deepStrictEqual(r2, { ok: true, status: 'maybe', outcomes: [] });
  assert.equal(env.mails.length, mails0, 'no change mail');
  assert.equal(JSON.stringify(env.sheet().rows), rows);
});

// ---- 11. Unknown and closed --------------------------------------------------------------------------------------

test('11. unknown slug, feed 404, the cache, closed', () => {
  const env = makeEnv();
  assert.deepStrictEqual(env.post({ ...params({ email: 'a@example.com' }), slug: '../x' }), { ok: false, error: 'unknown' });
  assert.deepStrictEqual(env.get({ slug: '../x' }), { ok: false, error: 'unknown' });
  assert.equal(env.state.fetches, 0, 'a bad slug is never fetched');
  assert.deepStrictEqual(env.post({ ...params({ email: 'a@example.com' }), slug: 'other-party' }), { ok: false, error: 'unknown' });
  assert.equal(env.state.fetches, 1);
  assert.equal(env.fetched[0], `${site.deploy.site}/events/other-party.json`);

  const e2 = makeEnv();
  rsvp(e2, { email: 'a@example.com' });
  rsvp(e2, { email: 'b@example.com' });
  assert.equal(e2.state.fetches, 1, 'two POSTs, one fetch');
  e2.clock.now += 11 * MIN;
  rsvp(e2, { email: 'c@example.com' });
  assert.equal(e2.state.fetches, 2, 'the cache lasts about 10 minutes');

  e2.clock.now = CLOSES_AT;
  assert.deepStrictEqual(e2.post(params({ email: 'late@example.com' })), { ok: false, error: 'closed' });
  assert.equal(e2.status().open, false);
  assert.equal(e2.data().find((x) => x[COL.email] === 'late@example.com'), undefined);
});

// ---- 12. Injection -----------------------------------------------------------------------------------------------

test('12. injection: formula prefix, control characters, escaped HTML, every link and form targets _top', () => {
  const env = makeEnv();
  rsvp(env, { name: '=HYPERLINK("x")', email: 'f1@example.com', guests: [['+1 555', 'yes'], ['A\u0007B', 'no']] });
  const names = env.data().map((x) => x[COL.name]);
  assert.deepStrictEqual(names, ['\'=HYPERLINK("x")', "'+1 555", 'AB']);

  const page = env.postHtml(params({ name: '<script>alert(1)</script>', email: 'f2@example.com' }));
  assert.ok(page.includes('&lt;script&gt;') && !page.includes('<script'), 'escaped');
  assert.ok(page.includes(`href="${env.feed.pageUrl}"`), 'the back link is pageUrl');

  env.post(params({ email: 'f2@example.com', status: 'maybe' }));
  const confirm = env.getPage({ change: env.token('f2@example.com') });
  const applied = env.applyChange(env.token('f2@example.com'));
  const bad = env.postHtml(params({ email: 'nope' }));
  for (const html of [page, confirm, applied, bad, ...env.htmlReplies]) {
    for (const tag of html.match(/<(a|form)\b[^>]*>/g) ?? []) assert.ok(/target="_top"/.test(tag), `target=_top on ${tag}`);
  }
  assert.ok(confirm.includes('<form'), 'the confirm page has its form');
});

// ---- 13. Emails --------------------------------------------------------------------------------------------------

test('13. emails: going, all confirmed, can\'t go, change, a mail error still saves', () => {
  const env = makeEnv((f) => {
    f.session.limit = 1;
  });
  rsvp(env, { name: 'Alex Rivera', email: 'alex@example.com', guests: [['Sam', 'yes']] });
  let m = env.mails[0];
  assert.equal(m.to, 'alex@example.com');
  assert.equal(m.subject, fill(T.confirmSubject, { title: env.feed.title }));
  assert.equal(m.name, site.name);
  assert.equal(m.replyTo, site.email);
  assert.equal(m.body, expectConfirm(env.feed, 'Alex Rivera', 'going', [['Alex Rivera', 'confirmed'], ['Sam', 'waitlist']], { waitlist: true }));

  const e2 = makeEnv();
  rsvp(e2, { name: 'Bo Park', email: 'bo@example.com', guests: [['Cat', 'yes']] });
  m = e2.mails[0];
  assert.equal(m.body, expectConfirm(e2.feed, 'Bo Park', 'going', [['Bo Park', 'confirmed'], ['Cat', 'confirmed']]));
  assert.ok(!m.body.includes(T.waitlistNote));

  rsvp(e2, { name: 'Dan Lee', email: 'dan@example.com', status: 'cant' });
  m = e2.mails[1];
  assert.equal(m.subject, fill(T.cantSubject, { title: e2.feed.title }));
  assert.equal(m.body, [fill(T.hi, { name: 'Dan Lee' }), fill(T.cantLead, vars(e2.feed)), fill(T.signoff, vars(e2.feed))].join('\n\n'));

  rsvp(e2, { name: 'Eli Ray', email: 'eli@example.com', status: 'maybe', guests: [['Fox', 'no']] });
  m = e2.mails[2];
  assert.equal(m.body, expectConfirm(e2.feed, 'Eli Ray', 'maybe', [['Eli Ray', 'maybe'], ['Fox', 'no']], { maybe: true }));

  // the change mail
  e2.post(params({ name: 'Nova', email: 'bo@example.com', status: 'maybe', guests: [['Cat', 'no']] }));
  m = e2.mails[3];
  const token = e2.token('bo@example.com');
  assert.equal(m.subject, fill(T.changeSubject, { title: e2.feed.title }));
  assert.equal(
    m.body,
    [
      fill(T.hi, { name: 'Bo Park' }),
      fill(T.changeLead, vars(e2.feed)),
      [fill(T.newAnswer, { status: T.maybe }), `- ${fill(T.answerLine, { name: 'Nova', Session: 'Yoga', answer: T.yes })}`, `- ${fill(T.answerLine, { name: 'Cat', Session: 'Yoga', answer: T.no })}`].join('\n'),
      [fill(T.changeLinkLine, { changeUrl: `${EXEC}?change=${token}` }), T.changeIgnore].join('\n'),
      fill(T.signoff, vars(e2.feed)),
    ].join('\n\n'),
  );

  // a mail error still returns ok with the rows saved
  const e3 = makeEnv();
  e3.state.failMail = true;
  const r = rsvp(e3, { name: 'Gil', email: 'gil@example.com' });
  assert.deepStrictEqual(r, { ok: true, status: 'going', outcomes: ['confirmed'] });
  assert.equal(e3.data().length, 1);
});

// ---- 14. Reminders -----------------------------------------------------------------------------------------------

test('14. reminders: due window, one each, current cells, quota, no repeat after a change', () => {
  const env = makeEnv((f) => {
    f.session.limit = 1;
  });
  rsvp(env, { name: 'Ann Aldo', email: 'ann@example.com', guests: [['Gee Gold', 'yes']] });
  rsvp(env, { name: 'Bob Bay', email: 'bob@example.com', status: 'maybe' });
  rsvp(env, { name: 'Cal Cove', email: 'cal@example.com', status: 'cant' });
  const sent0 = env.mails.length;

  env.api.sendDueReminders();
  assert.equal(env.mails.length, sent0, 'none before reminderAt');

  env.clock.now = REMINDER_AT;
  // Brian hand-promotes the waitlisted guest
  env.sheet().rows.find((x, i) => i > 0 && x[COL.name] === 'Gee Gold')![COL.cell] = 'confirmed';

  env.state.quota = 0;
  env.api.sendDueReminders();
  assert.equal(env.mails.length, sent0, 'quota 0 sends nothing');
  assert.ok(env.data().every((x) => !x[COL.reminder]), 'and stamps nothing');

  env.state.quota = 100;
  env.api.sendDueReminders();
  const reminders = env.mails.slice(sent0);
  assert.equal(reminders.length, 2, 'one per going or maybe RSVP, none for cant');
  const ann = reminders.find((m) => m.to === 'ann@example.com')!;
  const bob = reminders.find((m) => m.to === 'bob@example.com')!;
  assert.equal(ann.subject, fill(T.reminderSubject, { title: env.feed.title }));
  assert.equal(ann.body, expectReminder(env.feed, 'Ann Aldo', [['Ann Aldo', 'confirmed'], ['Gee Gold', 'confirmed']]));
  assert.equal(bob.body, expectReminder(env.feed, 'Bob Bay', [['Bob Bay', 'maybe']], true));
  assert.ok(ann.body.includes('Comfy cozy') && ann.body.includes('Parking') && ann.body.includes(env.feed.notices[0].title), 'wear items, parking and the waiver');
  assert.ok(env.data().filter((x) => x[COL.status] !== 'cant').every((x) => x[COL.reminder]), 'stamped');

  const n = env.mails.length;
  env.api.sendDueReminders();
  assert.equal(env.mails.length, n, 'a second run sends none');

  // a change after the reminder doesn't send another
  change(env, 'bob@example.com', { name: 'Bob Bay', email: 'bob@example.com', status: 'going', session: 'no' });
  const afterChange = env.mails.length;
  assert.ok(env.data().find((x) => x[COL.name] === 'Bob Bay')![COL.reminder], 'Reminder sent kept');
  env.api.sendDueReminders();
  assert.equal(env.mails.length, afterChange);

  // after start: none
  const e2 = makeEnv();
  rsvp(e2, { email: 'late@example.com' });
  const k = e2.mails.length;
  e2.clock.now = Date.parse(e2.feed.start) + MIN;
  e2.api.sendDueReminders();
  assert.equal(e2.mails.length, k);
});

// ---- 15. setup and the repo files --------------------------------------------------------------------------------

test('15. setup twice leaves one 15-minute trigger and logs the quota; it needs SHEET_ID', () => {
  const env = makeEnv();
  env.api.setup();
  env.api.setup();
  assert.equal(env.triggers.length, 1);
  assert.equal(env.triggers[0].fn, 'sendDueReminders');
  assert.equal(env.triggers[0].every, 15);
  assert.ok(env.logger.some((l) => l.includes(String(env.state.quota))), 'logs the remaining mail quota');
  delete env.props.SHEET_ID;
  assert.throws(() => env.api.setup(), /SHEET_ID/);
});

test('15. the two apps-script files hold no email, sheet link or script id; the manifest is the §B10 one', () => {
  const manifestText = readFileSync(manifestPath, 'utf8');
  for (const [name, text] of [['rsvp.js', src], ['appsscript.json', manifestText]] as const) {
    assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(text), `${name}: no email address`);
    assert.ok(!text.includes('docs.google.com'), `${name}: no docs.google.com`);
    assert.ok(!text.includes('/spreadsheets/d/'), `${name}: no sheet URL`);
    assert.ok(!text.includes('script.google.com'), `${name}: no script URL`);
  }
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.timeZone, 'America/Denver');
  assert.equal(manifest.runtimeVersion, 'V8');
  assert.deepStrictEqual(manifest.webapp, { access: 'ANYONE_ANONYMOUS', executeAs: 'USER_DEPLOYING' });
  assert.equal(manifest.oauthScopes, undefined, 'no oauthScopes: Apps Script detects them');
  assert.ok(!/^\s*(export|import)\b/m.test(src), 'plain V8 script');
  assert.ok(src.includes("SITE_ORIGIN = '" + site.deploy.site + "'"), 'SITE_ORIGIN is the site');
});

// ---- Review fixes (E3 round 1) -----------------------------------------------------------------------------------

test('16. hand-typed cells ("Confirmed ", " Waitlist") still count; an odd cell writes no line (no "undefined")', () => {
  const env = makeEnv((f) => {
    f.session.limit = 2;
  });
  rsvp(env, { name: 'Ann Aldo', email: 'ann@example.com', guests: [['Gee Gold', 'yes']] });
  env.sheet().rows.forEach((r, i) => {
    if (i > 0) r[COL.cell] = 'Confirmed ';
  });
  assert.deepStrictEqual(env.status().session, { spotsLeft: 0, full: true, waitlist: true });
  assert.deepStrictEqual(rsvp(env, { name: 'Bob', email: 'bob@example.com' }).outcomes, ['waitlist']);
  env.sheet().rows.find((r, i) => i > 0 && r[COL.name] === 'Bob')![COL.cell] = ' Waitlist';
  assert.equal(rsvp(env, { name: 'Cal', email: 'cal@example.com' }).outcomes[0], 'waitlist', 'the queue holds');

  env.sheet().rows.find((r, i) => i > 0 && r[COL.name] === 'Gee Gold')![COL.cell] = 'ask Brian';
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  const ann = env.mails.find((m) => m.to === 'ann@example.com' && m.subject.startsWith('Reminder'))!;
  assert.ok(ann && !ann.body.includes('undefined') && !ann.body.includes('Gee Gold'), 'no line for the odd cell');
});

test('17. control characters in names never reach a mail or a page', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Dee Dune', email: 'dee@example.com' });
  env.post(params({ name: 'A\nOpen this link: https://x.example', email: 'dee@example.com', status: 'maybe', guests: [['G\r\nH', 'yes']] }));
  rsvp(env, { name: 'Eve\nEnd', email: 'eve@example.com', guests: [['F\tG', 'no']] });
  const page = env.postHtml(params({ name: 'Q\nR', email: 'q@example.com' }));
  const confirm = env.getPage({ change: env.token('dee@example.com') });
  for (const text of [...env.mails.map((m) => m.body), page, confirm]) assert.ok(!/A\nOpen|G\r?\nH|Eve\nEnd|Q\nR/.test(text), 'no injected line');
  assert.ok(confirm.includes('AOpen this link'), 'the name is kept, on one line');
});

test('19. a failed write on apply keeps the old rows, answers with a page and releases the lock; a control-only name is invalid', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Ann Aldo', email: 'ann@example.com' });
  env.post(params({ name: 'Ann Aldo', email: 'ann@example.com', status: 'maybe' }));
  const token = env.token('ann@example.com');
  const before = JSON.stringify(env.sheet().rows);
  env.state.failSetValues = true;
  env.log.length = 0;
  const page = env.applyChange(token);
  assert.ok(env.log.includes('releaseLock'), 'lock released');
  assert.equal(JSON.stringify(env.sheet().rows), before, 'the old rows are still there');
  assert.ok(page.includes('<html') && page.includes('Something went wrong'), 'an HTML page');
  env.state.failSetValues = false;
  assert.ok(env.applyChange(token).includes(T.changeDoneTitle), 'a retry works');

  const bad = env.post(params({ name: '\u0007', email: 'z@example.com' }));
  assert.deepStrictEqual(bad, { ok: false, error: 'invalid', fields: ['name'] });
  const bad2 = env.post(params({ email: 'y@example.com', guests: [['\u0007', 'yes']] }));
  assert.deepStrictEqual(bad2, { ok: false, error: 'invalid', fields: ['g1name'] });
});

test('20. no calendar button on the change-done page; the error page shows the server line once, with a mailto link', () => {
  const env = makeEnv();
  const first = env.postHtml(params({ name: 'Ann Aldo', email: 'ann@example.com' }));
  assert.ok(first.includes(`href="${env.feed.icsUrl}"`), 'the plain done page has the calendar button');
  const done = change(env, 'ann@example.com', { name: 'Ann Aldo', email: 'ann@example.com', status: 'maybe' });
  assert.ok(done.includes(T.changeDoneTitle) && !done.includes(env.feed.icsUrl), 'no calendar button after a change');
  env.state.lockBusy = true;
  const err = env.postHtml(params({ name: 'Bob', email: 'bob@example.com' }));
  assert.ok(err.includes(`href="mailto:${env.feed.sender.replyTo}"`) && /<a[^>]*mailto[^>]*target="_top"/.test(err), 'mailto link');
  assert.equal(err.split('Something went wrong').length - 1, 1, 'the line appears once');
});

test('18. real Sheets values (Date objects, numbers): a change matches its base once, waitlist numbers hold, no second reminder', () => {
  const env = makeEnv((f) => {
    f.session.limit = 1;
  });
  env.state.realSheets = true;
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  rsvp(env, { name: 'Bob', email: 'bob@example.com' });
  change(env, 'ann@example.com', { name: 'Ann', email: 'ann@example.com', status: 'maybe' });
  assert.equal(env.data().find((x) => x[COL.name] === 'Ann')![COL.cell], 'maybe');
  change(env, 'bob@example.com', { name: 'Bob', email: 'bob@example.com' });
  const bob = env.data().find((x) => x[COL.name] === 'Bob')!;
  assert.equal(bob[COL.cell], 'waitlist');
  assert.equal(Number(bob[COL.wait]), 1, 'kept Waitlist #');
  env.post(params({ email: 'ann@example.com', status: 'going' }));
  const t = env.token('ann@example.com');
  assert.ok(env.applyChange(t).includes(T.changeDoneTitle));
  assert.ok(env.applyChange(t).includes(T.changeExpired));
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  const n = env.mails.length;
  env.api.sendDueReminders();
  assert.equal(env.mails.length, n, 'stamped reminders are not resent');
});

