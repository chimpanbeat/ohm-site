/**
 * Body map (I-073, I-074, I-108; ARCHITECTURE §B12, BRIEF §15). CONTRACT FILE: only the architect or a step
 * that lists it changes it. No imports (Node type stripping; client script 8 bundles this file).
 * Every string is from docs/build/copy-deck.md → Body map (Brian approved the copy as drafted, Nov 8, 2026).
 * Geometry lives in src/data/bodymap-zones/<sex>_<view>.json; this file holds no client data, ever.
 */

export type Sex = 'female' | 'male';
export type View = 'front' | 'back';
export type PinTypeKey = 'pain' | 'discomfort' | 'injury' | 'numb' | 'avoid';
export type PinShape = 'circle' | 'diamond' | 'triangle' | 'star4' | 'ring-slash';
export interface PinType { key: PinTypeKey; shape: PinShape; token: string; starrable: boolean }
export interface Region { key: string; name: string }

const pinTypes: PinType[] = [
  { key: 'pain', shape: 'circle', token: 'pin-pain', starrable: true },
  { key: 'discomfort', shape: 'diamond', token: 'pin-discomfort', starrable: true },
  { key: 'injury', shape: 'triangle', token: 'pin-injury', starrable: true },
  { key: 'numb', shape: 'star4', token: 'pin-numb', starrable: true },
  // Avoid marks can't be starred (Brian, Nov 8, 2026): a star means "work here first".
  { key: 'avoid', shape: 'ring-slash', token: 'pin-avoid', starrable: false },
];

/** Pairs in head-to-toe order, left (the client's own left) first. */
const pair = (key: string, name: string): Region[] => [
  { key: `left-${key}`, name: `Left ${name}` },
  { key: `right-${key}`, name: `Right ${name}` },
];

const front: Region[] = [
  { key: 'head-face', name: 'Head and face' },
  { key: 'neck-front', name: 'Front of neck' },
  ...pair('shoulder', 'shoulder'),
  ...pair('chest', 'chest'),
  ...pair('upper-arm', 'upper arm'),
  ...pair('elbow', 'elbow'),
  ...pair('forearm', 'forearm'),
  ...pair('wrist-hand', 'wrist and hand'),
  ...pair('ribs-side', 'side of ribs'),
  { key: 'belly-upper', name: 'Upper belly' },
  { key: 'belly-lower', name: 'Lower belly' },
  ...pair('hip-front', 'front of hip'),
  ...pair('thigh-front', 'front of thigh'),
  ...pair('knee', 'knee'),
  ...pair('shin', 'shin'),
  ...pair('ankle-foot', 'ankle and foot'),
];

const back: Region[] = [
  { key: 'head-back', name: 'Back of head' },
  { key: 'neck-back', name: 'Back of neck' },
  ...pair('shoulder-top', 'top of shoulder'),
  ...pair('shoulder-blade', 'shoulder blade'),
  ...pair('mid-back', 'mid back'),
  ...pair('low-back', 'low back'),
  { key: 'spine-base', name: 'Base of spine' },
  ...pair('glute', 'glute'),
  ...pair('upper-arm-back', 'back of upper arm'),
  ...pair('elbow-back', 'back of elbow'),
  ...pair('forearm-back', 'back of forearm'),
  ...pair('hand-back', 'back of hand'),
  ...pair('hamstring', 'hamstring'),
  ...pair('knee-back', 'back of knee'),
  ...pair('calf', 'calf'),
  ...pair('ankle-heel', 'ankle and heel'),
];

export type Side = 'left' | 'right' | 'midline';
/** A fine zone (PDF and JSON only, never on the page). `region` is the coarse region it sits in. */
export interface Zone { key: string; name: string; region: string }
/** What the lookup says about a point or a pin: five nulls outside every zone. */
export interface Located {
  zone: string | null;
  zoneName: string | null;
  region: string | null;
  regionName: string | null;
  side: Side | null;
}

/**
 * Fine zones (B5, I-157; the list Brian approved Nov 13, 2026, docs/build/steps/B5-zone-list-draft.md).
 * `zonePair` makes the left and right twins of a paired region; `zoneSplit` makes the twins of a midline region.
 * A region with no fine zones is its own zone (the lookup's leaf), so it is not listed here.
 */
const zonePair = (key: string, name: string, region: string): Zone[] => [
  { key: `left-${key}`, name: `Left ${name}`, region: `left-${region}` },
  { key: `right-${key}`, name: `Right ${name}`, region: `right-${region}` },
];
const zoneSplit = (key: string, name: string, region: string): Zone[] => [
  { key: `left-${key}`, name: `Left ${name}`, region },
  { key: `right-${key}`, name: `Right ${name}`, region },
];

const zonesFront: Zone[] = [
  { key: 'forehead', name: 'Forehead and temples', region: 'head-face' },
  ...zoneSplit('jaw', 'cheek and jaw', 'head-face'),
  ...zoneSplit('neck-front', 'side of the front of the neck', 'neck-front'),
  ...zonePair('collarbone', 'collarbone', 'shoulder'),
  ...zonePair('shoulder-front', 'front of shoulder', 'shoulder'),
  ...zonePair('chest-inner', 'chest, by the breastbone', 'chest'),
  ...zonePair('chest-outer', 'chest, by the armpit', 'chest'),
  ...zonePair('elbow-inner', 'inner elbow', 'elbow'),
  ...zonePair('elbow-outer', 'outer elbow', 'elbow'),
  ...zonePair('wrist-front', 'wrist, palm side', 'wrist-hand'),
  ...zonePair('palm', 'palm and base of thumb', 'wrist-hand'),
  ...zonePair('fingers', 'fingers and thumb', 'wrist-hand'),
  ...zoneSplit('belly-upper', 'upper belly', 'belly-upper'),
  ...zoneSplit('belly-lower', 'lower belly', 'belly-lower'),
  ...zonePair('hip-bone-front', 'front of hip bone', 'hip-front'),
  ...zonePair('hip-crease', 'hip crease and groin', 'hip-front'),
  ...zonePair('thigh-front-upper-inner', 'front of thigh, upper inner', 'thigh-front'),
  ...zonePair('thigh-front-upper-outer', 'front of thigh, upper outer', 'thigh-front'),
  ...zonePair('thigh-front-lower-inner', 'front of thigh, lower inner', 'thigh-front'),
  ...zonePair('thigh-front-lower-outer', 'front of thigh, lower outer', 'thigh-front'),
  ...zonePair('knee-inner', 'knee, inner side', 'knee'),
  ...zonePair('knee-outer', 'knee, outer side', 'knee'),
  ...zonePair('shin-upper', 'upper shin', 'shin'),
  ...zonePair('shin-lower', 'lower shin', 'shin'),
  ...zonePair('ankle-front', 'front of ankle', 'ankle-foot'),
  ...zonePair('foot-top', 'top of foot and toes', 'ankle-foot'),
];

const zonesBack: Zone[] = [
  { key: 'head-back-upper', name: 'Back and top of head', region: 'head-back' },
  ...zoneSplit('skull-base', 'base of skull', 'head-back'),
  ...zoneSplit('neck-back', 'side of the back of the neck', 'neck-back'),
  ...zonePair('shoulder-top-inner', 'top of shoulder, by the neck', 'shoulder-top'),
  ...zonePair('shoulder-top-outer', 'top of shoulder, by the arm', 'shoulder-top'),
  ...zonePair('shoulder-blade-inner', 'shoulder blade, inner edge by the spine', 'shoulder-blade'),
  ...zonePair('shoulder-blade-mid', 'shoulder blade, middle', 'shoulder-blade'),
  ...zonePair('shoulder-blade-outer', 'shoulder blade, outer edge and back of shoulder', 'shoulder-blade'),
  ...zonePair('mid-back-inner', 'mid back, beside the spine', 'mid-back'),
  ...zonePair('mid-back-outer', 'mid back, over the ribs', 'mid-back'),
  ...zonePair('low-back-inner', 'low back, beside the spine', 'low-back'),
  ...zonePair('low-back-outer', 'low back, side of the waist', 'low-back'),
  ...zoneSplit('spine-base', 'side of the base of the spine', 'spine-base'),
  ...zonePair('glute-upper', 'upper glute', 'glute'),
  ...zonePair('glute-outer', 'outer hip', 'glute'),
  ...zonePair('glute-mid', 'middle of glute', 'glute'),
  ...zonePair('glute-lower', 'lower glute and sit bone', 'glute'),
  ...zonePair('wrist-back', 'back of wrist', 'hand-back'),
  ...zonePair('knuckles', 'back of hand and knuckles', 'hand-back'),
  ...zonePair('fingers-back', 'back of fingers and thumb', 'hand-back'),
  ...zonePair('hamstring-upper-inner', 'hamstring, upper inner', 'hamstring'),
  ...zonePair('hamstring-upper-outer', 'hamstring, upper outer', 'hamstring'),
  ...zonePair('hamstring-lower-inner', 'hamstring, lower inner', 'hamstring'),
  ...zonePair('hamstring-lower-outer', 'hamstring, lower outer', 'hamstring'),
  ...zonePair('calf-upper', 'upper calf', 'calf'),
  ...zonePair('calf-lower', 'lower calf', 'calf'),
  ...zonePair('achilles', 'Achilles and back of ankle', 'ankle-heel'),
  ...zonePair('heel', 'heel', 'ankle-heel'),
];

/** `left`, `right`, or `midline` when the key has neither prefix. Left and right are the client's own. */
export function sideOf(key: string): Side {
  return key.startsWith('left-') ? 'left' : key.startsWith('right-') ? 'right' : 'midline';
}

export const bodymap = {
  /** Goes up when a zone key is added, removed or renamed, or a border moves enough to change what a name means. */
  zoneSet: 1,
  /** The report JSON's own format version (`v`). */
  reportVersion: 2,
  zones: { front: zonesFront, back: zonesBack } satisfies Record<View, Zone[]>,
  /** false until B10: the page shows `closed` only, with no script and no endpoint URL. */
  open: false,
  figures: ['female', 'male'] as const satisfies readonly Sex[],
  views: ['front', 'back'] as const satisfies readonly View[],
  /** In src/assets/bodymap/ for a later release, never shown in v1 (spec R1). */
  laterViews: ['left_side', 'right_side'] as const,
  /** The art's own canvas; pins are stored as 0–1 of it. */
  viewBox: { width: 2048, height: 4096 },
  pinTypes,
  limits: {
    stars: 3,
    pins: 60,
    noteChars: 140,
    nameChars: 80,
    expiryHours: 24,
    /** base64 characters of the PDF */
    pdfBytes: 1_500_000,
    reportBytes: 64_000,
  },
  /** Rate limits the script enforces (Brian, Nov 8, 2026); here so docs and tests read one value. */
  rate: { perTenMinutes: 6, perDay: 30, perNameAndDatePerDay: 3 },
  /** Created by the script's setup() inside the clients parent folder (Brian, Nov 8, 2026). */
  unsortedFolder: '_Unsorted_Intakes',
  storageKey: 'ohm-bodymap-v1',
  regions: { front, back } satisfies Record<View, Region[]>,
  text: {
    title: 'Body map',
    description: 'Mark where you feel it before your session.',
    closed: "This page isn't open yet.",
    h1: 'Body map',
    intro: "Show me where you feel it, and I'll read it before your session.",
    name: 'Your name',
    apptDate: 'Appointment date',
    figure: 'Pick the figure closest to your body',
    figures: { female: 'Female', male: 'Male' } satisfies Record<Sex, string>,
    views: { front: 'Front', back: 'Back' } satisfies Record<View, string>,
    typeQuestion: 'What are you marking?',
    types: {
      pain: 'Pain',
      discomfort: 'Discomfort',
      injury: 'Injury',
      numb: 'Numbness or tingling',
      avoid: 'Avoid this area',
    } satisfies Record<PinTypeKey, string>,
    tapHint: 'Tap where you feel it.',
    zoomHint: 'Pinch, or use + and −, to zoom.',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom',
    /** {figure} is figures[sex], {view} is views[view] in lower case. */
    figureLabel: '{figure} figure, {view}. Tap to mark a spot.',
    intensity: 'How strong is it?',
    intensityLow: 'Mild',
    intensityHigh: 'Strong',
    note: 'Note (optional)',
    notePlaceholder: 'A few words, if it helps',
    star: 'Star as a top priority',
    remove: 'Remove',
    done: 'Done',
    starLimit: 'You can star up to 3 marks. Unstar one first.',
    starAvoid: "Avoid marks can't be starred.",
    marks: 'Your marks ({n})',
    marksEmpty: 'No marks yet.',
    listTitle: 'Prefer a list? Choose areas by name.',
    listHint: 'Areas you tick use the type chosen above.',
    startOver: 'Start over',
    startOverConfirm: 'Clear all your marks?',
    startOverYes: 'Clear everything',
    startOverNo: 'Keep my marks',
    savedNote: 'Saved on this device for 24 hours, and cleared when you send it.',
    sharedNote: "On a shared device? Tap Start over when you're done.",
    send: 'Send body map',
    sending: 'Sending…',
    errName: 'Enter your name.',
    errDate: 'Pick your appointment date.',
    errEmpty: 'Mark at least one spot, or choose an area from the list.',
    errNetwork: "It didn't send. Your marks are still here. Check your connection and try again.",
    retry: 'Try again',
    errBusy: 'A lot of maps are coming in right now. Your marks are saved here. Try again in a few minutes.',
    errServer: "Something went wrong, and it didn't send. Try again, or tell me at your session.",
    doneTitle: 'Got it. Thank you.',
    doneText: "I'll look it over before your session. Your marks are cleared from this device.",
    privacy: "Only I see this. It's saved to my private business files.",
    noscript: "This page needs JavaScript. If you can't use it, tell me about any pain or areas to avoid at your session.",
    honeypot: 'Leave this field empty',
    unlabelled: 'Unlabelled area',
    pdf: {
      title: 'Body map',
      name: 'Name',
      appointment: 'Appointment',
      sent: 'Sent',
      figure: 'Figure',
      priority: 'Priority',
      avoid: 'Avoid',
      other: 'Other marks',
      front: 'Front',
      back: 'Back',
      intensity: '{n}/5',
      /** A mark ticked in the region list: the zone is not known, only the region (B5). */
      fromList: 'chosen from the list',
      /** {site} is site.name, filled by the PDF builder. */
      footer: '{site} · private client record',
    },
  },
} as const;

/** The art file stem for a figure and view: `female_front`, `male_left_side` (the delivered names, AC-14). */
export function artName(sex: Sex, view: string): string {
  return `${sex}_${view}`;
}

/**
 * The key a client folder and a typed name are compared by (B2 mirrors this in apps-script/bodymap/bodymap.js).
 * Underscores become spaces (folders are `First_Last`, Brian, Nov 8, 2026), accents and punctuation go,
 * case and repeated spaces don't matter. Exact match only: no fuzzy matching.
 */
export function folderKey(s: string): string {
  return s
    .replace(/_/g, ' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
