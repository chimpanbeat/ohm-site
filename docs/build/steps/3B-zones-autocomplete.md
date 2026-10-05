# 3B: Real zones, autocomplete, fallback

Model: sonnet
Brief: §6 (all), §12, §14
Architecture: §B4, §B5 (`npm run zones`)

## Goal
- Convert the real KML to `zones.geojson`.
- Add the address-fixture tests.
- Build the accessible address combobox on Google Places (New) to the **pinned spec below**, so `/book` routes a typed address to its zone.
- If the key or Google fails, the page falls back silently.

## Google spec (pinned by Opus in 3A; follow it exactly)
Checked against Google's docs on 2026-10-05: load-maps-js-api, place-autocomplete-data, reference/autocomplete-data, reference/place, place-class-data-fields, session-pricing, sku-details and events.

### G1. Loader: direct script tag, not the bootstrap snippet
Google's inline `importLibrary` bootstrap contains a `console.warn`, which would break Done-when 5. Use the documented **direct script loading tag** instead. Google confirms that `importLibrary` works once it has loaded.

```ts
const CALLBACK = '__ohmMapsReady';

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
// then:
const places = (await google.maps.importLibrary('places')) as PlacesLib;
```
- Don't add `libraries=`; `importLibrary('places')` covers it.
- **Don't set `auth_referrer_policy=origin`.** Brian's referrers are path-scoped (`https://chimpanbeat.github.io/ohm-site/*`), and `origin` would send only the origin, which would fail that match.
- **No `@types/google.maps`** (no new dependencies). Declare a minimal local type for the subset used: `importLibrary`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `AutocompleteSessionToken`, `PlacePrediction.text.text`, `toPlace()`, `Place.fetchFields`, `Place.location.lat()/lng()`, and `Place.formattedAddress`. Put `declare global { interface Window { gm_authFailure?: () => void; google?: … } }` in `book.ts`.

### G2. Calls
```ts
const { AutocompleteSuggestion, AutocompleteSessionToken } = places;

// Session token: create lazily on the first query of a session; reset after fetchFields.
token ??= new AutocompleteSessionToken();          // constructor takes no arguments

const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
  input,                                            // the trimmed input value
  sessionToken: token,
  includedRegionCodes: ['us'],
  region: 'us',
  language: 'en-US',
  locationBias: { center: { lat: 38.8339, lng: -104.8214 }, radius: 40000 }, // CircleLiteral, Colorado Springs; radius in metres (max 50000)
});
// suggestions: Array<{ placePrediction?: PlacePrediction }>. Skip entries with no placePrediction.
// Option label: s.placePrediction.text.text (a string). Google returns up to 5; show what comes back.

// On select:
const place = prediction.toPlace();
await place.fetchFields({ fields: ['location', 'formattedAddress'] }); // exactly these two
const loc = place.location;                          // LatLng | undefined
// loc → zoneFor(loc.lat(), loc.lng(), zones) → showZone(zone)
// Put place.formattedAddress into the input (display only), close the list, then token = undefined.
```
- No `includedPrimaryTypes`. Neighbourhood and town queries ("Briargate", "Falcon, CO") must still resolve.
- `fetchFields` ends the session. The token is not passed to it; the Place from `toPlace()` carries it.
- Don't request any other field. Both fields are **Place Details Essentials**, so no higher SKU is ever triggered.

### G3. Querying
- **Minimum length:** 3 characters after trimming. Below 3, clear and close the list and send no request.
- **Debounce:** 300 ms after the last keystroke.
- **Stale responses:** increment a request id per call and drop any response whose id isn't the latest.
- `aria-expanded="true"` only while the list has options. Zero results → close the list (no "no results" copy).

### G4. Error paths → `unavailable`
`unavailable()` is idempotent and terminal for the page view. It:
- empties `#address-slot` and sets `#mobile[data-state="unavailable"]`
- ignores any later responses
- if focus was inside the slot, moves focus to the first `#mobile .zone-picker a`
- never logs. Google's own console messages are outside our control and acceptable; ours are not.

Trigger it on **any** of:
1. The script's `onerror`, meaning a network block or ad-blocker.
2. `importLibrary('places')` not resolved within **6 s** of injecting the script.
3. `window.gm_authFailure` firing, for a bad key, a disallowed referrer or a disabled API. Assign it **before** injecting the script. It can fire after load, so it must also work once the field is showing.
4. `fetchAutocompleteSuggestions` rejecting, for example over quota or on an auth error.
5. `fetchFields` rejecting, or resolving with no `location`.
6. `importLibrary` rejecting or throwing.

An empty key never loads anything, as in 2A. The visitor sees no error copy: the field just isn't there, and the picker, map and "Text me" line remain.

## Files to create or modify
- `scripts/kml-to-geojson.mjs`: per §B5. Run `npm run zones`.
- `src/data/zones.geojson`: regenerated. Check by eye that it contains only `type`, `properties.zone` and `geometry`, with no descriptions and no names.
- `tests/zones.test.ts`: loads `tests/fixtures/addresses.json` (written by Opus) and `src/data/zones.geojson`, then asserts `zoneFor(lat, lng) === expect` for each entry. Also asserts the geojson has exactly 3 features with keys `home`, `shared` and `north`, and has no properties other than `zone`.
- `src/scripts/book.ts`: implement `loadPlaces()` and the combobox to the Google spec:
  - Inject the loader on the first `mobile` choice only, and only if `data-maps-key` is non-empty.
  - Render into `#address-slot`:
    ```html
    <label for="addr">Your address</label>
    <input id="addr" role="combobox" aria-autocomplete="list" aria-expanded aria-controls="addr-list" autocomplete="street-address">
    <ul id="addr-list" role="listbox">
    ```
    with `aria-activedescendant` handling.
  - **Keys:** ArrowDown/ArrowUp move the active option, Enter selects, Escape closes, and Tab closes without selecting.
  - **Querying:** a minimum length and a debounce as pinned. Discard stale responses by request id.
  - **On select:** fetch the pinned fields, then `zoneFor`, then `showZone`, then start a new session token.
  - **Unavailable path,** per the spec: remove the slot contents and set `data-state="unavailable"` on `#mobile`. **No `console.*` calls anywhere in book.ts.**
- `src/pages/book/index.astro`: only if the slot needs a wrapper or a hint line ("Start typing your street address"). Copy beyond that line needs escalation.

## Constraints
- **Privacy is a hard rule.** The input value never goes to localStorage, sessionStorage, cookies, the URL, the console, or any request other than the pinned Google calls.
- The geojson goes into the bundle as a raw import: `import zonesRaw from '../data/zones.geojson?raw'` then `const zones = JSON.parse(zonesRaw) as ZoneCollection`. Vite's JSON plugin only matches `.json`, so a bare `.geojson` import fails; `?raw` works for any file. No runtime fetch. (Pinned in 3A.)
- **No new dependencies.** Use the Google loader snippet inline, not `@googlemaps/js-api-loader`.

## Done when
1. `npm run zones` prints 3 zones and the skipped counts, and `git diff --stat src/data/zones.geojson` shows the regeneration.
2. `grep -ciE 'description|home office|sat' src/data/zones.geojson` returns 0.
3. `npm test` passes, including every fixture address.
4. `npm run build` and `npm run check:wording` both pass.
5. `grep -n 'console\.' src/scripts/book.ts` prints nothing.
6. Manual checks on `npm run dev` with a real key in `.env`, on port 4321:
   - Each fixture address, typed in, shows the expected card.
   - Keyboard-only selection works.
7. Fallback checks:
   - With `PUBLIC_GOOGLE_MAPS_KEY=` (empty), rebuild and confirm there's no address field and the picker and map are present.
   - With an invalid key string, the field disappears within about 6s, the picker remains, and nothing appears in the console from our code.

## Report
(Sonnet)

## Review
(Opus)
