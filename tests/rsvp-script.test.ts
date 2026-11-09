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
import { w } from '../src/data/wording.ts';
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
const TIPS_ID = 'fake-tips-id-0123456789';
const EXEC = 'https://exec.example.com/macros/exec';
const SIG_PHONE = '719-555-0100'; // E13: fictional (555-0100 to 555-0199); check:secrets allows the range
const HOST_NUM = '719-555-0123';
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
  // tips: the cells of column A of the tips sheet, header first (E6); tipsFail: openById(TIPS_ID) throws; tipsTab: the tab's name.
  const state: any = { lockBusy: false, realSheets: false, failSetValues: false, failMail: false, rejectFrom: false, aliasesFail: false, aliases: ['other@example.com', feed.sender.from], quota: 1500, fetches: 0, feedStatus: 200, tips: ['Tip'], tipsFail: false, tipsTab: 'Sheet1' };
  const mails: Record<string, string>[] = [];
  const sheets = new Map<string, FakeSheet>();
  const cacheStore = new Map<string, { v: string; exp: number }>();
  // E13: both phone properties set by default, with fictional 555-01xx numbers (never a real one in the repo)
  const props: Record<string, string> = { SHEET_ID, TIPS_SHEET_ID: TIPS_ID, SIGNATURE_PHONE: SIG_PHONE, HOST_PHONE: HOST_NUM };
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
        if (id === TIPS_ID) {
          log.push('openTips');
          if (state.tipsFail) throw new Error('no access to the tips sheet');
          const tipSheet = new FakeSheet(state.tipsTab, { log, state });
          tipSheet.rows = state.tips.map((v: unknown) => [v]);
          return {
            getSheetByName: (n: string) => (n === state.tipsTab ? tipSheet : null),
            getSheets: () => [tipSheet],
          };
        }
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
      sendEmail: () => {
        log.push('MailApp.sendEmail');
        throw new Error('MailApp is rejected for outside addresses');
      },
      getRemainingDailyQuota: () => state.quota,
    },
    GmailApp: {
      sendEmail: (to: string, subject: string, body: string, opts: Record<string, string>) => {
        if (state.failMail) throw new Error('mail down');
        if (opts && opts.from && state.rejectFrom) throw new Error('from rejected');
        mails.push(plain({ to, subject, body, ...opts }));
        state.quota--;
      },
      getAliases: () => {
        if (state.aliasesFail) throw new Error('no aliases');
        return state.aliases.slice();
      },
    },
    UrlFetchApp: {
      fetch: (url: string) => {
        state.fetches++;
        fetched.push(url);
        if (state.fetchThrows) throw new Error('network down');
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
    cache: cacheStore,
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
const vars = (f: Feed) => ({ title: f.title, eventName: f.mail.name, thanks: f.mail.thanks, dateLabel: f.dateLabel, timeLabel: f.timeLabel, venue: f.venue.name, address: f.venue.address, icsUrl: f.icsUrl, googleUrl: f.googleCalUrl, pageUrl: f.pageUrl });
const OUT_KEY: Record<string, string> = { confirmed: 'confirmed', waitlist: 'waitlist', full: 'full', maybe: 'maybe', no: 'no' };
const noticeBlocks = (f: Feed) => f.notices.map((n: any) => [n.title, n.text, n.urlLabel, n.url].filter(Boolean).join('\n'));
// E13: the session answer each cell gives in the confirmation (a Maybe holds no spot: No)
const ANSWER: Record<string, string> = { confirmed: T.yes, waitlist: T.sessionWaitlist, full: T.no, no: T.no, maybe: T.no };
/** E13: the plain-text signature, from the feed and the env's SIGNATURE_PHONE as it is now. */
function expectSig(env: Env): string {
  const s = env.feed.signature;
  const phone = env.props.SIGNATURE_PHONE;
  return [`${s.name}${s.credentials ? `, ${s.credentials}` : ''}`, s.business, phone ? `${phone} • ${s.label}` : s.label].join('\n');
}
const bookBlock = (f: Feed) => [T.bookHead, T.bookLink, f.bookUrl].join('\n'); // E14: the link is a button on its own line
// E16: the words are the link; the text body puts each URL on the next line
const calLines = (f: Feed) => [T.calendarGoogle, f.googleCalUrl, T.calendar, f.icsUrl].join('\n');
const calendarBlock = (f: Feed) => calLines(f);
// Brian, Nov 9: the confirm link is the words changeLinkWords; the text body puts the URL on the next line
const linkLine = (url: string) => [fill(T.changeLinkLine, { changeLink: T.changeLinkWords }), url].join('\n');
const hostLine = (env: Env) => (env.props.HOST_PHONE ? fill(T.questionsHost, { host: env.feed.mail.host, hostPhone: env.props.HOST_PHONE }) : T.questions);
/** E13: people = [name, cell], you first. */
function expectConfirm(env: Env, name: string, status: 'going' | 'maybe', people: [string, string][], opts: { waitlist?: boolean } = {}): string {
  const f = env.feed;
  const v = vars(f);
  // E14: Yoga lines only for Going on a session event; guests are a "Guests:" heading and one bullet each
  const asks = Boolean(f.session) && status === 'going';
  const main = [T.detailsHead, fill(T.yourRsvp, { status: T[status] })];
  if (asks) main.push(fill(T.sessionAnswer, { Session: 'Yoga', answer: ANSWER[people[0][1]] }));
  const guests = people.slice(1).map(([n, cell]) => `- ${asks ? fill(T.guestLine, { name: n, Session: 'Yoga', answer: ANSWER[cell] }) : n}`);
  return [
    fill(T.hi, { name }),
    fill(T.confirmLead, v).trim(),
    main.join('\n'),
    ...(guests.length ? [[T.guestsHead, ...guests].join('\n')] : []),
    ...(opts.waitlist ? [T.waitlistNote] : []),
    [T.changeLine, f.pageUrl].join('\n'),
    [fill(T.when, v), fill(T.where, v)].join('\n'),
    calendarBlock(f),
    ...noticeBlocks(f),
    bookBlock(f),
    hostLine(env),
    T.seeYou,
    expectSig(env),
  ].join('\n\n');
}
function expectCant(env: Env, name: string): string {
  return [fill(T.hi, { name }), [fill(T.cantLead, vars(env.feed)), env.feed.pageUrl].join('\n'), bookBlock(env.feed), expectSig(env)].join('\n\n');
}
function expectReminder(env: Env, name: string, people: [string, string][], maybe = false): string {
  const f = env.feed;
  const v = vars(f);
  const lines = people.filter(([, o]) => o !== 'maybe').map(([n, o]) => `- ${outcomeLine(T, 'Yoga', n, OUT_KEY[o] as any)}`); // E14: a maybe cell has no line
  if (maybe) lines.push(fill(T.maybeNote, words('Yoga')));
  return [
    fill(T.hi, { name }),
    fill(T.reminderLead, v),
    [fill(T.when, v), fill(T.where, v)].join('\n'),
    ...f.reminderInfo.map((b: any) => [b.title, b.text ?? '', ...(b.items ?? []).map((i: string) => `- ${i}`)].filter(Boolean).join('\n')),
    lines.join('\n'),
    ...noticeBlocks(f),
    [fill(T.detailsLine, v), calLines(f)].join('\n'),
    expectSig(env),
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
  assert.deepStrictEqual(env.status(), { ok: true, open: true, session: { spotsLeft: 1, full: false, waitlist: true }, tips: [] });

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
  assert.equal(m.from, env.feed.sender.from);

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
  // E14: a Maybe has no session answers, so the page lists none
  for (const n of ['Alex R', 'Sam']) assert.ok(!page.includes(fill(T.answerLine, { name: n, Session: 'Yoga', answer: T.yes })), `no answer line for ${n}`);
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
  // E14: the Maybe confirmation lists the guests by name, has no Yoga lines, and drops maybeNote (the change line says how)
  assert.equal(conf.body, expectConfirm(env, 'Alex R', 'maybe', [['Alex R', 'maybe'], ['Sam', 'maybe']]));
  assert.ok(!conf.body.includes(fill(T.maybeNote, words('Yoga'))), 'no maybeNote in the confirmation');

  // E14: pressing Confirm again (or reopening the link) shows the finished page, not "expired", and sends no second mail
  const again = env.applyChange(token);
  assert.ok(again.includes(T.changeDoneTitle) && !again.includes(T.changeExpired), 'the same token again shows the result');
  assert.equal(env.mails.length, mailsBefore + 1, 'no second email');
  assert.ok(env.getPage({ change: token }).includes(T.changeDoneTitle), 'the link opened again shows the result too');

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
  const freed = env.mails.slice(mails0).filter((m) => m.to === env.feed.sender.contact);
  assert.equal(freed.length, 1, 'one spot-freed mail');
  assert.equal(freed[0].subject, fill(T.spotFreedSubject, { session: 'yoga', title: env.feed.title }));
  assert.equal(freed[0].body, [fill(T.spotFreedText, { session: 'yoga', n: 1 }), fill(T.detailsLine, vars(env.feed))].join('\n\n'));
  assert.ok(!/Ann|Bea|Cyrus|@/.test(freed[0].body), 'no guest name or email in it');
  assert.equal(freed[0].htmlBody, undefined, 'E13: the spot-freed note stays plain text, unsigned');
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
  const f2 = sent.filter((m) => m.to === env.feed.sender.contact);
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
  assert.ok(!e2.mails.some((m) => m.to === e2.feed.sender.contact), 'no spot-freed mail');
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
  const untoken = (s: string | undefined) => s?.replace(/\?change=[0-9a-f-]+/g, '?change=TOKEN');
  return env.mails.map((m) => ({ ...m, body: untoken(m.body)!, htmlBody: untoken(m.htmlBody)! }));
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
  env.post(params({ name: 'Nova Plume', email: 'zed@example.com', status: 'going', guests: [['Wren Ash', 'yes']] }));
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
  assert.ok(env.applyChange(token).includes(T.changeDoneTitle)); // E14: the same token again shows the result

  const names =['Zed Quill', 'Yara Stone', 'Xan Moss', 'Nova Plume', 'Wren Ash', 'Vik Dune'];
  for (const r of env.jsonReplies) {
    assert.ok(!r.includes('@'), `no email in ${r}`);
    for (const n of names) assert.ok(!r.includes(n), `no name in ${r}`);
    assert.ok(!r.includes(token) && !r.includes(SHEET_ID) && !r.includes(TIPS_ID), `no token or sheet id in ${r}`);
  }
  const get = env.status();
  assert.deepStrictEqual(Object.keys(get).sort(), ['ok', 'open', 'session', 'tips']);
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
  assert.equal(m.replyTo, site.eventsEmail);
  assert.equal(m.body, expectConfirm(env, 'Alex Rivera', 'going', [['Alex Rivera', 'confirmed'], ['Sam', 'waitlist']], { waitlist: true }));

  const e2 = makeEnv();
  rsvp(e2, { name: 'Bo Park', email: 'bo@example.com', guests: [['Cat', 'yes']] });
  m = e2.mails[0];
  assert.equal(m.body, expectConfirm(e2, 'Bo Park', 'going', [['Bo Park', 'confirmed'], ['Cat', 'confirmed']]));
  assert.ok(!m.body.includes(T.waitlistNote));

  rsvp(e2, { name: 'Dan Lee', email: 'dan@example.com', status: 'cant' });
  m = e2.mails[1];
  assert.equal(m.subject, fill(T.cantSubject, { title: e2.feed.title }));
  assert.equal(m.body, expectCant(e2, 'Dan Lee'));

  rsvp(e2, { name: 'Eli Ray', email: 'eli@example.com', status: 'maybe', guests: [['Fox', 'no']] });
  m = e2.mails[2];
  assert.equal(m.body, expectConfirm(e2, 'Eli Ray', 'maybe', [['Eli Ray', 'maybe'], ['Fox', 'maybe']]));

  // the change mail (E14: a Maybe has no session answers to list)
  e2.post(params({ name: 'Nova', email: 'bo@example.com', status: 'maybe', guests: [['Cat', 'no']] }));
  m = e2.mails[3];
  const token = e2.token('bo@example.com');
  assert.equal(m.subject, fill(T.changeSubject, { title: e2.feed.title }));
  assert.equal(
    m.body,
    [
      fill(T.hi, { name: 'Bo Park' }),
      fill(T.changeLead, vars(e2.feed)),
      fill(T.newAnswer, { status: T.maybe }),
      [linkLine(`${EXEC}?change=${token}`), T.changeIgnore].join('\n'),
      expectSig(e2),
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
  assert.equal(ann.body, expectReminder(env, 'Ann Aldo', [['Ann Aldo', 'confirmed'], ['Gee Gold', 'confirmed']]));
  assert.equal(bob.body, expectReminder(env, 'Bob Bay', [['Bob Bay', 'maybe']], true));
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
  env.post(params({ name: 'A\nOpen this link: https://x.example', email: 'dee@example.com', status: 'going', guests: [['G\r\nH', 'yes']] }));
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
  assert.ok(err.includes(`href="mailto:${env.feed.sender.contact}"`) && /<a[^>]*mailto[^>]*target="_top"/.test(err), 'mailto link');
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
  assert.ok(env.applyChange(t).includes(T.changeDoneTitle)); // E14: the same token again shows the result
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  const n = env.mails.length;
  env.api.sendDueReminders();
  assert.equal(env.mails.length, n, 'stamped reminders are not resent');
});

// ---- Self-care tips (E6, I-082, I-084) ---------------------------------------------------------------------------

const setTips = (env: Env, ...cells: unknown[]) => {
  env.state.tips = ['Tip', ...cells];
};
const tipOpens = (env: Env) => env.log.filter((x) => x === 'openTips').length;
const TIP_LINE = /^Self-care tip: (.*)$/m; // E9, I-095: "of the day" dropped
const tipOf = (body: string): string | undefined => TIP_LINE.exec(body)?.[1];
/** The reminder mail with one tip line just before the sign-off (what the copy deck says). */
const withTipBlock = (env: Env, body: string, tip: string): string => {
  const sign = expectSig(env); // E13: the signature replaces the sign-off
  assert.ok(body.endsWith(sign), 'the signature ends the mail');
  return body.slice(0, body.length - sign.length) + fill(T.reminderTip, { tip }) + '\n\n' + sign;
};

test('S1. GET returns the cleaned tips after the session, and nothing else leaks', () => {
  const env = makeEnv();
  setTips(env, '  Drink water  ', '', 'drink WATER', 'Stretch\nslowly', 'x'.repeat(281), 42, 'Breathe\u0007out');
  const got = env.status();
  assert.deepStrictEqual(got.tips, ['Drink water', 'Stretch slowly', '42', 'Breathe out']);
  assert.deepStrictEqual(Object.keys(got), ['ok', 'open', 'session', 'tips']);
  env.api.setup();
  for (const r of env.jsonReplies) assert.ok(!r.includes(TIPS_ID), `no tips sheet id in ${r}`);
  for (const l of env.logger) assert.ok(!l.includes(TIPS_ID), `no tips sheet id in the log: ${l}`);
});

test('S2. the tips are cached for 300 seconds, then the sheet is read again; at most 100 tips', () => {
  const env = makeEnv();
  setTips(env, 'A');
  assert.deepStrictEqual(env.status().tips, ['A']);
  assert.equal(tipOpens(env), 1);
  setTips(env, 'A', 'B');
  env.clock.now = CLOCK0 + 299_000;
  assert.deepStrictEqual(env.status().tips, ['A'], 'still cached at 299 s');
  assert.equal(tipOpens(env), 1);
  env.clock.now = CLOCK0 + 300_000;
  assert.deepStrictEqual(env.status().tips, ['A', 'B'], 'read again at 300 s');
  assert.equal(tipOpens(env), 2);

  const big = makeEnv();
  setTips(big, ...Array.from({ length: 150 }, (_, i) => `tip number ${i}`));
  assert.equal(big.status().tips.length, 100);
  assert.equal(big.status().tips[99], 'tip number 99');
});

test('S3. every failure gives [] and never touches ok, open or session', () => {
  const base = makeEnv().status();
  assert.equal(base.ok, true);

  const unset = makeEnv();
  delete unset.props.TIPS_SHEET_ID;
  setTips(unset, 'A');
  const u = unset.status();
  assert.deepStrictEqual(u.tips, []);
  assert.equal(tipOpens(unset), 0, 'no sheet call without the property');
  assert.deepStrictEqual({ ok: u.ok, open: u.open, session: u.session }, { ok: base.ok, open: base.open, session: base.session });

  const fail = makeEnv();
  fail.state.tipsFail = true;
  const f = fail.status();
  assert.deepStrictEqual(f.tips, []);
  assert.deepStrictEqual({ ok: f.ok, open: f.open, session: f.session }, { ok: base.ok, open: base.open, session: base.session });
  assert.equal(tipOpens(fail), 1);
  fail.status();
  assert.equal(tipOpens(fail), 1, 'a failed read is cached too: no new openTips inside 300 s');

  const header = makeEnv();
  assert.deepStrictEqual(header.status().tips, [], 'header only');

  const renamed = makeEnv();
  renamed.state.tipsTab = 'Tips';
  setTips(renamed, 'From the first tab');
  assert.deepStrictEqual(renamed.status().tips, ['From the first tab']);

  for (const tweak of [(x: any) => { x.tips = false; }, (x: any) => { delete x.tips; }]) {
    const off = makeEnv(tweak);
    setTips(off, 'A');
    assert.deepStrictEqual(off.status().tips, []);
    assert.equal(tipOpens(off), 0, 'the feed says no tips: the sheet is not opened');
  }
});

function remindScenario(going: number, tips: string[], tweak?: (feed: any) => void, failTips = false) {
  const env = makeEnv(tweak);
  setTips(env, ...tips);
  for (let i = 0; i < going; i++) rsvp(env, { name: `Guest ${i}`, email: `g${i}@example.com` });
  const before = env.mails.length;
  env.state.tipsFail = failTips;
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  return { env, reminders: env.mails.slice(before), confirmations: env.mails.slice(0, before) };
}

test('S4. reminders: one tip line each, just before the sign-off, no repeats until the tips run out', () => {
  const three = remindScenario(5, ['Tip one', 'Tip two', 'Tip three']);
  assert.equal(three.reminders.length, 5);
  const used = three.reminders.map((m) => tipOf(m.body)!);
  for (const m of three.reminders) {
    assert.equal(m.body.split('\n').filter((l) => TIP_LINE.test(l)).length, 1, 'exactly one tip line');
    const i = Number(/Guest (\d)/.exec(m.body)![1]);
    const tip = tipOf(m.body)!;
    assert.equal(m.body, withTipBlock(three.env, expectReminder(three.env, `Guest ${i}`, [[`Guest ${i}`, 'confirmed']]), tip));
  }
  assert.equal(new Set(used.slice(0, 3)).size, 3, `the first three are different: ${used.join(' | ')}`);
  for (const tip of ['Tip one', 'Tip two', 'Tip three']) assert.ok(used.filter((u) => u === tip).length <= 2, `${tip} used more than twice`);
  assert.ok(three.reminders.every((m) => three.env.data().every((x) => x[COL.reminder]) && m.to.endsWith('@example.com')));

  const seven = remindScenario(5, ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
  assert.equal(new Set(seven.reminders.map((m) => tipOf(m.body))).size, 5, 'five different tips from seven');

  const down = remindScenario(5, ['Tip one'], undefined, true);
  assert.equal(down.reminders.length, 5, 'the reminders still go');
  assert.ok(down.reminders.every((m) => tipOf(m.body) === undefined && !m.body.includes('Self-care')), 'no tip line when the sheet cannot be read');
  assert.ok(down.env.data().every((x) => x[COL.reminder]), 'and every row is stamped');
  assert.equal(down.reminders[0].body, expectReminder(down.env, 'Guest 0', [['Guest 0', 'confirmed']]));

  const old = remindScenario(2, ['Tip one'], (x) => { delete x.text.reminderTip; });
  assert.equal(old.reminders.length, 2);
  assert.ok(old.reminders.every((m) => !m.body.includes('Tip one')), 'a feed without reminderTip sends none');

  const off = remindScenario(2, ['Tip one'], (x) => { x.tips = false; });
  assert.equal(off.reminders.length, 2);
  assert.ok(off.reminders.every((m) => !m.body.includes('Tip one')));
  assert.equal(tipOpens(off.env), 0, 'feed tips false: the sheet is not opened');
});

test("S4. the confirmation, can't-go, change and spot-freed mails never carry a tip", () => {
  const env = makeEnv((f) => {
    f.session.limit = 1;
  });
  setTips(env, 'Zebra tip one', 'Zebra tip two');
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  rsvp(env, { name: 'Bob', email: 'bob@example.com' });
  rsvp(env, { name: 'Cal', email: 'cal@example.com', status: 'maybe' });
  rsvp(env, { name: 'Dee', email: 'dee@example.com', status: 'cant' });
  change(env, 'ann@example.com', { name: 'Ann', email: 'ann@example.com', status: 'cant' });
  assert.ok(env.mails.some((m) => m.to === env.feed.sender.contact), 'the spot-freed note went to Brian');
  assert.ok(env.mails.length >= 6, `mails: ${env.mails.length}`);
  for (const m of env.mails) assert.ok(!/Self-care|Zebra/.test(m.subject + m.body), `a tip in "${m.subject}"`);
  assert.equal(tipOpens(env), 0, 'none of these paths read the tips sheet');
});

test('S5. setup logs how many tips it read, never a tip or the sheet id', () => {
  const env = makeEnv();
  setTips(env, 'Secret tip one', 'Secret tip two', 'Secret tip three');
  env.api.setup();
  assert.ok(env.logger.includes('Tips read: 3'), env.logger.join(' | '));

  const unset = makeEnv();
  delete unset.props.TIPS_SHEET_ID;
  setTips(unset, 'Secret tip one');
  unset.api.setup();
  assert.ok(unset.logger.includes('Tips read: 0') && unset.logger.includes('TIPS_SHEET_ID not set (no tips)'), unset.logger.join(' | '));

  const down = makeEnv();
  down.state.tipsFail = true;
  down.api.setup();
  assert.ok(down.logger.includes('Tips read: 0'));

  for (const e of [env, unset, down]) for (const l of e.logger) assert.ok(!/Secret tip/.test(l) && !l.includes(TIPS_ID), `a tip or id in the log: ${l}`);
});


// ---- G. E7: mail through Gmail from the events alias (I-087) -----------------------------------------------------

const noAt = (env: Env) => assert.ok(env.logger.every((l) => !l.includes('@')), `an address in the log: ${env.logger.join(' | ')}`);
const FALLBACK = 'Mail: the events alias is not a Gmail send-as address; sent from the account address';

test('G1. every mail goes through GmailApp from the alias; the spot-freed note goes to the contact', () => {
  const env = makeEnv((f) => {
    f.session.limit = 1;
  });
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  rsvp(env, { name: 'Bob', email: 'bob@example.com' });
  rsvp(env, { name: 'Cal', email: 'cal@example.com', status: 'cant' });
  change(env, 'ann@example.com', { name: 'Ann', email: 'ann@example.com', status: 'cant' });
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  assert.ok(env.mails.length >= 6);
  for (const m of env.mails) {
    assert.equal(m.from, site.eventsEmail);
    assert.equal(m.replyTo, site.eventsEmail);
    assert.equal(m.name, site.name);
  }
  assert.ok(env.mails.some((m) => m.to === site.email), 'the spot-freed note went to the contact');
  assert.ok(!env.log.includes('MailApp.sendEmail'));
});

test('G2. the alias matches ignoring case', () => {
  const env = makeEnv();
  env.state.aliases = [env.feed.sender.from.toUpperCase()];
  rsvp(env, { email: 'ann@example.com' });
  assert.equal(env.mails[0].from, env.feed.sender.from);
});

test('G3. no alias, or getAliases throwing: mail goes without from, with the log line once per mail', () => {
  for (const set of [(e: Env) => { e.state.aliases = []; }, (e: Env) => { e.state.aliasesFail = true; }]) {
    const env = makeEnv();
    set(env);
    const r = rsvp(env, { email: 'ann@example.com' });
    assert.equal(r.ok, true);
    assert.deepEqual(r, rsvp(makeEnv(), { email: 'ann@example.com' }), 'same JSON reply as with the alias');
    assert.equal(env.mails.length, 1);
    assert.ok(!('from' in env.mails[0]));
    assert.equal(env.mails[0].name, site.name);
    assert.equal(env.mails[0].replyTo, site.eventsEmail);
    assert.equal(env.logger.filter((l) => l === FALLBACK).length, 1);
    noAt(env);
  }
});

test('G4. a rejected from retries once without it; a failed mail stamps nothing and retries next run', () => {
  const env = makeEnv();
  env.state.rejectFrom = true;
  rsvp(env, { email: 'ann@example.com' });
  assert.equal(env.mails.length, 1);
  assert.ok(!('from' in env.mails[0]));
  assert.ok(env.logger.includes(FALLBACK));
  noAt(env);

  const e2 = makeEnv();
  rsvp(e2, { name: 'Ann', email: 'ann@example.com' });
  rsvp(e2, { name: 'Bob', email: 'bob@example.com' });
  const sent0 = e2.mails.length;
  e2.clock.now = REMINDER_AT;
  e2.state.failMail = true;
  e2.api.sendDueReminders();
  assert.equal(e2.mails.length, sent0);
  assert.ok(e2.data().every((x) => !x[COL.reminder]), 'nothing stamped');
  e2.state.failMail = false;
  e2.api.sendDueReminders();
  assert.equal(e2.mails.length, sent0 + 2);
  assert.ok(e2.data().every((x) => x[COL.reminder]));
  e2.api.sendDueReminders();
  assert.equal(e2.mails.length, sent0 + 2, 'stamped once');
});

test('G5. an E6-shape feed (no from, no contact) still works', () => {
  const env = makeEnv((f) => {
    delete f.sender.from;
    delete f.sender.contact;
    f.session.limit = 1;
  });
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  rsvp(env, { name: 'Bob', email: 'bob@example.com' });
  change(env, 'ann@example.com', { name: 'Ann', email: 'ann@example.com', status: 'cant' });
  assert.ok(env.mails.length >= 3);
  for (const m of env.mails) assert.ok(!('from' in m));
  assert.ok(env.mails.some((m) => m.to === env.feed.sender.replyTo && /spot/i.test(m.subject + m.body)), 'spot-freed to replyTo');
  env.state.lockBusy = true;
  const err = env.postHtml(params({ name: 'Bob', email: 'bob@example.com' }));
  assert.ok(err.includes(`href="mailto:${env.feed.sender.replyTo}"`), 'error-page mailto = replyTo');
});

test('G6. setup logs the alias state per event tab', () => {
  const env = makeEnv();
  rsvp(env, { email: 'ann@example.com' });
  env.api.setup();
  assert.ok(env.logger.includes('From alias for launch-party: ready'), env.logger.join(' | '));
  assert.ok(env.logger.some((l) => l.startsWith('Remaining daily mail quota')));
  noAt(env);

  const none = makeEnv();
  rsvp(none, { email: 'ann@example.com' });
  none.state.aliases = [];
  none.api.setup();
  assert.ok(none.logger.includes('From alias for launch-party: not a Gmail send-as address (mail goes from the account address)'), none.logger.join(' | '));

  const old = makeEnv((f) => {
    delete f.sender.from;
  });
  rsvp(old, { email: 'ann@example.com' });
  old.api.setup();
  assert.ok(old.logger.includes('From alias for launch-party: not in the feed yet'), old.logger.join(' | '));

  const empty = makeEnv();
  empty.api.setup();
  assert.ok(!empty.logger.some((l) => l.startsWith('From alias for')));

  // a network error on the feed skips the tab; setup still logs the tips
  const net = makeEnv();
  rsvp(net, { email: 'ann@example.com' });
  net.cache.clear();
  net.state.fetchThrows = true;
  net.api.setup();
  assert.ok(!net.logger.some((l) => l.startsWith('From alias for')));
  assert.ok(net.logger.some((l) => l.startsWith('Tips read:')), net.logger.join(' | '));
});

test('G7. source: GmailApp.sendEmail only inside send_; no MailApp.sendEmail', () => {
  const text = readFileSync(new URL('../apps-script/rsvp.js', import.meta.url), 'utf8');
  assert.ok(!/MailApp\.sendEmail/.test(text));
  const start = text.indexOf('function send_');
  const end = text.indexOf('// people:', start);
  const all = [...text.matchAll(/GmailApp\.sendEmail/g)].map((m) => m.index!);
  assert.ok(all.length >= 1 && all.every((i) => i > start && i < end), 'only inside send_');
});


// ---- E13: Marea's email copy, HTML with a plain-text body, Brian's reply signature ---------------------------------

const ORIGIN = site.deploy.site;
const HOST_LABEL = new URL(ORIGIN).host;
const SIG_TEXT = (phone?: string) => [w('credential'), site.name, phone ? `${phone} • ${HOST_LABEL}` : HOST_LABEL].join('\n');
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const lastMail = (env: Env, to: string) => [...env.mails].reverse().find((m) => m.to === to)!;

test('E13-1. the Going confirmation is Marea\'s copy, line for line; the subject is unchanged', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Alex Rivera', email: 'alex@example.com', guests: [['Sam', 'no']] });
  const m = env.mails[0];
  const waiver = party.notices[0];
  assert.equal(m.subject, `You're on the list: ${party.title}`);
  assert.equal(
    m.body,
    [
      'Hi Alex Rivera,',
      "Thanks for your RSVP to Ohm Launch Party. I'm looking forward to celebrating this milestone moment with you.",
      "Here's all of the details:\nYour RSVP: Going\nYoga: Yes",
      'Guests:\n- Sam — Yoga: No',
      `To change your RSVP, register again on the event page with the same email address.\n${ORIGIN}/events/launch-party`,
      `When: Sunday, Nov 22, 2026, 2:00–6:00 pm\nWhere: ${party.venue.name}, ${party.venue.address}`,
      `Add to Google Calendar\n${env.feed.googleCalUrl}\nAdd to another calendar\n${ORIGIN}/events/launch-party.ics`,
      `Important: Waiver Required\n${waiver.text}\n${waiver.link!.label}\n${waiver.link!.url}`,
      `Ready to book a massage?\nClick here to book\n${ORIGIN}/book`,
      `If you have any questions, reply to this email or text Maréa: ${HOST_NUM}.`,
      'See you there!',
      SIG_TEXT(SIG_PHONE),
    ].join('\n\n'),
  );
  assert.equal(SIG_TEXT(SIG_PHONE), `Brian Clarke, LMT, CNMT\nOhm Precision Bodywork\n${SIG_PHONE} • ohmprecisionbodywork.com`);
  assert.equal(m.body, expectConfirm(env, 'Alex Rivera', 'going', [['Alex Rivera', 'confirmed'], ['Sam', 'no']]));
});

test('E13-2. HTML: the headings bold and green, links from the feed only, names escaped, the signature table', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Kim <b>Lee</b> & Co', email: 'kim@example.com', guests: [['https://evil.example', 'yes']] });
  const m = env.mails[0];
  const html = m.htmlBody;
  assert.ok(html && html.startsWith('<div>') && html.endsWith('</div>'), 'an htmlBody beside the plain body');
  for (const head of ["Here's all of the details:", 'Guests:', 'Important: Waiver Required', 'Ready to book a massage?']) {
    assert.ok(html.includes(`<strong style="color:#125245">${head.replace("'", '&#39;')}</strong>`), `heading ${head}`);
  }
  assert.ok(!m.body.includes('<strong'), 'the plain body has no markup');
  // E14: the book link is a button on its own line (a table cell carries the fill), in the site's button colours
  assert.ok(html.includes(`<a href="${ORIGIN}/book" style="display:inline-block;padding:12px 24px;`) && html.includes('>Click here to book</a></td></tr></table>'), 'the book button');
  assert.ok(html.includes('bgcolor="#9C5739"') && html.includes('color:#F3F2F0;text-decoration:none'), 'the site button colours');
  assert.ok(!html.includes('now live! <a'), 'the link is no longer inside the sentence');
  assert.ok(html.includes(`<a href="${esc(env.feed.pageUrl)}">${esc(env.feed.pageUrl)}</a>`), 'the event page stays a plain URL');
  // E16: the calendar and waiver links are words, not addresses
  for (const [url, label] of [[env.feed.icsUrl, T.calendar], [env.feed.googleCalUrl, T.calendarGoogle], [env.feed.notices[0].url, env.feed.notices[0].urlLabel]]) assert.ok(html.includes(`<a href="${esc(url)}">${esc(label)}</a>`) && !html.includes(`>${esc(url)}</a>`), `link ${label}`);
  assert.ok(html.includes('Hi Kim &lt;b&gt;Lee&lt;/b&gt; &amp; Co,') && !html.includes('<b>Lee'), 'the name is escaped');
  assert.ok(html.includes('<li><strong style="color:inherit">https://evil.example</strong> — Yoga: <strong style="color:#125245">Yes</strong></li>') && !html.includes('href="https://evil.example'), 'a name is never a link');
  // E14: your own Yoga line, Yes green; the guests a real bulleted list; No terracotta
  assert.ok(html.includes('Your RSVP: Going<br>Yoga: <strong style="color:#125245">Yes</strong></p>'), 'your answer, coloured');
  assert.ok(html.includes('<ul style="margin:0 0 16px;padding-left:20px"><li>'), 'a bulleted list');
  rsvp(env, { name: 'Lou', email: 'lou@example.com', guests: [['Max', 'no']] });
  assert.ok(env.mails[1].htmlBody.includes('<li><strong style="color:inherit">Max</strong> — Yoga: <strong style="color:#9C5739">No</strong></li>'), 'No is terracotta');
  // the signature: Brian's styles, regular-weight credentials, business and site linked, tel: link and bullet
  assert.ok(html.includes('<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:12px;line-height:16px;color:#125245">'));
  assert.ok(html.includes('<td style="border-left:2px solid #C37A5B;padding-left:10px">'));
  assert.ok(html.includes('<div style="font-weight:bold;font-size:13px;line-height:17px">Brian Clarke<span style="font-weight:normal">, LMT, CNMT</span></div>'));
  assert.ok(html.includes(`<a href="${ORIGIN}" style="color:#125245;text-decoration:none;font-weight:bold">Ohm Precision Bodywork</a>`));
  assert.ok(html.includes(`<a href="tel:7195550100" style="color:#125245;text-decoration:none">${SIG_PHONE}</a><span style="color:#C37A5B">&nbsp;&bull;&nbsp;</span><a href="${ORIGIN}" style="color:#125245;text-decoration:none">ohmprecisionbodywork.com</a>`));
  assert.ok(!/<img\b/i.test(html), 'no logo or image');
  assert.equal(m.from, site.eventsEmail, 'still from the alias');
});

test('E13-3. the signature reads SIGNATURE_PHONE at send time: set, unset, changed', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  assert.ok(env.mails[0].body.endsWith(`\n\n${SIG_TEXT(SIG_PHONE)}`));
  delete env.props.SIGNATURE_PHONE;
  rsvp(env, { name: 'Bob', email: 'bob@example.com', status: 'cant' });
  const bob = env.mails[1];
  assert.ok(bob.body.endsWith(`\n\nBrian Clarke, LMT, CNMT\nOhm Precision Bodywork\n${HOST_LABEL}`), 'no phone: the site alone, no bullet');
  assert.ok(!bob.body.includes('•') && !bob.htmlBody.includes('tel:') && !bob.htmlBody.includes('&bull;'));
  assert.ok(bob.htmlBody.includes(`<div><a href="${ORIGIN}" style="color:#125245;text-decoration:none">${HOST_LABEL}</a></div>`));
  env.props.SIGNATURE_PHONE = '  (719) 555-0199 ';
  rsvp(env, { name: 'Cal', email: 'cal@example.com' });
  const cal = env.mails[2];
  assert.ok(cal.body.endsWith(`(719) 555-0199 • ${HOST_LABEL}`), 'trimmed, as typed');
  assert.ok(cal.htmlBody.includes('<a href="tel:7195550199"'), 'tel: link with digits only');
  for (const m of env.mails) assert.equal(m.body.split('\n\n').filter((b) => b.startsWith(w('credential'))).length, 1, 'one signature');
});

test('E13-4. the questions line: with HOST_PHONE and the event host, else the short line', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  assert.ok(env.mails[0].body.includes(`\n\nIf you have any questions, reply to this email or text Maréa: ${HOST_NUM}.\n\nSee you there!\n\n`));
  delete env.props.HOST_PHONE;
  rsvp(env, { name: 'Bob', email: 'bob@example.com' });
  assert.ok(env.mails[1].body.includes('\n\nIf you have any questions, reply to this email.\n\nSee you there!\n\n'));
  assert.ok(!env.mails[1].body.includes('Maréa'));
  const noHost = makeEnv((f) => {
    f.mail.host = '';
  });
  rsvp(noHost, { name: 'Cy', email: 'cy@example.com' });
  assert.ok(noHost.mails[0].body.includes(`\n\n${T.questions}\n\n`), 'no host in the event: the short line, even with HOST_PHONE');
  assert.ok(!noHost.mails[0].body.includes(HOST_NUM));
});

test('E13-5 (E14). Maybe: your RSVP and the guests by name; no Yoga line, no maybeNote, no waitlist note', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Eli Ray', email: 'eli@example.com', status: 'maybe', guests: [['Fox', 'yes'], ['Gus', 'no']] });
  const m = env.mails[0];
  assert.ok(m.body.includes("Here's all of the details:\nYour RSVP: Maybe\n\nGuests:\n- Fox\n- Gus\n\n"));
  assert.ok(!m.body.includes(fill(T.maybeNote, words('Yoga'))) && !m.body.includes(T.waitlistNote));
  assert.ok(!m.body.includes('Yoga:'), 'no Yoga text at all, even though the request sent answers');
  assert.equal(m.body, expectConfirm(env, 'Eli Ray', 'maybe', [['Eli Ray', 'maybe'], ['Fox', 'maybe'], ['Gus', 'maybe']]));
});

test('E13-6. the yoga answer per cell: confirmed Yes, waitlist Waitlist with the note after the list, full No', () => {
  const env = makeEnv((f) => {
    f.session.limit = 1;
  });
  rsvp(env, { name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cy', 'no']] });
  assert.ok(env.mails[0].body.includes(`Your RSVP: Going\nYoga: Yes\n\nGuests:\n- Bea — Yoga: Waitlist\n- Cy — Yoga: No\n\n${T.waitlistNote}\n\n`));
  const full = makeEnv((f) => {
    f.session.limit = 1;
    f.session.waitlist = false;
  });
  rsvp(full, { name: 'Ann', email: 'ann@example.com' });
  rsvp(full, { name: 'Dee', email: 'dee@example.com' });
  assert.ok(full.mails[1].body.includes("Here's all of the details:\nYour RSVP: Going\nYoga: No\n\n"), 'full reads No');
  assert.ok(!full.mails[1].body.includes(T.waitlistNote));
});

test('E13-7. an event with no session: no yoga lines', () => {
  const env = makeEnv((f) => {
    f.session = null;
  });
  rsvp(env, { name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes']] });
  const m = env.mails[0];
  assert.ok(m.body.includes("Here's all of the details:\nYour RSVP: Going\n\nGuests:\n- Bea\n\n"));
  assert.ok(!m.body.includes('Yoga'));
  assert.equal(m.body, expectConfirm(env, 'Ann', 'going', [['Ann', ''], ['Bea', '']]));
});

test("E13-8. Can't go: Marea's copy, the book block and the signature; subject unchanged", () => {
  const env = makeEnv();
  rsvp(env, { name: 'Dan Lee', email: 'dan@example.com', status: 'cant' });
  const m = env.mails[0];
  assert.equal(m.subject, `RSVP received: ${party.title}`);
  assert.equal(
    m.body,
    [
      'Hi Dan Lee,',
      `Thanks for letting me know you can't make it to Ohm Launch Party. We'll miss you! If your plans change, RSVP again on the event page with this email address.\n${ORIGIN}/events/launch-party`,
      `Ready to book a massage?\nClick here to book\n${ORIGIN}/book`,
      SIG_TEXT(SIG_PHONE),
    ].join('\n\n'),
  );
  assert.ok(!m.body.includes('See you there') && !m.body.includes('questions'));
  assert.ok(m.htmlBody.includes(`<a href="${ORIGIN}/book" style="display:inline-block;`) && m.htmlBody.includes('border-left:2px solid #C37A5B'));
});

test('E13-9. the change email keeps its words, gains the signature, and its link still works from either body', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Bo Park', email: 'bo@example.com' });
  env.post(params({ name: 'Bo Park', email: 'bo@example.com', status: 'maybe' }));
  const m = lastMail(env, 'bo@example.com');
  const token = env.token('bo@example.com');
  const url = `${EXEC}?change=${token}`;
  // Brian, Nov 9: "open this link" is the link; the text body puts the URL on the next line
  assert.ok(m.body.includes(`To make the change, open this link and press Confirm change within 6 hours.\n${url}\n${T.changeIgnore}\n\n${SIG_TEXT(SIG_PHONE)}`));
  assert.ok(m.body.endsWith(SIG_TEXT(SIG_PHONE)) && !m.body.includes(T.seeYou) && !m.body.includes(T.bookHead));
  assert.ok(m.htmlBody.includes(`To make the change, <a href="${url}">open this link</a> and press Confirm change within 6 hours.<br>`), 'the words are the link');
  assert.ok(!m.htmlBody.includes(`>${url}<`), 'no bare URL in the HTML');
  const fromHtml = /href="[^"]*\?change=([0-9a-f-]+)"/.exec(m.htmlBody)![1];
  assert.equal(fromHtml, token);
  assert.ok(env.applyChange(fromHtml).includes(T.changeDoneTitle), 'the HTML link confirms the change');
  assert.equal(env.data()[0][COL.status], 'maybe');
});

test('E13-10. the reminder keeps its content, ends with the signature, and escapes a tip in its HTML', () => {
  const env = makeEnv();
  setTips(env, 'Breathe <slowly> & smile');
  rsvp(env, { name: 'Ann Aldo', email: 'ann@example.com' });
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  const m = lastMail(env, 'ann@example.com');
  assert.equal(m.subject, fill(T.reminderSubject, { title: env.feed.title }));
  assert.equal(m.body, withTipBlock(env, expectReminder(env, 'Ann Aldo', [['Ann Aldo', 'confirmed']]), 'Breathe <slowly> & smile'));
  assert.ok(m.htmlBody.includes('Self-care tip: Breathe &lt;slowly&gt; &amp; smile') && !m.htmlBody.includes('<slowly>'));
  assert.ok(m.htmlBody.includes(`<a href="${env.feed.pageUrl}">${env.feed.pageUrl}</a>`) && m.htmlBody.includes('<td style="border-left:2px solid #C37A5B'));
  assert.ok(!m.htmlBody.includes('<strong'), 'the reminder keeps its plain layout: no new headings');
});

test('E13-11. setup says whether the phone properties are set, never a number', () => {
  const env = makeEnv();
  rsvp(env, { email: 'ann@example.com' });
  env.api.setup();
  assert.ok(env.logger.includes('Signature phone: set') && env.logger.includes('Host phone: set'), env.logger.join(' | '));
  assert.ok(!env.logger.some((l) => l.startsWith('Signature for')), 'the feed has the signature');
  const none = makeEnv((f) => {
    delete f.signature;
  });
  rsvp(none, { email: 'ann@example.com' });
  delete none.props.SIGNATURE_PHONE;
  delete none.props.HOST_PHONE;
  none.api.setup();
  assert.ok(none.logger.includes('Signature phone: not set') && none.logger.includes('Host phone: not set'));
  assert.ok(none.logger.includes('Signature for launch-party: not in the feed yet'));
  for (const e of [env, none]) for (const l of e.logger) assert.ok(!l.includes('555') && !l.includes(SIG_PHONE) && !l.includes(HOST_NUM), `a phone number in the log: ${l}`);
});

test('E13-12. an older feed still mails; an email that cannot be built never undoes the RSVP', () => {
  const old = makeEnv((f) => {
    delete f.signature;
    delete f.bookUrl;
    delete f.mail;
  });
  rsvp(old, { name: 'Ann', email: 'ann@example.com', status: 'cant' });
  const m = old.mails[0];
  assert.ok(m.body.endsWith(`\n\n${site.name}`), 'signs with the business name, as before');
  assert.ok(!m.body.includes(T.bookHead) && m.body.includes(`can't make it to ${party.title}.`), 'eventName falls back to the title');

  const broken = makeEnv((f) => {
    delete f.venue;
  });
  const r = rsvp(broken, { name: 'Bob', email: 'bob@example.com' });
  assert.deepStrictEqual(r, { ok: true, status: 'going', outcomes: ['confirmed'] });
  assert.equal(broken.data().length, 1, 'the row is saved');
  assert.equal(broken.mails.length, 0);
  assert.ok(broken.logger.includes('Mail: an email could not be built from the feed; nothing sent'));
});

test('E13-13. source: the email colours equal tokens.css; no credential, name, business, URL path or phone typed in the script', () => {
  const css = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  const token = (name: string) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)![1].toLowerCase();
  const constant = (name: string) => new RegExp(`var ${name} = '(#[0-9a-fA-F]{6})'`).exec(src)![1].toLowerCase();
  assert.equal(constant('MAIL_GREEN'), token('--green-700'));
  assert.equal(constant('MAIL_TERRA'), token('--terra-500'));
  assert.equal(constant('MAIL_CTA'), token('--terra-700')); // E14: the site button's fill
  assert.equal(constant('MAIL_CTA_TEXT'), token('--cream'));
  assert.equal([...src.matchAll(/#[0-9a-fA-F]{6}\b/g)].length, 4, 'no other colour in the script');
  for (const word of ['LMT', 'CNMT', site.owner, site.name, '/book', 'Maréa', 'Ohm Launch Party']) assert.ok(!src.includes(word), `rsvp.js types "${word}"`);
  assert.ok(!/\(?\b[2-9]\d{2}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(src), 'no phone number');
  assert.ok(src.includes("prop_('SIGNATURE_PHONE')") && src.includes("prop_('HOST_PHONE')"));
});

// ---- E14: Maybe asks no session question; calendar links; the confirm button ---------------------------------------------

test('E14-6. a Maybe holds no spot for anyone: every cell maybe, answers sent with it are ignored, the reply says maybe', () => {
  const env = makeEnv();
  const before = JSON.stringify(env.status());
  // what the form sends: no session answers at all
  const r = env.post({ slug: SLUG, mode: 'json', name: 'Eli Ray', email: 'eli@example.com', status: 'maybe', g1name: 'Fox', g2name: 'Gus' });
  assert.deepStrictEqual(r, { ok: true, status: 'maybe', outcomes: ['maybe', 'maybe', 'maybe'] });
  // an old page that still sends answers
  rsvp(env, { name: 'Old Page', email: 'old@example.com', status: 'maybe', session: 'yes', guests: [['Kin', 'yes']] });
  assert.deepStrictEqual(env.data().filter((x) => x[COL.status] === 'maybe').map((x) => x[COL.cell]), ['maybe', 'maybe', 'maybe', 'maybe', 'maybe']);
  assert.equal(JSON.stringify(env.status()), before, 'a Maybe holds no spot');
  // Going still needs the answers
  const bad = env.post({ slug: SLUG, mode: 'json', name: 'Gil', email: 'gil@example.com', status: 'going', g1name: 'Hal' });
  assert.deepStrictEqual(bad, { ok: false, error: 'invalid', fields: ['session', 'g1session'] });
});

test('E14-6b. the Maybe pages and reminder list no session lines but keep the note', () => {
  const env = makeEnv();
  const html = env.postHtml({ slug: SLUG, mode: 'html', name: 'Eli Ray', email: 'eli@example.com', status: 'maybe', g1name: 'Fox' });
  assert.ok(html.includes(esc(fill(T.maybeNote, words('Yoga')))), 'the note');
  assert.ok(!html.includes('<li>') && !html.includes('no spot held while Maybe'), 'no per-person lines');
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  const m = lastMail(env, 'eli@example.com');
  assert.ok(m.body.includes(fill(T.maybeNote, words('Yoga'))) && !m.body.includes('Eli Ray ·') && !m.body.includes('Fox ·'), m.body);
});

test('E14-5. the Google Calendar link sits before the .ics in the confirmation and the reminder; an older feed keeps the .ics alone', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  const m = env.mails[0];
  const google = `${T.calendarGoogle}\n${env.feed.googleCalUrl}`;
  assert.ok(m.body.includes(`${google}\n${T.calendar}\n${env.feed.icsUrl}`));
  assert.ok(m.htmlBody.includes(`<a href="${esc(env.feed.googleCalUrl)}">${T.calendarGoogle}</a>`), 'the words are the link in the HTML');
  env.clock.now = REMINDER_AT;
  env.api.sendDueReminders();
  assert.ok(lastMail(env, 'ann@example.com').body.includes(google));
  const old = makeEnv((f) => {
    delete f.googleCalUrl;
  });
  rsvp(old, { name: 'Bea', email: 'bea@example.com' });
  assert.ok(!old.mails[0].body.includes('Google') && old.mails[0].body.includes(`${T.calendar}\n${old.feed.icsUrl}`));
  const page = env.postHtml(params({ name: 'Cy', email: 'cy@example.com' }));
  assert.ok(page.includes(`href="${esc(env.feed.googleCalUrl)}"`) && page.includes(T.calendarGoogle), 'the no-JS done page has the Google button');
});

test('E14-8. the confirm page locks its button on the first press and says Confirming…; a second submit does nothing', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  env.post(params({ name: 'Ann', email: 'ann@example.com', status: 'maybe' }));
  const page = env.getPage({ change: env.token('ann@example.com') });
  assert.ok(page.includes('<script>') && page.includes('addEventListener("submit"') && page.includes('b.disabled=true'), 'the lock script');
  assert.ok(page.includes(JSON.stringify(T.changeConfirming)), 'the button words while it works');
  assert.ok(page.includes('data-sent') && page.includes('e.preventDefault()'), 'a second submit is stopped');
  assert.equal((page.match(/<script/g) ?? []).length, 1, 'one script, nothing from the guest');
});

test('E14-7. a confirmed change then a second press: one email, the finished page both times, and a different request is still single-use', () => {
  const env = makeEnv();
  rsvp(env, { name: 'Ann', email: 'ann@example.com' });
  env.post(params({ name: 'Ann', email: 'ann@example.com', status: 'maybe', guests: [['Bea', 'no']] }));
  const token = env.token('ann@example.com');
  const mailsBefore = env.mails.length;
  const first = env.applyChange(token);
  assert.ok(first.includes(T.changeDoneTitle));
  assert.equal(env.mails.length, mailsBefore + 1, 'the new status gets its email, once');
  const sent = env.mails[env.mails.length - 1];
  assert.equal(sent.to, 'ann@example.com');
  assert.equal(sent.subject, fill(T.confirmSubject, { title: env.feed.title }));
  assert.ok(sent.body.includes('Your RSVP: Maybe') && !sent.body.includes('Yoga:'));
  const second = env.applyChange(token);
  assert.ok(second.includes(T.changeDoneTitle) && !second.includes(T.changeExpired));
  assert.equal(env.mails.length, mailsBefore + 1, 'no second email');
  assert.equal(env.data().length, 2, 'the sheet changed once');
  // a token that was never confirmed (or whose request was replaced) is still expired
  assert.ok(env.applyChange('00000000-0000-0000-0000-000000000000').includes(T.changeExpired));
  // changing to Can't go sends the short note
  env.clock.now += MIN;
  env.post(params({ name: 'Ann', email: 'ann@example.com', status: 'cant' }));
  env.applyChange(env.token('ann@example.com'));
  assert.equal(env.mails[env.mails.length - 1].subject, fill(T.cantSubject, { title: env.feed.title }));
});

// ---- Brian, Nov 9, 2026: a guest's optional email, and the short guest email -------------------------------------

/** params() plus g{n}email for the guests named in `emails` (index 0 = guest 1). */
const withEmails = (p: P, emails: (string | undefined)[]) => {
  const o = params(p);
  emails.forEach((e, i) => {
    if (e !== undefined) o[`g${i + 1}email`] = e;
  });
  return o;
};
/** Brian, Nov 9 (after testing): the confirmation's format, with guestLead, guestChangeLine and this guest's details
 * alone: the RSVP's status and, for a Going on a session event, the guest's own answer from their cell. */
function expectGuest(env: Env, guest: string, inviter: string, status: 'going' | 'maybe', cell: string): string {
  const f = env.feed;
  const v = vars(f);
  const main = [T.detailsHead, fill(T.yourRsvp, { status: T[status] })];
  if (f.session && status === 'going') main.push(fill(T.sessionAnswer, { Session: 'Yoga', answer: ANSWER[cell] }));
  return [
    fill(T.hi, { name: guest }),
    fill(T.guestLead, { ...v, inviter }).trim(),
    main.join('\n'),
    ...(f.session && cell === 'waitlist' ? [T.waitlistNote] : []),
    [T.guestChangeLine, f.pageUrl].join('\n'), // Brian, Nov 9: how a guest changes or cancels (no remove links)
    [fill(T.when, v), fill(T.where, v)].join('\n'),
    calendarBlock(f),
    ...noticeBlocks(f),
    bookBlock(f),
    hostLine(env),
    T.seeYou,
    expectSig(env),
  ].join('\n\n');
}

test('G-1. a guest with an email gets the guest email (To, subject, body, HTML); a guest without one gets none; the row keeps the address', () => {
  const env = makeEnv();
  const r = env.post(withEmails({ name: 'Alex Rivera', email: 'alex@example.com', guests: [['Sam', 'no'], ['Jo', 'yes']] }, [' Sam@Example.com ']));
  assert.equal(r.ok, true);
  assert.ok(!JSON.stringify(r).includes('sam@'), 'no address in the reply');
  assert.equal(env.mails.length, 2, 'the confirmation and one guest email');
  assert.equal(env.mails[0].to, 'alex@example.com');
  const g = env.mails[1];
  assert.equal(g.to, 'sam@example.com');
  assert.equal(g.subject, `You're on the list: ${party.title}`);
  assert.equal(g.replyTo, env.feed.sender.replyTo);
  assert.equal(g.from, env.feed.sender.from);
  assert.equal(g.body, expectGuest(env, 'Sam', 'Alex Rivera', 'going', 'no'));
  assert.ok(g.body.startsWith("Hi Sam,\n\nAlex Rivera RSVPed you to Ohm Launch Party. I'm looking forward to celebrating this milestone moment with you.\n\nHere's all of the details:\nYour RSVP: Going\nYoga: No\n\n"));
  // Brian, Nov 9 (after testing): the confirmation's format; Sam's own answer only, never the RSVPer or another guest
  assert.ok(g.body.includes(T.bookHead) && g.body.includes(T.guestChangeLine) && !g.body.includes(T.changeLine));
  assert.ok(!g.body.includes(T.guestsHead) && !/\bJo\b/.test(g.body) &&!g.body.includes('Alex Rivera —') && !g.body.includes(fill(T.detailsLine, vars(env.feed))));
  assert.ok(g.htmlBody.includes(`<a href="${esc(env.feed.pageUrl)}">`) && g.htmlBody.includes('Alex Rivera RSVPed you'));
  assert.ok(g.htmlBody.includes(`Yoga: <strong style="color:#9C5739">No</strong>`), 'No in terracotta, as in the confirmation');
  assert.ok(g.htmlBody.includes(`<a href="${esc(env.feed.bookUrl)}"`) && g.htmlBody.includes(esc(T.bookLink)), 'the book button');
  const rows = env.data();
  assert.deepEqual(rows.map((x) => [x[COL.who], x[COL.name], x[COL.email], x[COL.optin]]), [
    ['you', 'Alex Rivera', 'alex@example.com', ''],
    ['guest', 'Sam', 'sam@example.com', ''],
    ['guest', 'Jo', '', ''],
  ]);
  // Brian, Nov 9 (guest self-removal): the guest's own address RSVPing again is a guest request, not a new RSVP (G-5–G-10)
  const own = rsvp(env, { name: 'Sam', email: 'sam@example.com' });
  assert.deepEqual(own, { ok: true, status: 'going', pending: true, outcomes: [] });
  assert.equal(env.data().length, 3, 'no new rows');
});

test("G-2. Maybe mails the guest; Can't go mails no guest; a guest's address equal to the RSVPer's or repeated is mailed once at most", () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', status: 'maybe', guests: [['Bea', ''], ['Cy', '']] }, ['bea@example.com']));
  assert.deepEqual(env.mails.map((m) => m.to), ['ann@example.com', 'bea@example.com']);
  assert.equal(env.mails[1].body, expectGuest(env, 'Bea', 'Ann', 'maybe', 'maybe'));
  assert.ok(env.mails[1].body.includes('Your RSVP: Maybe\n\n') && !env.mails[1].body.includes('Yoga:'), 'a Maybe: the status only');
  const e2 = makeEnv();
  e2.post(withEmails({ name: 'Dan', email: 'dan@example.com', status: 'cant', guests: [['Eve', 'yes']] }, ['eve@example.com']));
  assert.deepEqual(e2.mails.map((m) => m.to), ['dan@example.com']);
  assert.equal(e2.mails[0].subject, fill(T.cantSubject, { title: e2.feed.title }));
  assert.equal(e2.data().length, 1, "Can't go keeps no guest rows");
  const e3 = makeEnv();
  e3.post(withEmails({ name: 'Fay', email: 'fay@example.com', guests: [['Gus', 'no'], ['Hal', 'no'], ['Ivy', 'no']] }, ['FAY@example.com', 'gus@example.com', 'gus@example.com']));
  assert.deepEqual(e3.mails.map((m) => m.to), ['fay@example.com', 'gus@example.com']);
});

test('G-3. a confirmed change mails only a guest address the RSVP did not already store', () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  assert.deepEqual(env.mails.map((m) => m.to), ['ann@example.com', 'bea@example.com']);
  env.clock.now += MIN;
  const r = env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cy', 'no']] }, ['bea@example.com', 'cy@example.com']));
  assert.equal(r.pending, true);
  assert.equal(env.mails[env.mails.length - 1].to, 'ann@example.com', 'the change link goes to the RSVPer only');
  const before = env.mails.length;
  env.applyChange(env.token('ann@example.com'));
  assert.deepEqual(env.mails.slice(before).map((m) => m.to), ['ann@example.com', 'cy@example.com'], 'Bea is not mailed again');
  assert.deepEqual(env.data().map((x) => x[COL.email]), ['ann@example.com', 'bea@example.com', 'cy@example.com']);
});

test('G-4. a bad guest email is invalid with g{n}email: no row, no mail; a feed without guestLead sends no guest email', () => {
  const env = makeEnv();
  const r = env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example']));
  assert.deepEqual(r, { ok: false, error: 'invalid', fields: ['g1email'] });
  assert.equal(env.mails.length, 0);
  assert.equal(env.data().length, 0);
  const old = makeEnv((feed) => {
    delete feed.text.guestLead;
  });
  old.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  assert.deepEqual(old.mails.map((m) => m.to), ['ann@example.com'], 'the RSVPer still gets the confirmation');
  assert.ok(!('bookLine' in env.feed.text), 'Brian, Nov 9: bookLine is gone');
});

// ---- Brian, Nov 9, 2026: a guest takes themselves off the list (guest self-removal) ------------------------------

const removeMail = (env: Env, guest: string, inviter: string, token: string) =>
  [
    fill(T.hi, { name: guest }),
    fill(T.guestRemoveLead, { ...vars(env.feed), inviter }),
    [linkLine(`${EXEC}?change=${token}`), T.guestRemoveIgnore].join('\n'),
    expectSig(env),
  ].join('\n\n');

test("G-5. a guest's address RSVPs Can't go: the same pending reply as a change, one confirm mail to that address only, nothing written; the link's page writes nothing", () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cy', 'no']] }, ['bea@example.com']));
  rsvp(env, { name: 'Dee', email: 'dee@example.com' });
  const rows0 = JSON.stringify(env.sheet().rows);
  const before = env.mails.length;
  const r = rsvp(env, { name: 'Somebody', email: ' Bea@Example.com ', status: 'cant' });
  const yours = rsvp(env, { name: 'Dee', email: 'dee@example.com', status: 'cant' });
  assert.deepEqual(r, { ok: true, status: 'cant', pending: true, outcomes: [] });
  assert.deepEqual(r, yours, "the same reply as an RSVPer's change request");
  assert.equal(JSON.stringify(env.sheet().rows), rows0, 'nothing written');
  const sent = env.mails.slice(before);
  assert.deepEqual(sent.map((m) => m.to), ['bea@example.com', 'dee@example.com'], 'the guest address only (and Dee her own change link)');
  const token = env.token('bea@example.com');
  assert.equal(sent[0].subject, fill(T.guestRemoveSubject, { title: env.feed.title }));
  assert.equal(sent[0].body, removeMail(env, 'Bea', 'Ann', token));
  assert.ok(!sent[0].body.includes('Somebody'), 'the stored name, not the typed one');
  assert.ok(sent[0].htmlBody.includes(`<a href="${esc(`${EXEC}?change=${token}`)}">${esc(T.changeLinkWords)}</a>`), 'Brian, Nov 9: the words are the link');
  assert.equal(sent[0].from, env.feed.sender.from);
  // the no-JS reply is the same "check your email" page
  const page = env.postHtml(params({ name: 'X', email: 'bea@example.com', status: 'cant' }));
  assert.ok(page.includes(esc(T.changeTitle)) && page.includes(esc(T.changeText)));
  // the link's page: the guest lead and the Confirm button; a GET writes nothing
  const confirm = env.getPage({ change: token });
  assert.equal(JSON.stringify(env.sheet().rows), rows0, 'a GET writes nothing');
  assert.ok(confirm.includes(`<h1>${esc(fill(T.guestRemoveConfirmLead, vars(env.feed)))}</h1>`));
  assert.ok(confirm.includes(`name="change" value="${token}"`) && confirm.includes(esc(T.changeConfirm)));
  assert.ok(!confirm.includes(esc(T.changeConfirmLead)), 'not the RSVPer page');
});

test('G-6. confirming removes only that guest row; the RSVPer gets the note; the guest only the page; a second press shows the same page and sends nothing', () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cy', 'no']] }, ['bea@example.com', 'cy@example.com']));
  env.post(withEmails({ name: 'Dee', email: 'dee@example.com', guests: [['Bea', 'yes']] }, [])); // another Bea, no address
  const before = env.data();
  rsvp(env, { name: 'Bea', email: 'bea@example.com', status: 'cant' });
  const token = env.token('bea@example.com');
  const m0 = env.mails.length;
  const page = env.applyChange(token);
  assert.ok(page.includes(esc(T.guestRemovedTitle)) && page.includes(esc(T.guestRemovedText)));
  assert.ok(!page.includes(esc(T.changeDoneTitle)));
  const after = env.data();
  assert.equal(after.length, before.length - 1);
  assert.deepEqual(after, before.filter((x) => x[COL.email] !== 'bea@example.com'), 'only that row is gone; every other cell is unchanged');
  const sent = env.mails.slice(m0);
  assert.deepEqual(sent.map((m) => m.to), ['ann@example.com'], 'the RSVPer only');
  assert.equal(sent[0].subject, fill(T.guestRemovedSubject, { title: env.feed.title }));
  assert.equal(sent[0].body, [fill(T.hi, { name: 'Ann' }), fill(T.guestRemovedNote, { guest: 'Bea', eventName: env.feed.mail.name }), expectSig(env)].join('\n\n'));
  assert.ok(sent[0].body.startsWith('Hi Ann,\n\nBea removed themselves from your RSVP to Ohm Launch Party.\n\n'));
  // a second press, and the link opened again: the same page, no mail, no write
  const again = env.applyChange(token);
  assert.ok(again.includes(esc(T.guestRemovedTitle)) && !again.includes(esc(T.changeExpired)));
  assert.ok(env.getPage({ change: token }).includes(esc(T.guestRemovedTitle)));
  assert.equal(env.mails.length, m0 + 1, 'no second note');
  assert.deepEqual(env.data(), after, 'the sheet changed once');
  // Bea's spot is free (nobody waits, so no spot-freed note); her address is now unknown and RSVPs as a new person
  assert.equal(env.status().session.spotsLeft, 17);
  assert.deepEqual(rsvp(env, { name: 'Bea', email: 'bea@example.com' }), { ok: true, status: 'going', outcomes: ['confirmed'] });
});

test('G-7. a removed guest who held a confirmed spot while anyone waits: the spot-freed note (freed 1); a waitlisted guest, or nobody waiting: none', () => {
  const env = makeEnv((f) => {
    f.session.limit = 2;
  });
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes']] }, ['bea@example.com']));
  env.post(withEmails({ name: 'Dee', email: 'dee@example.com', guests: [['Eve', 'yes']] }, ['eve@example.com']));
  const cell = (n: string) => env.data().find((x) => x[COL.name] === n)?.[COL.cell];
  assert.deepEqual(['Ann', 'Bea', 'Dee', 'Eve'].map(cell), ['confirmed', 'confirmed', 'waitlist', 'waitlist']);
  rsvp(env, { name: 'Bea', email: 'bea@example.com', status: 'cant' });
  const m0 = env.mails.length;
  env.applyChange(env.token('bea@example.com'));
  const freed = env.mails.slice(m0).filter((m) => m.to === env.feed.sender.contact);
  assert.equal(freed.length, 1, 'one spot-freed note');
  assert.equal(freed[0].subject, fill(T.spotFreedSubject, { session: 'yoga', title: env.feed.title }));
  assert.equal(freed[0].body, [fill(T.spotFreedText, { session: 'yoga', n: 1 }), fill(T.detailsLine, vars(env.feed))].join('\n\n'));
  assert.equal(cell('Dee'), 'waitlist', 'nobody is promoted');
  // a waitlisted guest's removal frees nothing
  rsvp(env, { name: 'Eve', email: 'eve@example.com', status: 'cant' });
  const m1 = env.mails.length;
  env.applyChange(env.token('eve@example.com'));
  assert.deepEqual(env.mails.slice(m1).map((m) => m.to), ['dee@example.com'], 'the note to Dee only');
  assert.equal(cell('Eve'), undefined);
  // nobody waiting: no note
  const e2 = makeEnv((f) => {
    f.session.limit = 3;
  });
  e2.post(withEmails({ name: 'Hal', email: 'hal@example.com', guests: [['Ivy', 'yes']] }, ['ivy@example.com']));
  rsvp(e2, { name: 'Ivy', email: 'ivy@example.com', status: 'cant' });
  e2.applyChange(e2.token('ivy@example.com'));
  assert.ok(!e2.mails.some((m) => m.to === e2.feed.sender.contact), 'no spot-freed note');
  assert.equal(e2.status().session.spotsLeft, 2);
});

test('G-8. Going or Maybe from a guest address changes nothing: the pending reply and an "already on the list" note with no link; the throttle caps it', () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  const rows0 = JSON.stringify(env.sheet().rows);
  const m0 = env.mails.length;
  for (const status of ['going', 'maybe']) {
    const r = rsvp(env, { name: 'B', email: 'bea@example.com', status, guests: [['Zed', 'yes']] });
    assert.deepEqual(r, { ok: true, status, pending: true, outcomes: [] });
  }
  assert.equal(JSON.stringify(env.sheet().rows), rows0, 'nothing written');
  const sent = env.mails.slice(m0);
  assert.deepEqual(sent.map((m) => m.to), ['bea@example.com', 'bea@example.com']);
  const f = env.feed;
  const expected = [fill(T.hi, { name: 'Bea' }), fill(T.guestListedLead, { ...vars(f), inviter: 'Ann' }), [T.guestChangeLine, f.pageUrl].join('\n'), expectSig(env)].join('\n\n');
  for (const m of sent) {
    assert.equal(m.subject, fill(T.guestListedSubject, { title: f.title }));
    assert.equal(m.body, expected);
    assert.ok(!/\?change=/.test(m.body), 'no link');
  }
  assert.ok(![...env.cache.keys()].some((k) => k.startsWith('chg:')), 'no token');
  // the third request still mails (3 per 6 hours); the fourth gets the same reply and sends nothing
  rsvp(env, { name: 'B', email: 'bea@example.com', status: 'going' });
  const r4 = rsvp(env, { name: 'B', email: 'bea@example.com', status: 'cant' });
  assert.deepEqual(r4, { ok: true, status: 'cant', pending: true, outcomes: [] });
  assert.equal(env.mails.length, m0 + 3, 'the fourth request sends nothing');
  assert.equal(JSON.stringify(env.sheet().rows), rows0);
});

test('G-9. an unknown address is a new RSVP as before; so is a guest address whose RSVPer row is gone, and any address on a feed without guestRemoveLead', () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  assert.deepEqual(rsvp(env, { name: 'Cy', email: 'cy@example.com' }), { ok: true, status: 'going', outcomes: ['confirmed'] });
  assert.equal(env.mails[env.mails.length - 1].subject, fill(T.confirmSubject, { title: env.feed.title }));
  env.sheet().rows.splice(1, 1); // Brian deletes Ann's you row by hand: Bea's row has no RSVPer
  assert.deepEqual(rsvp(env, { name: 'Bea', email: 'bea@example.com' }), { ok: true, status: 'going', outcomes: ['confirmed'] });
  const old = makeEnv((feed) => {
    delete feed.text.guestRemoveLead;
  });
  old.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  assert.deepEqual(rsvp(old, { name: 'Bea', email: 'bea@example.com', status: 'cant' }), { ok: true, status: 'cant', outcomes: [] });
  assert.equal(old.data().length, 3, 'a new RSVP row, as before');
});

test('G-10. a stale guest link (the RSVPer changed the RSVP first, 6 hours passed, or the row went by hand): changeExpired, nothing deleted, no note', () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes']] }, ['bea@example.com']));
  rsvp(env, { name: 'Bea', email: 'bea@example.com', status: 'cant' });
  const stale = env.token('bea@example.com');
  env.clock.now += MIN;
  // Ann confirms a change (Bea stays, same address): the RSVP's base moves on
  const r = env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes']] }, ['bea@example.com']));
  assert.equal(r.pending, true);
  env.applyChange(env.token('ann@example.com'));
  const rows1 = env.data();
  const m1 = env.mails.length;
  assert.ok(env.applyChange(stale).includes(esc(T.changeExpired)));
  assert.deepEqual(env.data(), rows1, 'nothing deleted');
  assert.equal(env.mails.length, m1, 'no note');
  // 6 hours pass before the guest confirms
  rsvp(env, { name: 'Bea', email: 'bea@example.com', status: 'cant' });
  const late = env.token('bea@example.com');
  env.clock.now += 6 * HOUR + MIN;
  assert.ok(env.getPage({ change: late }).includes(esc(T.changeExpired)), 'GET after expiry');
  assert.ok(env.applyChange(late).includes(esc(T.changeExpired)), 'POST after expiry');
  assert.deepEqual(env.data(), rows1);
  // Brian deletes the guest row by hand before she confirms
  rsvp(env, { name: 'Bea', email: 'bea@example.com', status: 'cant' });
  const gone = env.token('bea@example.com');
  const i = env.sheet().rows.findIndex((x) => x[COL.email] === 'bea@example.com');
  env.sheet().rows.splice(i, 1);
  const rows2 = env.data();
  const m2 = env.mails.length;
  assert.ok(env.applyChange(gone).includes(esc(T.changeExpired)));
  assert.deepEqual(env.data(), rows2);
  assert.equal(env.mails.length, m2);
});

// ---- Brian, Nov 9, 2026: at most one guest email per address per event (the cap) ---------------------------------

test('G-11. a guest address any row of the tab already holds (another RSVP\'s guest or RSVPer) gets no guest email; the row still keeps it', () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  rsvp(env, { name: 'Dee', email: 'dee@example.com' });
  assert.deepEqual(env.mails.map((m) => m.to), ['ann@example.com', 'bea@example.com', 'dee@example.com']);
  const before = env.mails.length;
  // Fay lists Bea (already Ann's guest), Dee (an RSVPer), herself, a repeat, and one new address
  env.post(
    withEmails({ name: 'Fay', email: 'fay@example.com', guests: [['Bea', 'no'], ['Dee', 'no'], ['Gus', 'no'], ['Hal', 'no'], ['Ivy', 'no']] }, [
      'BEA@example.com',
      'dee@example.com',
      'fay@example.com',
      'gus@example.com',
      'gus@example.com',
    ]),
  );
  assert.deepEqual(env.mails.slice(before).map((m) => m.to), ['fay@example.com', 'gus@example.com'], 'only the new address');
  const fay = env.data().filter((x) => x[COL.id] === env.data().find((y) => y[COL.email] === 'fay@example.com')![COL.id]);
  assert.deepEqual(fay.map((x) => x[COL.email]), ['fay@example.com', 'bea@example.com', 'dee@example.com', 'fay@example.com', 'gus@example.com', 'gus@example.com'], 'every typed address is stored');
  // a later RSVP listing Gus (now in Fay's rows) mails nobody but its RSVPer
  const m1 = env.mails.length;
  env.post(withEmails({ name: 'Jo', email: 'jo@example.com', guests: [['Gus', 'no']] }, ['gus@example.com']));
  assert.deepEqual(env.mails.slice(m1).map((m) => m.to), ['jo@example.com']);
});

test('G-12. a confirmed change skips a new guest address another RSVP holds and mails a new one; once a row is gone the address can be mailed again', () => {
  const env = makeEnv();
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  env.post(withEmails({ name: 'Dee', email: 'dee@example.com', guests: [['Eve', 'no']] }, ['eve@example.com']));
  env.clock.now += MIN;
  env.post(withEmails({ name: 'Dee', email: 'dee@example.com', guests: [['Eve', 'no'], ['Bea', 'no'], ['Cy', 'no']] }, ['eve@example.com', 'bea@example.com', 'cy@example.com']));
  const before = env.mails.length;
  env.applyChange(env.token('dee@example.com'));
  assert.deepEqual(env.mails.slice(before).map((m) => m.to), ['dee@example.com', 'cy@example.com'], 'Eve (her own old row) and Bea (Ann\'s guest) are not mailed again');
  // Brian deletes every row holding Cy by hand; a new RSVP listing Cy mails Cy again (the cap reads the tab as it is)
  const all = env.sheet().rows;
  for (let i = all.length - 1; i > 0; i--) if (all[i][COL.email] === 'cy@example.com') all.splice(i, 1);
  const m1 = env.mails.length;
  env.post(withEmails({ name: 'Jo', email: 'jo@example.com', guests: [['Cy', 'no']] }, ['cy@example.com']));
  assert.deepEqual(env.mails.slice(m1).map((m) => m.to), ['jo@example.com', 'cy@example.com']);
});

// ---- Brian, Nov 9, 2026 (after testing the live emails): the guest email in the confirmation's format --------------

test("G-13. each guest's email carries that guest's own cell: Yes green, Waitlist with the note, No; no session: the status only", () => {
  const env = makeEnv((f) => {
    f.session.limit = 2;
  });
  // Ann takes spot 1, Bea spot 2, Cy is waitlisted, Dan answers no; only the guests with addresses are mailed
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cy', 'yes'], ['Dan', 'no']] }, ['bea@example.com', undefined, 'dan@example.com']));
  const cy = makeEnv((f) => {
    f.session.limit = 2;
  });
  cy.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes'], ['Cy', 'yes']] }, [undefined, 'cy@example.com']));
  assert.deepEqual(env.mails.map((m) => m.to), ['ann@example.com', 'bea@example.com', 'dan@example.com']);
  const [, bea, dan] = env.mails;
  assert.equal(bea.body, expectGuest(env, 'Bea', 'Ann', 'going', 'confirmed'));
  assert.ok(bea.htmlBody.includes('Your RSVP: Going<br>Yoga: <strong style="color:#125245">Yes</strong></p>'), 'Yes in green');
  assert.ok(!bea.body.includes(T.waitlistNote), "Cy's waitlist is not Bea's");
  assert.equal(dan.body, expectGuest(env, 'Dan', 'Ann', 'going', 'no'));
  const c = cy.mails[1];
  assert.equal(c.to, 'cy@example.com');
  assert.equal(c.body, expectGuest(cy, 'Cy', 'Ann', 'going', 'waitlist'));
  assert.ok(c.body.includes(`Your RSVP: Going\nYoga: Waitlist\n\n${T.waitlistNote}\n\n`));
  for (const m of [bea, dan, c]) {
    assert.ok(!m.body.includes(T.guestsHead) && !m.body.includes('Ann —') && !m.htmlBody.includes('<li>'), 'no guest list, no RSVPer line');
  }
  const plain = makeEnv((f) => {
    f.session = null;
  });
  plain.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'yes']] }, ['bea@example.com']));
  assert.equal(plain.mails[1].body, expectGuest(plain, 'Bea', 'Ann', 'going', ''));
  assert.ok(plain.mails[1].body.includes("Here's all of the details:\nYour RSVP: Going\n\n") && !plain.mails[1].body.includes('Yoga'));
});

test('G-14. an older feed (changeLinkLine with {changeUrl}, no changeLinkWords) keeps the bare confirm URL in the change and guest-removal emails', () => {
  const env = makeEnv((f) => {
    delete f.text.changeLinkWords;
    f.text.changeLinkLine = 'To make the change, open this link and press Confirm change within 6 hours: {changeUrl}';
  });
  env.post(withEmails({ name: 'Ann', email: 'ann@example.com', guests: [['Bea', 'no']] }, ['bea@example.com']));
  rsvp(env, { name: 'Ann', email: 'ann@example.com', status: 'maybe' });
  rsvp(env, { name: 'Bea', email: 'bea@example.com', status: 'cant' });
  for (const to of ['ann@example.com', 'bea@example.com']) {
    const url = `${EXEC}?change=${env.token(to)}`;
    const m = [...env.mails].reverse().find((x) => x.to === to)!;
    assert.ok(m.body.includes(`within 6 hours: ${url}\n`), `${to}: the URL in the line`);
    assert.ok(m.htmlBody.includes(`within 6 hours: <a href="${url}">${url}</a>`), `${to}: linked as before`);
  }
});
