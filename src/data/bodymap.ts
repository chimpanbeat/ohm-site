/**
 * Body map (I-073, I-074, I-108; ARCHITECTURE §B12, BRIEF §15). CONTRACT FILE: only the architect or a step
 * that lists it changes it. No imports (Node type stripping; client script 8 bundles this file).
 * Every string is from docs/build/copy-deck.md → Body map (Brian approved the copy as drafted, Nov 8, 2026).
 * Geometry lives in src/data/bodymap-zones/<sex>_<view>.json; this file holds no client data, ever.
 */

export type Sex = 'female' | 'male';
export type View = 'front' | 'back';
export type PinTypeKey = 'pain' | 'discomfort' | 'tight' | 'injury' | 'numb' | 'avoid' | 'other';
export type PinShape = 'circle' | 'diamond' | 'hexagon' | 'triangle' | 'star4' | 'ring-slash' | 'bubble';
/** The fields a mark can carry (§B12 Pins → Fields). `note` is the mark's note; for avoid and other it is the only field. */
export type PinField = 'intensity' | 'since' | 'quality' | 'worst' | 'course' | 'started' | 'worse' | 'better' | 'note';
export type Quality = 'sharp' | 'dull' | 'burning' | 'spreading' | 'numb' | 'tingling' | 'tight' | 'stiff' | 'knotted';
export type Worst = 'mornings' | 'evenings' | 'still' | 'activity' | 'always';
export type Course = 'acute' | 'chronic';
export type Visit = 'first' | 'followup';
export type Since = 'better' | 'same' | 'worse';
export type ForWhom = 'self' | 'helper';
/** `fields` is the panel's order: the first is the one up front, the rest sit behind `Add details`, the note last. */
export interface PinType { key: PinTypeKey; shape: PinShape; token: string; starrable: boolean; fields: PinField[] }
export interface Region { key: string; name: string }

// The seven types, in I-167's order (the toolbar chips, the 1–7 keys, the legend). Brian, Nov 14, 2026.
const types: PinType[] = [
  { key: 'pain', shape: 'circle', token: 'pin-pain', starrable: true, fields: ['intensity', 'since', 'quality', 'course', 'started', 'worse', 'better', 'note'] },
  { key: 'discomfort', shape: 'diamond', token: 'pin-discomfort', starrable: true, fields: ['intensity', 'since', 'quality', 'course', 'started', 'worse', 'better', 'note'] },
  { key: 'tight', shape: 'hexagon', token: 'pin-tight', starrable: true, fields: ['intensity', 'since', 'quality', 'worst', 'course', 'started', 'worse', 'better', 'note'] },
  { key: 'injury', shape: 'triangle', token: 'pin-injury', starrable: true, fields: ['intensity', 'since', 'course', 'started', 'worse', 'better', 'note'] },
  { key: 'numb', shape: 'star4', token: 'pin-numb', starrable: true, fields: ['intensity', 'since', 'quality', 'course', 'started', 'worse', 'better', 'note'] },
  // Avoid marks can't be starred (Brian, Nov 8, 2026): a star means "work here first".
  { key: 'avoid', shape: 'ring-slash', token: 'pin-avoid', starrable: false, fields: ['note'] },
  // Other can be starred (Brian, Nov 14, 2026).
  { key: 'other', shape: 'bubble', token: 'pin-other', starrable: true, fields: ['note'] },
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
  ...pair('shoulder-back', 'back of shoulder'),
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
 * The report's new shapes, set once in B6 so storage and the report agree (§B12 Report JSON); B7 fills them.
 * `consent` is always true and `consentAt` equals `sent` (I-173); `seconds` is whole seconds from the first mark (I-174);
 * `to` and `area` are reserved for v1.1 and sent as null (I-169).
 */
export interface ReportTo extends Located { x: number; y: number }
export interface ReportArea { x: number; y: number; r: number; zones: Array<Located & { share: number }> }
/** A Both sides pair's second point in the report (I-168): its own zone fields, and the reserved `to` and `area`. */
export interface ReportMirror extends Located { x: number; y: number; to: ReportTo | null; area: ReportArea | null }
/** The keys a report pin gains in B6's contract; B7 fills them. `to` and `area` are null in v1 (I-169). */
export interface ReportPinExtras { mirror: ReportMirror | null; to: ReportTo | null; area: ReportArea | null }
/** The whole-body item (I-171): the per-type fields of a mark, with no spot. */
export interface WholeItem {
  type: PinTypeKey;
  intensity: number | null;
  quality: Quality[];
  worst: Worst[];
  course: Course | null;
  started: string;
  worse: string;
  better: string;
  since: Since | null;
  note: string;
  star: boolean;
}
export interface ReportExtras {
  visit: Visit | null;
  forWhom: ForWhom | null;
  helperName: string;
  consent: true;
  consentAt: string;
  seconds: number;
  whole: WholeItem | null;
}

/**
 * Fine zones (B5, I-157; the list Brian approved Nov 13, 2026, docs/build/steps/B5-zone-list-draft.md; zone set 3, B5d:
 * the hands I-161, the splits I-163 and I-164).
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
  ...zoneSplit('forehead', 'forehead and temple', 'head-face'),
  ...zoneSplit('jaw', 'cheek and jaw', 'head-face'),
  ...zoneSplit('neck-front', 'side of the front of the neck', 'neck-front'),
  ...zonePair('collarbone', 'collarbone', 'shoulder'),
  ...zonePair('shoulder-front', 'front of shoulder', 'shoulder'),
  ...zonePair('chest-inner', 'chest, by the breastbone', 'chest'),
  ...zonePair('chest-outer', 'chest, by the armpit', 'chest'),
  // Keys say inner/outer, names say medial/lateral (Brian, Nov 13, 2026): toward/away from the body's midline. On the
  // arm medial is the little-finger side (the art's palms face forward); on the foot, the big-toe side.
  ...zonePair('elbow-inner', 'front of elbow, medial', 'elbow'),
  ...zonePair('elbow-outer', 'front of elbow, lateral', 'elbow'),
  ...zonePair('forearm-upper-inner', 'upper forearm, medial', 'forearm'),
  ...zonePair('forearm-upper-outer', 'upper forearm, lateral', 'forearm'),
  ...zonePair('forearm-lower-inner', 'lower forearm, medial', 'forearm'),
  ...zonePair('forearm-lower-outer', 'lower forearm, lateral', 'forearm'),
  // I-161, I-164: the wrist halves come before the thumb leaf, and the thumb before the palm, in each zone file
  ...zonePair('wrist-front-inner', 'wrist, palm side, medial', 'wrist-hand'),
  ...zonePair('wrist-front-outer', 'wrist, palm side, lateral', 'wrist-hand'),
  ...zonePair('thumb', 'thumb and base of thumb', 'wrist-hand'),
  ...zonePair('palm', 'palm', 'wrist-hand'),
  ...zonePair('index-middle-fingers', 'index and middle fingers', 'wrist-hand'),
  ...zonePair('ring-little-fingers', 'ring and little fingers', 'wrist-hand'),
  ...zoneSplit('belly-upper', 'upper belly', 'belly-upper'),
  ...zoneSplit('belly-lower', 'lower belly', 'belly-lower'),
  ...zonePair('hip-bone-front', 'front of hip bone', 'hip-front'),
  ...zonePair('hip-crease', 'hip crease and groin', 'hip-front'),
  ...zonePair('thigh-front-upper-inner', 'front of thigh, upper medial', 'thigh-front'),
  ...zonePair('thigh-front-upper-outer', 'front of thigh, upper lateral', 'thigh-front'),
  ...zonePair('thigh-front-lower-inner', 'front of thigh, lower medial', 'thigh-front'),
  ...zonePair('thigh-front-lower-outer', 'front of thigh, lower lateral', 'thigh-front'),
  ...zonePair('knee-inner', 'knee, medial', 'knee'),
  ...zonePair('knee-outer', 'knee, lateral', 'knee'),
  ...zonePair('shin-upper-inner', 'upper shin, medial', 'shin'),
  ...zonePair('shin-upper-outer', 'upper shin, lateral', 'shin'),
  ...zonePair('shin-lower-inner', 'lower shin, medial', 'shin'),
  ...zonePair('shin-lower-outer', 'lower shin, lateral', 'shin'),
  ...zonePair('ankle-front-inner', 'front of ankle, medial', 'ankle-foot'),
  ...zonePair('ankle-front-outer', 'front of ankle, lateral', 'ankle-foot'),
  ...zonePair('foot-top-inner', 'top of foot, medial', 'ankle-foot'),
  ...zonePair('foot-top-outer', 'top of foot, lateral', 'ankle-foot'),
];

const zonesBack: Zone[] = [
  ...zoneSplit('head-back-upper', 'back and top of head', 'head-back'),
  ...zoneSplit('skull-base', 'base of skull', 'head-back'),
  ...zoneSplit('neck-back', 'side of the back of the neck', 'neck-back'),
  ...zonePair('shoulder-back-upper', 'back of shoulder, upper', 'shoulder-back'),
  ...zonePair('shoulder-back-lower', 'back of shoulder, by the armpit', 'shoulder-back'),
  ...zonePair('shoulder-blade-inner', 'shoulder blade, medial border, by the spine', 'shoulder-blade'),
  ...zonePair('shoulder-blade-mid', 'shoulder blade, middle', 'shoulder-blade'),
  ...zonePair('mid-back-inner', 'mid back, beside the spine', 'mid-back'),
  ...zonePair('mid-back-outer', 'mid back, over the ribs', 'mid-back'),
  ...zonePair('low-back-inner', 'low back, beside the spine', 'low-back'),
  ...zonePair('low-back-outer', 'low back, side of the waist', 'low-back'),
  ...zoneSplit('spine-base', 'side of the base of the spine', 'spine-base'),
  ...zonePair('glute-upper', 'upper glute', 'glute'),
  ...zonePair('glute-outer', 'lateral hip', 'glute'),
  ...zonePair('glute-mid', 'middle of glute', 'glute'),
  ...zonePair('glute-lower-inner', 'lower glute, medial, by the sit bone', 'glute'),
  ...zonePair('glute-lower-outer', 'lower glute, lateral', 'glute'),
  ...zonePair('elbow-back-inner', 'back of elbow, medial', 'elbow-back'),
  ...zonePair('elbow-back-outer', 'back of elbow, lateral', 'elbow-back'),
  ...zonePair('forearm-back-upper-inner', 'back of upper forearm, medial', 'forearm-back'),
  ...zonePair('forearm-back-upper-outer', 'back of upper forearm, lateral', 'forearm-back'),
  ...zonePair('forearm-back-lower-inner', 'back of lower forearm, medial', 'forearm-back'),
  ...zonePair('forearm-back-lower-outer', 'back of lower forearm, lateral', 'forearm-back'),
  ...zonePair('wrist-back-inner', 'back of wrist, medial', 'hand-back'),
  ...zonePair('wrist-back-outer', 'back of wrist, lateral', 'hand-back'),
  ...zonePair('thumb-back', 'back of thumb and base of thumb', 'hand-back'),
  ...zonePair('knuckles', 'back of hand and knuckles', 'hand-back'),
  ...zonePair('index-middle-fingers-back', 'back of index and middle fingers', 'hand-back'),
  ...zonePair('ring-little-fingers-back', 'back of ring and little fingers', 'hand-back'),
  ...zonePair('hamstring-upper-inner', 'hamstring, upper medial', 'hamstring'),
  ...zonePair('hamstring-upper-outer', 'hamstring, upper lateral', 'hamstring'),
  ...zonePair('hamstring-lower-inner', 'hamstring, lower medial', 'hamstring'),
  ...zonePair('hamstring-lower-outer', 'hamstring, lower lateral', 'hamstring'),
  ...zonePair('knee-back-inner', 'back of knee, medial', 'knee-back'),
  ...zonePair('knee-back-outer', 'back of knee, lateral', 'knee-back'),
  ...zonePair('calf-upper-inner', 'upper calf, medial', 'calf'),
  ...zonePair('calf-upper-outer', 'upper calf, lateral', 'calf'),
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
  zoneSet: 3,
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
  types,
  /** Intensity is ten chips (I-153; was 1–5). */
  intensity: { min: 1, max: 10 },
  /** Per-type quality lists (I-158, I-167). A key can sit in two lists (`spreading`): one answer, shown in both. */
  qualities: {
    pain: ['sharp', 'dull', 'burning', 'spreading'],
    numb: ['numb', 'tingling', 'spreading'],
    tight: ['tight', 'stiff', 'knotted'],
  } as const satisfies Partial<Record<PinTypeKey, readonly Quality[]>>,
  worsts: ['mornings', 'evenings', 'still', 'activity', 'always'] as const satisfies readonly Worst[],
  courses: ['acute', 'chronic'] as const satisfies readonly Course[],
  /** Visit, since and who it's for are filled from B6e; the keys and values are set here so storage and the report are set once. */
  visits: ['first', 'followup'] as const satisfies readonly Visit[],
  sinces: ['better', 'same', 'worse'] as const satisfies readonly Since[],
  forWhoms: ['self', 'helper'] as const satisfies readonly ForWhom[],
  /** WebP on phones, SVG on desktop (Brian, Nov 14, 2026): the SVG where this matches, else the WebP when there is one. The only copy. */
  artQuery: '(min-width: 1024px) and (pointer: fine)',
  limits: {
    stars: 3,
    pins: 60,
    noteChars: 140,
    detailChars: 80,
    startedChars: 40,
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
      tight: 'Tight or stiff',
      injury: 'Injury',
      numb: 'Numbness or tingling',
      avoid: 'Avoid this area',
      other: 'Other',
    } satisfies Record<PinTypeKey, string>,
    /** A toolbar button: `{view}` is views[view], `{n}` the marks on it. Shown as `{view}` alone while that view has none. */
    viewCount: '{view} {n}',
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
    /** Behind `Add details` for types 1–5 (I-166 (5)); avoid and other have their own prompts below. */
    note: 'Anything else?',
    notePlaceholder: 'A few words, if it helps',
    avoidNote: 'Why avoid it? (optional)',
    otherNote: "What's here? (optional)",
    tightIntensity: 'How tight is it?',
    tightEnds: { low: 'Slight', high: 'Very tight' },
    details: 'Add details',
    quality: 'What does it feel like?',
    qualities: {
      sharp: 'Sharp',
      dull: 'Dull or achy',
      burning: 'Burning',
      spreading: 'Spreading',
      numb: 'Numb',
      tingling: 'Tingling or pins and needles',
      tight: 'Tight or pulling',
      stiff: 'Stiff, hard to move',
      knotted: 'Knotted',
    } satisfies Record<Quality, string>,
    worst: 'When is it worst?',
    worsts: {
      mornings: 'Mornings',
      evenings: 'Evenings or at night',
      still: 'After sitting still',
      activity: 'During or after activity',
      always: 'All the time',
    } satisfies Record<Worst, string>,
    course: 'Is it new or long-standing?',
    courses: { acute: 'New', chronic: 'Long-standing' } satisfies Record<Course, string>,
    started: 'When did it start?',
    startedPlaceholder: 'Roughly, if you know',
    worse: 'What makes it worse?',
    better: 'What makes it better?',
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
      intensity: '{n}/10',
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
