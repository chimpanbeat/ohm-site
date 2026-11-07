// Every event as data, plus the RSVP strings shared by all of them (E1, I-048; ARCHITECTURE §B10).
// CONTRACT FILE: shape and exports are fixed by §B10; the strings are the copy deck's → Events, verbatim
// (Brian's capitals included). A new event is a new entry here, its images under src/assets/events/<slug>/
// and its copy in the deck: no new page, component or script.
// No imports: tests and scripts load this under Node type stripping (no enum, namespace or parameter properties).

export type Iso = string; // '2026-11-22T14:00:00-07:00': local wall time plus the UTC offset in force in timeZone on that date
export interface TimelineItem { start: Iso; end?: Iso; title: string; notes?: string[]; optional?: boolean }
export interface InfoBlock { id: string; title: string; text?: string; items?: string[]; inReminder?: boolean }
export interface Notice { id: string; title: string; text: string; link?: { label: string; url: string }; inEmails?: boolean }
// label 'Yoga'; item = index into timeline (its time goes in the question); limit and waitlist per I-050
export interface CappedSession { key: string; label: string; item: number; limit: number; waitlist: boolean }
export interface EventRsvp { closesAt: Iso; maxGuests: number; reminderAt: Iso; showGoing: boolean; session?: CappedSession }
export interface SiteEvent {
  slug: string;
  title: string;
  summary: string; // second sentence of the meta description
  start: Iso;
  end: Iso;
  timeZone: string; // 'America/Denver'
  venue: { name: string; address: string }; // a public venue only, never the office
  host?: { name: string; photo?: string; alt: string }; // no intro text (I-048); photo is a path under src/assets/events/
  timeline: TimelineItem[];
  info: InfoBlock[];
  notices: Notice[];
  graphics: { wide: string; narrow: string; og: string; ogAlt: string }; // paths under src/assets/events/
  index: boolean; // false: noindex and out of the sitemap
  rsvp?: EventRsvp; // absent: no form, no feed
}

// The launch party. `limit` is the one place the yoga cap is typed; the timeline note is built from it.
export const SESSION_LIMIT = 20;

export function launchParty(limit: number): SiteEvent {
  return {
    slug: 'launch-party',
    title: 'Ohm Launch Party: A Celebration of Self-Care',
    summary: 'Restorative yoga, the Self Care Launch Party and an optional climb at the gym.',
    start: '2026-11-22T14:00:00-07:00', // MST: DST ended Nov 1, 2026
    end: '2026-11-22T18:00:00-07:00',
    timeZone: 'America/Denver',
    venue: { name: 'CityROCK', address: '21 N Nevada Ave, Colorado Springs, CO 80903' },
    host: { name: 'Marea', photo: 'launch-party/marea-host.jpg', alt: 'Marea, the host.' },
    timeline: [
      { start: '2026-11-22T13:45:00-07:00', title: 'Arrive for yoga, get settled in' },
      {
        start: '2026-11-22T14:00:00-07:00',
        end: '2026-11-22T15:00:00-07:00',
        title: 'Restorative yoga',
        notes: ['No supplies or experience needed', 'Water bottle and stretchy clothes recommended', `Limited to first ${limit} sign-ups`],
      },
      {
        start: '2026-11-22T15:00:00-07:00',
        end: '2026-11-22T18:00:00-07:00',
        title: 'Self Care Launch Party',
        notes: ['Open house style, come and go as you please', 'Refreshments provided'],
      },
      {
        start: '2026-11-22T18:00:00-07:00',
        end: '2026-11-22T20:00:00-07:00',
        title: 'Optional: climb at the gym until close',
        notes: ['Own day pass required', 'Harness and shoes provided'],
        optional: true,
      },
    ],
    info: [
      {
        id: 'wear',
        title: 'What to wear',
        items: ['Comfy cozy: yoga clothes or sweat pants', 'Fuzzy socks encouraged', 'Shoes off in the yoga room', 'Mats provided, own mats welcome'],
        inReminder: true,
      },
      {
        id: 'parking',
        title: 'Parking',
        text: "Metered street parking, or free parking along Wahsatch if you don't mind walking 2 blocks.",
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
      },
    ],
    graphics: {
      wide: 'launch-party/header-green.png',
      narrow: 'launch-party/launch-mark-on-dark.png',
      og: 'launch-party/header-green.png',
      ogAlt: 'Ohm Precision Bodywork Launch Party',
    },
    index: false, // I-063 (Brian, Nov 6): hidden for now, shared by URL only; a Home link may come later
    rsvp: {
      closesAt: '2026-11-22T14:00:00-07:00',
      maxGuests: 10, // I-060 (Brian, Nov 6): no limit on +1s; 10 is only a ceiling against bots
      reminderAt: '2026-11-21T10:00:00-07:00', // I-061 (Brian, Nov 6): Sat Nov 21, 10:00 am
      showGoing: false,
      session: { key: 'yoga', label: 'Yoga', item: 1, limit, waitlist: true },
    },
  };
}

export const events: SiteEvent[] = [launchParty(SESSION_LIMIT)];

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
  privacy: 'I only use your name and email for Ohm. News and offers only if you check the box.',
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
} as const;

export type RsvpTextKey = keyof typeof rsvpText;
