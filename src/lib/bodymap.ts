// Body map state, storage and the wire (B4, ARCHITECTURE §B12 Storage, Wire contract, Retries). Pure: the clock, the
// storage and the random source are passed in, so tests run without a browser. Health information lives here only in
// memory and in the one storage entry (24 hours); nothing is logged, and nothing but the send leaves the device.
import { bodymap, type PinTypeKey, type Sex, type View } from '../data/bodymap.ts';

export interface Pin {
  id: string;
  view: View;
  /** 0-1 of the art's canvas */
  x: number;
  y: number;
  type: PinTypeKey;
  intensity: number | null;
  note: string;
  star: boolean;
  fromList: boolean;
}
export interface BodyState {
  name: string;
  apptDate: string;
  figure: Sex;
  pins: Pin[];
  /** null until the first send, then kept across retries and reloads (Retries) */
  id: string | null;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type Random = (bytes: Uint8Array) => Uint8Array;

const HOUR = 3_600_000;
const STORAGE_VERSION = 1;
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** A lower-case version-4 UUID from getRandomValues. The one-call UUID helper needs https; the LAN preview is plain http. */
export function makeId(random: Random): string {
  const b = random(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const blank = (): BodyState => ({ name: '', apptDate: '', figure: 'female', pins: [], id: null });
const isBlank = (s: BodyState) => !s.name && !s.apptDate && !s.pins.length && s.id === null;
const typeKeys: string[] = bodymap.pinTypes.map((t) => t.key);
const num01 = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function cleanPin(p: unknown): Pin | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id || (o.view !== 'front' && o.view !== 'back') || !num01(o.x) || !num01(o.y)) return null;
  if (typeof o.type !== 'string' || !typeKeys.includes(o.type)) return null;
  const intensity = typeof o.intensity === 'number' && o.intensity >= 1 && o.intensity <= 5 ? Math.round(o.intensity) : null;
  return {
    id: o.id,
    view: o.view,
    x: o.x,
    y: o.y,
    type: o.type as PinTypeKey,
    intensity,
    note: typeof o.note === 'string' ? o.note.slice(0, bodymap.limits.noteChars) : '',
    star: o.star === true,
    fromList: o.fromList === true,
  };
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
    const pins = o.pins.map(cleanPin);
    if (pins.some((p) => p === null)) return drop();
    return {
      name: o.name.slice(0, bodymap.limits.nameChars),
      apptDate: o.apptDate,
      figure: o.figure as Sex,
      pins: pins as Pin[],
      id: o.id as string | null,
    };
  }

  const state: BodyState = load();

  function save() {
    guard(() => {
      if (!storage) return;
      if (isBlank(state)) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, savedAt: now(), name: state.name, apptDate: state.apptDate, figure: state.figure, pins: state.pins, id: state.id }));
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
      const pin: Pin = { id, view: p.view, x: clamp(p.x), y: clamp(p.y), type: p.type, intensity: null, note: '', star: false, fromList: false };
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
