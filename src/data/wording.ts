// Licensure-dependent phrasing (brief §7).
// CONTRACT FILE. Each entry is [unlicensed, licensed]. Pages call w(key) and
// never write the licensed-only terms themselves. Add keys here (Opus) when
// copy needs a new variant.

import { site } from './site.ts';

export const wording = {
  /** Brian's role noun. */
  role: ['practitioner', 'Licensed Massage Therapist'],
  roleShort: ['practitioner', 'LMT'],
  /** The work, as a noun phrase. */
  practice: ['bodywork', 'massage therapy'],
  deepTissue: ['deep tissue work', 'deep tissue massage'],
  /** Home "What a session does" only. Both variants equal: Home is unchanged by licensure (Brian, Oct 29 2026). */
  deepTissueHome: ['deep tissue work', 'deep tissue work'],
  program: [
    'advanced neuromuscular program',
    'Advanced Neuromuscular Massage Therapy program',
  ],
  /** About: training sentence. The school's name contains a licensed-only term. */
  training: [
    'In September 2026 I completed a 650-hour advanced neuromuscular program.',
    'In September 2026 I graduated from the 650-hour Advanced Neuromuscular Massage Therapy program at the Colorado Institute of Massage Therapy.',
  ],
  /** Services intro, first sentence (8A). Unlicensed copy avoids the bare word "massage" (§A6). */
  notSpa: [
    "This isn't a generic spa session, and it isn't no-pain, no-gain deep tissue torture.",
    "This isn't a generic spa massage, and it isn't no-pain, no-gain deep tissue torture.",
  ],
  /**
   * Home hero headline. Both variants are the tagline: Home is unchanged by licensure
   * (Brian, Oct 29 2026, "leave the home page alone"; replaces HomeMock's "Massage for action").
   */
  heroLine: [site.tagline, site.tagline],
  /**
   * Credential block (I-035): About under the H1, /book under the intro, and the footer.
   * Licensed-only: the unlicensed variants are empty and Credentials.astro renders nothing
   * while unlicensed. Never add the license number here (I-035, I-027).
   */
  credential: ['', 'Brian Clarke, LMT, CNMT'],
  licensedIn: ['', 'Licensed in Colorado.'],
  /** Link text; the link goes to site.licenseVerifyUrl. */
  verifyLicense: ['', 'Verify my license'],
} as const satisfies Record<string, readonly [string, string]>;

export type WordingKey = keyof typeof wording;

export function w(key: WordingKey): string {
  return wording[key][site.licensed ? 1 : 0];
}
