// The only client script on the site. Imported only by pages/book/index.astro.
// State machine: docs/build/ARCHITECTURE.md §B4. Plain DOM, no frameworks.
// Privacy: nothing the visitor types is stored, logged, or sent anywhere but Google (step 3B).

import type { ZoneKey } from '../data/site.ts';
import { zoneFor, type ZoneCollection } from '../lib/geo.ts';
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

/** Clone the zone's card into the live region and move focus to its heading. */
export function showZone(zone: ZoneKey): void {
  const tpl = document.querySelector<HTMLTemplateElement>(`template[data-zone="${zone}"]`);
  if (!tpl || !result) return;
  result.replaceChildren(tpl.content.cloneNode(true));
  result.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
}

const slot = $('address-slot');
let dead = false;

/**
 * Terminal for this page view: drop the address field and let the zone picker, map and
 * "Text me" line carry on. Shows no error copy and logs nothing.
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
  label.textContent = 'Your address';

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
        li.addEventListener('click', () => void select(i));
        return li;
      }),
    );
    list.hidden = next.length === 0;
    input.setAttribute('aria-expanded', String(next.length > 0));
    setActive(-1);
  }

  const close = () => show([]);

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

  async function select(i: number): Promise<void> {
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
      showZone(zoneFor(loc.lat(), loc.lng(), zones));
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
        void select(active);
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
}

init();

// Dev-only hook so showZone can be tried from the browser devtools.
if (import.meta.env.DEV) Object.assign(window, { showZone });
