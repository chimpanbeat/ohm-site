// Every event as data, plus the RSVP strings shared by all of them (E1, I-048; ARCHITECTURE §B10).
// CONTRACT FILE: shape and exports are fixed by §B10; the strings are the copy deck's → Events, verbatim
// (Brian's capitals included). A new event is a new entry here, its images under src/assets/events/<slug>/
// and its copy in the deck: no new page, component or script.
// No imports: tests and scripts load this under Node type stripping (no enum, namespace or parameter properties).

export type Iso = string; // '2026-11-22T14:00:00-07:00': local wall time plus the UTC offset in force in timeZone on that date
// Running text with inline pieces (E4, I-077/I-078; same idea as client-policies.ts `Run`/`Rich`):
// a plain string; a link (`href` is https, opens in a new tab with rel="noopener"); or a licensure-dependent piece,
// `{ w: key }`, rendered as w(key) from src/data/wording.ts (the key must exist there; a guard checks it).
export type Run = string | { text: string; href: string } | { w: string };
export type Rich = string | Run[];
export interface TimelineItem { start: Iso; end?: Iso; title: string; notes?: Rich[]; optional?: boolean }
// text is Rich since E8 (I-093: the parking text links "free parking along Wahsatch"); the feed and the reminder email
// get it as plain text (plainText in src/lib/events.ts), so the email line is unchanged.
export interface InfoBlock { id: string; title: string; text?: Rich; items?: string[]; inReminder?: boolean }
// inResult (E9, I-096): true = its link also shows as a button on the RSVP result card for Going and Maybe (never Can't go).
export interface Notice { id: string; title: string; text: string; link?: { label: string; url: string }; inEmails?: boolean; inResult?: boolean }
// label 'Yoga'; item = index into timeline (its time goes in the question); limit and waitlist per I-050
export interface CappedSession { key: string; label: string; item: number; limit: number; waitlist: boolean }
// tips (E6, I-082/I-084): true = the in-page "Self-care tip of the day" card after an RSVP and one tip in each reminder
// email, read by the Apps Script from Brian's tips sheet (ARCHITECTURE §B10 Tips). Absent or false: no tips.
export interface EventRsvp { closesAt: Iso; maxGuests: number; reminderAt: Iso; showGoing: boolean; session?: CappedSession; tips?: boolean }
// One "made possible by" entry (E4, I-079; E5, I-085): the image, then `name` (bold) and under it `role` (smaller, its
// own line, first letter capitalised), all one link (new tab). No comma between them since E5.
// image: a path under src/assets/events/; alt '' when the name beside it already says what the image shows.
// logo (E5, I-085): true = a transparent logo, drawn with no border or radius; absent = a photo, framed.
export interface Credit { name: string; role: string; url: string; image: string; alt: string; logo?: boolean }
export interface SiteEvent {
  slug: string;
  title: string; // the full name: meta title, link preview, calendar file, feed and emails
  heading?: string; // the on-page H1 when it differs from title (E4, I-078); absent: the H1 is title
  summary: string; // second sentence of the meta description
  start: Iso;
  end: Iso;
  timeZone: string; // 'America/Denver'
  venue: { name: string; address: string }; // a public venue only, never the office
  description?: Rich[]; // paragraphs under the hero (E4, I-077)
  timeline: TimelineItem[];
  info: InfoBlock[];
  notices: Notice[];
  credits?: { heading: string; items: Credit[] }; // the last section (E4, I-079; replaces `host`)
  // paths under src/assets/events/; alt = the words on the header graphic: the header <picture> alt and og:image:alt
  // wideMark (E11, I-104): a JSON path made by `npm run event-banner`, the traced mark drawn as inline SVG over `wide`
  // from 48rem; absent: `wide` is the whole banner (E5 crop).
  graphics: { wide: string; narrow: string; og: string; alt: string; wideMark?: string };
  index: boolean; // false: noindex and out of the sitemap
  rsvp?: EventRsvp; // absent: no form, no feed
}

// The launch party. `limit` is the one place the yoga cap is typed; the timeline note is built from it.
export const SESSION_LIMIT = 20;

// The event-day swap (E8, I-091; ARCHITECTURE §B10 E8–E11): from CHAI_AT the Tai Chi note and John Marshall's credit role
// read as chai tea, in a build made then (.github/workflows/deploy.yml runs three scheduled builds on Nov 22, 2026).
// All or nothing: set CHAI_NOTE to null to turn the whole swap off.
export const CHAI_AT: Iso = '2026-11-22T16:00:00-07:00'; // 23:00 UTC // I-091
export const CHAI_NOTE: string | null = 'Chai tea led by John Marshall 🍵🫖'; // I-091 (Brian, Nov 8, 2026, verbatim)
const TAI_CHI_NOTE = 'Tai Chi led by John Marshall ☯️ 🥋'; // I-088
const TAI_CHI_ROLE = 'Tai Chi instruction'; // I-089
const CHAI_ROLE = 'Chai Tea ceremony'; // I-091 (Brian)

// `chaiNote`: the event-day swap (I-091). With it, item 2's last note is the chai note and John Marshall's role is
// `Chai Tea ceremony`; without it, the Tai Chi note and `Tai Chi instruction`.
export function launchParty(limit: number, chaiNote: string | null = null): SiteEvent {
  return {
    slug: 'launch-party',
    title: 'Ohm Launch Party: A Celebration of Self-Care',
    heading: 'A Celebration of Self-Care', // I-078 (Marea): the header graphic already says "Ohm Launch Party"
    summary: 'Restorative yoga, the Self Care Launch Party and an optional climb at the gym.',
    start: '2026-11-22T14:00:00-07:00', // MST: DST ended Nov 1, 2026
    end: '2026-11-22T18:00:00-07:00',
    timeZone: 'America/Denver',
    venue: { name: 'CityROCK', address: '21 N Nevada Ave, Colorado Springs, CO 80903' },
    // I-077: Brian's Partiful description with Marea's edits (650 hours; "passed his state test to become a licensed
    // neuromuscular massage therapist"). The licensure clause is w('launchStateTest'): empty while unlicensed.
    description: [
      [
        'A year and a half ago, Brian left his electrical engineering career and stepped into the unknown, in search of a more soul-fulfilling way to contribute to the world. Last month, he completed 650 hours of studies',
        { w: 'launchStateTest' },
        "! 🎉 We invite our community to join us as we celebrate the beginning of Brian's new career and the launch of his business: Ohm Precision Bodywork.",
      ],
      [
        'This event welcomes you into a space of celebration as well as self-care, equal parts joy and rest. Our beloved friend ',
        { text: 'Britt', href: 'https://www.instagram.com/brittandspirit/' },
        ' will be guiding us through a beginner-friendly restorative yoga practice and sound bath, meant to help you release tension and reconnect with your body.',
      ],
      "Following the yoga class, you're invited to enjoy healthy snacks and cozy drinks, make new friends, and participate in activities designed to reset your nervous system. By completing activities, you'll have the opportunity to win a body care gift basket and some limited edition Ohm merch!",
      "We hope you'll bless us with your presence as we come together to usher Brian into a joyful new era. ⚡",
    ],
    timeline: [
      { start: '2026-11-22T13:45:00-07:00', title: 'Arrive for yoga, get settled in' },
      {
        start: '2026-11-22T14:00:00-07:00',
        end: '2026-11-22T15:00:00-07:00',
        title: 'Restorative Yoga with Britt 🧘 🪷', // I-078 (Marea); I-088 (Brian): the emoji
        notes: [
          'No supplies or experience needed',
          'Mats provided, or bring your own', // I-078: moved here from What to wear
          'Water bottle and stretchy clothes recommended',
          `Limited to first ${limit} sign-ups`,
        ],
      },
      {
        start: '2026-11-22T15:00:00-07:00',
        end: '2026-11-22T18:00:00-07:00',
        title: 'Self Care Launch Party',
        // I-078; I-086 (Marea); I-088 (Brian): "Optional" dropped, Tai Chi led by John Marshall with emoji; I-091: the chai swap
        notes: ['Open house style, come and go as you please', 'Refreshments provided', 'Activities and merch', chaiNote ?? TAI_CHI_NOTE],
      },
      {
        start: '2026-11-22T18:00:00-07:00',
        end: '2026-11-22T20:00:00-07:00',
        title: 'Optional: climb at the gym until close',
        // I-078: "Own day pass required" becomes the linked "Day pass purchase required" (URL confirmed by Brian)
        // I-086 (Marea): rentals cost extra, so "provided" became "available"
        notes: [[{ text: 'Day pass purchase required', href: 'https://climbcityrock.com/day-passes' }], 'Harness and shoe rentals available'],
        optional: true,
      },
    ],
    info: [
      {
        id: 'wear',
        title: 'What to wear',
        items: ['Comfy cozy: yoga clothes or sweat pants', 'Fuzzy socks encouraged', 'Shoes off in the yoga room'], // I-078: mats moved to the yoga item
        inReminder: true,
      },
      {
        id: 'parking',
        title: 'Parking',
        // I-093 (Brian): only "free parking along Wahsatch" links, to his map pin; the feed and the email get plain text
        text: [
          'Metered street parking, or ',
          { text: 'free parking along Wahsatch', href: 'https://maps.app.goo.gl/kdJ5A88ab9EMxUmQ8' },
          " if you don't mind walking 2 blocks.",
        ],
        inReminder: true,
      },
      {
        id: 'raffle',
        title: 'Raffle',
        text: 'Complete the activities at the party for a chance to win a body care gift basket and limited-edition Ohm merch.',
      },
    ],
    notices: [
      {
        id: 'waiver',
        title: 'Important: Waiver Required',
        text: "If you haven't been to CityROCK in the last 2 years, you'll be required to fill out a waiver to enter the building. We recommend filling this out in advance, but it can be done in person if you forget!",
        link: { label: 'Fill out the waiver', url: 'https://portal.climbcityrock.com/cityrockdowntown/agreements/cityrock-waiver' },
        inEmails: true,
        inResult: true, // E9, I-096: also a button on the RSVP result card (Going and Maybe)
      },
    ],
    // I-079 (Marea's labels): replaces the host section. Images made by `npm run event-images` (E4).
    credits: {
      heading: 'This event made possible by…',
      items: [
        { name: 'Maréa', role: 'Host', url: 'https://dreamcatcherwed.com', image: 'launch-party/marea-thumb.jpg', alt: '' },
        { name: 'CityROCK', role: 'Venue', url: 'https://climbcityrock.com', image: 'launch-party/cityrock-logo.png', alt: '', logo: true },
        {
          name: 'Britt Maddy',
          role: 'Yoga instruction',
          url: 'https://www.instagram.com/brittandspirit/',
          image: 'launch-party/britt-thumb.jpg',
          alt: '',
        },
        // Marea typed "JohnMark.co"; the logo is his Rantala Creative mark, so its alt gives the words on it
        { name: 'JohnMark', role: 'Graphic design', url: 'https://johnmark.co', image: 'launch-party/johnmark-logo.png', alt: 'Rantala Creative', logo: true },
        // I-089 (Marea's entry, Brian's role, Nov 8, 2026): a framed photo (I-090); I-091: the role swaps with the note
        { name: 'John Marshall', role: chaiNote ? CHAI_ROLE : TAI_CHI_ROLE, url: 'https://ransfordengineering.com', image: 'launch-party/john-thumb.jpg', alt: '' },
      ],
    },
    graphics: {
      wide: 'launch-party/banner-bg.png',
      wideMark: 'launch-party/banner-mark.json',
      narrow: 'launch-party/launch-mark-on-dark.png',
      og: 'launch-party/header-green.png',
      alt: 'Ohm Precision Bodywork Launch Party',
    },
    index: false, // I-063 (Brian, Nov 6): hidden for now, shared by URL only; a Home link may come later
    rsvp: {
      closesAt: '2026-11-22T14:00:00-07:00',
      maxGuests: 10, // I-060 (Brian, Nov 6): no limit on +1s; 10 is only a ceiling against bots
      reminderAt: '2026-11-21T10:00:00-07:00', // I-061 (Brian, Nov 6): Sat Nov 21, 10:00 am
      showGoing: false,
      session: { key: 'yoga', label: 'Yoga', item: 1, limit, waitlist: true },
      tips: true, // I-082, I-084 (Brian): self-care tips after an RSVP and in the reminder email
    },
  };
}

// Every event as of `nowMs` (E8, I-091): the launch party swaps at CHAI_AT. A static page changes only with a build, so
// the clock is the build's.
export function eventsAt(nowMs: number): SiteEvent[] { // I-091
  return [launchParty(SESSION_LIMIT, CHAI_NOTE !== null && nowMs >= Date.parse(CHAI_AT) ? CHAI_NOTE : null)];
}

// Build time: OHM_EVENTS_NOW (an ISO time) when set, so tests and previews can build either side of CHAI_AT; an
// unparseable value stops the build. Read through globalThis so this file keeps no imports.
function buildNow(): number { // I-091
  const set = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.OHM_EVENTS_NOW; // I-091
  if (set === undefined || set === '') return Date.now();
  const t = Date.parse(set);
  if (Number.isNaN(t)) throw new Error(`OHM_EVENTS_NOW "${set}" is not a date; use an ISO time like 2026-11-22T23:30:00Z`);
  return t;
}

export const events: SiteEvent[] = eventsAt(buildNow()); // I-091

// The section headings every event page uses (copy deck → Events; E5, I-085). The credits heading is per event
// (`credits.heading`) and the RSVP heading is `rsvpText.heading`.
export const eventHeadings = {
  description: 'Description', // E5, I-085 (Brian)
  schedule: 'Schedule',
  details: 'Details', // E5, I-085 (Brian): over the info blocks, which become H3s
} as const;

export function eventBySlug(slug: string): SiteEvent | undefined {
  return events.find((e) => e.slug === slug);
}

// The RSVP strings shared by every event (copy deck → Events → RSVP text). `{x}` placeholders are filled by the
// page, the script and the emails; nothing else types these.
export const rsvpText = {
  heading: 'RSVP',
  intro: "Let me know if you can make it, and add anyone you're bringing.",
  name: 'Name',
  email: 'Email',
  status: 'Are you coming?',
  going: 'Going',
  maybe: 'Maybe',
  cant: "Can't go",
  sessionQuestion: 'Joining {session} ({time})?',
  yes: 'Yes',
  no: 'No',
  guestsHeading: 'Guests',
  guestsHelp: "Bringing someone? Add each guest's name and whether they're joining {session}.",
  guestsHelpPlain: "Bringing someone? Add each guest's name.",
  guestLegend: 'Guest {n}',
  guestName: 'Name',
  addGuest: 'Add a guest',
  removeGuest: 'Remove guest {n}',
  honeypot: 'Leave this field empty',
  optIn: 'Yes, send me Ohm news and offers.',
  submit: 'Send RSVP',
  sending: 'Sending…',
  privacy: "I'll only use your name and email for event reminders. You'll also receive Ohm news and offers if you check the box.",
  spotsLeft: '{n} {session} spots left',
  spotLeft: '1 {session} spot left',
  fullWaitlist: '{Session} is full. Answer yes to join the waitlist.',
  full: '{Session} is full.',
  closed: 'RSVPs for this event are closed.',
  doneTitle: "You're on the list.",
  doneText: 'I sent a confirmation to your email.',
  cantTitle: 'Thanks for letting me know.',
  cantText: 'I sent a short note to your email.',
  outcomeConfirmed: '{Session}: confirmed',
  outcomeWaitlist: '{Session}: waitlist',
  outcomeFull: '{Session}: full',
  outcomeNo: '{Session}: no',
  outcomeMaybe: '{Session}: no spot held while Maybe',
  maybeNote: "A Maybe doesn't hold a {session} spot. If you decide to come, RSVP again on the event page with this email and choose Going.",
  outcomeLine: '{name} · {outcome}',
  calendar: 'Add to calendar',
  errInvalid: 'Check the fields marked below.',
  errName: 'Enter your name.',
  errEmail: 'Enter a valid email address.',
  errLength: 'Use 80 characters or fewer.',
  errStatus: "Choose Going, Maybe or Can't go.",
  errSession: 'Answer the {session} question.',
  errGuestName: "Enter guest {n}'s name, or remove the guest.",
  errGuestSession: 'Answer the {session} question for guest {n}.',
  changeTitle: 'Check your email.',
  changeText: 'This email already has an RSVP, so I sent a link to that address. Open it to confirm your change; nothing changes until you do.',
  errServer: "Something went wrong and your RSVP wasn't saved. Try again in a minute, or email me at {email}.",
  pageTitle: 'RSVP: {title}',
  back: 'Back to the event page',
  hi: 'Hi {name},',
  confirmSubject: "You're on the list: {title}",
  confirmLead: 'Thanks for your RSVP to {title}. You said: {status}.',
  cantSubject: 'RSVP received: {title}',
  cantLead: "Thanks for letting me know you can't make {title}. If your plans change, RSVP again on the event page with this email.",
  reminderSubject: 'Reminder: {title}',
  reminderLead: "Here's a reminder about {title}.",
  when: 'When: {dateLabel}, {timeLabel}',
  where: 'Where: {venue}, {address}',
  waitlistNote: "The waitlist goes in sign-up order. I'll email you if a spot opens.",
  calendarLine: 'Add it to your calendar: {icsUrl}',
  detailsLine: 'Event details: {pageUrl}',
  changeLine: 'To change your RSVP, RSVP again on the event page with this email, or reply to this email.',
  signoff: '{siteName}',
  changeSubject: 'Confirm your RSVP change: {title}',
  changeLead: 'Someone asked to change your RSVP to {title} using this email address. If it was you, confirm the new answer below.',
  newAnswer: 'New answer: {status}',
  answerLine: '{name} · {Session}: {answer}',
  changeLinkLine: 'To make the change, open this link and press Confirm change within 6 hours: {changeUrl}',
  changeIgnore: "If you didn't ask for this, ignore this email. Your RSVP stays as it is.",
  changeConfirmLead: 'Confirm this change to your RSVP:',
  changeConfirm: 'Confirm change',
  changeExpired: 'This link has expired or was already used. To change your RSVP, send it again on the event page.',
  changeDoneTitle: 'Your RSVP is updated.',
  spotFreedSubject: 'A {session} spot opened: {title}',
  spotFreedText: "A guest's RSVP change freed {session} spots (freed: {n}) while people are on the waitlist. In the sheet, set the lowest Waitlist # to confirmed and email that guest, once for each freed spot.",
  tipTitle: 'Self-care tip', // E9, I-095 (Brian: drops "of the day")
  tipNext: 'Another tip', // E6, I-082 (Brian)
  reminderTip: 'Self-care tip: {tip}', // E9, I-095 (Brian: drops "of the day"; the script reads it from the feed)
  resultStatus: 'RSVP: {status}', // E9, I-094 (Brian)
  cheerGoing: "Can't wait to see you there!", // E9, I-103 (Brian, verbatim)
  cheerMaybe: 'Hope to see you there!', // E9, I-103 (Brian, verbatim)
  cheerCant: "Sorry you can't make it!", // E9, I-103 (Brian, verbatim)
  cheerMaybeEmoji: '🤞', // E9, I-105 (Brian; decorative)
  cheerCantEmoji: '🥲', // E9, I-105 (Brian; decorative)
  countdownDays: 'In {n} days', // E10, I-101 (Brian, Nov 8; n >= 2)
  countdownTomorrow: 'Tomorrow', // E10, I-101 (Brian)
  countdownToday: 'Today!', // E10, I-101 (Brian; the event's day until it ends)
} as const;

export type RsvpTextKey = keyof typeof rsvpText;
