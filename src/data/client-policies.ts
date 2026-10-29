// Client Policies v1.4 (Oct 29, 2026), the single source for /client-policies and its PDF (step 14, I-037).
// CONTRACT FILE: shape and exports are fixed by docs/build/ARCHITECTURE.md §B2. The text is in the copy deck.
// Figures come from site.ts; package prices and the policy terms below are policy, not site facts.
// Imported by Node (scripts, tests) under type stripping: no enum, namespace or parameter properties.
import { site, mailHref, type Rate } from './site.ts';

export type Run = string | { text: string; href: string };
export type Rich = string | Run[];
export type Block =
  | { type: 'paragraph'; text: Rich }
  | { type: 'bullets'; items: { lead?: string; text: Rich }[] }
  | { type: 'table'; caption: string; head: string[]; rows: string[][] }
  | { type: 'notice'; columns: [{ head: string; text: string }, { head: string; text: string }] };
export interface PolicySection {
  id: string;
  title: string;
  blocks: Block[];
}
export interface ClientPolicies {
  version: string;
  date: string;
  displayDate: string;
  intro: string;
  sections: PolicySection[];
}

export const terms = {
  surchargePercent: 3,
  noticeHours: 24,
  lateCancelPercent: 50,
  checkInMinutes: 15,
  graceMinutes: 15,
  groupMax: 4,
  reportDays: 7,
} as const;

export const packages = {
  sessions: 5,
  expiryMonths: 12,
  prices: { s60: { office: 375, mobile: 475 }, s90: { office: 500, mobile: 600 } },
} as const;

export function lateCancelFee(rate: Rate): number {
  return (rate.price * terms.lateCancelPercent) / 100;
}

export function packageSavings(key: 's60' | 's90', place: 'office' | 'mobile'): number {
  const each = site.rates[key].price + (place === 'mobile' ? site.travelFee.amount : 0);
  return packages.sessions * each - packages.prices[key][place];
}

// The statutory notice, verbatim (C.R.S. 5-2-212), shown beside Ohm's own line.
export const coloradoNotice =
  'To cover the cost of processing a credit or charge card transaction, and pursuant to section 5-2-212, Colorado Revised Statutes, a seller or lessor may impose a processing surcharge in an amount not to exceed the merchant discount fee that the seller or lessor incurs in processing the sales or lease transaction. A seller or lessor shall not impose a processing surcharge on payments made by use of cash, a check, or a debit card or redemption of a gift card.';

export const surchargeLine = `${site.name} adds a ${terms.surchargePercent}% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.`;

// Payment methods (step 15 prep, I-041): the two Booking and payment bullets, shared with PaymentNotice.
// No Zelle address or handle, no bank transfer: clients ask for Zelle details.
export const acceptedPayments = 'I accept cash, Zelle, and credit or debit cards through PocketSuite (Tap to Pay in person, or the booking link).';
export const zelleDetails = "Ask me for Zelle details. I don't accept Venmo, PayPal or other payment apps.";
export const paymentMethodsLine = `${acceptedPayments} ${zelleDetails}`;

export const policiesPdfPath = '/ohm-client-policies.pdf';

const host = new URL(site.deploy.customDomain).host;
const { s60, s90 } = site.rates;
const travel = site.travelFee.amount;
const late60 = lateCancelFee(s60);
const late90 = lateCancelFee(s90);
const total = (r: Rate) => r.minutes + terms.checkInMinutes;
const money = (n: number) => `$${n}`;

const sessionRow = (r: Rate) => [`${r.minutes} minutes`, money(r.price), `${money(r.price)} + ${money(travel)} travel`];
const packageRow = (key: 's60' | 's90') => [
  `${packages.sessions} × ${site.rates[key].minutes} minutes`,
  ...(['office', 'mobile'] as const).map((p) => `${money(packages.prices[key][p])} (save ${money(packageSavings(key, p))})`),
];

export const clientPolicies: ClientPolicies = {
  version: '1.4',
  date: '2026-10-29',
  displayDate: 'Oct 29, 2026',
  intro:
    'These policies keep scheduling fair for every client and let me give my full attention to your session. Booking an appointment means you agree to them. If anything is unclear, ask me before your appointment.',
  sections: [
    {
      id: 'booking',
      title: 'Booking and payment',
      blocks: [
        {
          type: 'bullets',
          items: [
            {
              text: `Book online at ${host}, or text or call me to request a time. A text or call is a request, not a booking: your appointment is booked once I send you a booking confirmation.`,
            },
            {
              text: 'A card on file is required to book, added through the booking link. It holds your appointment and covers any fees below. I charge it after your session, not before, except for packages, which are paid when you buy them (see Packages).',
            },
            { text: acceptedPayments },
            { text: zelleDetails },
            { text: `Credit card payments carry a ${terms.surchargePercent}% processing surcharge. There is no surcharge on cash, Zelle or debit cards.` },
            {
              text: `Your appointment time is when we begin: when I arrive at your door for a mobile visit, or when you arrive at my office. The first ${terms.checkInMinutes} minutes are for setup and check-in, so a ${s60.minutes}-minute session takes about ${total(s60)} minutes start to finish, and a ${s90.minutes}-minute session about ${total(s90)}.`,
            },
          ],
        },
        {
          type: 'notice',
          columns: [
            { head: 'Colorado notice', text: coloradoNotice },
            { head: site.name, text: `${surchargeLine} The surcharge appears as its own line on your receipt.` },
          ],
        },
        { type: 'table', caption: 'Session prices', head: ['Session', 'Office', 'Mobile (I come to you)'], rows: [sessionRow(s60), sessionRow(s90)] },
      ],
    },
    {
      id: 'cancelling',
      title: 'Cancelling and rescheduling',
      blocks: [
        {
          type: 'bullets',
          items: [
            { text: `Cancel or reschedule at least ${terms.noticeHours} hours before your appointment time and there's no charge.` },
            {
              text: `Inside ${terms.noticeHours} hours, the late-cancel fee is ${terms.lateCancelPercent}% of the session price: ${money(late60)} for a ${s60.minutes}-minute session, ${money(late90)} for a ${s90.minutes}-minute session. No travel fee is added, since I haven't driven to you.`,
            },
            { text: `Moving an appointment to a new time inside the ${terms.noticeHours} hours counts as a late cancel.` },
            {
              text: 'The quickest way to cancel or reschedule is the link in your booking confirmation. Your cancellation counts from when you send it, not when I answer.',
            },
          ],
        },
      ],
    },
    {
      id: 'late-arrival',
      title: 'Late arrival and no-shows',
      blocks: [
        {
          type: 'bullets',
          items: [
            { text: "If you're running late, text me. Your session still ends at its scheduled time and is charged in full, so the next client starts on time." },
            {
              lead: 'Mobile visits:',
              text: `if you don't answer the door or your phone when I arrive, I'll call or text and wait ${terms.graceMinutes} minutes. After that, I'll leave and it counts as a no-show.`,
            },
            {
              lead: 'Office visits:',
              text: `if you're more than ${terms.graceMinutes} minutes late and I haven't heard from you, it counts as a no-show.`,
            },
            { text: 'A no-show is charged 100% of the session price, plus the travel fee for a mobile visit.' },
          ],
        },
      ],
    },
    {
      id: 'illness',
      title: 'Illness and skin conditions',
      blocks: [
        {
          type: 'paragraph',
          text: "Please don't come to a session sick. If you have a fever, cough, cold or flu symptoms, or a stomach bug, or a rash, open wound or possible skin infection (such as athlete's foot or ringworm) where I'd be working, reschedule with me.",
        },
        {
          type: 'bullets',
          items: [
            { text: "There's no session fee for an illness reschedule, however close to the appointment it is." },
            { text: "If I've already left for a mobile visit, only the travel fee applies." },
            { text: "If a skin issue is small and in an area we can safely skip, we may still go ahead. Tell me before we start and we'll decide together." },
            { text: "Not sure? Text me. I'd rather hear early." },
            { text: "If I'm sick, I'll reschedule you, and you won't be charged anything." },
          ],
        },
      ],
    },
    {
      id: 'mobile-visits',
      title: 'Mobile visits and travel',
      blocks: [
        {
          type: 'bullets',
          items: [
            { text: `The travel fee is ${money(travel)} per visit inside my service area (see the map at ${host}).` },
            {
              text: `One travel fee covers up to ${terms.groupMax} back-to-back sessions at the same address, as my schedule allows, such as a household or a small group taking turns.`,
            },
            {
              text: `Outside my service area, mobile visits are by request. Travel is quoted before I confirm the appointment, based on drive time and distance. It replaces the ${money(travel)} fee, and one quote covers a back-to-back group the same way.`,
            },
            { text: 'Space, pets and access for mobile visits are covered in the Mobile visits section of the Client Service Agreement you sign.' },
          ],
        },
      ],
    },
    {
      id: 'packages',
      title: 'Packages',
      blocks: [
        {
          type: 'table',
          caption: 'Package prices',
          head: [`${packages.sessions}-session package`, 'Office', 'Mobile (travel included)'],
          rows: [packageRow('s60'), packageRow('s90')],
        },
        {
          type: 'bullets',
          items: [
            { text: 'A package is paid in full when you buy it. Its sessions are not charged again.' },
            { text: "Packages are for your own sessions. They can't be shared or transferred." },
            {
              text: `Use an office package for office visits and a mobile package for mobile visits. A mobile package includes travel inside my service area; outside it, any quoted travel above ${money(travel)} is charged to your card after each visit it applies to.`,
            },
            { text: `Use your sessions within ${packages.expiryMonths} months of purchase; unused sessions expire after that.` },
            { text: 'A package keeps the price you paid, even if my rates go up.' },
            {
              text: `A late cancel on a package session charges the late-cancel fee (${money(late60)} or ${money(late90)}) to your card, and the session stays in your package. A no-show uses one session.`,
            },
            {
              text: "Packages aren't refunded if you change your mind. If I can't provide your remaining sessions (for example, if I stop practicing or move away), or a change in your health makes massage unsafe for you, I'll refund the unused sessions at the per-session price you paid.",
            },
          ],
        },
      ],
    },
    {
      id: 'not-right',
      title: "If a session wasn't right",
      blocks: [
        {
          type: 'paragraph',
          text: `If something about a session wasn't right, tell me within ${terms.reportDays} days. I'll make it right with a follow-up session or a partial or full refund, my choice. I can't guarantee results; bodies don't work that way. Billing mistakes are always corrected and refunded once you make me aware of them.`,
        },
      ],
    },
    {
      id: 'tips',
      title: 'Tips',
      blocks: [{ type: 'paragraph', text: "Tips aren't expected. If you'd like to leave one, it's gladly accepted, and there's an optional tip at checkout." }],
    },
    {
      id: 'communication',
      title: 'Communication',
      blocks: [
        {
          type: 'bullets',
          items: [
            {
              text: [
                'The fastest way to reach me is the ',
                { text: 'contact form', href: site.contact.lead },
                ' or ',
                { text: 'chat', href: site.contact.chat },
                ` at ${host}. Email works too: `,
                { text: site.email, href: mailHref },
                ". I usually reply within two business days, and I don't answer during sessions.",
              ],
            },
            {
              text: 'Use text and email for scheduling and quick questions. Please don\'t send detailed health information that way; your intake form and our check-in are the place for it.',
            },
            { text: 'For new or worsening symptoms, contact your doctor. In an emergency, call 911.' },
          ],
        },
      ],
    },
    {
      id: 'conduct',
      title: 'Conduct and safety',
      blocks: [
        {
          type: 'bullets',
          items: [
            {
              text: "Every session is clinical and nonsexual. Any sexual behavior, comment or request, or harassment of any kind, ends the session immediately. You'll be charged the full session price, plus travel for a mobile visit, and you won't be able to book again.",
            },
            {
              text: "I won't start or continue a session if you appear impaired by alcohol or drugs, or if the setting feels unsafe to me. That's charged as a no-show, and rebooking is at my discretion.",
            },
            { text: "You're in charge of your session. Tell me to change the pressure, skip an area, or stop at any time." },
          ],
        },
      ],
    },
  ],
};
