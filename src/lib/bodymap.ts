// Body map state, storage and the wire (B4, ARCHITECTURE §B12 Storage, Wire contract, Retries). Pure: the clock, the
// storage and the random source are passed in, so tests run without a browser. Health information lives here only in
// memory and in the one storage entry (24 hours); nothing is logged, and nothing but the send leaves the device.
import {
  bodymap,
  type Course,
  type ForWhom,
  type PinField,
  type PinTypeKey,
  type Quality,
  type Sex,
  type Since,
  type View,
  type Visit,
  type Worst,
  type WholeItem,
} from '../data/bodymap.ts';

/** The answers a mark (or the whole-body item) can carry. All optional; a field the type lacks is kept but not sent. */
export interface PinAnswers {
  type: PinTypeKey;
  intensity: number | null;
  quality: Quality[];
  worst: Worst[];
  course: Course | null;
  started: string;
  worse: string;
  better: string;
  since: Since | null;
  note: string;
  star: boolean;
}
export interface Pin extends PinAnswers {
  id: string;
  view: View;
  /** 0-1 of the art's canvas */
  x: number;
  y: number;
  fromList: boolean;
  /** A Both sides pair's second point (B6c); null for a single mark */
  mirror: { x: number; y: number } | null;
}
export interface BodyState {
  name: string;
  apptDate: string;
  figure: Sex;
  pins: Pin[];
  /** null until the first send, then kept across retries and reloads (Retries) */
  id: string | null;
  /** The whole-body item (B6e, I-171), at most one; no spot */
  whole: WholeItem | null;
  /** First visit or follow-up (B6e, I-172) */
  visit: Visit | null;
  /** Who it's for (B6e, I-178) and the helper's name */
  forWhom: ForWhom | null;
  helperName: string;
  /** Epoch ms of the first mark (B6e, I-174) */
  firstAt: number | null;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type Random = (bytes: Uint8Array) => Uint8Array;

const HOUR = 3_600_000;
/** 2 from B6: a pin gains the detail fields and intensity is 1-10, so a v1 entry is deleted, never re-read on the new scale. */
const STORAGE_VERSION = 2;
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** A lower-case version-4 UUID from getRandomValues. The one-call UUID helper needs https; the LAN preview is plain http. */
export function makeId(random: Random): string {
  const b = random(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const blank = (): BodyState => ({ name: '', apptDate: '', figure: 'female', pins: [], id: null, whole: null, visit: null, forWhom: null, helperName: '', firstAt: null });
const isBlank = (s: BodyState) => !s.name && !s.apptDate && !s.pins.length && s.id === null && !s.whole && !s.visit && !s.forWhom && !s.helperName && s.firstAt === null;
const typeKeys: string[] = bodymap.types.map((t) => t.key);
const num01 = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
const typeOf = (k: PinTypeKey) => bodymap.types.find((t) => t.key === k)!;

// --- fields -----------------------------------------------------------------------------------------------------------

/** Every quality in one order (the union of the three lists), so the state keeps one answer per word whatever the type. */
const QUALITY_ORDER: Quality[] = [...new Set<Quality>([...bodymap.qualities.pain, ...bodymap.qualities.numb, ...bodymap.qualities.tight])];
const WORST_ORDER: readonly Worst[] = bodymap.worsts;
/** The quality list a type shows: discomfort uses pain's; injury, avoid and other have none. */
const qualityListOf = (t: PinTypeKey): readonly Quality[] =>
  t === 'pain' || t === 'discomfort' ? bodymap.qualities.pain : t === 'numb' ? bodymap.qualities.numb : t === 'tight' ? bodymap.qualities.tight : [];
const hasField = (t: PinTypeKey, f: PinField) => typeOf(t).fields.includes(f);

/** Control characters and line breaks become a space; the text is cut at the cap. */
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/gu;
const cleanText = (v: unknown, cap: number): string => (typeof v === 'string' ? v.replace(CONTROL, ' ').slice(0, cap) : '');
const TEXT_CAPS = { started: bodymap.limits.startedChars, worse: bodymap.limits.detailChars, better: bodymap.limits.detailChars, note: bodymap.limits.noteChars } as const;
export type TextField = keyof typeof TEXT_CAPS;

/** What a mark says, by its type: the fields the type lacks come back empty (the report sends the same). */
export function fieldsOf(p: PinAnswers): Omit<PinAnswers, 'type' | 'star'> {
  const t = p.type;
  const list = qualityListOf(t);
  return {
    intensity: hasField(t, 'intensity') ? p.intensity : null,
    quality: hasField(t, 'quality') ? list.filter((q) => p.quality.includes(q)) : [],
    worst: hasField(t, 'worst') ? WORST_ORDER.filter((w) => p.worst.includes(w)) : [],
    course: hasField(t, 'course') ? p.course : null,
    started: hasField(t, 'started') ? p.started : '',
    worse: hasField(t, 'worse') ? p.worse : '',
    better: hasField(t, 'better') ? p.better : '',
    since: hasField(t, 'since') ? p.since : null,
    note: p.note,
  };
}

/** A stored list: the whole field is cleared if any word is unknown (storage is not trusted), else deduped in canonical order. */
function cleanList<T extends string>(v: unknown, order: readonly T[]): T[] {
  if (!Array.isArray(v)) return [];
  if (v.some((x) => typeof x !== 'string' || !order.includes(x as T))) return [];
  return order.filter((x) => v.includes(x));
}
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null);

function cleanAnswers(o: Record<string, unknown>, type: PinTypeKey): PinAnswers {
  const intensity = typeof o.intensity === 'number' && Number.isInteger(o.intensity) && o.intensity >= bodymap.intensity.min && o.intensity <= bodymap.intensity.max ? o.intensity : null;
  return {
    type,
    intensity,
    quality: cleanList(o.quality, QUALITY_ORDER),
    worst: cleanList(o.worst, WORST_ORDER),
    course: oneOf(o.course, bodymap.courses),
    started: cleanText(o.started, TEXT_CAPS.started),
    worse: cleanText(o.worse, TEXT_CAPS.worse),
    better: cleanText(o.better, TEXT_CAPS.better),
    since: oneOf(o.since, bodymap.sinces),
    note: cleanText(o.note, TEXT_CAPS.note),
    star: o.star === true && typeOf(type).starrable,
  };
}

function cleanPin(p: unknown): Pin | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id || (o.view !== 'front' && o.view !== 'back') || !num01(o.x) || !num01(o.y)) return null;
  if (typeof o.type !== 'string' || !typeKeys.includes(o.type)) return null;
  const m = o.mirror as { x?: unknown; y?: unknown } | null | undefined;
  return {
    id: o.id,
    view: o.view,
    x: o.x,
    y: o.y,
    ...cleanAnswers(o, o.type as PinTypeKey),
    fromList: o.fromList === true,
    mirror: m && typeof m === 'object' && num01(m.x) && num01(m.y) ? { x: m.x, y: m.y } : null,
  };
}

/** The whole-body item (B6e): any type but avoid, no spot. Anything else is dropped. */
function cleanWhole(w: unknown): WholeItem | null {
  if (!w || typeof w !== 'object') return null;
  const o = w as Record<string, unknown>;
  if (typeof o.type !== 'string' || !typeKeys.includes(o.type) || o.type === 'avoid') return null;
  return cleanAnswers(o, o.type as PinTypeKey);
}

export interface StoreOptions {
  storage: StorageLike | null;
  now: () => number;
  random: Random;
}

export function createStore({ storage, now, random }: StoreOptions) {
  const key = bodymap.storageKey;
  const guard = (fn: () => void) => {
    try {
      fn();
    } catch {
      // storage refused (private window, quota, blocked): the state stays in memory
    }
  };

  function load(): BodyState {
    let raw: string | null = null;
    guard(() => {
      raw = storage ? storage.getItem(key) : null;
    });
    if (raw === null) return blank();
    const drop = () => {
      guard(() => storage?.removeItem(key));
      return blank();
    };
    let o: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return drop();
      o = parsed as Record<string, unknown>;
    } catch {
      return drop();
    }
    if (o.v !== STORAGE_VERSION || typeof o.savedAt !== 'number' || !Number.isFinite(o.savedAt)) return drop();
    if (now() - o.savedAt > bodymap.limits.expiryHours * HOUR) return drop();
    if (typeof o.name !== 'string' || typeof o.apptDate !== 'string' || !bodymap.figures.includes(o.figure as Sex) || !Array.isArray(o.pins)) return drop();
    if (o.id !== null && typeof o.id !== 'string') return drop();
    // A pin that isn't understood (an unknown type, a bad spot) is dropped on its own; its neighbours stay.
    const pins = o.pins.map(cleanPin).filter((p): p is Pin => p !== null).slice(0, bodymap.limits.pins);
    return {
      name: o.name.slice(0, bodymap.limits.nameChars),
      apptDate: o.apptDate,
      figure: o.figure as Sex,
      pins,
      id: o.id as string | null,
      whole: cleanWhole(o.whole),
      visit: oneOf(o.visit, bodymap.visits),
      forWhom: oneOf(o.forWhom, bodymap.forWhoms),
      helperName: cleanText(o.helperName, bodymap.limits.nameChars),
      firstAt: typeof o.firstAt === 'number' && Number.isFinite(o.firstAt) ? o.firstAt : null,
    };
  }

  const state: BodyState = load();
  const find = (id: string) => state.pins.find((p) => p.id === id);

  function save() {
    guard(() => {
      if (!storage) return;
      if (isBlank(state)) storage.removeItem(key);
      else {
        const { name, apptDate, figure, pins, id, whole, visit, forWhom, helperName, firstAt } = state;
        storage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, savedAt: now(), name, apptDate, figure, pins, id, whole, visit, forWhom, helperName, firstAt }));
      }
    });
  }
  /** Any change to what a send would carry drops the id, so an edit is never swallowed by the script's done marker. */
  function edited() {
    state.id = null;
    save();
  }
  function reset() {
    Object.assign(state, blank());
    guard(() => storage?.removeItem(key));
  }

  return {
    state,
    setName(v: string) {
      const next = String(v).slice(0, bodymap.limits.nameChars);
      if (next !== state.name) {
        state.name = next;
        edited();
      }
    },
    setApptDate(v: string) {
      if (v !== state.apptDate) {
        state.apptDate = v;
        edited();
      }
    },
    setFigure(v: Sex) {
      if (v !== state.figure && bodymap.figures.includes(v)) {
        state.figure = v;
        edited();
      }
    },
    /** Adds a mark at 0-1 coordinates (clamped). Null at the cap of 60. */
    addPin(p: { view: View; x: number; y: number; type: PinTypeKey }): Pin | null {
      if (state.pins.length >= bodymap.limits.pins) return null;
      let id = '';
      do id = `p${hex(random(new Uint8Array(4)))}`;
      while (state.pins.some((q) => q.id === id));
      const clamp = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
      const pin: Pin = {
        id,
        view: p.view,
        x: clamp(p.x),
        y: clamp(p.y),
        type: p.type,
        intensity: null,
        quality: [],
        worst: [],
        course: null,
        started: '',
        worse: '',
        better: '',
        since: null,
        note: '',
        star: false,
        fromList: false,
        mirror: null,
      };
      state.pins.push(pin);
      edited();
      return pin;
    },
    removePin(id: string) {
      const i = state.pins.findIndex((p) => p.id === id);
      if (i < 0) return;
      state.pins.splice(i, 1);
      edited();
    },

    // --- a mark's answers (B6). Each returns false and changes nothing when the value can't be taken; each change drops the send id. ---
    /** Changes a mark's type. Every answer stays in the state (changing back restores it); a type that can't be starred unstars it. */
    setType(id: string, type: PinTypeKey): boolean {
      const p = find(id);
      if (!p || !typeKeys.includes(type)) return false;
      p.type = type;
      if (!typeOf(type).starrable) p.star = false;
      edited();
      return true;
    },
    /** 1-10; the same value again clears it. Refused for a type with no intensity (avoid, other). */
    setIntensity(id: string, n: number): boolean {
      const p = find(id);
      if (!p || !hasField(p.type, 'intensity')) return false;
      if (typeof n !== 'number' || !Number.isInteger(n) || n < bodymap.intensity.min || n > bodymap.intensity.max) return false;
      p.intensity = p.intensity === n ? null : n;
      edited();
      return true;
    },
    /** Any number of the type's own qualities, kept in one order; a tap on a chosen one clears it. */
    toggleQuality(id: string, q: Quality): boolean {
      const p = find(id);
      if (!p || !hasField(p.type, 'quality') || !qualityListOf(p.type).includes(q)) return false;
      const next = new Set(p.quality);
      if (!next.delete(q)) next.add(q);
      p.quality = QUALITY_ORDER.filter((x) => next.has(x));
      edited();
      return true;
    },
    /** Tight only: when it is worst, any number. */
    toggleWorst(id: string, w: Worst): boolean {
      const p = find(id);
      if (!p || !hasField(p.type, 'worst') || !WORST_ORDER.includes(w)) return false;
      const next = new Set(p.worst);
      if (!next.delete(w)) next.add(w);
      p.worst = WORST_ORDER.filter((x) => next.has(x));
      edited();
      return true;
    },
    /** New or long-standing; the same chip again clears it. */
    setCourse(id: string, c: Course): boolean {
      const p = find(id);
      if (!p || !hasField(p.type, 'course') || !bodymap.courses.includes(c)) return false;
      p.course = p.course === c ? null : c;
      edited();
      return true;
    },
    /** Better, same or worse since last time (follow-up visits, B6e); the same chip again clears it. */
    setSince(id: string, s: Since): boolean {
      const p = find(id);
      if (!p || !hasField(p.type, 'since') || !bodymap.sinces.includes(s)) return false;
      p.since = p.since === s ? null : s;
      edited();
      return true;
    },
    /** One-line text: started, worse, better, note. Control characters become spaces and the cap cuts. */
    setText(id: string, field: TextField, value: string): boolean {
      const p = find(id);
      if (!p || !(field in TEXT_CAPS) || !hasField(p.type, field)) return false;
      p[field] = cleanText(value, TEXT_CAPS[field]);
      edited();
      return true;
    },
    /** A star: at most 3 (the whole-body item counts), never on avoid. Tapping a starred mark unstars it. */
    toggleStar(id: string): 'ok' | 'star-limit' | 'star-avoid' | 'none' {
      const p = find(id);
      if (!p) return 'none';
      if (p.star) {
        p.star = false;
        edited();
        return 'ok';
      }
      if (!typeOf(p.type).starrable) return 'star-avoid';
      const starred = state.pins.filter((q) => q.star).length + (state.whole?.star ? 1 : 0);
      if (starred >= bodymap.limits.stars) return 'star-limit';
      p.star = true;
      edited();
      return 'ok';
    },

    // --- the entry's own keys (filled by the page from B6e; set up here so storage and the report are set once) ---
    setVisit(v: Visit | null) {
      state.visit = oneOf(v, bodymap.visits);
      edited();
    },
    setForWhom(v: ForWhom | null) {
      state.forWhom = oneOf(v, bodymap.forWhoms);
      edited();
    },
    setHelperName(v: string) {
      state.helperName = cleanText(v, bodymap.limits.nameChars);
      edited();
    },
    setFirstAt(v: number | null) {
      state.firstAt = typeof v === 'number' && Number.isFinite(v) ? v : null;
      save();
    },
    /** The whole-body item, or null to remove it. Refused for avoid. */
    setWhole(w: WholeItem | null): boolean {
      const next = w === null ? null : cleanWhole(w);
      if (w !== null && next === null) return false;
      state.whole = next;
      edited();
      return true;
    },
    /** The id for this send: made at the first send, then the same for every retry until something changes. */
    sendId(): string {
      if (state.id === null) {
        state.id = makeId(random);
        save();
      }
      return state.id;
    },
    /** The send succeeded: nothing stays on the device. */
    sent() {
      reset();
    },
    startOver() {
      reset();
    },
  };
}
export type Store = ReturnType<typeof createStore>;

// --- dates and checks ------------------------------------------------------------------------------------------------

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);
function shift(day: string, days: number): string {
  const m = DATE.exec(day)!;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
/** Appointment dates the page allows: today -14 to +365 days. `today` is the client's own YYYY-MM-DD. */
export function dateWindow(today: string): { min: string; max: string } {
  return { min: shift(today, -14), max: shift(today, 365) };
}
function realDate(s: string): boolean {
  const m = DATE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return iso(d) === s;
}

export type FieldError = 'errName' | 'errDate' | 'errEmpty';
export function validate(s: BodyState, today: string): FieldError[] {
  const out: FieldError[] = [];
  if (!s.name.trim()) out.push('errName');
  const w = dateWindow(today);
  if (!realDate(s.apptDate) || s.apptDate < w.min || s.apptDate > w.max) out.push('errDate');
  if (!s.pins.length) out.push('errEmpty');
  return out;
}

// --- the wire --------------------------------------------------------------------------------------------------------

export interface Payload {
  v: 1;
  kind: 'ohm-bodymap';
  id: string;
  website: '';
  name: string;
  apptDate: string;
  figure: Sex;
  report: unknown;
  pdf: string;
}

/** The body of the one POST. Throws when the caps would be broken, so the page can say so instead of sending. */
export function buildPayload(s: Pick<BodyState, 'name' | 'apptDate' | 'figure' | 'id'>, report: unknown, pdfBase64: string): Payload {
  if (!s.id) throw new Error('payload needs the send id (call sendId first)');
  if (pdfBase64.length > bodymap.limits.pdfBytes) throw new Error('pdf is over the size cap');
  if (JSON.stringify(report).length > bodymap.limits.reportBytes) throw new Error('report is over the size cap');
  return { v: 1, kind: 'ohm-bodymap', id: s.id, website: '', name: s.name.trim(), apptDate: s.apptDate, figure: s.figure, report, pdf: pdfBase64 };
}

export type SendResult = 'ok' | 'busy' | 'server' | 'network';

/**
 * One fetch POST of a JSON string with no custom headers (text/plain, a simple request: no preflight). Replies are
 * {ok:true} or {ok:false,error}. busy -> 'busy'; invalid, server or anything unexpected -> 'server'; a failed fetch, a failed
 * HTTP status or a reply that isn't JSON -> 'network'. The caller keeps the marks until 'ok'.
 */
export async function sendMap(o: { fetch: (url: string, init: RequestInit) => Promise<Response>; url: string; payload: Payload }): Promise<SendResult> {
  let body: unknown;
  try {
    const res = await o.fetch(o.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(o.payload),
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) return 'network';
    body = JSON.parse(await res.text());
  } catch {
    return 'network';
  }
  if (!body || typeof body !== 'object') return 'network';
  const r = body as { ok?: unknown; error?: unknown };
  if (r.ok === true) return 'ok';
  return r.ok === false && r.error === 'busy' ? 'busy' : 'server';
}
