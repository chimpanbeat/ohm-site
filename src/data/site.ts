// Single source of truth for business facts (brief §4).
// CONTRACT FILE: shape and exports are fixed by docs/build/ARCHITECTURE.md.
// Values change only on Brian's instruction. No page may hardcode a rate, day,
// link, or zone label; read it from here.

export type ZoneKey = 'home' | 'shared' | 'north' | 'out';
export type LinkKey = 'office' | 'home' | 'shared' | 'north' | 'general';

export interface Rate {
  label: string;
  minutes: number;
  price: number;
}

export interface Zone {
  key: ZoneKey;
  /** Client-facing name, e.g. "Central & Southwest Springs". */
  name: string;
  /** Days Brian is in this area, as display text. */
  days: string;
  /** PocketSuite link for this zone; null = contact only (out of region). */
  linkKey: LinkKey | null;
  /** Rough boundary description for copy/alt text. The polygons decide, not this. */
  area: string;
}

export const site = {
  name: 'Ohm Precision Bodywork',
  legalName: 'Ohm Precision Bodywork LLC',
  tagline: 'Reduce resistance. Restore movement.',

  licensed: false, // flips wording rules (brief §7). Default false.
  licenseNumber: '', // shown in footer only when licensed && non-empty

  phone: '719-900-3339',
  email: 'brian@ohmprecisionbodywork.com',
  city: 'Colorado Springs',
  region: 'CO',

  officeArea: 'Southwest Colorado Springs (address sent after booking)',
  office: {
    days: 'Tue, Fri, and Sat, plus some Wed evenings',
    linkKey: 'office' as LinkKey,
  },

  rates: {
    initial: { label: 'Initial assessment + session', minutes: 75, price: 110 },
    s60: { label: '60-minute session', minutes: 60, price: 90 },
    s90: { label: '90-minute session', minutes: 90, price: 120 },
  } satisfies Record<string, Rate>,

  travelFee: {
    amount: 25,
    note: 'Flat, per mobile session. Waived for back-to-back sessions at the same location.',
  },
  outOfRegionFee: null as number | null, // TBD. Do not display an amount while null.

  // PLACEHOLDERS. Brian replaces these with tested PS links. Never guess PS URLs.
  links: {
    office: 'TODO_PS_OFFICE',
    home: 'TODO_PS_HOME_REGION',
    shared: 'TODO_PS_SHARED_KEYWORD',
    north: 'TODO_PS_NORTH',
    general: 'https://pocketsuite.io/book/ohm-precision-bodywork',
  } satisfies Record<LinkKey, string>,

  zones: {
    home: {
      key: 'home',
      name: 'Central & Southwest Springs',
      days: 'Tuesdays and Fridays (some Wednesday evenings)',
      linkKey: 'home',
      area: 'Inside Academy Blvd to the east and south, west to Manitou Springs, north to Garden of the Gods Rd / Austin Bluffs Pkwy. Includes Broadmoor Bluffs.',
    },
    shared: {
      key: 'shared',
      name: 'Mid-north Springs',
      days: 'Tuesdays, Wednesdays, and Fridays',
      linkKey: 'shared',
      area: 'From Garden of the Gods Rd / Austin Bluffs Pkwy north to Woodmen Rd, west of Academy Blvd.',
    },
    north: {
      key: 'north',
      name: 'North Springs',
      days: 'Wednesdays',
      linkKey: 'north',
      // Describes the KML polygon, which is authoritative (Brian, Oct 5 2026). Monument is out for now.
      area: 'North of Woodmen Rd up to Baptist Rd, east of Hwy 83, including Briargate, Wolf Ranch, and Cordera. Also east of Academy Blvd between Austin Bluffs Pkwy / Templeton Gap Rd and Woodmen Rd, west of Powers Blvd.',
    },
    out: {
      key: 'out',
      name: 'Outside my regular area',
      days: 'By request',
      linkKey: null,
      area: 'East of Academy Blvd outside North Springs, Monument, Black Forest, Falcon, Fountain, Security-Widefield.',
    },
  } satisfies Record<ZoneKey, Zone>,

  /** If a point is in more than one polygon, the first listed wins. None = 'out'. */
  zonePrecedence: ['shared', 'home', 'north'] as const,

  serviceAreaSummary: 'Colorado Springs and Manitou Springs; other areas by request',
  areaServed: ['Colorado Springs', 'Manitou Springs'],

  // Google My Maps "Ohm Service Map". The /embed form allows iframing; the
  // /viewer form sends X-Frame-Options: SAMEORIGIN, so it's used only as a link.
  // Empty mapEmbedUrl = map embed hidden.
  mapEmbedUrl:
    'https://www.google.com/maps/d/embed?mid=1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc&ll=38.89985450733466%2C-104.8154571&z=12',
  mapViewerUrl:
    'https://www.google.com/maps/d/viewer?mid=1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc&ll=38.89985450733466%2C-104.8154571&z=12',

  deploy: {
    site: 'https://chimpanbeat.github.io',
    base: '/ohm-site',
    // Cutover (brief §10): set site to customDomain, base to '/', live to true.
    customDomain: 'https://ohmprecisionbodywork.com',
    live: false,
  },
} as const;

/** Search engines may index only once licensed and on the production domain (brief §14). */
export const indexable: boolean = site.licensed && site.deploy.live;

export const isPlaceholder = (url: string): boolean => url.startsWith('TODO_');

/**
 * The booking URL for a link key. Placeholder links fall back to the general
 * PS page so the preview never shows a dead button.
 */
export function bookingUrl(key: LinkKey): { href: string; placeholder: boolean } {
  const url = site.links[key];
  return isPlaceholder(url)
    ? { href: site.links.general, placeholder: true }
    : { href: url, placeholder: false };
}

export const telHref = `tel:+1${site.phone.replace(/\D/g, '')}`;
export const smsHref = `sms:+1${site.phone.replace(/\D/g, '')}`;
export const mailHref = `mailto:${site.email}`;

export const zoneOrder: ZoneKey[] = ['home', 'shared', 'north', 'out'];
