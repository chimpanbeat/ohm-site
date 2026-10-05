// The only client script on the site. Imported only by pages/book/index.astro.
// State machine: docs/build/ARCHITECTURE.md §B4. Plain DOM, no frameworks.
// Privacy: nothing the visitor types is stored, logged, or sent anywhere but Google (step 3B).

import type { ZoneKey } from '../data/site.ts';

type Where = 'office' | 'mobile';

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

/**
 * TODO(3B): load Google Places and render the address combobox into #address-slot.
 * Step 2A leaves this empty on purpose; it must not load Google.
 */
async function loadPlaces(): Promise<void> {}

function choose(where: Where): void {
  if (!office || !mobile) return;
  office.hidden = where !== 'office';
  mobile.hidden = where !== 'mobile';
  if (where === 'mobile' && !placesStarted && mobile.dataset.mapsKey) {
    placesStarted = true;
    void loadPlaces();
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

// Dev-only hook so showZone can be tried from the console.
if (import.meta.env.DEV) Object.assign(window, { showZone });
