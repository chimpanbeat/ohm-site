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

// Google My Maps "Ohm Service Map". Brian cleaned the map in place (Oct 5 2026), so the ID is unchanged.
// The /embed form allows iframing; the /viewer form sends X-Frame-Options: SAMEORIGIN, so it's only a link.
const map = {
  mid: '1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc',
  center: '38.89985450733466,-104.8154571',
  zoom: 12,
  // Title bar color (ehbc: 6-digit hex, no '#') = --green-700. My Maps sets the title in white: about 9:1 on green, 3.4:1 on terracotta (fails AA).
  headerColor: '125245',
};

/** URLSearchParams encodes the ll comma as %2C, matching the URL Google gives. */
const mapQuery = (params: Record<string, string>) => new URLSearchParams(params).toString();

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
    note: 'Flat, per mobile session. No travel fee for a second session booked right after the first at the same address.',
  },
  outOfRegionFee: null as number | null, // TBD. Do not display an amount while null.
  /** Out-of-region card. Contains no amount; revisit the wording when outOfRegionFee is set. */
  outOfRegionFeeNote: "An out-of-region fee applies; I'll quote it when you get in touch.",

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
      // The KML polygon is authoritative (Brian, Oct 5 2026). Monument is out of the service area (decided Oct 5 2026).
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

  // Built from `map` above. Empty mapEmbedUrl = map embed hidden.
  map,
  mapEmbedUrl:
    'https://www.google.com/maps/d/embed?' +
    mapQuery({ mid: map.mid, noprof: '1', ll: map.center, z: String(map.zoom), ehbc: map.headerColor }),
  mapViewerUrl:
    'https://www.google.com/maps/d/viewer?' + mapQuery({ mid: map.mid, ll: map.center, z: String(map.zoom) }),

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
