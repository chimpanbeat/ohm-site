// Pure time helpers for client script 6 (E10, I-100, I-101; ARCHITECTURE §B10 E8–E11). No imports: the script bundles
// only this file, never the event data, site.ts or wording.ts.

export type Countdown = { kind: 'days'; n: number } | { kind: 'tomorrow' } | { kind: 'today' } | null;

// The calendar date (year, month, day) of an instant in `tz`, as a UTC day number, so two of them subtract to whole days.
function dayNumber(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(ms);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000;
}

// Days are calendar dates in `tz`, never 24-hour blocks: 8 pm on Nov 20 is two days before Nov 22 whatever the UTC date.
// `today` runs from midnight of the event's day to `end`; at and after `end` the answer is null.
export function countdown(nowMs: number, start: string, end: string, tz: string): Countdown {
  if (nowMs >= Date.parse(end)) return null;
  const days = dayNumber(Date.parse(start), tz) - dayNumber(nowMs, tz);
  if (days >= 2) return { kind: 'days', n: days };
  if (days === 1) return { kind: 'tomorrow' };
  return { kind: 'today' };
}

// The index of the item with start <= now < end, or -1.
export function currentItem(items: { start: string; end: string }[], nowMs: number): number {
  return items.findIndex((item) => Date.parse(item.start) <= nowMs && nowMs < Date.parse(item.end));
}
