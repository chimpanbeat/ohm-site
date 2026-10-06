// The only client script on the site. Imported only by pages/book/index.astro.
// State machine: docs/build/ARCHITECTURE.md §B4. Plain DOM, no frameworks.
// Privacy: nothing the visitor types is stored, logged, or sent anywhere but Google (step 3B).

import type { ZoneKey } from '../data/site.ts';
import { bboxOf, zoneFor, type ZoneCollection } from '../lib/geo.ts';
import { makeFrame, viewBoxAttr, type MapFrame, type View } from '../lib/mapview.ts';
import zonesRaw from '../data/zones.geojson?raw';

type Where = 'office' | 'mobile';

// Minimal types for the slice of Maps JS we use (no @types/google.maps; step 3B spec G1).
interface PlaceLike {
  location?: { lat(): number; lng(): number } | null;
  formattedAddress?: string | null;
  fetchFields(opts: { fields: string[] }): Promise<unknown>;
}
interface Prediction {
  text: { text: string };
  toPlace(): PlaceLike;
}
interface PlacesLib {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(req: {
      input: string;
      sessionToken: object;
      includedRegionCodes: string[];
      region: string;
      language: string;
      locationBias: { center: { lat: number; lng: number }; radius: number };
    }): Promise<{ suggestions: { placePrediction?: Prediction | null }[] }>;
  };
}
declare global {
  interface Window {
    gm_authFailure?: () => void;
    google?: { maps: { importLibrary(name: 'places'): Promise<PlacesLib> } };
  }
}

const zones = JSON.parse(zonesRaw) as ZoneCollection;

const CALLBACK = '__ohmMapsReady';
const LOAD_TIMEOUT_MS = 6000;
const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;
const COLORADO_SPRINGS = { lat: 38.8339, lng: -104.8214 };
const BIAS_RADIUS_M = 40000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const whereSet = $<HTMLFieldSetElement>('where');
const office = $('office');
const mobile = $('mobile');
const result = $('zone-result');

let placesStarted = false;

// The service-area map (ServiceMap.astro). It is drawn at build time; this script only swaps the
// viewBox, the focus classes and the pin. It never depends on Google.
const svg = document.querySelector<SVGSVGElement>('#mobile .service-map svg[role="img"]');
/** "Show all areas", over the map's corner; visible only while the map is zoomed to an area. */
const reset = mobile?.querySelector<HTMLButtonElement>('.map-reset') ?? null;
let frame: MapFrame | null = null;
/** The address pin in map units. Memory only: never stored, logged, or put in the URL. */
let pin: [number, number] | null = null;
/** Set by the combobox once it exists; empties the address field. */
let clearAddress: (() => void) | null = null;

const PIN_MARGIN = 100; // map units around the pin when the view widens to include it (the pin is ~72 units tall)

function setPin(loc: { lat: number; lng: number } | null): void {
  const el = svg?.querySelector<SVGGElement>('.map-pin');
  if (!el || !frame) return;
  if (!loc) {
    pin = null;
    el.setAttribute('hidden', '');
    return;
  }
  pin = frame.project(loc.lng, loc.lat);
  el.style.transform = `translate(${pin[0]}px, ${pin[1]}px) scale(calc(1 / var(--map-scale)))`;
  el.removeAttribute('hidden');
}

/** Zoom to the zone and grey out the others; for "out", show everything (widened to include the pin). */
function focusZone(zone: ZoneKey): void {
  if (!svg || !frame) return;
  let view: View = frame.full;
  const box = zone === 'out' ? null : bboxOf(zones, zone);
  if (box) view = frame.viewFor(box);
  else if (pin) view = frame.include(view, pin[0], pin[1], PIN_MARGIN);
  for (const el of svg.querySelectorAll<SVGElement>('[data-zone]')) {
    const key = el.dataset.zone;
    el.classList.toggle('is-focused', !!box && key === zone);
    el.classList.toggle('is-muted', !!box && key !== zone);
  }
  svg.setAttribute('viewBox', viewBoxAttr(view));
  svg.style.setProperty('--map-scale', String(frame.full.w / view.w));
}

/**
 * Show a zone: clone its card into the live region and focus the heading, mark the matching
 * picker button, then move the map. `via` picks the card variant (only "out" has two).
 */
function select(zone: ZoneKey, via: 'address' | 'pick', loc?: { lat: number; lng: number }): void {
  const tpl =
    document.querySelector<HTMLTemplateElement>(`template[data-zone="${zone}"][data-via="${via}"]`) ??
    document.querySelector<HTMLTemplateElement>(`template[data-zone="${zone}"]:not([data-via])`);
  if (!tpl || !result) return;
  result.replaceChildren(tpl.content.cloneNode(true));
  result.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
  for (const link of document.querySelectorAll<HTMLAnchorElement>('#mobile .zone-picker a[data-zone]')) {
    if (link.dataset.zone === zone) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  setPin(loc ?? null);
  focusZone(zone);
  if (reset) reset.hidden = !isRegion(zone);
  if (via === 'pick') clearAddress?.();
}

/**
 * Undo select(): no card, no chosen button, no pin, an empty address field, and the full map.
 * If focus was on something that just went away (the card heading or the reset button), it moves
 * to the first area button; otherwise it stays where it is.
 */
function deselect(): void {
  if (!result) return;
  const active = document.activeElement;
  const lostFocus = !!active && (result.contains(active) || active === reset);
  result.replaceChildren();
  for (const link of document.querySelectorAll<HTMLAnchorElement>('#mobile .zone-picker a[data-zone]')) {
    link.removeAttribute('aria-current');
  }
  setPin(null);
  clearAddress?.();
  if (svg && frame) {
    for (const el of svg.querySelectorAll<SVGElement>('[data-zone]')) el.classList.remove('is-focused', 'is-muted');
    svg.setAttribute('viewBox', viewBoxAttr(frame.full));
    svg.style.setProperty('--map-scale', '1');
  }
  if (reset) reset.hidden = true;
  hot(null);
  if (lostFocus) document.querySelector<HTMLElement>('#mobile .zone-picker a')?.focus();
}

const isRegion = (zone: ZoneKey | null | undefined): zone is 'home' | 'shared' | 'north' =>
  zone === 'home' || zone === 'shared' || zone === 'north';

/**
 * Linked hover: the area button and its map area light up together (is-hot). Purely visual. Only
 * the three real areas; "out" has none.
 */
function hot(zone: ZoneKey | null | undefined): void {
  for (const el of mobile?.querySelectorAll('.is-hot') ?? []) el.classList.remove('is-hot');
  if (!isRegion(zone)) return;
  mobile?.querySelector(`.zone-picker a[data-zone="${zone}"]`)?.classList.add('is-hot');
  svg?.querySelector(`[data-zone="${zone}"].zone-line`)?.classList.add('is-hot');
}

const slot = $('address-slot');
let dead = false;

/**
 * Terminal for this page view: drop the address field and let the zone picker, map and
 * boundary line carry on. Shows no error copy and logs nothing.
 */
function unavailable(): void {
  if (dead) return;
  dead = true;
  const hadFocus = !!slot?.contains(document.activeElement);
  slot?.replaceChildren();
  if (mobile) mobile.dataset.state = 'unavailable';
  if (hadFocus) document.querySelector<HTMLElement>('#mobile .zone-picker a')?.focus();
}

/** Direct script tag; Google's inline bootstrap logs a warning (3B spec G1). */
function loadMapsJs(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w[CALLBACK] = () => {
      delete w[CALLBACK];
      resolve();
    };
    const s = document.createElement('script');
    s.src =
      'https://maps.googleapis.com/maps/api/js?' +
      new URLSearchParams({ key, v: 'weekly', loading: 'async', callback: CALLBACK });
    s.async = true;
    s.onerror = () => reject(new Error('maps'));
    document.head.append(s);
  });
}

async function loadPlaces(key: string): Promise<void> {
  window.gm_authFailure = unavailable; // set before injecting; can also fire after load
  const timer = setTimeout(unavailable, LOAD_TIMEOUT_MS);
  try {
    await loadMapsJs(key);
    const places = await window.google!.maps.importLibrary('places');
    clearTimeout(timer);
    if (!dead) mountCombobox(places);
  } catch {
    clearTimeout(timer);
    unavailable();
  }
}

/** ARIA 1.2 combobox with a listbox popup, fed by Places (New) autocomplete. */
function mountCombobox(places: PlacesLib): void {
  if (!slot) return;
  const { AutocompleteSuggestion, AutocompleteSessionToken } = places;

  const label = document.createElement('label');
  label.htmlFor = 'addr';
  label.textContent = 'Not sure? Enter your address';

  const input = document.createElement('input');
  input.id = 'addr';
  input.type = 'text';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'addr-list');
  input.autocomplete = 'street-address';

  const list = document.createElement('ul');
  list.id = 'addr-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Address suggestions');
  list.hidden = true;

  slot.replaceChildren(label, input, list);

  let token: object | undefined;
  let predictions: Prediction[] = [];
  let active = -1;
  let requestId = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const options = () => list.querySelectorAll<HTMLElement>('[role="option"]');

  function setActive(i: number): void {
    active = i;
    options().forEach((o, n) => o.setAttribute('aria-selected', String(n === i)));
    if (i >= 0) input.setAttribute('aria-activedescendant', `addr-opt-${i}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function show(next: Prediction[]): void {
    predictions = next;
    list.replaceChildren(
      ...next.map((p, i) => {
        const li = document.createElement('li');
        li.id = `addr-opt-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.textContent = p.text.text;
        li.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
        li.addEventListener('click', () => void choosePrediction(i));
        return li;
      }),
    );
    list.hidden = next.length === 0;
    input.setAttribute('aria-expanded', String(next.length > 0));
    setActive(-1);
  }

  const close = () => show([]);

  // Picking an area by button or map empties the address field.
  clearAddress = () => {
    requestId++; // drop anything still in flight
    clearTimeout(debounce);
    input.value = '';
    close();
  };

  async function search(value: string): Promise<void> {
    if (dead) return; // a debounce can outlive the field
    const id = ++requestId;
    try {
      token ??= new AutocompleteSessionToken();
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        sessionToken: token,
        includedRegionCodes: ['us'],
        region: 'us',
        language: 'en-US',
        locationBias: { center: COLORADO_SPRINGS, radius: BIAS_RADIUS_M },
      });
      if (dead || id !== requestId) return;
      show(suggestions.flatMap((s) => (s.placePrediction ? [s.placePrediction] : [])));
    } catch {
      unavailable();
    }
  }

  async function choosePrediction(i: number): Promise<void> {
    const prediction = predictions[i];
    if (!prediction) return;
    const id = ++requestId;
    clearTimeout(debounce);
    close();
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['location', 'formattedAddress'] });
      token = undefined; // fetchFields ends the billing session
      if (dead) return;
      const loc = place.location;
      if (!loc) return unavailable();
      if (id !== requestId) return; // the visitor kept typing
      if (place.formattedAddress) input.value = place.formattedAddress; // display only
      const [lat, lng] = [loc.lat(), loc.lng()];
      select(zoneFor(lat, lng, zones), 'address', { lat, lng });
    } catch {
      unavailable();
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const value = input.value.trim();
    if (value.length < MIN_CHARS) {
      requestId++; // drop anything still in flight
      close();
      return;
    }
    debounce = setTimeout(() => void search(value), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    const n = predictions.length;
    switch (e.key) {
      case 'ArrowDown':
        if (!n) return;
        e.preventDefault();
        setActive((active + 1) % n);
        break;
      case 'ArrowUp':
        if (!n) return;
        e.preventDefault();
        setActive(active <= 0 ? n - 1 : active - 1);
        break;
      case 'Enter':
        if (active < 0) return;
        e.preventDefault();
        void choosePrediction(active);
        break;
      case 'Escape':
        if (!n) return;
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  });

  input.addEventListener('blur', close);
}

function choose(where: Where): void {
  if (!office || !mobile) return;
  office.hidden = where !== 'office';
  mobile.hidden = where !== 'mobile';
  const key = mobile.dataset.mapsKey;
  if (where === 'mobile' && !placesStarted && key) {
    placesStarted = true;
    void loadPlaces(key);
  }
}

function init(): void {
  if (!whereSet || !office || !mobile) return;
  office.hidden = true;
  mobile.hidden = true;
  whereSet.hidden = false;
  const radios = whereSet.querySelectorAll<HTMLInputElement>('input[name="where"]');
  for (const radio of radios) {
    radio.checked = false; // undo any state the browser restored
    radio.addEventListener('change', () => radio.checked && choose(radio.value as Where));
  }

  if (svg) {
    frame = makeFrame(zones);
    svg.classList.add('is-interactive');
    mobile.querySelector<HTMLElement>('.map-hint')?.removeAttribute('hidden');
  }

  // One delegated handler: the area buttons stay on the page (without JS they are plain links
  // to /book/<zone>). Clicking an area chooses it; clicking the chosen one again, the focused
  // area on the map, or "Show all areas" goes back to the full view.
  mobile.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('.map-reset')) {
      deselect();
      return;
    }
    const link = target.closest<HTMLAnchorElement>('.zone-picker a[data-zone]');
    if (link) {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // let the browser open a tab
      e.preventDefault();
      if (link.hasAttribute('aria-current')) deselect();
      else select(link.dataset.zone as ZoneKey, 'pick');
      return;
    }
    const zonePath = target.closest<SVGPathElement>('path.zone[data-zone]');
    if (!zonePath) return;
    if (zonePath.classList.contains('is-focused')) deselect();
    else select(zonePath.dataset.zone as ZoneKey, 'pick');
  });

  // Linked hover. The pointer drives it by what is under it; keyboard focus drives it only when the
  // browser shows a focus ring (a mouse click also focuses a button, and that must not stick).
  mobile.addEventListener('pointerover', (e) => {
    const el = (e.target as Element).closest<HTMLElement | SVGElement>('.zone-picker a[data-zone], path.zone[data-zone]');
    hot((el?.dataset.zone as ZoneKey | undefined) ?? null);
  });
  mobile.addEventListener('pointerleave', () => hot(null));
  mobile.addEventListener('focusin', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('.zone-picker a[data-zone]');
    if (link?.matches(':focus-visible')) hot(link.dataset.zone as ZoneKey);
  });
  mobile.addEventListener('focusout', (e) => {
    if ((e.target as Element).closest('.zone-picker a[data-zone]')) hot(null);
  });
}

init();

// Dev-only hook so select can be tried from the browser devtools.
if (import.meta.env.DEV) Object.assign(window, { select });
