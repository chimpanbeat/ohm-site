# 8B: Map polish, office map, resistor divider, copy

Model: sonnet
Brief: §1, §5, §6 (flow, map), §7, §8
Architecture: §A3 (H1 divider), §B2, §B3 (OfficeCard, ZonePicker, ServiceMap), §B4 (state machine `deselect` / `hot`, "Styling", "Office map"), §C 2026-10-06 (8A)
Copy: `docs/build/copy-deck.md`: Global "Changes in step 8A", Home → Why "Ohm", Services intro, Pricing intro, About meta + paragraph 2, Book → Mobile section
Context: `steps/8A-review-contracts.md`

Opus already changed the contract files in 8A (the build still passes):
- `src/data/site.ts`: `officeArea` text; `office.mapArea = { lat: 38.79, lng: -104.86, radiusKm: 1.5 }`.
- `src/data/wording.ts`: new key `notSpa`.
- `src/styles/tokens.css`: `--zone-home-tint`, `--zone-shared-tint`, `--zone-north-tint`.

**Don't edit `site.ts`, `wording.ts`, `tokens.css`, `geo.ts` or `astro.config.mjs`. No new dependencies.**

## Files
| File | Change |
|---|---|
| `src/styles/global.css` | `h1::after` becomes the resistor zigzag, exactly as specified in ARCHITECTURE §A3 (mask + `-webkit-mask`, `background: var(--accent)`, 72×12px). Spacing: ≥ `--s-8` from the bottom of the zigzag to the next element on **every** page with an H1. Do it with one global rule (for example `h1 + * { margin-top: var(--s-8) }`, or a margin on `h1`), and remove page-level margins that fight it (`.intro` in `services.astro` and `pricing.astro`, and whatever Book, About, Home hero and 404 use). Measure the gap in the browser on all of them. |
| `src/pages/services.astro` | Intro per the copy deck: `{w('notSpa')} I take a clinical approach…`. |
| `src/pages/pricing.astro` | Intro per the copy deck (the "already included…" clause is dropped). |
| `src/pages/index.astro` | Per the copy deck: meta `description`, hero subline, "Who it's for" and "Why Ohm" paragraphs. |
| `src/pages/about.astro` | `description` per the copy deck. Replace the five body paragraphs with Brian's bio from the copy deck, exactly (¶3 keeps `{w('training')}`). Remove the `TODO(Brian): review About draft` comment. |
| `src/components/OfficeCard.astro` | New `<p>I send the exact address after you book.</p>` right after the area line (ARCHITECTURE §B3). |
| `src/components/ZonePicker.astro` | Per ARCHITECTURE §B3: remove the swatch spans and their CSS. Zone buttons (`home`, `shared`, `north`): `background` and `border-color` `var(--zone-{key}-tint)`, `color: var(--ink)`. Their hover state keeps the tint (at most a 150ms underline or border change; no colour inversion). `out`: the quiet style with `border-style: dashed`. Chosen (`[aria-current]`): zone buttons get `box-shadow: 0 0 0 3px var(--text-on-dark)`; `out` keeps the inverted cream fill. `ul:has(a[aria-current]) a:not([aria-current]) { opacity: 0.5 }`. `.is-hot` (set by book.ts): the same 3px ring. The `:focus-visible` outline must stay visible on every state. |
| `src/lib/mapview.ts` | Add to `MapFrame`: `unitsPerKm: number` (map units per km, from `k`: 1° of latitude = 110.57 km), and `viewAround(lng, lat, halfWidthKm): View`, a 4:5 view centred on the projected point, `2 × halfWidthKm × unitsPerKm` wide, rounded the way `fit` rounds. |
| `src/components/ServiceMap.astro` | See "ServiceMap" below. |
| `src/pages/book/index.astro` | In `#office`, after `<OfficeCard />`: `<ServiceMap focus="office" id="office-map" />`. The mobile map keeps the default id. |
| `src/pages/book/[zone].astro` | Office page: `<ServiceMap focus="office" />` under the card (other zones unchanged). |
| `src/scripts/book.ts` | See "book.ts" below. |
| `scripts/check-contrast.mjs` | Add a `mix(fgHex, bgHex, p)` helper (sRGB channel mix, as CSS `color-mix(in srgb …)` does) and pairs: `ink` on each of the three tints (`mix(green-700|green-300|terra-500, cream, 0.4)`), min 4.5. Also each tint against `green-900` (the button edge on the page), min 3.0. Keep the existing pairs. |
| `tests/site.test.ts` | `site.office.mapArea`: `lat` and `lng` have at most 2 decimals (`Number(x.toFixed(2)) === x`), `radiusKm` ≥ 1. |
| `tests/mapview.test.ts` | `viewAround`: 4:5; the centre is within 0.2 units of `project(lng, lat)`; width = `2 × km × unitsPerKm` (±0.5). `unitsPerKm`: two points 0.1° of latitude apart project 11.057 km × `unitsPerKm` apart (±0.5). |
| `README.md` | "Updating rates, days and links": one line saying the office circle on the map is `site.office.mapArea` (approximate on purpose; 2 decimals). |

### ServiceMap
- **Props:** `focus?: ZoneKey | 'office'`, `id?: string = 'map'`. The `<title>` / `<desc>` ids become `{id}-title` / `{id}-desc` (and `aria-labelledby` follows them).
- **Zone fills:** `fill: var(--zone-{key}-tint)`, `fill-opacity: 1`. `.zone.is-muted` stays as it is. Add `.zone-line.is-hot { stroke-width: 4px }`.
- **Office mode** (`focus === 'office'`), per ARCHITECTURE §B4 "Office map":
  - no zone fills, zone outlines or zone labels;
  - `view = frame.viewAround(mapArea.lng, mapArea.lat, 6)`, with `--map-scale` set as in zone focus;
  - roads and places as usual, then the circle, its label `My office is in this area` (zone-label style, counter-scaled, about 1.2 × r below the centre), and no pin;
  - circle: class `office-area`, fill `var(--accent)` with `fill-opacity: 0.18`, stroke `var(--accent)` 2px, `vector-effect: non-scaling-stroke`;
  - `<title>` / `<desc>` from the copy deck;
  - below the SVG, only the credit line.
- **Zone mode, below the SVG** (in this order):
  1. `<p class="map-link"><a class="btn btn--quiet" href={site.mapViewerUrl} target="_blank" rel="noopener">Open in Google Maps <svg …icon…/><span class="visually-hidden"> (opens in a new tab)</span></a></p>`. The icon is a small inline external-link glyph (a box with an arrow out of the top-right corner), about 1em, `aria-hidden="true"`, `stroke="currentColor"`, no hex.
  2. `.map-hint` (hidden; text from the copy deck).
  3. The credit line.
- **Reset button:** wrap the `<svg>` in `<div class="map-frame">` (`position: relative`, same max-width as the svg). Inside it, after the svg: `<button type="button" class="map-reset" hidden>Show all areas</button>`, positioned top-right with `--s-2` inset. Style: `--bg-light` background, `--ink` text, 1px `--line-light` border, `--radius`, `--fs-small`, weight 700, `min-height: 44px`, `padding-inline: var(--s-3)`. Zone mode only.
- Keep the inline SVG for `/book` under ~40 KB **per map**, and report both sizes.

### book.ts
Follow the ARCHITECTURE §B4 state machine (8A lines). Specifics:
- `const reset = mobile.querySelector('.map-reset')`. In `select()`, show it when `zone` is home/shared/north, else hide it.
- **`deselect()`:** exactly as in §B4. The map reset is `svg.setAttribute('viewBox', viewBoxAttr(frame.full))`, `--map-scale` `1`, and both classes removed from every `[data-zone]` element. Call `clearAddress?.()`.
- **Click handler:**
  - A picker link that already has `aria-current` → `preventDefault()`, then `deselect()`. Modified clicks pass through as before.
  - A `path.zone` that has `is-focused` → `deselect()`.
  - A click on `.map-reset` → `deselect()`.
- **`hot(zone | null)`:** delegated `pointerover` / `pointerout` (or `pointerenter` per element) on the picker links and the `path.zone` elements, plus `focusin` / `focusout` on the picker links. Only for home/shared/north. It toggles `is-hot` on `#mobile .zone-picker a[data-zone=z]` and on `#mobile svg [data-zone=z].zone-line`. Clear it on leave. Don't let it fight `is-muted`: a muted area can still be hot (thicker outline is fine).
- The office map needs no JS. Don't query it.
- Privacy is unchanged: no `console.*`, and no coordinates leave memory or the pin transform.

## Done when
1. `npm test`: 0 fail; the 2 existing `todo` fixtures stay todo.
2. `npm run build` succeeds with no TypeScript errors.
3. `npm run check:wording` passes. Paste any warnings. One is expected: "fix" in About ¶1, which is engineering context. `npm run check:contrast` passes; paste the output.
4. Greps:
   - `grep -rli fpga dist src` → nothing.
   - `grep -rliE 'desk-bound|desk workers' dist src` → nothing ("desk work" on Services stays).
   - `grep -rl 'already included' dist` → nothing.
   - `grep -rE '#[0-9a-fA-F]{3,6}\b' src --include=*.astro --include=*.ts --include=*.css` → only `tokens.css`.
   - `grep -rl 'swatch' src` → nothing.
5. `dist/book.html`:
   - two `<svg role="img">` with distinct `aria-labelledby` ids, and no duplicate `id` anywhere in the page (check with a script);
   - the office svg has an `office-area` circle, no `path.zone`, and the label text;
   - the mobile svg has the `.map-reset` button (hidden) and the `Open in Google Maps` button;
   - report each svg's byte size.
   `dist/book/office.html` has the office map. `dist/services.html` intro starts "This isn't a generic spa session". `dist/pricing.html` intro has no "column". `dist/index.html` has "electrical engineer" and "the sacred sound of yoga and meditation".
6. **In the browser** (`npm run dev` on 4321 if it's free, otherwise the preview on 4321 after a rebuild, as in 7B). Record each result and save 375px and 1280px screenshots of a, c, d and f to `docs/build/screens/8B-*.png` (gitignored):
   a. `/book` → At your place: the three zone buttons are visibly the same colours as their map areas, and `out` is dashed.
   b. Hover the Mid-north button: the Mid-north outline thickens on the map. Hover the North area on the map: the North button gets the ring. Leaving clears both.
   c. Click Mid-north: zoom, grey-out, card, the Mid-north button ringed and the other three dimmed, "Show all areas" visible on the map.
   d. Click Mid-north again: card gone, no button chosen, full view, no grey-out, reset hidden. Repeat via "Show all areas", and via clicking the focused area on the map.
   e. Enter `Wynbury Ct, Colorado Springs, CO 80919`, then deselect: pin hidden, address field empty.
   f. Choose At my office: the card shows the new area line and the address line; the map shows a circle near Cheyenne Canyon / the Broadmoor with its label, roads labelled, and no zones.
   g. JS off (sandboxed iframe as in 7B): `/book/office` and `/book/north` show their maps; picker links navigate.
   h. The H1 divider is a zigzag on Home, Services, Pricing, About, Book, `/book/north` and 404, with ≥32px from its bottom to the next element. Measure with `getBoundingClientRect` and list the numbers.
   i. Header and pages at 360px: no horizontal scroll on `/book` (both sections), `/services` or `/pricing`.
   j. The console shows nothing from our code.
   k. Keyboard: Tab to a zone button, press Enter to choose (focus moves to the card heading, §B4), Shift+Tab back to the button, Enter again to deselect. The focus ring is visible in all three button states. *(Amended in 8R: the original "Enter again" ignored the heading focus.)*
7. `git status --porcelain` lists no `.kml`, `.kmz` or `.env` file. `git diff --stat` shows no edits to the contract files beyond Opus's 8A edits.

## Report
(Sonnet, Oct 6 2026.)

**Files changed**
- `src/styles/global.css`: `h1::after` is the 72×12 resistor zigzag (mask and `-webkit-mask` over `var(--accent)`); one global `h1 + * { margin-top: var(--s-8) }`.
- `src/lib/mapview.ts`: `MapFrame.unitsPerKm` and `viewAround(lng, lat, halfWidthKm)`.
- `src/components/ServiceMap.astro`: props `focus?: ZoneKey | 'office'` and `id`; office mode; `.map-frame` wrapper with the `.map-reset` button; the Google Maps button and new hint; tint fills; `.zone-line.is-hot`; `.office-area`.
- `src/components/ZonePicker.astro`: swatches removed; tinted zone buttons, dashed `out`, chosen ring, dimming, `.is-hot` ring.
- `src/components/OfficeCard.astro`: "I send the exact address after you book."
- `src/scripts/book.ts`: `deselect()`, `hot()`, reset button, toggle clicks, linked hover.
- `src/pages/book/index.astro`, `src/pages/book/[zone].astro`: office map; `[zone]` renders `<ServiceMap focus={zone} />` for every zone including office; `.result` margin removed.
- `src/pages/index.astro`, `services.astro`, `pricing.astro`, `about.astro`: copy per the deck; `.intro`, `.subline` and `.about h1` margins removed; About TODO comment removed.
- `scripts/check-contrast.mjs`: `mix()` helper plus the tint pairs.
- `tests/site.test.ts`, `tests/mapview.test.ts`: the new tests. `README.md`: the office-circle line.

**Checks**
1. `npm test`: 53 tests, 51 pass, **0 fail**, 2 todo (the Cordera and Wolf Ranch fixtures).
2. `npm run build`: succeeds, 11 pages. There's no `astro check` or `tsc` script, and no new dependency, so there was no separate typecheck.
3. `npm run check:wording`: OK, with one expected warning, `"fix"` in About ¶1 ("testing each fix until it held"). `npm run check:contrast`: all pass:
   ```
   ok   ink on home tint: 7.10 (min 4.5)     ok   home tint on green-900: 5.24 (min 3)
   ok   ink on shared tint: 10.26 (min 4.5)  ok   shared tint on green-900: 7.57 (min 3)
   ok   ink on north tint: 9.56 (min 4.5)    ok   north tint on green-900: 7.06 (min 3)
   ```
   (The 5 existing pairs still pass: 10.56, 8.10, 14.30, 4.89, 3.52.)
4. Greps: `fpga`, `desk-bound|desk workers` and `already included` find nothing. No raw hex outside `tokens.css`. **`grep -rl swatch src` still finds `src/styles/tokens.css`**: a comment on line 45 ("matching swatches on the zone buttons"). It's a contract file, so I left it (see Questions).
5. `dist/book.html`: two `role="img"` svgs with `office-map-title office-map-desc` and `map-title map-desc`, no duplicate ids. The office svg has 1 `office-area` circle, 0 `path.zone` and 0 `zone-line`, and the label. The mobile svg has the hidden `.map-reset` and the Google Maps button. **Sizes: office svg 9,569 bytes; service map svg 13,989 bytes** (limit ~40 KB). `book/office.html` has the circle. Services intro starts "This isn't a generic spa session"; the Pricing intro has no "column"; Home has "electrical engineer" and "the sacred sound of yoga and meditation".
6. Browser (preview on 4321 after a rebuild; screenshots in `docs/build/screens/8B-*.png`, a/c/d/f at 375 and 1280, plus two keyboard shots):
   - **a** pass. Button backgrounds equal the map fills exactly (home `srgb 0.6 0.698 0.673`, shared `0.771 0.825 0.8`, north `0.878 0.761 0.707`, map `fill-opacity` 1). `out` is a dashed cream outline.
   - **b** pass. Hovering Mid-north → `.zone-line` for shared goes to 4px. Moving the mouse onto the North area → the North button gets the 3px ring and its outline is 4px. Both clear on leave.
   - **c** pass. Mid-north: viewBox `88.4 239.4 425.9 532.37`, `--map-scale` 2.348, focused `shared`, muted `home`/`north`, card shown, shared button `aria-current` + ring, the other three at opacity 0.5, "Show all areas" visible.
   - **d** pass, all three ways. Re-clicking the chosen button, "Show all areas", and clicking the focused area on the map each give: no card, no `aria-current`, full viewBox, `--map-scale` 1, no `is-focused`/`is-muted`, reset hidden, all four buttons at opacity 1. Focus moved to the first area button after the reset button went away.
   - **e** pass. `Wynbury Ct, Colorado Springs, CO 80919` → Mid-north card, pin shown. Reset → pin hidden, card empty, address field empty. (This used the live Places key: one autocomplete session.)
   - **f** pass. The card shows the new area line, "I send the exact address after you book." and the days. The map has the circle (centred, d≈81px in a 328px map), the label below it, `I-25`, `US 24` and `Colorado Springs` labelled, 0 zone paths, only the credit line, no Google button, no reset button.
   - **g** pass, JS disabled (a fresh context with `javaScriptEnabled: false`). `/book/office` shows the office map, `/book/north` the zoomed map with North focused, and `/book` both maps. Clicking a picker link navigated to `/book/north`.
   - **h** pass. The gap from the H1 bottom to the next element is **32px** on `/`, `/services`, `/pricing`, `/about`, `/book`, `/book/north` and `/404`, at 1280 and 375 alike. The `::after` is 72×12 with a mask.
   - **i** pass. At 360px, horizontal overflow is 0 on `/book` (office and mobile sections), `/services` and `/pricing`.
   - **j** pass. During the run nothing came from our code (a `console` and `pageerror` listener caught nothing). The session's cumulative log also holds a `places.googleapis.com` 400 and "Blocked script execution" lines from the sandboxed-iframe runs in 7B (port 4322), neither from this phase's code, plus the headless font-preload warnings.
   - **k** pass, with one finding (Questions 2). The focus outline (2px terracotta, offset 3px) shows in all states: unchosen, chosen (ring plus outline), dimmed (opacity forced to 1), and just deselected.
7. `git status` shows no `.kml`, `.kmz` or `.env`. The contract files (`site.ts`, `wording.ts`, `tokens.css`) carry only Opus's 8A edits, which were already uncommitted when 8B began; I didn't touch them. Nothing is committed.

**Deviations**
- **Dimmed buttons come back to full opacity on keyboard focus or `.is-hot`** (`ul:has(a[aria-current]) a:not([aria-current]):is(:focus-visible, .is-hot) { opacity: 1 }`). Without it, the focus ring and hover ring are drawn at 0.5 opacity, which fails the "focus ring must stay visible" requirement.
- **`focusin` sets `hot` only when the button matches `:focus-visible`.** Otherwise a mouse click focuses the button, and the ring would stick to it after a deselect.
- **`deselect()` also calls `hot(null)`.** Without it, a keyboard-focused button keeps the "hot" ring after the toggle and looks chosen.
- **The script's map selector is now `#mobile .service-map svg[role="img"]`**, since the Google Maps button's icon is also an `svg` inside `.service-map`. The map's CSS is scoped to `.map-frame > svg` for the same reason.
- **Office-map road labels are placed against the office view, not the full view** (`labelBounds` in `ServiceMap.astro`). With the full view, the roads' labels would have landed off-canvas.
- **`/book/[zone]` loses the `{zone !== 'office' && …}` guard** and renders `<ServiceMap focus={zone} />` for every zone; `ServiceMap` handles `'office'` itself.

**TODO(Brian)**
- None new. The existing one (confirm the office circle is the right neighbourhood) is still open in STATUS.

**Questions for Opus**
1. `src/styles/tokens.css` line 45 still says "…the matching swatches on the zone buttons". It's a contract file, so I couldn't fix it, and it makes `grep -rl swatch src` (Done-when 4) non-empty. Reword the comment, or drop the grep for that file.
2. **Done-when 6k:** Enter on a focused area button does choose it, but `select()` then moves focus to the card heading (§B4: "then focus the cloned heading"), so "Enter again to deselect" on that same button can't happen without tabbing back. Deselect by keyboard works once the button is focused again (shift-tab, then Enter), and it's also reachable through "Show all areas". Do you want focus to stay on the button for the `pick` path, or keep the heading focus?
3. Cosmetic: in the office map at 375px the `I-25` label sits on the road line and touches the "Colorado Springs" place label (the `labelNudge` table is shared by both views). A per-view nudge would fix it if you care.

## Review
(Opus, 8R, Oct 6 2026.) **Accepted.**

Re-ran: `npm test` 51 pass / 0 fail / 2 todo; `npm run build` OK (11 pages); `check:wording` OK (the expected "fix" warning only); `check:contrast` all 11 pairs pass; Done-when 4 greps clean after the tokens.css fix below; no `.kml`/`.kmz`/`.env` in `git status`. Read the full diff. The deviations are all accepted: each fixes a real gap in the spec (focus ring at 0.5 opacity, sticky hot ring after a mouse click, the icon svg catching the map selector, off-canvas road labels).

Answers:
1. tokens.css comment reworded by Opus (no more "swatches").
2. Keep focus on the card heading for both paths. The card sits right under the picker, and focusing its heading tells screen-reader users what was chosen, the same as the address path. Done-when 6k amended.
3. Fixed by Opus, plus a second defect in the same view: the office map now uses its own `officeNudge` table (empty), because the full-map nudges are in full-map units and threw "Colorado Springs" ~3 km south onto I-25. The office map also drops places whose anchor is outside its view (half of "Manitou Springs" was poking in at the top-left). Checked at 375px: `docs/build/screens/8R-office-375.png`.

Not re-checked live in 8R: browser checks b–k on `/book` (navigation to `/book` was denied in the 8R session). They rest on the 8B Report; the 8R edits touch only the office map.

Open for Brian (not a defect): the office map has little context around the circle. The OSM data holds only the zone-border roads and town names, so the lower half is empty and nothing names Cheyenne Cañon or the Broadmoor. Adding local roads and landmark labels would mean a `fetch-osm.mjs` change, a possible Phase 9 item.
