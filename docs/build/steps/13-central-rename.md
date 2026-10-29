# 13: Zones renamed Central, Mid-north, North; real booking links (I-040)

Brief §1, §4, §6, §7, AC-1, AC-2, AC-4, AC-6 · Architecture §B2, §B4, §B5

## Goal
Every zone key, token, route, test and script follows the contracts the architect already changed: keys `central`, `midnorth`, `north`, `out` (no `home`, `shared`); names `Central`, `Mid-north`, `North`; `bookingUrl(key: LinkKey): string` returns `site.links[key]` (Brian's `…/items?keyword=<key>` links), so components write `href={bookingUrl(key)}` and the `data-placeholder` attribute and `isPlaceholder` are gone. Routes are `/book/central` and `/book/midnorth` (no redirects from the old ones). `check:wording` gains the always-on fail in §B5 for "home visit(s)", "home office", "Home mobile". Services says `Sessions are at my office or at your place.` (copy deck). Read-only here (done by the architect): `src/data/site.ts`, `src/data/wording.ts`, `src/lib/geo.ts`, `src/styles/tokens.css`, `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`. Known gaps: none.

Exact edits outside tests:
- `brief/Ohm Service Map.kml` (local, gitignored, never commit): polygon names `<![CDATA[Central & Southwest Springs]]>` → `Central`, `Mid-north Springs` → `Mid-north`, `North Springs` → `North`. Then `npm run zones`; `git diff src/data/zones.geojson` must show exactly two changed lines (`"home"` → `"central"`, `"shared"` → `"midnorth"`), geometry untouched.
- `scripts/kml-to-geojson.mjs`: `ORDER = ['central', 'midnorth', 'north']`; header comment `site.zones[central|midnorth|north].name`. `scripts/check-contrast.mjs`: tint labels `central tint`, `midnorth tint`.
- `src/components/ServiceMap.astro`: `.zone--central`/`.zone--midnorth`, `.zone-line--central`/`.zone-line--midnorth` with the new tokens; `labelNudge` key `'zone:central'`; office view `bboxOf(zones, 'central')`. `ZonePicker.astro`: `data-zone='central'|'midnorth'` selectors and tokens. `ZoneCard.astro`, `OfficeCard.astro`: `href={bookingUrl(…)}`, no `data-placeholder`. `src/scripts/book.ts`: `isRegion` uses `central | midnorth | north`. `src/pages/services.astro`: `my home office` → `my office`.
- `README.md`: the `TODO_` placeholder paragraph → `` Booking links are PocketSuite items pages filtered by a keyword, `https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=<key>`, for `office`, `central`, `midnorth` and `north`. Only Brian changes them. ``; zone-name bullet → `` `Central`, `Mid-north`, `North` ``; fixture `expect` list → `` (`central`, `midnorth`, `north` or `out`) ``; License-day step 1 → `` Brian has tested the PocketSuite links in `site.links` (office, central, midnorth, north). ``

## AC covered (IDs)
- AC-1: site test 3–4 (each zone and the office route to its keyword link; out has none).
- AC-2: `tests/zones.test.ts` with the renamed fixture `expect` values.
- AC-4: `tests/check-wording.test.ts` cases 11–14, and `npm run check:wording` on the real build.
- AC-6: site test 5 (no old keys or tokens in `src/`, `scripts/`); zone names only from `site.zones`.

## Files
- brief/Ohm Service Map.kml
- src/data/zones.geojson
- src/components/ServiceMap.astro
- src/components/ZonePicker.astro
- src/components/ZoneCard.astro
- src/components/OfficeCard.astro
- src/scripts/book.ts
- src/pages/services.astro
- scripts/kml-to-geojson.mjs
- scripts/check-wording.mjs
- scripts/check-contrast.mjs
- tests/site.test.ts
- tests/geo.test.ts
- tests/mapview.test.ts
- tests/zones.test.ts
- tests/zones-script.test.ts
- tests/check-wording.test.ts
- tests/fixtures/addresses.json
- README.md

## Tests first (write them and see them fail before writing code)
`tests/site.test.ts` (replace the two placeholder tests; drop the `isPlaceholder` import):
1. `Object.keys(site.zones)` and `zoneOrder` equal `['central','midnorth','north','out']`; `site.zonePrecedence` equals `['midnorth','central','north']`.
2. Names `Central`, `Mid-north`, `North`, out `Outside my regular area`; no name matches `/Springs/`; days unchanged (`Tuesdays and Fridays`, `Tuesdays, Wednesdays, and Fridays`, `Wednesdays`).
3. `Object.keys(site.links)` equals `['office','central','midnorth','north']`; for each key `k`, `bookingUrl(k) === \`https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=${k}\`` and `new URL(bookingUrl(k)).searchParams.get('keyword') === k`; no link starts with `TODO_`.
4. Sequence zone → link: for each zone, `z.linkKey` is `z.key` (out: `null`) and `bookingUrl(z.linkKey)` equals `site.links[z.key]`; `bookingUrl(site.office.linkKey)` equals `site.links.office`; calling it twice gives the same string.
5. No `.ts`/`.astro`/`.mjs`/`.css` under `src/` or `scripts/` matches `/['"](?:home|shared)['"]|zone-(?:home|shared)|isPlaceholder|data-placeholder|links\.general|TODO_PS/`.

`tests/geo.test.ts`, `tests/mapview.test.ts`: rename keys. Overlap cases: `midnorth` + `central` → `midnorth`; `central` + `north` → `central`; sequence: the same point after removing the `midnorth` feature → `central`. `bboxOf(fc, 'midnorth')` on a collection without it → `null`.
`tests/zones.test.ts` + fixture: `expect` `home` → `central`, `shared` → `midnorth`; feature zones sorted `['central','midnorth','north']`.
`tests/zones-script.test.ts`: polygons `<![CDATA[Central]]>`, `Mid-north` with surrounding whitespace/newline, `North` → `[{zone:'central'},{zone:'midnorth'},{zone:'north'}]`; an old name `Central &amp; Southwest Springs` → exit 1 and stderr lists `Central`, `Mid-north`, `North`.
`tests/check-wording.test.ts` (both `--licensed` states; a good tree from the existing helpers plus one phrase):
11. Visible `my home office` → exit 1, message names the file; `Home visits`, `home-office`, `Home mobile` → exit 1 each.
12. The phrase only in `alt="…"` or `<meta name="description" content="…">` → exit 1; only inside `<script>` or `<style>` → exit 0.
13. `go back to the home page`, `aria-label="Ohm Precision Bodywork, home"` before `Ohm…` text, `mobile visit`, `office session` → exit 0.
14. Sequence: a tree with `Sessions are at my home office` → exit 1; the same file rewritten to `my office` → exit 0.

## Done when
1. `npm run check` passes, including the new tests (paste the existing `fix` warning on About).
2. `npm run shots -- 13`: `book`, `book/central`, `book/midnorth`, `book/north`, `book/office`, `services` at 375 and 1280 px in `docs/build/screens/13/`. Zone labels sit inside their areas and clear of the Ω (adjust `labelNudge['zone:central']` only if the shorter label now collides); buttons read `Central`, `Mid-north`, `North`, `Outside my regular area`; colours unchanged.
3. `ls dist/book` has `central.html midnorth.html north.html office.html out.html` and no `home.html`/`shared.html`; `grep -o "keyword=central" dist/book/central.html` hits; `grep -rl "data-placeholder\|home office" --include="*.html" dist` prints nothing; `grep -rhoE "[A-Za-z-]+ Springs" --include="*.html" dist | sort -u` prints only `Colorado Springs` and `Manitou Springs`.
4. `git status` doesn't list the KML; `zones.geojson` diff is the two key lines only. No hex outside `tokens.css`, no new dependency.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
