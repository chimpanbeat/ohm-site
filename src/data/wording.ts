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
  program: [
    'advanced neuromuscular program',
    'Advanced Neuromuscular Massage Therapy program',
  ],
  /** Home hero headline (HomeMock uses the licensed line). */
  heroLine: [site.tagline, 'Massage for action'],
} as const satisfies Record<string, readonly [string, string]>;

export type WordingKey = keyof typeof wording;

export function w(key: WordingKey): string {
  return wording[key][site.licensed ? 1 : 0];
}
