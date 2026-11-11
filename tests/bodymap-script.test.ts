// B2 (I-073, I-126, I-127, I-128): the body map filing script (apps-script/bodymap/bodymap.js), run in node:vm with
// fakes for Drive, Cache, Lock, Properties, ContentService and Utilities, and a settable clock. No network, no dist/.
// Every name, note and ID is fake (tests/fixtures/bodymap-payloads.json). ARCHITECTURE §B12.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bodymap, folderKey } from '../src/data/bodymap.ts';

const src = readFileSync(new URL('../apps-script/bodymap/bodymap.js', import.meta.url), 'utf8');
const manifestText = readFileSync(new URL('../apps-script/bodymap/appsscript.json', import.meta.url), 'utf8');
const fx = JSON.parse(readFileSync(new URL('./fixtures/bodymap-payloads.json', import.meta.url), 'utf8'));

const FOLDER_ID: string = fx.clientsFolderId;
const CLOCK0 = Date.parse(fx.clock); // Fri Nov 20, 2026, 12:00 in Denver; no fixture appointment falls on a send day
const SEC = 1000;
const MIN = 60_000;
const HOUR = 3_600_000;
const PDF = Buffer.from(fx.pdfText, 'utf8');
const PDF_B64 = PDF.toString('base64');
const UNSORTED = bodymap.unsortedFolder;
const R = {
  ok: '{"ok":true}',
  invalid: '{"ok":false,"error":"invalid"}',
  busy: '{"ok":false,"error":"busy"}',
  server: '{"ok":false,"error":"server"}',
};
const sha16 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

// ---- The fakes ---------------------------------------------------------------------------------------------------

type Blob = { fake: 'blob'; data: Buffer; type: string; name: string };
type FakeFile = { id: string; name: string; mime: string; data: Buffer };

function makeEnv(opts: { unsorted?: boolean; folderId?: boolean } = {}) {
  const clock = { now: CLOCK0 };
  const log: string[] = [];
  const warns: unknown[][] = [];
  const otherConsole: string[] = [];
  const state = {
    lockBusy: false,
    lockMs: [] as number[],
    creates: 0,
    failCreate: null as null | ((blob: Blob, n: number) => boolean),
    failGetFolder: false,
    failCachePut: null as null | ((key: string) => boolean),
    failPropSet: false,
  };
  const cacheStore = new Map<string, { v: string; exp: number }>();
  const cacheWrites: { k: string; v: string; sec: number }[] = [];
  const props: Record<string, string> = {};
  if (opts.folderId !== false) props.CLIENTS_FOLDER_ID = FOLDER_ID;
  const propWrites: { k: string; v: string }[] = [];
  const replies: string[] = [];
  let ids = 0;
  const newId = (kind: string) => `fake-${kind}-id-${String(++ids).padStart(4, '0')}-abcdefghijklmnop`;
  const iter = <T>(list: T[]) => {
    let i = 0;
    return { hasNext: () => i < list.length, next: () => list[i++] };
  };

  class FakeFolder {
    id = newId('folder');
    name: string;
    trashed = false;
    folders: FakeFolder[] = [];
    files: FakeFile[] = [];
    constructor(name: string) {
      this.name = name;
    }
    getName() {
      log.push('drive.getName');
      return this.name;
    }
    isTrashed() {
      log.push('drive.isTrashed');
      return this.trashed;
    }
    getFolders() {
      log.push('drive.getFolders');
      return iter(this.folders);
    }
    getFoldersByName(n: string) {
      log.push('drive.getFoldersByName');
      return iter(this.folders.filter((f) => f.name === n));
    }
    createFolder(n: string) {
      log.push('drive.createFolder');
      const f = new FakeFolder(n);
      this.folders.push(f);
      return f;
    }
    createFile(blob: Blob) {
      log.push('drive.createFile');
      state.creates++;
      assert.ok(blob && blob.fake === 'blob', 'createFile takes one blob');
      if (state.failCreate?.(blob, state.creates)) throw new Error('drive down');
      this.files.push({ id: newId('file'), name: blob.name, mime: blob.type, data: blob.data });
      return {}; // the script has no use for the new file: nothing to call on it
    }
  }

  const parent = new FakeFolder('Fake Clients');
  for (const n of fx.folders as string[]) parent.folders.push(new FakeFolder(n));
  if (opts.unsorted !== false) parent.folders.push(new FakeFolder(UNSORTED));

  class FakeDate extends Date {
    constructor(...a: any[]) {
      if (a.length === 0) super(clock.now);
      else super(...(a as [any]));
    }
    static now() {
      return clock.now;
    }
  }

  const out = (body: string) => {
    const o: any = { mime: '', getContent: () => body, setMimeType: (m: string) => ((o.mime = m), o) };
    return o;
  };
  const signed = (buf: Buffer) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
  const globals = {
    Date: FakeDate,
    DriveApp: {
      getFolderById: (id: string) => {
        log.push('drive.getFolderById');
        if (state.failGetFolder || id !== FOLDER_ID) throw new Error('no such folder');
        return parent;
      },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: (ms: number) => {
          log.push('lock.try');
          state.lockMs.push(ms);
          return !state.lockBusy;
        },
        releaseLock: () => {
          log.push('lock.release');
        },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => {
          log.push('cache.get');
          const e = cacheStore.get(k);
          if (!e) return null;
          if (clock.now >= e.exp) {
            cacheStore.delete(k);
            return null;
          }
          return e.v;
        },
        put: (k: string, v: string, sec: number) => {
          log.push('cache.put');
          assert.equal(typeof v, 'string', 'cache values are strings');
          assert.ok(k.length <= 250, 'cache key at most 250 characters');
          assert.ok(Number.isInteger(sec) && sec >= 1 && sec <= 21600, `cache expiry 1 to 21,600 s, got ${sec}`);
          if (state.failCachePut?.(k)) throw new Error('cache down');
          cacheStore.set(k, { v, exp: clock.now + sec * 1000 });
          cacheWrites.push({ k, v, sec });
        },
        remove: (k: string) => {
          log.push('cache.remove');
          cacheStore.delete(k);
        },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => {
          log.push(`props.get:${k}`);
          return props[k] ?? null;
        },
        setProperty: (k: string, v: string) => {
          log.push(`props.set:${k}`);
          assert.equal(typeof v, 'string', 'property values are strings');
          if (state.failPropSet) throw new Error('properties down');
          props[k] = v;
          propWrites.push({ k, v });
        },
      }),
    },
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (s: string) => out(s) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (alg: string, s: string, charset: string) => {
        assert.equal(alg, 'SHA_256');
        assert.equal(charset, 'UTF_8');
        return signed(createHash('sha256').update(String(s), 'utf8').digest());
      },
      base64Decode: (s: string) => signed(Buffer.from(s, 'base64')),
      newBlob: (data: string | number[], type: string, name: string): Blob => ({
        fake: 'blob',
        data: typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data.map((b) => b & 255)),
        type,
        name,
      }),
      formatDate: (date: Date, tz: string, fmt: string) => {
        assert.equal(tz, 'America/Denver');
        assert.ok(['yyyy-MM-dd', 'yyyy-MM-dd HH.mm'].includes(fmt), `unexpected date format ${fmt}`);
        const p = Object.fromEntries(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .formatToParts(date)
            .map((x) => [x.type, x.value]),
        );
        return fmt.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute);
      },
    },
    console: {
      warn: (...a: unknown[]) => warns.push(a),
      log: () => otherConsole.push('log'),
      info: () => otherConsole.push('info'),
      error: () => otherConsole.push('error'),
      debug: () => otherConsole.push('debug'),
    },
  };
  const ctx = vm.createContext(globals);
  const api: any = vm.runInContext(`${src}\n;({ doGet, doPost, setup, folderKey, RATE, LIMITS })`, ctx);

  const post = (raw: unknown) => {
    const contents = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const text: string = api.doPost({ postData: { contents, type: 'text/plain' }, parameter: {}, queryString: '' }).getContent();
    replies.push(text);
    return text;
  };
  const get = (parameter: Record<string, string> = {}) => {
    const queryString = new URLSearchParams(parameter).toString();
    const text: string = api.doGet({ parameter, queryString }).getContent();
    replies.push(text);
    return text;
  };
  const folder = (name: string) => parent.folders.find((f) => f.name === name)!;
  const allFolders = () => [parent, ...parent.folders];
  const files = () => allFolders().flatMap((f) => f.files.map((x) => ({ ...x, folder: f.name })));
  const drive = (from = 0) => log.slice(from).filter((l) => l.startsWith('drive.'));
  const codes = (from = 0) => warns.slice(from).map((a) => a[0]);
  const day = () => (props.DAY_COUNTS ? JSON.parse(props.DAY_COUNTS) : null);
  const cached = (k: string) => {
    const e = cacheStore.get(k);
    return e && clock.now < e.exp ? e.v : null;
  };
  return { api, clock, log, warns, otherConsole, state, cacheStore, cacheWrites, props, propWrites, replies, parent, FakeFolder, post, get, folder, allFolders, files, drive, codes, day, cached };
}

/** A valid fake send; each call gets its own id unless one is given. */
const body = (over: Record<string, unknown> = {}) => ({ ...fx.base, pdf: PDF_B64, id: randomUUID(), ...over });
const stem = (name: string, appt: string, sent: string) => `${appt} Body map, ${name} (sent ${sent})`;

// ---- 1–2: filing ---------------------------------------------------------------------------------------------------

test('1. "Test Client" on 2026-12-03: one PDF and one JSON in _Unsorted_Intakes, right names and MIME types', () => {
  const env = makeEnv();
  assert.equal(env.post(body()), R.ok);
  const got = env.files();
  assert.equal(got.length, 2);
  assert.ok(got.every((f) => f.folder === UNSORTED));
  const name = stem('Test Client', '2026-12-03', '2026-11-20 12.00');
  assert.deepEqual(got.map((f) => [f.name, f.mime]), [[`${name}.pdf`, 'application/pdf'], [`${name}.json`, 'application/json']]);
  assert.ok(got[0].data.equals(PDF), 'the PDF bytes are the ones sent');
  assert.deepEqual(JSON.parse(got[1].data.toString('utf8')), fx.base.report, 'the JSON file is the report as sent');
  assert.deepEqual(env.state.lockMs, [10000]);
  assert.equal(env.log.filter((l) => l === 'lock.release').length, 1);
  assert.deepEqual(env.codes(), [], 'a filed send logs nothing');
  assert.equal(env.drive().filter((l) => l === 'drive.createFile').length, 2);
  assert.ok(!env.drive().includes('drive.createFolder'));
});

test('1b. the sent stamp is Denver time; the file name drops /\\:*?"<>| and control characters and stops at 60', () => {
  const env = makeEnv();
  env.clock.now = Date.parse('2026-11-21T06:30:00Z'); // 23:30 on Nov 20 in Denver
  assert.equal(env.post(body({ name: ' Sam/Sample: "S"\u0007 <x>|?* \\ ' })), R.ok);
  const long = 'Sam Sample ' + 'x'.repeat(69); // 80 characters, the page's cap
  assert.equal(long.length, bodymap.limits.nameChars);
  assert.equal(env.post(body({ name: long })), R.ok);
  const names = env.files().filter((f) => f.mime === 'application/pdf').map((f) => f.name);
  assert.deepEqual(names, [
    `${stem('SamSample S x', '2026-12-03', '2026-11-20 23.30')}.pdf`,
    `${stem(long.slice(0, 60), '2026-12-03', '2026-11-20 23.30')}.pdf`,
  ]);
});

test('2. the folder Alex_Example gets "alex  EXAMPLE" and "Álex Example"; two folders with one key, or none → _Unsorted_Intakes', () => {
  const env = makeEnv();
  for (const name of ['alex  EXAMPLE', 'Álex Example']) assert.equal(env.post(body({ name })), R.ok);
  assert.equal(env.folder('Alex_Example').files.length, 4);
  assert.equal(env.folder(UNSORTED).files.length, 0);
  assert.ok(env.folder('Alex_Example').files.some((f) => f.name === `${stem('alex  EXAMPLE', '2026-12-03', '2026-11-20 12.00')}.pdf`), 'the file keeps the name as typed');

  // no folder for this name
  assert.equal(env.post(body({ name: 'Zoë-Marie D’Example' })), R.ok);
  assert.equal(env.folder(UNSORTED).files.length, 2);

  // a second folder with the same key: no guess, unsorted
  env.parent.folders.push(new env.FakeFolder('alex example'));
  assert.equal(env.post(body({ name: 'Alex Example', apptDate: '2026-12-04' })), R.ok);
  assert.equal(env.folder('Alex_Example').files.length, 4);
  assert.equal(env.folder('alex example').files.length, 0);
  assert.equal(env.folder(UNSORTED).files.length, 4);

  // a folder in the trash never receives a map
  const env2 = makeEnv();
  env2.folder('Sam_Sample').trashed = true;
  assert.equal(env2.post(body({ name: 'Sam Sample' })), R.ok);
  assert.equal(env2.folder('Sam_Sample').files.length, 0);
  assert.equal(env2.folder(UNSORTED).files.length, 2);

  // a name with no letters or digits has an empty key: it matches no folder, even one whose own key is empty
  const env3 = makeEnv();
  env3.parent.folders.push(new env3.FakeFolder('___'));
  assert.equal(env3.post(body({ name: '?!' })), R.ok);
  assert.equal(env3.folder('___').files.length, 0);
  assert.equal(env3.folder(UNSORTED).files.length, 2);

  for (const name of [...fx.names, ...fx.folders, UNSORTED]) assert.equal(env.api.folderKey(name), folderKey(name), `folderKey(${JSON.stringify(name)})`);
  assert.deepEqual({ ...env.api.RATE }, { ...bodymap.rate }, "the script's rate limits equal bodymap.rate");
  const { pins, noteChars, nameChars, pdfBytes, reportBytes } = bodymap.limits;
  assert.deepEqual({ ...env.api.LIMITS }, { pins, noteChars, nameChars, pdfBytes, reportBytes }, "the script's caps equal bodymap.limits");
});

// ---- 3–5: refusals before the lock --------------------------------------------------------------------------------------

test('3. honeypot filled → the generic error, 0 Drive writes, nothing locked or counted', () => {
  const env = makeEnv();
  assert.equal(env.post(body({ website: 'https://spam.example.com' })), R.invalid);
  assert.equal(env.post(body({ website: ' ' })), R.invalid);
  assert.deepEqual(env.drive(), []);
  assert.deepEqual(env.log, ['props.get:PAUSED', 'props.get:PAUSED']);
  assert.deepEqual(env.codes(), ['bodymap: invalid', 'bodymap: invalid']);
  assert.equal(env.files().length, 0);
});

test('4. a 2,000,001-character body → error with no parse and no writes; 2,000,000 passes', () => {
  const env = makeEnv();
  const valid = JSON.stringify(body());
  // valid JSON padded with spaces: were it parsed, it would be filed
  assert.equal(env.post(valid + ' '.repeat(2_000_001 - valid.length)), R.invalid);
  assert.deepEqual(env.drive(), []);
  assert.deepEqual(env.codes(), ['bodymap: invalid']);
  assert.equal(env.post(valid + ' '.repeat(2_000_000 - valid.length)), R.ok);
  assert.equal(env.files().length, 2);
});

test('5. bad PDF magic, bad date, unknown figure, 61 pins or a 141-character note → invalid, nothing written; the caps themselves pass', () => {
  const env = makeEnv();
  const pin = fx.base.report.pins[0];
  const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
  const bad: [string, unknown][] = [
    ['not JSON', '{"v":1,'],
    ['empty body', ''],
    ['an array', '[1]'],
    ['null', 'null'],
    ['PDF magic', body({ pdf: b64('GIF89a fake image, not a PDF') })],
    ['PDF not base64', body({ pdf: PDF_B64 + '!' })],
    ['PDF empty', body({ pdf: '' })],
    ['PDF not a string', body({ pdf: 7 })],
    ['PDF over the cap', body({ pdf: PDF_B64 + 'A'.repeat(bodymap.limits.pdfBytes) })],
    ['date not real', body({ apptDate: '2026-02-30' })],
    ['date format', body({ apptDate: '12/03/2026' })],
    ['date not a string', body({ apptDate: 20261203 })],
    ['date 16 days back', body({ apptDate: '2026-11-04' })],
    ['date 367 days ahead', body({ apptDate: '2027-11-22' })],
    ['figure', body({ figure: 'child' })],
    ['61 pins', body({ report: { pins: Array.from({ length: 61 }, () => pin) } })],
    ['141-character note', body({ report: { pins: [{ ...pin, note: 'n'.repeat(141) }] } })],
    ['note not a string', body({ report: { pins: [{ ...pin, note: 5 }] } })],
    ['pins missing', body({ report: {} })],
    ['a pin that is no object', body({ report: { pins: ['x'] } })],
    ['report not an object', body({ report: 'x' })],
    ['report over the cap', body({ report: { pins: [pin], pad: 'p'.repeat(bodymap.limits.reportBytes) } })],
    ['v', body({ v: 2 })],
    ['kind', body({ kind: 'other' })],
    ['name empty', body({ name: '   ' })],
    ['name too long', body({ name: 'x'.repeat(81) })],
    ['name not a string', body({ name: ['Test Client'] })],
    ['id upper case', body({ id: randomUUID().toUpperCase() })],
    ['id version 1', body({ id: '1b9d6bcd-bbfd-1b2d-9b5d-ab8dfbbd4bed' })],
    ['id with text', body({ id: 'Test Client' })],
    ['unknown key', body({ token: 'x' })],
    ['missing key', (() => { const { figure, ...rest } = body(); return rest; })()],
    ['no honeypot field', (() => { const { website, ...rest } = body(); return rest; })()],
  ];
  for (const [what, raw] of bad) assert.equal(env.post(raw), R.invalid, what);
  assert.equal(env.files().length, 0);
  assert.deepEqual(env.drive(), []);
  assert.ok(!env.log.some((l) => /^(lock|cache|props\.set)/.test(l)), 'a refused send never reaches the lock or the stores');
  assert.deepEqual(new Set(env.codes()), new Set(['bodymap: invalid']));
  assert.equal(env.codes().length, bad.length);

  const ok: [string, unknown][] = [
    ['60 pins with 140-character notes', body({ report: { pins: Array.from({ length: 60 }, () => ({ ...pin, note: 'n'.repeat(140) })) } })],
    ['an 80-character name', body({ name: 'x'.repeat(80) })],
    ['15 days back (one day of slack for time zones)', body({ apptDate: '2026-11-05' })],
    ['366 days ahead', body({ apptDate: '2027-11-21' })],
    ['the male figure', body({ figure: 'male', name: 'Sam Sample' })],
    ['a note left out, and one that is null', body({ name: 'Sam Sample', apptDate: '2026-12-04', report: { pins: [{ id: 1 }, { id: 2, note: null }] } })],
    ['no pins at all (the page asks for one; the script only caps them)', body({ name: 'Sam Sample', apptDate: '2026-12-05', report: { pins: [] } })],
  ];
  ok.forEach(([what, raw], i) => {
    env.clock.now = CLOCK0 + i * 11 * MIN;
    assert.equal(env.post(raw), R.ok, what);
  });
  env.clock.now = Date.parse('2027-06-01T12:00:00-06:00');
  assert.equal(env.post(body({ apptDate: '2028-02-29' })), R.ok, 'a leap day');
  assert.equal(env.files().length, 2 * (ok.length + 1));
});

// ---- 6: rate limits -------------------------------------------------------------------------------------------------

test('6. rate limits in sequence: 6 per 10 min, 30 per Denver day, 3 per name and appointment date; refusals count nothing', () => {
  const env = makeEnv();
  const send = (i: number, over: Record<string, unknown> = {}) => env.post(body({ name: `Fake Person ${i}`, ...over }));

  // the 10-minute window
  for (let i = 1; i <= 6; i++) {
    assert.equal(send(i), R.ok, `send ${i}`);
    env.clock.now += MIN;
  }
  assert.equal(env.cached('win'), `6:${CLOCK0}`);
  assert.deepEqual(env.cacheWrites.filter((w) => w.k === 'win').map((w) => [w.v, w.sec]), [
    [`1:${CLOCK0}`, 600], [`2:${CLOCK0}`, 540], [`3:${CLOCK0}`, 480], [`4:${CLOCK0}`, 420], [`5:${CLOCK0}`, 360], [`6:${CLOCK0}`, 300],
  ]);
  const before = { files: env.files().length, day: env.props.DAY_COUNTS, writes: env.cacheWrites.length };
  assert.equal(send(7), R.busy, 'the 7th inside 10 minutes');
  assert.deepEqual(env.codes(), ['bodymap: busy-window']);
  assert.deepEqual({ files: env.files().length, day: env.props.DAY_COUNTS, writes: env.cacheWrites.length }, before, 'a refused send counts nothing');
  env.clock.now = CLOCK0 + 10 * MIN - SEC;
  assert.equal(send(7), R.busy, 'one second before the window closes');
  env.clock.now = CLOCK0 + 10 * MIN;
  assert.equal(send(7), R.ok, 'after 10 minutes');
  assert.equal(env.cached('win'), `1:${CLOCK0 + 10 * MIN}`);

  // the Denver day: 7 counted so far, 23 more at one every 101 s never fills a window
  for (let i = 8; i <= 30; i++) {
    env.clock.now += 101 * SEC;
    assert.equal(send(i), R.ok, `send ${i}`);
  }
  assert.equal(env.day().n, 30);
  assert.equal(env.day().d, '2026-11-20');
  assert.equal(Object.keys(env.day().k).length, 30);
  assert.ok(env.props.DAY_COUNTS.length < 9000, 'under the 9 KB property limit');
  env.clock.now += 11 * MIN;
  const warned = env.warns.length;
  assert.equal(send(31), R.busy, 'the 31st of the day');
  assert.deepEqual(env.codes(warned), ['bodymap: busy-day']);
  env.clock.now = Date.parse('2026-11-21T06:59:00Z'); // 23:59 in Denver, already Nov 21 in UTC
  assert.equal(send(31), R.busy, 'still the same Denver day');
  assert.equal(env.day().n, 30);
  env.clock.now = Date.parse('2026-11-21T07:00:30Z'); // 00:00:30 on Nov 21 in Denver
  assert.equal(send(31), R.ok, 'the next Denver day resets the count');
  assert.deepEqual([env.day().d, env.day().n, Object.keys(env.day().k).length], ['2026-11-21', 1, 1]);

  // per name and appointment date
  const one = makeEnv();
  for (let i = 1; i <= 3; i++) assert.equal(one.post(body()), R.ok, `Test Client ${i}`);
  assert.equal(one.post(body()), R.busy, 'a 4th for the same name and appointment date');
  assert.equal(one.post(body({ name: 'test  CLIENT' })), R.busy, 'the same name typed another way');
  assert.deepEqual(one.codes(), ['bodymap: busy-name', 'bodymap: busy-name']);
  assert.equal(one.post(body({ apptDate: '2026-12-10' })), R.ok, 'another appointment date has its own count');
  assert.equal(one.post(body({ name: 'Sam Sample' })), R.ok, 'another name has its own count');
  assert.deepEqual(one.day(), {
    d: '2026-11-20',
    n: 5,
    k: { [sha16('test client|2026-12-03')]: 3, [sha16('test client|2026-12-10')]: 1, [sha16('sam sample|2026-12-03')]: 1 },
  });
  assert.equal(one.post(body({ id: 'not-a-uuid' })), R.invalid, 'a bad id');

  // stores, keys and expiries exactly as §B12 Script state
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  for (const w of [...env.cacheWrites, ...one.cacheWrites]) {
    if (w.k === 'win') assert.match(w.v, /^[1-6]:\d{13}$/);
    else if (w.k.startsWith('done:')) assert.deepEqual([new RegExp(`^done:${uuid}$`).test(w.k), w.v, w.sec], [true, '1', 21600]);
    else {
      assert.match(w.k, new RegExp(`^pdf:${uuid}$`));
      assert.match(w.v, /^\d{13}$/);
      assert.equal(w.sec, 21600);
    }
  }
  assert.deepEqual([...new Set([...env.propWrites, ...one.propWrites].map((w) => w.k))], ['DAY_COUNTS']);
  for (const w of one.propWrites) assert.match(w.v, /^\{"d":"\d{4}-\d\d-\d\d","n":\d+,"k":\{("[0-9a-f]{16}":\d+,?)+\}\}$/);

  // a broken or stale DAY_COUNTS reads as a fresh day, and an evicted window only loosens the limit
  const odd = makeEnv();
  odd.props.DAY_COUNTS = 'not json';
  assert.equal(odd.post(body()), R.ok);
  assert.equal(odd.day().n, 1);
  odd.props.DAY_COUNTS = JSON.stringify({ d: '2026-11-19', n: 30, k: { [sha16('test client|2026-12-03')]: 3 } });
  assert.equal(odd.post(body()), R.ok, "yesterday's counts don't carry over");
  assert.equal(odd.day().n, 1);
  odd.cacheStore.delete('win');
  assert.equal(odd.post(body()), R.ok);
  assert.equal(odd.cached('win'), `1:${CLOCK0}`);
});

// ---- 7–9: replay, lock, faults, read-style requests ---------------------------------------------------------------------

test('7. the same id twice → ok both times, one pair of files', () => {
  const env = makeEnv();
  const b = body();
  assert.equal(env.post(b), R.ok);
  const mark = env.log.length;
  env.clock.now += 2 * MIN;
  assert.equal(env.post(b), R.ok);
  assert.equal(env.files().length, 2);
  assert.deepEqual(env.drive(mark), [], 'the replay makes no Drive call');
  assert.equal(env.day().n, 1);
  assert.equal(env.cached('win'), `1:${CLOCK0}`);
  assert.deepEqual(env.codes(), []);
});

test('8. tryLock false → busy; a Drive throw → server, and the lock is released', () => {
  const env = makeEnv();
  env.state.lockBusy = true;
  assert.equal(env.post(body()), R.busy);
  assert.deepEqual(env.log, ['props.get:PAUSED', 'lock.try'], 'nothing is read or written without the lock');
  assert.deepEqual(env.codes(), ['bodymap: busy-lock']);
  env.state.lockBusy = false;

  const faults: [string, (e: ReturnType<typeof makeEnv>) => void][] = [
    ['the PDF createFile throws', (e) => { e.state.failCreate = () => true; }],
    ['the folder is unreachable', (e) => { e.state.failGetFolder = true; }],
    ['CLIENTS_FOLDER_ID is unset', (e) => { delete e.props.CLIENTS_FOLDER_ID; }],
  ];
  for (const [what, breakIt] of faults) {
    const e = makeEnv();
    breakIt(e);
    assert.equal(e.post(body()), R.server, what);
    assert.deepEqual(e.codes(), ['bodymap: drive-error'], what);
    assert.equal(e.files().length, 0, what);
    assert.equal(e.log.filter((l) => l === 'lock.try').length, 1, what);
    assert.equal(e.log.at(-1), 'lock.release', `${what}: the lock is released`);
    assert.equal(e.props.DAY_COUNTS, undefined, `${what}: nothing counted`);
    assert.equal(e.cacheWrites.length, 0, `${what}: no marker`);
  }
});

test('9. read-style GET or POST → the same bytes, with 0 Drive calls', () => {
  const env = makeEnv();
  assert.equal(env.post(body()), R.ok); // there is something to read
  const mark = env.log.length;
  assert.equal(env.get({ list: '1', id: 'x', folder: 'y' }), R.invalid);
  assert.equal(env.get(), R.invalid);
  assert.equal(env.get({ fileId: 'fake-file-id-0003-abcdefghijklmnop' }), R.invalid);
  assert.deepEqual(env.log.slice(mark), [], 'doGet touches nothing');
  assert.equal(env.post({ action: 'list' }), R.invalid);
  assert.equal(env.post(body({ fileId: 'fake-file-id-0003-abcdefghijklmnop' })), R.invalid);
  assert.equal(env.post(body({ action: 'read' })), R.invalid);
  assert.equal(env.post({ ...body(), list: true }), R.invalid);
  assert.deepEqual(env.drive(mark), []);
  assert.equal(env.files().length, 2);
});

// ---- 10: nothing leaks ---------------------------------------------------------------------------------------------------

test('10. every reply is one of 4 strings; no reply, log line, cache key or value, or property name or value holds a name, date, note or ID', () => {
  const env = makeEnv();
  const note = fx.base.report.pins[0].note as string;
  const appts = ['2026-12-03', '2026-12-10'];
  const run = (raw: unknown) => {
    env.post(raw);
    env.clock.now += 30 * SEC;
  };
  run(body()); // unsorted
  run(body({ name: 'Alex Example', apptDate: appts[1] })); // a client folder
  run(body({ name: 'Zoë-Marie D’Example' }));
  run(body({ website: 'x' }));
  run(body({ apptDate: 'tomorrow' }));
  run(body({ name: 'Sam Sample', id: 'Sam Sample' }));
  const replayed = body({ name: 'Sam Sample' });
  run(replayed);
  run(replayed);
  env.state.lockBusy = true;
  run(body());
  env.state.lockBusy = false;
  env.state.failCreate = (blob) => blob.type === 'application/json';
  run(body({ name: 'O\'Brien_Sam' }));
  env.state.failCreate = null;
  run(body({ name: 'alex  EXAMPLE' }));
  run(body()); // the 6th counted send
  run(body()); // busy-window
  env.get({ list: '1', name: 'Test Client' });
  env.props.PAUSED = '1';
  run(body());
  delete env.props.PAUSED;
  env.clock.now += 11 * MIN;
  run(body());
  run(body()); // the 4th Test Client on 2026-12-03 → busy-name
  assert.deepEqual(new Set(env.replies), new Set(Object.values(R)), 'the run saw all four replies and nothing else');
  assert.deepEqual(
    new Set(env.codes()),
    new Set(['bodymap: invalid', 'bodymap: busy-lock', 'bodymap: drive-error', 'bodymap: busy-window', 'bodymap: paused', 'bodymap: busy-name']),
  );
  assert.deepEqual(env.otherConsole, [], 'console.warn only');

  const said = [
    ...env.replies,
    ...env.warns.flat().map(String),
    ...env.cacheWrites.flatMap((w) => [w.k, w.v]),
    ...env.propWrites.flatMap((w) => [w.k, w.v]),
  ].map((s) => s.toLowerCase());
  const names = (fx.names as string[]).map((n) => n.trim()).filter(Boolean);
  const secrets = [
    ...names,
    ...names.map((n) => folderKey(n)),
    ...appts,
    note,
    ...env.allFolders().flatMap((f) => [f.name, f.id]),
    ...env.files().flatMap((f) => [f.id, f.name]),
    FOLDER_ID,
  ].map((s) => s.toLowerCase());
  assert.ok(env.files().length >= 8 && secrets.length > 40);
  for (const s of secrets) assert.ok(!said.some((line) => line.includes(s)), `${JSON.stringify(s)} appears in a reply, log, cache entry or property`);
  for (const w of env.warns) assert.equal(w.length, 1, 'one argument per log line');

  // the per-name key is a digest, nothing else
  const key = sha16('test client|2026-12-03');
  assert.match(key, /^[0-9a-f]{16}$/);
  assert.equal(env.day().k[key], 3);
  assert.equal(env.day().k[sha16('alex example|2026-12-10')], 1);
  assert.ok(Object.keys(env.day().k).every((k) => /^[0-9a-f]{16}$/.test(k)));
});

// ---- 11: static ---------------------------------------------------------------------------------------------------------

test('11. static: banned APIs, string-literal console.warn only, the manifest exactly as §B12, no ID, email or URL', () => {
  const banned = [
    'getFiles(', 'getFilesByName', 'getFilesByType', 'searchFiles', 'searchFolders', 'getFileById', 'getBlob', 'getAs(', 'getContent', 'getDataAsString',
    'getDownloadUrl', 'getUrl(', 'setSharing', 'addViewer', 'addEditor', 'addCommenter', 'makeCopy', 'moveTo', 'setTrashed', 'removeFile', 'removeFolder',
    'UrlFetchApp', 'MailApp', 'GmailApp', 'Logger.log', 'SpreadsheetApp', 'ScriptApp', 'HtmlService', 'Drive.Files', 'eval(',
  ];
  for (const b of banned) assert.ok(!src.includes(b), `${b} is banned in the filing script (comments too)`);
  const allowedCodes = [
    'paused', 'invalid', 'busy-lock', 'busy-window', 'busy-day', 'busy-name', 'drive-error', 'state-error', 'reachable', 'unsorted-created', 'unsorted-found',
  ];
  const calls = [...src.matchAll(/console\s*\.\s*(\w+)\s*\(([^)]*)\)/g)];
  assert.ok(calls.length >= 8);
  for (const [whole, method, arg] of calls) {
    assert.equal(method, 'warn', whole);
    const code = arg.match(/^'bodymap: ([a-z-]+)'$/)?.[1];
    assert.ok(code && allowedCodes.includes(code), `${whole} must be one fixed string literal from §B12`);
  }
  assert.equal(src.match(/console/g)!.length, calls.length, 'console is only ever called, with a literal');
  assert.deepEqual(new Set(calls.map((c) => c[2].slice(10, -1))), new Set(allowedCodes), 'every §B12 code is used');

  assert.deepEqual(JSON.parse(manifestText), {
    timeZone: 'America/Denver',
    dependencies: {},
    exceptionLogging: 'NONE',
    runtimeVersion: 'V8',
    oauthScopes: ['https://www.googleapis.com/auth/drive'],
    webapp: { access: 'ANYONE_ANONYMOUS', executeAs: 'USER_DEPLOYING' },
  });
  for (const [what, text] of [['bodymap.js', src], ['appsscript.json', manifestText.replace('https://www.googleapis.com/auth/drive', '')]] as const) {
    assert.doesNotMatch(text, /https?:|www\.|\.com\b/, `${what}: no URL`);
    assert.doesNotMatch(text, /@/, `${what}: no email`);
    assert.doesNotMatch(text, /[A-Za-z0-9_-]{30,}/, `${what}: nothing shaped like an ID`);
  }
  assert.doesNotMatch(src, /[^\x09\x0a\x0d\x20-\x7e]/, 'the script is plain ASCII');
});

// ---- 12: setup -------------------------------------------------------------------------------------------------------------

test('12. setup(): a clear throw when the property is unset; creates _Unsorted_Intakes once', () => {
  const unset = makeEnv({ folderId: false });
  assert.throws(() => unset.api.setup(), /CLIENTS_FOLDER_ID is not set/);
  assert.deepEqual(unset.drive(), []);

  const env = makeEnv({ unsorted: false });
  env.api.setup();
  assert.equal(env.parent.folders.filter((f) => f.name === UNSORTED).length, 1);
  assert.deepEqual(env.codes(), ['bodymap: reachable', 'bodymap: unsorted-created']);
  env.api.setup();
  assert.equal(env.parent.folders.filter((f) => f.name === UNSORTED).length, 1, 'a second run makes no second folder');
  assert.deepEqual(env.codes(), ['bodymap: reachable', 'bodymap: unsorted-created', 'bodymap: reachable', 'bodymap: unsorted-found']);
  assert.equal(env.files().length, 0);
  assert.deepEqual(env.propWrites, [], 'setup() writes no property');

  // without setup(), the first unmatched send still has somewhere to go
  const fresh = makeEnv({ unsorted: false });
  assert.equal(fresh.post(body()), R.ok);
  assert.equal(fresh.folder(UNSORTED).files.length, 2);
  assert.equal(fresh.post(body({ name: 'Sam Example' })), R.ok);
  assert.equal(fresh.parent.folders.filter((f) => f.name === UNSORTED).length, 1);

  const gone = makeEnv();
  gone.state.failGetFolder = true;
  assert.throws(
    () => gone.api.setup(),
    (err: Error) => /not reachable/.test(err.message) && !err.message.includes(FOLDER_ID),
    'an unreachable folder throws a clear message without the ID',
  );
  assert.deepEqual(gone.codes(), []);
});

// ---- 13: retries and partial writes (I-127) ----------------------------------------------------------------------------

test('13a. the JSON createFile throws after the PDF → server, nothing counted; the retry writes the JSON only, with the PDF\'s stamp', () => {
  const env = makeEnv();
  const b = body();
  env.state.failCreate = (blob) => blob.type === 'application/json';
  assert.equal(env.post(b), R.server);
  assert.deepEqual(env.codes(), ['bodymap: drive-error']);
  assert.deepEqual(env.files().map((f) => f.mime), ['application/pdf']);
  assert.equal(env.props.DAY_COUNTS, undefined);
  assert.equal(env.cached('win'), null);
  assert.equal(env.cached(`done:${b.id}`), null);
  assert.equal(env.cached(`pdf:${b.id}`), String(CLOCK0));
  assert.equal(env.log.at(-1), 'lock.release');

  env.state.failCreate = null;
  env.clock.now += 3 * MIN;
  const mark = env.log.length;
  assert.equal(env.post(b), R.ok);
  assert.equal(env.drive(mark).filter((l) => l === 'drive.createFile').length, 1, 'the retry writes one file');
  const name = stem('Test Client', '2026-12-03', '2026-11-20 12.00');
  assert.deepEqual(env.files().map((f) => f.name), [`${name}.pdf`, `${name}.json`], 'one pair, both with the PDF\'s sent stamp');
  assert.equal(env.day().n, 1);
  assert.equal(env.cached(`done:${b.id}`), '1');
  assert.equal(env.cached('win'), `1:${CLOCK0 + 3 * MIN}`);
  assert.equal(env.cached(`pdf:${b.id}`), null, 'the PDF marker goes once the pair is whole, so a lost done: gives a full second pair (13c)');
});

test('13b. both written, the same body again within 6 h → ok, 0 Drive calls, counts unchanged, also with the day cap full', () => {
  const env = makeEnv();
  const b = body();
  assert.equal(env.post(b), R.ok);
  env.clock.now += 6 * HOUR - SEC;
  const mark = env.log.length;
  const dayBefore = env.props.DAY_COUNTS;
  assert.equal(env.post(b), R.ok);
  assert.deepEqual(env.drive(mark), []);
  assert.equal(env.props.DAY_COUNTS, dayBefore);

  const full = makeEnv();
  assert.equal(full.post(b), R.ok);
  full.props.DAY_COUNTS = JSON.stringify({ d: '2026-11-20', n: 30, k: { [sha16('test client|2026-12-03')]: 3 } });
  full.cacheStore.set('win', { v: `6:${CLOCK0}`, exp: CLOCK0 + 10 * MIN });
  const dayFull = full.props.DAY_COUNTS;
  assert.equal(full.post(b), R.ok, 'idempotency runs before the limits');
  assert.equal(full.files().length, 2);
  assert.equal(full.props.DAY_COUNTS, dayFull);
  assert.equal(full.post(body()), R.busy, 'a new send is still refused');
});

test('13c. a marker gone → the accepted duplicate: a second pair with a later stamp, or a lone PDF and then a pair', () => {
  const env = makeEnv();
  const b = body();
  assert.equal(env.post(b), R.ok);
  env.cacheStore.delete(`done:${b.id}`); // evicted early
  env.clock.now += 20 * MIN;
  assert.equal(env.post(b), R.ok);
  const first = stem('Test Client', '2026-12-03', '2026-11-20 12.00');
  const second = stem('Test Client', '2026-12-03', '2026-11-20 12.20');
  assert.deepEqual(env.files().map((f) => f.name), [`${first}.pdf`, `${first}.json`, `${second}.pdf`, `${second}.json`]);
  assert.equal(env.day().n, 2, 'counted again');

  const late = makeEnv();
  assert.equal(late.post(b), R.ok);
  late.clock.now += 6 * HOUR; // both markers expired
  assert.equal(late.post(b), R.ok);
  assert.equal(late.files().length, 4);

  const lone = makeEnv();
  lone.state.failCreate = (blob) => blob.type === 'application/json';
  assert.equal(lone.post(b), R.server);
  lone.state.failCreate = null;
  lone.cacheStore.delete(`pdf:${b.id}`);
  lone.clock.now += 5 * MIN;
  assert.equal(lone.post(b), R.ok);
  const third = stem('Test Client', '2026-12-03', '2026-11-20 12.05');
  assert.deepEqual(lone.files().map((f) => f.name), [`${first}.pdf`, `${third}.pdf`, `${third}.json`]);
  assert.equal(lone.day().n, 1);
});

test('13d. a throw putting done: or the counts after both files → ok and bodymap: state-error', () => {
  const env = makeEnv();
  env.state.failCachePut = (k) => k.startsWith('done:');
  assert.equal(env.post(body()), R.ok);
  assert.deepEqual(env.codes(), ['bodymap: state-error']);
  assert.equal(env.files().length, 2);
  assert.equal(env.day().n, 1, 'the counts are still kept');
  assert.equal(env.log.at(-1), 'lock.release');

  const counts = makeEnv();
  counts.state.failPropSet = true;
  assert.equal(counts.post(body()), R.ok);
  assert.deepEqual(counts.codes(), ['bodymap: state-error']);
  assert.equal(counts.files().length, 2);
  assert.equal(counts.cacheWrites.filter((w) => w.k.startsWith('done:')).length, 1);

  const all = makeEnv();
  all.state.failCachePut = () => true;
  all.state.failPropSet = true;
  assert.equal(all.post(body()), R.ok, 'both files exist, so the reply is ok');
  assert.equal(all.files().length, 2);
  assert.ok(all.codes().length >= 1 && all.codes().every((c) => c === 'bodymap: state-error'));
});

// ---- 14: the off switch and the log codes (I-128) ----------------------------------------------------------------------

test('14. PAUSED set → busy and bodymap: paused with 0 Drive, cache, lock or count calls; deleted → ok', () => {
  const env = makeEnv();
  const b = body();
  env.props.PAUSED = '1';
  assert.equal(env.post(b), R.busy);
  assert.equal(env.post(JSON.stringify(b) + ' '.repeat(2_000_001)), R.busy, 'even an oversize body: the pause comes first');
  assert.equal(env.post('not json'), R.busy);
  assert.deepEqual(env.log, ['props.get:PAUSED', 'props.get:PAUSED', 'props.get:PAUSED'], 'only the switch is read');
  assert.deepEqual(env.codes(), ['bodymap: paused', 'bodymap: paused', 'bodymap: paused']);
  assert.equal(env.get({ list: '1' }), R.invalid, 'doGet is unchanged');
  assert.equal(env.files().length, 0);
  env.props.PAUSED = 'yes';
  assert.equal(env.post(b), R.busy, 'any non-empty value pauses');

  delete env.props.PAUSED;
  assert.equal(env.post(b), R.ok, 'the same send files once the switch is deleted');
  assert.equal(env.files().length, 2);
  assert.deepEqual(env.propWrites.map((w) => w.k), ['DAY_COUNTS'], 'the script never writes PAUSED');
});
