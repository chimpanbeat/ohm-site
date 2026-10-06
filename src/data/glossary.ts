// Plain-language definitions for technical terms in the copy (Services, About).
// Opus-owned copy: Sonnet renders these but doesn't edit them. Each definition
// describes what happens and makes no outcome claim (brief §7, §8).

export const glossary = {
  ischemicCompression: {
    term: 'Ischemic compression',
    def: 'Steady pressure held on one tender spot, usually for 30 to 90 seconds, then released.',
  },
  pnf: {
    term: 'PNF stretching',
    def: 'Short for proprioceptive neuromuscular facilitation. You push gently against my hand for a few seconds, relax, then ease a little further into the stretch.',
  },
  referredPain: {
    term: 'Referred pain',
    def: 'Pain felt away from where it starts. Tight muscles in the upper shoulders, for example, can be felt as a headache.',
  },
} as const satisfies Record<string, { term: string; def: string }>;

export type GlossaryKey = keyof typeof glossary;
