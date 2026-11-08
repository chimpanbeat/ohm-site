// RSVP logic that needs no browser (E2, I-049 and I-050; ARCHITECTURE §B10). The field names are the wire
// contract shared with the Apps Script (tests/fixtures/rsvp-cases.json runs through both). The client script
// (src/scripts/rsvp.ts) is a thin DOM layer over createRsvp(), and this file is bundled into it, so it imports no
// site data (only types, which are erased) and never types a URL, an address or a string of copy: text, url and
// email arrive as arguments.
import type { SiteEvent } from '../data/events.ts';

/** Guest rows a visitor without JS sees. Rows NOJS_GUEST_ROWS+1…maxGuests are rendered `hidden` (I-060). */
export const NOJS_GUEST_ROWS = 3;
export const NAME_MAX = 80;
export const EMAIL_MAX = 254;
export const TIMEOUT_MS = 15000;
/** Self-care tips (E6): a longer tip is dropped, and only the first TIPS_MAX are used (the script uses the same numbers). */
export const TIP_MAX = 280;
export const TIPS_MAX = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_RE = /^(name|email|status|session|g\d+(name|session))$/; // the wire names a reply may flag

export type Status = 'going' | 'maybe' | 'cant';
export type Answer = 'yes' | 'no';
export type Outcome = 'confirmed' | 'waitlist' | 'full' | 'maybe' | 'no';
export type RsvpText = Record<string, string>;

const STATUSES: string[] = ['going', 'maybe', 'cant'];
const OUTCOMES: string[] = ['confirmed', 'waitlist', 'full', 'maybe', 'no'];
const ERRORS: string[] = ['invalid', 'closed', 'unknown', 'busy', 'server'];

// ---- Validation --------------------------------------------------------------------------------------------------

export interface RsvpRules {
  maxGuests: number;
  session: boolean;
}
export interface Guest {
  name: string;
  session?: Answer;
}
export interface Normalized {
  name: string;
  email: string;
  status: Status;
  session?: Answer;
  guests: Guest[];
  optin: boolean;
}
export interface Validation {
  ok: boolean;
  /** Wire names of the bad fields, in form order (name, email, status, session, then each guest's name and session). */
  fields: string[];
  /** The honeypot was filled: `ok` is true so a bot sees a success, but nothing is sent. */
  bot?: boolean;
  normalized?: Normalized;
}
export type RawFields = Record<string, string | undefined>;

export function rulesOf(event: Pick<SiteEvent, 'rsvp'>): RsvpRules {
  return { maxGuests: event.rsvp?.maxGuests ?? 0, session: Boolean(event.rsvp?.session) };
}

const answerOf = (v: string): Answer | undefined => (v === 'yes' || v === 'no' ? v : undefined);

export function validateRsvp(input: RawFields, rules: RsvpRules): Validation {
  const get = (k: string) => String(input[k] ?? '');
  if (get('website') !== '') return { ok: true, fields: [], bot: true };

  const fields: string[] = [];
  const name = get('name').trim();
  if (!name || name.length > NAME_MAX) fields.push('name');
  const email = get('email').trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) fields.push('email');
  const st = get('status');
  const status = STATUSES.includes(st) ? (st as Status) : null;
  if (!status) fields.push('status');
  const cant = status === 'cant';

  let session: Answer | undefined;
  if (rules.session && !cant) {
    session = answerOf(get('session'));
    if (!session) fields.push('session');
  }

  const guests: Guest[] = [];
  if (!cant) {
    for (let n = 1; n <= rules.maxGuests; n++) {
      const gname = get(`g${n}name`).trim();
      const rawAnswer = rules.session ? get(`g${n}session`) : '';
      if (!gname && !rawAnswer) continue; // a blank row is dropped
      const gsession = answerOf(rawAnswer);
      let bad = false;
      if (!gname || gname.length > NAME_MAX) {
        fields.push(`g${n}name`);
        bad = true;
      }
      if (rules.session && gname && !gsession) {
        fields.push(`g${n}session`);
        bad = true;
      }
      if (!bad) guests.push(rules.session ? { name: gname, session: gsession } : { name: gname });
    }
  }

  if (fields.length || !status) return { ok: false, fields };
  const normalized: Normalized = { name, email, status, guests, optin: get('optin') === 'yes' };
  if (session) normalized.session = session;
  return { ok: true, fields, normalized };
}

/** The request body: form-urlencoded, so the web app needs no CORS preflight (§B10). */
export function toBody(slug: string, n: Normalized, website = ''): URLSearchParams {
  const body = new URLSearchParams({ slug, mode: 'json', name: n.name, email: n.email, status: n.status });
  if (n.session) body.set('session', n.session);
  n.guests.forEach((g, i) => {
    body.set(`g${i + 1}name`, g.name);
    if (g.session) body.set(`g${i + 1}session`, g.session);
  });
  if (n.optin) body.set('optin', 'yes');
  if (website) body.set('website', website);
  return body;
}

// ---- Replies -----------------------------------------------------------------------------------------------------

export type PostReply =
  | { ok: true; status: Status; outcomes: Outcome[]; pending: boolean }
  | { ok: false; error: 'invalid'; fields: string[] }
  | { ok: false; error: 'closed' | 'unknown' | 'busy' | 'server' };
export type StatusReply =
  | { ok: true; open: boolean; session: { spotsLeft: number; full: boolean; waitlist: boolean } | null; tips: string[] }
  | { ok: false };

const SERVER: PostReply = { ok: false, error: 'server' };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
function parseJson(text: string, httpStatus: number): Record<string, unknown> | null {
  if (httpStatus !== 200) return null;
  try {
    const v: unknown = JSON.parse(text);
    return isObject(v) ? v : null;
  } catch {
    return null; // an Apps Script error page is HTML
  }
}

/** Anything that is not a §B10 reply (HTML, a parse error, `duplicate`, a non-200) is `server`. */
export function parseReply(text: string, httpStatus = 200): PostReply {
  const o = parseJson(text, httpStatus);
  if (!o) return SERVER;
  if (o.ok === true) {
    if (typeof o.status !== 'string' || !STATUSES.includes(o.status)) return SERVER;
    if (!Array.isArray(o.outcomes) || !o.outcomes.every((x) => typeof x === 'string' && OUTCOMES.includes(x))) return SERVER;
    return { ok: true, status: o.status as Status, outcomes: o.outcomes as Outcome[], pending: o.pending === true };
  }
  if (o.ok === false && typeof o.error === 'string' && ERRORS.includes(o.error)) {
    if (o.error === 'invalid') return { ok: false, error: 'invalid', fields: Array.isArray(o.fields) ? o.fields.filter((f): f is string => typeof f === 'string' && FIELD_RE.test(f)) : [] };
    return { ok: false, error: o.error as 'closed' | 'unknown' | 'busy' | 'server' };
  }
  return SERVER;
}

export function parseStatus(text: string, httpStatus = 200): StatusReply {
  const o = parseJson(text, httpStatus);
  if (!o || o.ok !== true || typeof o.open !== 'boolean') return { ok: false };
  const tips = cleanTips(o.tips); // a missing or odd `tips` is [] and never fails the status
  if (o.session === null) return { ok: true, open: o.open, session: null, tips };
  const s = o.session;
  if (!isObject(s) || !Number.isInteger(s.spotsLeft) || (s.spotsLeft as number) < 0 || typeof s.full !== 'boolean' || typeof s.waitlist !== 'boolean') return { ok: false };
  return { ok: true, open: o.open, session: { spotsLeft: s.spotsLeft as number, full: s.full, waitlist: s.waitlist }, tips };
}

// ---- Self-care tips (E6, I-082) ----------------------------------------------------------------------------------

/** Strings only; control characters become a space, whitespace is collapsed and trimmed; empties, tips over TIP_MAX and
 * case-insensitive duplicates (first kept) are dropped; at most TIPS_MAX. Anything but an array is []. */
export function cleanTips(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const tips: string[] = [];
  for (const v of raw) {
    if (tips.length >= TIPS_MAX) break;
    if (typeof v !== 'string') continue;
    const tip = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    const key = tip.toLowerCase();
    if (!tip || tip.length > TIP_MAX || seen.has(key)) continue;
    seen.add(key);
    tips.push(tip);
  }
  return tips;
}

/** Fisher–Yates; a new array. */
export function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A shuffled walk: next() gives every tip once, reshuffles when they run out, and (with more than one tip) never gives the
 * same tip twice in a row. The Apps Script's tipDeck_ follows the same rules. */
export function tipDeck(tips: readonly string[], random: () => number): { size: number; next(): string } {
  let order: string[] = [];
  let at = 0;
  let last: string | null = null;
  return {
    size: tips.length,
    next() {
      if (tips.length === 0) return '';
      if (at >= order.length) {
        order = shuffle(tips, random);
        if (order.length > 1 && order[0] === last) [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
        at = 0;
      }
      last = order[at++];
      return last;
    },
  };
}

// ---- Text --------------------------------------------------------------------------------------------------------

/** Fills `{key}` placeholders; a key with no value stays as written. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** `{session}` is the label in lower case, `{Session}` the label with a capital first letter. */
export const words = (label: string) => ({ session: label.toLowerCase(), Session: label.charAt(0).toUpperCase() + label.slice(1) });

export function spotsText(text: RsvpText, label: string, spotsLeft: number, waitlist: boolean): string {
  const w = words(label);
  if (spotsLeft <= 0) return fill(waitlist ? text.fullWaitlist : text.full, w);
  if (spotsLeft === 1) return fill(text.spotLeft, w);
  return fill(text.spotsLeft, { ...w, n: spotsLeft });
}

const OUTCOME_KEY: Record<Outcome, string> = {
  confirmed: 'outcomeConfirmed',
  waitlist: 'outcomeWaitlist',
  full: 'outcomeFull',
  no: 'outcomeNo',
  maybe: 'outcomeMaybe',
};
export function outcomeLine(text: RsvpText, label: string, name: string, outcome: Outcome): string {
  return fill(text.outcomeLine, { name, outcome: fill(text[OUTCOME_KEY[outcome]], words(label)) });
}

export function errServer(text: RsvpText, email: string): string {
  return fill(text.errServer, { email });
}

/** The message under a bad field. `input` tells a too-long name from a missing one. */
export function fieldMessage(text: RsvpText, label: string, field: string, input: RawFields): string {
  const w = words(label);
  const long = (k: string) => String(input[k] ?? '').trim().length > NAME_MAX;
  const guest = field.match(/^g(\d+)(name|session)$/);
  if (guest) {
    const n = guest[1];
    if (guest[2] === 'session') return fill(text.errGuestSession, { ...w, n });
    return long(field) ? text.errLength : fill(text.errGuestName, { n });
  }
  switch (field) {
    case 'name':
      return long('name') ? text.errLength : text.errName;
    case 'email':
      return text.errEmail;
    case 'status':
      return text.errStatus;
    case 'session':
      return fill(text.errSession, w);
    default:
      return text.errInvalid;
  }
}

// ---- What the page shows after a send ----------------------------------------------------------------------------

export interface ResultView {
  title: string;
  text: string;
  /** One `<name> · <outcome>` per person; empty for can't go, a repeat RSVP and events without a session. */
  lines: string[];
  note?: string;
  /** Show the Add to calendar button. */
  calendar: boolean;
}

export function resultView(text: RsvpText, label: string, reply: Extract<PostReply, { ok: true }>, names: string[]): ResultView {
  if (reply.pending) return { title: text.changeTitle, text: text.changeText, lines: [], calendar: false };
  if (reply.status === 'cant') return { title: text.cantTitle, text: text.cantText, lines: [], calendar: false };
  const lines = names.slice(0, reply.outcomes.length).map((n, i) => outcomeLine(text, label, n, reply.outcomes[i]));
  const view: ResultView = { title: text.doneTitle, text: text.doneText, lines, calendar: true };
  if (reply.outcomes.includes('maybe')) view.note = fill(text.maybeNote, words(label));
  return view;
}

// ---- The controller ----------------------------------------------------------------------------------------------

/** What the form needs to know about its event (set as data attributes by RsvpForm; `configOf` makes it from the data). */
export interface RsvpConfig {
  slug: string;
  closesAt: string;
  maxGuests: number;
  session: { label: string; waitlist: boolean } | null;
}
export function configOf(event: SiteEvent): RsvpConfig {
  if (!event.rsvp) throw new Error(`event ${event.slug} has no rsvp`);
  const s = event.rsvp.session;
  return { slug: event.slug, closesAt: event.rsvp.closesAt, maxGuests: event.rsvp.maxGuests, session: s ? { label: s.label, waitlist: s.waitlist } : null };
}

export interface RsvpState {
  /** The spots line, or null (hidden) when the read failed or the event has no session. */
  spots: string | null;
  closed: boolean;
  sending: boolean;
  /** An error above the form. */
  banner: string | null;
  /** Wire name → message, shown under each bad field. */
  fieldErrors: Record<string, string>;
  /** The wire name of the first bad field, to focus. */
  focus: string | null;
  result: ResultView | null;
  /** The self-care tip under the result (E6), or null: no result yet, no tips, or the read failed. */
  tip: string | null;
  /** More than one tip, so the "Another tip" button shows. */
  moreTips: boolean;
}
export type FetchLike = (
  url: string,
  init?: { method?: string; body?: URLSearchParams; signal?: AbortSignal },
) => Promise<{ status: number; text(): Promise<string> }>;
export interface RsvpOptions {
  fetch: FetchLike;
  event: RsvpConfig;
  text: RsvpText;
  /** The web app URL (site.rsvpUrl; the form's `action`). */
  url: string;
  /** The contact address for the server-error line (site.email). */
  email: string;
  now?: () => number;
  timeoutMs?: number;
  /** The random source for the tip deck (E6); tests pass a seeded one. */
  random?: () => number;
}

export function createRsvp(opts: RsvpOptions) {
  const { event, text, url } = opts;
  const now = opts.now ?? Date.now;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const random = opts.random ?? Math.random;
  const rules: RsvpRules = { maxGuests: event.maxGuests, session: event.session !== null };
  const label = event.session?.label ?? '';
  const listeners: ((s: RsvpState) => void)[] = [];
  let state: RsvpState = { spots: null, closed: false, sending: false, banner: null, fieldErrors: {}, focus: null, result: null, tip: null, moreTips: false };
  // The deck comes from the first status read that has tips and lasts for the page view (a later read never resets it).
  let deck: ReturnType<typeof tipDeck> | null = null;
  const set = (patch: Partial<RsvpState>) => {
    state = { ...state, ...patch };
    // Whenever a result is showing and a deck exists, the card gets its first tip.
    if (state.result && deck && state.tip === null) state = { ...state, tip: deck.next(), moreTips: deck.size > 1 };
    for (const l of listeners) l(state);
  };

  // One request, one timer: the AbortController stops a real fetch, the race settles a stuck one.
  async function request(target: string, init: { method?: string; body?: URLSearchParams }) {
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ac.abort();
        reject(new Error('timeout'));
      }, timeoutMs);
    });
    const exchange = (async () => {
      const res = await opts.fetch(target, { ...init, signal: ac.signal });
      return { status: res.status, text: await res.text() };
    })();
    try {
      return await Promise.race([exchange, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function load(): Promise<void> {
    if (now() >= Date.parse(event.closesAt)) {
      set({ closed: true });
      return;
    }
    try {
      const res = await request(`${url}?slug=${encodeURIComponent(event.slug)}`, {});
      const p = parseStatus(res.text, res.status);
      if (!p.ok) return; // the timeline already says how many spots there are
      if (!deck && p.tips.length > 0) deck = tipDeck(p.tips, random);
      set({ closed: !p.open, spots: p.session ? spotsText(text, event.session?.label ?? label, p.session.spotsLeft, p.session.waitlist) : null });
    } catch {
      // the spots line stays as it was
    }
  }

  async function submit(fields: RawFields): Promise<void> {
    if (state.sending) return;
    const v = validateRsvp(fields, rules);
    if (v.bot) {
      set({ result: { title: text.doneTitle, text: text.doneText, lines: [], calendar: false }, banner: null, fieldErrors: {}, focus: null });
      return;
    }
    if (!v.ok || !v.normalized) {
      const fieldErrors: Record<string, string> = {};
      for (const f of v.fields) fieldErrors[f] = fieldMessage(text, label, f, fields);
      set({ banner: text.errInvalid, fieldErrors, focus: v.fields[0] ?? null });
      return;
    }
    const n = v.normalized;
    set({ sending: true, banner: null, fieldErrors: {}, focus: null });
    let reply: PostReply;
    try {
      const res = await request(url, { method: 'POST', body: toBody(event.slug, n) });
      reply = parseReply(res.text, res.status);
    } catch {
      reply = SERVER;
    }
    if (reply.ok) {
      set({ sending: false, result: resultView(text, label, reply, [n.name, ...n.guests.map((g) => g.name)]) });
      await load();
    } else if (reply.error === 'invalid') {
      const fieldErrors: Record<string, string> = {};
      for (const f of reply.fields) fieldErrors[f] = fieldMessage(text, label, f, fields);
      set({ sending: false, banner: text.errInvalid, fieldErrors, focus: reply.fields[0] ?? null });
    } else if (reply.error === 'closed') {
      set({ sending: false, closed: true });
    } else {
      set({ sending: false, banner: errServer(text, opts.email) });
    }
  }

  return {
    get state(): RsvpState {
      return state;
    },
    load,
    submit,
    /** The "Another tip" button: the next tip from the deck. Does nothing until a tip is showing. */
    nextTip(): void {
      if (deck && state.tip !== null) set({ tip: deck.next() });
    },
    subscribe(fn: (s: RsvpState) => void) {
      listeners.push(fn);
    },
  };
}
