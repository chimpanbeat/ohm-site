// Day-of-week helpers for the day chips (DayChips.astro). The days live in src/data/site.ts as display
// text ("Tuesdays, Wednesday evenings, Fridays, and Saturdays"); this reads the weekday names out of it so
// the text stays the single source. Monday first, so a working week reads as one block.

export const WEEK = [
  { abbr: 'Mo', name: 'Monday' },
  { abbr: 'Tu', name: 'Tuesday' },
  { abbr: 'We', name: 'Wednesday' },
  { abbr: 'Th', name: 'Thursday' },
  { abbr: 'Fr', name: 'Friday' },
  { abbr: 'Sa', name: 'Saturday' },
  { abbr: 'Su', name: 'Sunday' },
] as const;

/** Indexes into WEEK for each weekday named in `text`. "By request" and other text without a weekday give []. */
export function daysIn(text: string): number[] {
  return WEEK.flatMap((d, i) => (new RegExp(`\\b${d.name}`, 'i').test(text) ? [i] : []));
}
