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
> _3A has not run yet. If this section is still empty, stop and escalate._

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
- The geojson goes into the bundle as an import (`import zones from '../data/zones.geojson'`, which Vite handles as JSON; if not, rename to `.json` and **escalate**). No runtime fetch.
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
