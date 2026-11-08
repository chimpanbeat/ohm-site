// Pure helpers for events (E1, I-048; ARCHITECTURE §B10): labels, Maps link, calendar file, public feed, guards.
// Node-tested; no Astro or Vite imports. Event facts live in src/data/events.ts, never here.
import { rsvpText } from '../data/events.ts';
import type { Iso, Rich, SiteEvent } from '../data/events.ts';
import { site } from '../data/site.ts';
import { wording } from '../data/wording.ts';

// Running text as plain text: strings and link text joined; a `{ w }` piece is wording[key][variant] (0 unlicensed, 1 licensed).
// For tests and anything that needs the words without markup.
export function plainText(rich: Rich, variant: 0 | 1): string {
  if (typeof rich === 'string') return rich;
  return rich
    .map((run) => {
      if (typeof run === 'string') return run;
      if ('w' in run) return wording[run.w as keyof typeof wording]?.[variant] ?? '';
      return run.text;
    })
    .join('');
}

// Every top-level name in src/pages/ and public/ (without extension), plus the folders the build owns.
// An event slug can't be any of them: its page would collide with a file the site already serves.
export const RESERVED_SLUGS: string[] = [
  '404',
  'about',
  'apple-touch-icon',
  'book',
  'client-policies',
  'favicon-32',
  'hello',
  'icon-512',
  'img',
  'index',
  'ohm-client-policies',
  'pricing',
  'robots',
  'services',
  'sitemap',
  'events',
  '_astro',
];

const SLUG = /^[a-z0-9-]{1,40}$/;
const OFFSET = /([+-])(\d{2}):(\d{2})$/;

const numeric = (tz: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

interface Wall { year: number; month: number; day: number; hour: number; minute: number; second: number }

// The wall clock in `tz` at the instant `iso` names.
function wallAt(iso: Iso, tz: string): Wall {
  const parts = Object.fromEntries(numeric(tz).formatToParts(new Date(iso)).map((p) => [p.type, Number(p.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dateLabel(iso: Iso, tz: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`;
}

// 'always' (the hero): `2:00–6:00 pm`. 'auto' (the timeline): `2–3 pm`, `1:45 pm`, `11:30 am–1 pm`.
// Built from parts, so the narrow no-break space ICU puts before AM/PM never appears.
export function timeLabel(start: Iso, end: Iso | undefined, tz: string, minutes: 'always' | 'auto'): string {
  const clock = (iso: Iso) => {
    const w = wallAt(iso, tz);
    const hour = w.hour % 12 || 12;
    const text = minutes === 'always' || w.minute !== 0 ? `${hour}:${pad(w.minute)}` : `${hour}`;
    return { text, meridiem: w.hour < 12 ? 'am' : 'pm' };
  };
  const a = clock(start);
  if (!end) return `${a.text} ${a.meridiem}`;
  const b = clock(end);
  return a.meridiem === b.meridiem ? `${a.text}–${b.text} ${b.meridiem}` : `${a.text} ${a.meridiem}–${b.text} ${b.meridiem}`;
}

// Google Maps URLs need no key (https://developers.google.com/maps/documentation/urls/get-started).
export function mapsUrl(venue: SiteEvent['venue']): string {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: `${venue.name}, ${venue.address}` })}`;
}

const root = (siteUrl: string) => siteUrl.replace(/\/+$/, '');
export const pageUrl = (event: SiteEvent, siteUrl: string) => `${root(siteUrl)}/${event.slug}`;
export const icsUrl = (event: SiteEvent, siteUrl: string) => `${root(siteUrl)}/events/${event.slug}.ics`;

// RFC 5545 §3.3.11: escape backslash, semicolon, comma and newlines in TEXT values.
const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545 §3.1: lines fold at 75 octets (the leading space of a continuation counts); never inside a character.
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// `siteUrl` is the site's origin plus its base, e.g. https://ohmprecisionbodywork.com/
export function icsFor(event: SiteEvent, siteUrl: string, now: Date): string {
  const page = pageUrl(event, siteUrl);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ohm Precision Bodywork//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.slug}@${new URL(siteUrl).host}`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(new Date(event.start))}`,
    `DTEND:${utc(new Date(event.end))}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(`${event.venue.name}, ${event.venue.address}`)}`,
    `URL:${page}`,
    `DESCRIPTION:${escapeText(page)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export interface EventFeed {
  v: 1;
  slug: string;
  title: string;
  start: Iso;
  end: Iso;
  closesAt: Iso;
  reminderAt: Iso;
  maxGuests: number;
  dateLabel: string;
  timeLabel: string;
  venue: { name: string; address: string };
  pageUrl: string;
  icsUrl: string;
  session: { key: string; label: string; limit: number; waitlist: boolean; time: string } | null;
  reminderInfo: { title: string; text?: string; items?: string[] }[];
  notices: { title: string; text: string; url?: string }[];
  /** E6: true = the Apps Script returns tips on the status reply and adds one to each reminder. */
  tips: boolean;
  sender: { name: string; replyTo: string };
  text: typeof rsvpText;
}

// The public feed the Apps Script reads (§B10). Public facts only: no guest data, no `showGoing`.
export function feedFor(event: SiteEvent, siteUrl: string): EventFeed {
  const rsvp = event.rsvp;
  if (!rsvp) throw new Error(`event "${event.slug}" has no rsvp, so it has no feed`);
  const s = rsvp.session;
  const item = s ? event.timeline[s.item] : undefined;
  return {
    v: 1,
    slug: event.slug,
    title: event.title,
    start: event.start,
    end: event.end,
    closesAt: rsvp.closesAt,
    reminderAt: rsvp.reminderAt,
    maxGuests: rsvp.maxGuests,
    dateLabel: dateLabel(event.start, event.timeZone),
    timeLabel: timeLabel(event.start, event.end, event.timeZone, 'always'),
    venue: { name: event.venue.name, address: event.venue.address },
    pageUrl: pageUrl(event, siteUrl),
    icsUrl: icsUrl(event, siteUrl),
    session:
      s && item
        ? { key: s.key, label: s.label, limit: s.limit, waitlist: s.waitlist, time: timeLabel(item.start, item.end, event.timeZone, 'auto') }
        : null,
    reminderInfo: event.info
      .filter((b) => b.inReminder)
      .map((b) => ({ title: b.title, ...(b.text !== undefined && { text: b.text }), ...(b.items && { items: b.items }) })),
    notices: event.notices
      .filter((n) => n.inEmails)
      .map((n) => ({ title: n.title, text: n.text, ...(n.link && { url: n.link.url }) })),
    tips: rsvp.tips === true,
    sender: { name: site.name, replyTo: site.email },
    text: rsvpText,
  };
}

// The offset (minutes east of UTC) `tz` uses at the instant `iso` names.
function zoneOffset(iso: Iso, tz: string): number {
  const w = wallAt(iso, tz);
  const instant = Math.floor(new Date(iso).getTime() / 1000) * 1000;
  return (Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - instant) / 60000;
}

function checkTime(slug: string, label: string, iso: Iso, tz: string): void {
  const m = OFFSET.exec(iso);
  if (!m || Number.isNaN(new Date(iso).getTime())) {
    throw new Error(`event "${slug}": ${label} "${iso}" needs a time with an explicit UTC offset, like 2026-11-22T14:00:00-07:00`);
  }
  const given = (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  const actual = zoneOffset(iso, tz);
  if (given !== actual) {
    const sign = actual < 0 ? '-' : '+';
    const right = `${sign}${pad(Math.floor(Math.abs(actual) / 60))}:${pad(Math.abs(actual) % 60)}`;
    throw new Error(`event "${slug}": ${label} "${iso}" has the wrong offset; ${tz} uses ${right} on that date`);
  }
}

// Build-time and test-time guards (§B10). `seen` = slugs already taken.
export function assertEvent(event: SiteEvent, seen: string[] = []): void {
  const { slug, timeZone: tz } = event;
  if (RESERVED_SLUGS.includes(slug)) throw new Error(`event slug "${slug}" is reserved: the site already has a page, file or folder by that name`);
  if (!SLUG.test(slug)) throw new Error(`event slug "${slug}" must match ${SLUG} (lowercase letters, digits and hyphens, up to 40)`);
  if (seen.includes(slug)) throw new Error(`duplicate event slug "${slug}"`);

  checkTime(slug, 'start', event.start, tz);
  checkTime(slug, 'end', event.end, tz);
  if (!(new Date(event.end).getTime() > new Date(event.start).getTime())) throw new Error(`event "${slug}": end must be after start`);
  event.timeline.forEach((item, i) => {
    checkTime(slug, `timeline[${i}].start`, item.start, tz);
    if (item.end) checkTime(slug, `timeline[${i}].end`, item.end, tz);
  });

  // E4: running text (description, timeline notes) holds only https links and known wording keys
  const checkRich = (rich: Rich) => {
    if (typeof rich === 'string') return;
    for (const run of rich) {
      if (typeof run === 'string') continue;
      if ('w' in run) {
        if (!(run.w in wording)) throw new Error(`event "${slug}": unknown wording key "${run.w}"`);
      } else if (!run.href.startsWith('https://')) {
        throw new Error(`event "${slug}": link "${run.href}" must be https`);
      }
    }
  };
  event.description?.forEach(checkRich);
  event.timeline.forEach((item) => item.notes?.forEach(checkRich));
  event.credits?.items.forEach((c, i) => {
    if (!c.url.startsWith('https://')) throw new Error(`event "${slug}": link "${c.url}" must be https`);
    for (const field of ['name', 'role', 'image'] as const) {
      if (!c[field].trim()) throw new Error(`event "${slug}": credits.items[${i}].${field} is empty`);
    }
  });

  const rsvp = event.rsvp;
  if (rsvp) {
    checkTime(slug, 'rsvp.closesAt', rsvp.closesAt, tz);
    checkTime(slug, 'rsvp.reminderAt', rsvp.reminderAt, tz);
    if (rsvp.showGoing) throw new Error('showGoing has no design yet (I-049): decide what it shows first');
    const s = rsvp.session;
    if (s && !(Number.isInteger(s.item) && s.item >= 0 && s.item < event.timeline.length)) {
      throw new Error(`event "${slug}": rsvp.session.item ${s.item} is not an index into the timeline`);
    }
  }
}

export function assertEvents(list: SiteEvent[]): void {
  const seen: string[] = [];
  for (const event of list) {
    assertEvent(event, seen);
    seen.push(event.slug);
  }
}

// `getStaticPaths` for src/pages/[event].astro; the guards run here, so a bad event fails the build.
export function eventPaths(list: SiteEvent[]): { params: { event: string }; props: { event: SiteEvent } }[] {
  assertEvents(list);
  return list.map((event) => ({ params: { event: event.slug }, props: { event } }));
}
