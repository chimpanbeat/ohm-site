// Single source of truth for business facts (brief §4).
// CONTRACT FILE: shape and exports are fixed by docs/build/ARCHITECTURE.md.
// Values change only on Brian's instruction. No page may hardcode a rate, day,
// link, or zone label; read it from here.

// Zone keys since step 13 (I-040, Brian, Oct 29 2026).
export type ZoneKey = 'central' | 'midnorth' | 'north' | 'out';
export type LinkKey = 'office' | 'central' | 'midnorth' | 'north';

export interface Rate {
  label: string;
  minutes: number;
  price: number;
}

export interface Zone {
  key: ZoneKey;
  /** Client-facing name, e.g. "Central". Must equal the KML polygon name exactly (npm run zones). */
  name: string;
  /** Days Brian is in this area, as display text. */
  days: string;
  /** PocketSuite link for this zone; null = contact only (out of region). */
  linkKey: LinkKey | null;
  /** Rough boundary description for copy/alt text. The polygons decide, not this. */
  area: string;
}

// Google My Maps "Ohm Service Map". Brian cleaned the map in place (Oct 5 2026), so the ID is unchanged.
// Since 7A the site draws its own SVG map; My Maps is only the "Open the map in Google Maps" link.
const map = {
  mid: '1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc',
  center: '38.89985450733466,-104.8154571',
  // 11 shows all three zones; 12 cut off the north (Brian, Oct 6 2026).
  zoom: 11,
};

/** URLSearchParams encodes the ll comma as %2C, matching the URL Google gives. */
const mapQuery = (params: Record<string, string>) => new URLSearchParams(params).toString();

export const site = {
  name: 'Ohm Precision Bodywork',
  legalName: 'Ohm Precision Bodywork LLC',
  tagline: 'Reduce resistance. Restore movement.',

  licensed: true, // flips wording rules (brief §7). Licensed since Oct 12, 2026 (I-035).
  // Never published: not in the footer, page source or JSON-LD (Brian, Oct 29 2026, I-035). Keep empty;
  // nothing outside this file may read it, and check:wording fails if it is set.
  licenseNumber: '',
  /**
   * "Licensed in Colorado." links here: DORA's license lookup, where anyone can verify the license
   * by name (Brian, Oct 29 2026; exact URL as given, lowercase path).
   */
  licenseVerifyUrl: 'https://apps2.colorado.gov/dora/licensing/lookup/licenselookup.aspx',

  // No phone number on the site (Brian, Oct 6 2026). Contact is PocketSuite lead form, chat, or email.
  email: 'brian@ohmprecisionbodywork.com', // secrets-scan: allow
  city: 'Colorado Springs',
  region: 'CO',

  // The exact address is sent after booking (OfficeCard says so). Brian, Oct 6 2026.
  officeArea: 'Southwest Colorado Springs, in the Cheyenne Canyon / Broadmoor area',
  office: {
    days: 'Tuesdays, Wednesday evenings, Fridays, and Saturdays',
    linkKey: 'office' as LinkKey,
    /**
     * Where the Ω office mark sits on the maps: deliberately vague, NOT the address. Two decimals
     * (~1 km) on purpose; tests enforce it. Between North Cheyenne Cañon and the Broadmoor (8A).
     * TODO(Brian): confirm the mark sits in the right neighbourhood.
     */
    mapArea: { lat: 38.8, lng: -104.85 }, // 10A: moved ~1 km NE to the office's neighbourhood (Brian)
  },

  rates: {
    s60: { label: '60-minute session', minutes: 60, price: 90 },
    s90: { label: '90-minute session', minutes: 90, price: 120 },
  } satisfies Record<string, Rate>,

  travelFee: {
    amount: 25,
    // Matches the Client Policies group rule (terms.groupMax = 4); the policies win (Brian, Oct 29 2026, I-044).
    note: 'Flat, per visit. One travel fee covers up to four back-to-back sessions at the same address, as my schedule allows, such as a household or a small group taking turns.',
  },
  // Stays null: the site shows no amount or range for out-of-region travel (Brian, Oct 29 2026, I-023).
  outOfRegionFee: null as number | null,
  /**
   * Out-of-region card. No amount or range: some quotes run above the old range, so travel
   * outside the service area is quoted before booking (Brian, Oct 29 2026, I-023).
   */
  outOfRegionFeeNote: "I'll quote travel outside my service area before you book.",

  /** PocketSuite contact pages (Brian, Oct 6 2026). Real URLs, not booking links. */
  contact: {
    lead: 'https://pocketsuite.io/lead/ohm-precision-bodywork',
    chat: 'https://pocketsuite.io/chat/ohm-precision-bodywork',
  },

  /**
   * PocketSuite booking links: the items page filtered by a keyword tag, one per link key
   * (Brian, Oct 29 2026, I-040). Never guess PS URLs; only Brian changes these.
   */
  links: {
    office: 'https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=office',
    central: 'https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=central',
    midnorth: 'https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=midnorth',
    north: 'https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=north',
  } satisfies Record<LinkKey, string>,

  zones: {
    // Names drop "Springs" (Brian, Oct 29 2026, I-040); area and days text unchanged, except out.area 'outside North Springs' becomes 'outside North' (not rendered).
    central: {
      key: 'central',
      name: 'Central',
      days: 'Tuesdays and Fridays',
      linkKey: 'central',
      area: 'Inside Academy Blvd to the east and south, west to Manitou Springs, north to Garden of the Gods Rd / Austin Bluffs Pkwy. Includes Broadmoor Bluffs.',
    },
    midnorth: {
      key: 'midnorth',
      name: 'Mid-north',
      days: 'Tuesdays, Wednesdays, and Fridays',
      linkKey: 'midnorth',
      area: 'From Garden of the Gods Rd / Austin Bluffs Pkwy north to Woodmen Rd, west of Academy Blvd.',
    },
    north: {
      key: 'north',
      name: 'North',
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
      area: 'East of Academy Blvd outside North, Monument, Black Forest, Falcon, Fountain, Security-Widefield.',
    },
  } satisfies Record<ZoneKey, Zone>,

  /** If a point is in more than one polygon, the first listed wins. None = 'out'. */
  zonePrecedence: ['midnorth', 'central', 'north'] as const,

  serviceAreaSummary: 'Colorado Springs and Manitou Springs; other areas by request',
  areaServed: ['Colorado Springs', 'Manitou Springs'],

  // Built from `map` above.
  map,
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

/** The PocketSuite booking URL for a link key (step 13: no placeholder fallback). */
export function bookingUrl(key: LinkKey): string {
  return site.links[key];
}

export const mailHref = `mailto:${site.email}`;

export const zoneOrder: ZoneKey[] = ['central', 'midnorth', 'north', 'out'];
