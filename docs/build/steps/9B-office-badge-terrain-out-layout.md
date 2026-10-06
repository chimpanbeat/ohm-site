# 9B: Office badge, terrain and minor roads, clickable "outside", dimming, layout fixes, copy

Model: sonnet
Brief: §6 (flow, map)
Architecture: §A3 (layout primitives), §A5 (About), §B3 (ZonePicker, ServiceMap), §B4 (state machine 9A lines, "Layers", "Styling", "Office map", "Office badge", "Terrain"), §B5 (`npm run osm` minor roads, `npm run terrain`), §C 2026-10-06 (9A)
Copy: `docs/build/copy-deck.md`: Global "Changes in step 9A", Book → Mobile section, Services (cream band, 9A), Pricing (PriceTable note)
Context: `steps/9A-review-contracts.md`

Opus already made these contract edits in 9A (the build still passes):
- `src/styles/tokens.css`: `--zone-out-tint`.
- `.gitignore`: `.cache/`.

**Don't edit `site.ts`, `wording.ts`, `tokens.css`, `geo.ts` or `astro.config.mjs`. No new dependencies** (`sharp` is already importable, as `scripts/make-icons.mjs` does). Leave `--zone-muted` and `office.mapArea.radiusKm` in place, but stop using them; Opus deletes them in 9R.

## Files
| File | Change |
|---|---|
| `src/styles/global.css` | (1) `html { scrollbar-gutter: stable; }`. (2) The first section on a page gets half the top padding: `main > .section:first-child { padding-top: var(--s-8) }`, and `var(--s-12)` at `min-width: 48rem`. Bottom padding unchanged. Check that every page except Home starts with a `.section` as `main`'s first child (`/services`, `/pricing`, `/about`, `/book`, `/book/*`, `/404`); if one doesn't, fix the page, not the rule. |
| `src/pages/about.astro` | Order: `<h1>`, then `<picture>`, then the bio and CTA. Keep the picture's `margin-bottom`. The global `h1 + *` rule gives the gap above the picture. |
| `src/pages/services.astro` | Per the copy deck → Services (9A): cream band order office/mobile H2 + paragraph (with the `aria-hidden` `*` after the travel fee) → footnote `<p class="footnote">` (small text, `margin-top: var(--s-2)`) → `Specialties` H2 (`.gap`) + Brian's intro paragraph → the four H3 blocks → scope note. Delete the Pricing H2 and paragraph and the now-unused `minPrice`. Neuromuscular P1: "plays a big role in". |
| `src/components/PriceTable.astro` | `thead th`: `font-size: var(--fs-body)` (drop `--fs-small`), weight 700, `vertical-align: top`. The `.note` stays `--fs-small`, weight 400, on its own line under "At your place". |
| `src/components/Header.astro` | Logo sizes per ARCHITECTURE §A4 (9A): `.logo-full` 240px at `min-width: 48rem`, 200px by default, 130px in the compact query; `.logo-icon` 48×48 (update the `<Image>` `width`/`height` props to match: 240 with `densities={[2, 3]}`, icon 48). Header height unchanged. Re-measure the compact (now 33rem) and icon-only (now 25rem) breakpoints: the row needs ≥ 8px to spare at every width from 320 to 1280. Move a breakpoint rather than shrink the nav. Update the two comments with the new measured widths. |
| `src/pages/index.astro` | Why "Ohm" paragraph per the copy deck (new second sentence). |
| `src/pages/book/index.astro` | Boundary line per the copy deck: two links, `Chat with me` → `site.contact.chat`, `send me an email` → `mailHref` (import it from `site.ts`). |
| `src/scripts/book.ts` | Address label `Not sure? Enter your address:` (copy deck). State machine changes: see "book.ts". |
| `src/components/ZonePicker.astro` | `out` button per §B3 (9A): dashed outline, no fill by default; chosen (`aria-current`) → `background: var(--zone-out-tint)`, `border-color` stays dashed in `--ink`, `color: var(--ink)`, plus the same 3px ring as the zone buttons. Remove the inverted cream fill. `.is-hot` applies to `out` too. The dim rule (`opacity: 0.5` for the others) is unchanged and now also dims the three zone buttons when `out` is chosen. Focus outline still visible in every state. |
| `scripts/fetch-osm.mjs` | Minor roads, per §B5 (9A). See "fetch-osm" below. Then run `npm run osm` and commit-ready `src/data/osm.geojson`. |
| `scripts/make-terrain.mjs` (new) + `package.json` script `"terrain": "node scripts/make-terrain.mjs"` | Per §B5 (9A). See "make-terrain" below. Run it; it writes `src/assets/terrain.webp` and `src/data/terrain.json`. |
| `src/components/ServiceMap.astro` | See "ServiceMap" below. |
| `scripts/check-contrast.mjs` | Add the out tint: `mix(ink, cream, 0.15)`. Pairs: `ink` on it ≥ 4.5; it against `green-900` ≥ 3.0. |
| `tests/site.test.ts` | Remove nothing. (Opus removes the `radiusKm` line in 9R.) |
| `tests/osm.test.ts` (new) | `osm.geojson`: exactly one `kind: 'minor'` feature, a `MultiLineString` with ≥ 50 lines and no `name` property; every feature's properties are only `kind`, `name`, `major` (no OSM ids or tags); every coordinate is inside the box `[-105.09, 38.63, -104.54, 39.17]`. |
| `tests/terrain.test.ts` (new) | `terrain.json` has `bbox` equal to `[-105.09, 38.63, -104.54, 39.17]`, integer `width`/`height`, and `src/assets/terrain.webp` exists and is under 200 KB. |
| `README.md` | "Re-exporting zones" neighbourhood: a short `npm run terrain` section (what it does, run by hand, `.cache/` reused, ~80 tile downloads on the first run) and the full credit sentence `3DEP data courtesy of the U.S. Geological Survey`. Mention that `npm run osm` now also writes the minor roads. |

### fetch-osm
- Add to the Overpass union: `way["highway"~"^(primary|secondary)$"](${box});`. Keep everything else.
- A way is **minor** if `shortName(tags)` is `null` and its `highway` is `primary` or `secondary`. Named roads are unchanged.
- All minor ways go into **one** pool: join chains (`joinLines`), clip (`clipLine`), simplify with a new `SIMPLIFY_MINOR_DEG = 0.0006`, drop pieces shorter than `MIN_MINOR_KM = 1` (plain length; no cluster logic), round as now.
- Output: one extra feature `{ kind: 'minor' }` (no `name`, no `major`), a `MultiLineString`, written **before** the named roads. Print its line and vertex counts.
- Budget: see Done-when 5. If over, raise `SIMPLIFY_MINOR_DEG` (up to 0.001) and `MIN_MINOR_KM` (up to 2), in that order. If it's still over, escalate.

### make-terrain
No dependencies beyond `sharp` and Node built-ins. Never runs in CI.
1. **Box:** `BBOX = [-105.09, 38.63, -104.54, 39.17]` (W, S, E, N), the same box as `npm run osm`.
2. **Tiles:** Terrarium PNGs at **zoom 12**, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/{x}/{y}.png`, every tile that covers the box (standard Web Mercator tile maths). Cache each at `.cache/terrain/12/{x}/{y}.png`; reuse a cached tile instead of downloading. Send `User-Agent: ohm-site map builder (https://github.com/chimpanbeat/ohm-site)`. Fetch sequentially. Exit 1 on any non-200, naming the tile.
3. **Decode** with `sharp(file).raw()`: `elevation = R × 256 + G + B / 256 − 32768` (metres).
4. **Output grid:** regular in lng/lat. `width = 1024` px across the box; `height = round(width × (N − S) / ((E − W) × cos(lat0)))`, `lat0` = the box's middle latitude. For each output pixel centre, sample the elevation bilinearly at its lng/lat (convert to global Mercator pixel coordinates at zoom 12, then read from the right tile).
5. **Hillshade (Horn):** cell size in metres `dx = (E − W) / width × 111320 × cos(lat0)`, `dy = (N − S) / height × 110570`. Sun azimuth 315°, altitude 45°, z-factor 1. `shade` in [0, 1]; `flat = sin(45°)`.
6. **Shadow alpha:** `a = clamp(1 − shade / flat, 0, 1)`, then `alpha = round(255 × a ^ 0.8)`. Sunlit and flat ground: alpha 0. Pixel = RGBA `(0, 0, 0, alpha)`.
7. Light blur (`sharp.blur(0.6)` on the alpha) is allowed if the result looks noisy. Write **WebP** with alpha (`quality: 70, alphaQuality: 70`) to `src/assets/terrain.webp`. Must be under 200 KB; lower `alphaQuality` if not.
8. Write `src/data/terrain.json`: `{ "bbox": [W, S, E, N], "width": …, "height": … }`, 2-space JSON.
9. Print the tile count (downloaded / cached), the output size and the min/max elevation (expect roughly 1,700–4,300 m: Pikes Peak is in the box).

### ServiceMap
- **Layers, bottom to top (§B4 9A):** zone fills (incl. `out`) → terrain → minor roads → named roads → zone outlines → road labels → place labels → zone labels → office badge → pin.
- **Out area:** a `path.zone.zone--out` with `data-zone="out"`, `fill-rule="evenodd"`: an outer rectangle `full` grown by 5 × its size on every side, plus every ring of every zone as holes. Drawn first. CSS: `fill: var(--zone-out-tint)`, `fill-opacity: 0`, `pointer-events: fill` (default), `fill-opacity: 0.6` with `.is-hot`, `1` with `.is-focused`. No outline, no label. Office mode: none.
- **Muted zones (9A):** `.zone.is-muted` keeps its own tint fill at `fill-opacity: 0.35`. Delete the `--zone-muted` fill rule. Outlines (`stroke-opacity: 0.25`) and labels keep their current muted styles.
- **Static focus:** `focused` now includes `out`: with `focus="out"` the out path is `is-focused` and the three zones `is-muted` (the view stays `full`).
- **Terrain:** `import terrainImg from '../assets/terrain.webp'` and `terrain.json`. `[x0, y0] = project(W, N)`, `[x1, y1] = project(E, S)`. `<image class="terrain" href={terrainImg.src} x={x0} y={y0} width={x1 − x0} height={y1 − y0} preserveAspectRatio="none" aria-hidden="true" />`. CSS: `opacity: 0.6; pointer-events: none`. Start at 0.6 and tune between 0.4 and 0.8 so the Front Range reads clearly while the city stays almost untouched; report the value. Office mode too.
- **Minor roads:** the `kind: 'minor'` feature as one `<path class="road road--minor">`: `--ink`, `stroke-opacity: 0.22`, `1px`, non-scaling. No label.
- **Clipping for static maps:** when `focus` is set (the office map and every `/book/[zone]` map), clip all road lines (minor and named) to the view grown 5% on each side: keep runs of consecutive vertices inside it, plus one vertex either side of each run, and drop runs of fewer than 2 points. Road **labels** are computed before clipping (unchanged). The `/book` mobile map (no `focus`) is not clipped.
- **Office mode (9A):** view = `frame.viewFor(bboxOf(zones, 'home'))`, then `frame.include(view, ox, oy, 120)` where `[ox, oy] = project(mapArea.lng, mapArea.lat)`. `--map-scale` as now. No circle. The office badge (not a link) at `[ox, oy]`, and the label `My office is in this area` (zone-label style, counter-scaled) centred below it: `translate(ox, oy)` then a counter-scaled `<text>` with `y` = 52 (in pre-scale units, just under the badge). `<title>`/`<desc>` from the copy deck.
- **Office badge (all maps):**
  ```astro
  const badgeImg = await getImage({ src: icon, format: 'webp', width: 96 });   // icon = ../assets/icon.png
  …
  <g class="office-badge" transform={`translate(${ox} ${oy})`}>
    <g class="office-badge-scale">                 <!-- style: transform: scale(calc(1 / var(--map-scale))) -->
      <circle r="36" />
      <image href={badgeImg.src} x="-30" y="-30" width="60" height="60" />
    </g>
  </g>
  ```
  Circle: `fill: var(--bg-light)`, `stroke: var(--accent)`, `stroke-width: 2px`, non-scaling. Zone mode wraps the outer `<g>` in `<a class="map-office" href={href('/book/office')} tabindex="-1" aria-hidden="true">` with a `<title>My office</title>` first child; `cursor: pointer`; hover: circle `stroke-width: 3.5px`. Office mode: no `<a>`, no hover. Size the icon so the Ω sits centred and clear of the ring (adjust `x/y/width/height` together; report the values).
- **Credit line (both modes):** per the copy deck: `Roads and places © OpenStreetMap contributors. Terrain: USGS 3DEP.` (the OSM link unchanged; the USGS part plain text).
- **Hint:** new text per the copy deck.
- **Size:** report the inline `<svg>` bytes for `/book` (mobile map and office map separately), `/book/north` and `/book/office`. Limits: the `/book` mobile map ≤ 70 KB; each static map ≤ 40 KB.

### book.ts
Follow §B4 (9A). Specifics:
- `isRegion` stays for the zoom decision only. Everywhere else (`hot`, reset visibility, map-area clicks), `out` is a normal choice.
- `focusZone('out')`: view as now (full, widened for a pin); then `is-focused` on the `out` path and `is-muted` on the three zones.
- `.map-reset` visible iff a zone is chosen (any of the four).
- **Click handler order:** `.map-reset` → `deselect()`; `.map-office` → `preventDefault()` (plain left clicks only, as for picker links), then `goOffice()`; picker links (unchanged toggle); `path.zone[data-zone]` including `out` (toggle: `is-focused` → `deselect()`, else `select(zone, 'pick')`).
- **`goOffice()`:** check the `office` radio, call `choose('office')`, scroll `#office` into view (`block: 'start'`; `scroll-padding-top` already clears the header) and focus `#office-h` (give it `tabindex="-1"` in JS if it has none). The mobile section's state is left as it is.
- **`hot()`:** accepts `out`; marks `#mobile .zone-picker a[data-zone=out]` and the `out` path. Pointer over the map background outside the zones now hovers `out`; that's intended.
- No `console.*`. Privacy unchanged.

## Done when
1. `npm test`: 0 fail; the 2 existing `todo` fixtures stay todo.
2. `npm run build` succeeds.
3. `npm run check:wording` passes (paste warnings; the About "fix" one is expected). `npm run check:contrast` passes; paste the output.
4. Greps:
   - `grep -rE '#[0-9a-fA-F]{3,6}\b' src --include=*.astro --include=*.ts --include=*.css` → only `tokens.css`.
   - `grep -rn 'zone-muted\|radiusKm' src --include=*.astro --include=*.ts --include=*.css` → only `tokens.css` and `site.ts`.
   - `grep -c 'office-area' dist/book.html` → 0.
5. Sizes (paste): `osm.geojson` bytes and minor vertex count; `terrain.webp` bytes (< 200 KB); the four inline svg sizes against the limits in "ServiceMap"; `dist/book.html` raw and gzip bytes.
6. **In the browser** (`npm run dev` on 4321 if free, else the preview on 4321 after a rebuild). Save 375px and 1280px screenshots of a, b, c, d, e and h to `docs/build/screens/9B-*.png`:
   a. `/book` → At my office: the office map is zoomed like Central & SW, shows minor roads and terrain, and the Ω badge with "My office is in this area" under it. No zones.
   b. `/book` → At your place, nothing chosen: terrain visible on the west side, minor roads faint, the Ω badge in southwest Colorado Springs, no out tint.
   c. Hover the map outside the zones: the out tint appears and the "Outside my regular area" button gets the ring; leave clears both. Click there: out card, out button chosen (tint + ring), the three zones dimmed but still coloured, "Show all areas" visible. Click outside again: deselected.
   d. Choose Mid-north: the other two zones keep their colours, dimmed (not grey); the out area stays clear.
   e. Click the Ω badge on the mobile map: "At my office" is checked, the office section shows, the page scrolls to it and focus is on its heading. Also: `/book/north` with JS off, clicking the badge navigates to `/book/office`.
   f. `/book/out` (JS off): out tinted, zones dimmed, out button chosen.
   g. Measure the header-bottom → H1-top gap on `/services`, `/pricing`, `/about`, `/book`, `/book/north`, `/404` at 375 and 1280: 32px and 48px (± 1). List the numbers.
   h. `/about`: H1 first, at the same position as `/services`'s H1 (same `getBoundingClientRect().top` ± 1); picture under it; bio after.
   i. Book-page shift: at 1280×800, the `.container` left edge of the header is the same on `/book` (fresh load, nothing chosen) and `/services`. Paste both numbers.
   j. The address label reads `Not sure? Enter your address:`; the boundary line has two working links.
   k. 360px: no horizontal scroll on `/book` (both sections), `/about`.
   l. Keyboard: Tab through the picker (4 buttons), Enter on "Outside my regular area" → card, focus on its heading; Shift+Tab back, Enter → deselected. The badge isn't in the tab order.
   m. Console: nothing from our code.
   n. `/pricing` at 375 and 1280: the three header labels have the same `getBoundingClientRect().top` (± 1) and computed `font-size` equal to body text; "includes $25 travel" sits under "At your place". No horizontal scroll at 360. Screenshot at both widths.
   p. Header: the logo's rendered width at 1280, 768, 500, 400 and 360 (full or icon), and the row's spare space at 320, 360, 390, 430, 528 and 768 (all ≥ 8px, no overflow). Screenshot at 1280 and 390. Home "Why Ohm" shows "the Greek letter omega (Ω)".
   o. `/services`: the cream band reads office/mobile → `* See rates and the travel fee.` (link → `/pricing`) → Specialties + intro → four specialties → scope note. No "Pricing" heading; no "Sessions start at". Screenshot at 375.
7. `git status --porcelain` lists no `.kml`, `.kmz`, `.env` or `.cache/` file. `git diff --stat` shows no edits to contract files beyond Opus's 9A edits.

## Report
**Files changed**
- `src/styles/global.css`: `scrollbar-gutter: stable`; first-section top padding halved (`--s-8` / `--s-12`). Every page except Home already starts with a `.section`, so no page needed fixing.
- `src/pages/about.astro`: H1, then picture, then bio.
- `src/pages/services.astro`: cream band reordered (office/mobile + `*` footnote → Specialties + intro → four H3 blocks → scope note); Pricing section and `minPrice` removed; "plays a big role in".
- `src/components/PriceTable.astro`: header cells at body size, bold, top-aligned.
- `src/components/Header.astro`: logo 240 / 200 / 130, icon 48; breakpoints re-measured (below).
- `src/pages/index.astro`, `src/pages/book/index.astro`: Home "Why Ohm" sentence; boundary line with chat + `mailHref` links.
- `src/scripts/book.ts`: address label colon; `out` is a full peer (focus, dim, reset, hot, click toggle); `goOffice()` and the `.map-office` click.
- `src/components/ZonePicker.astro`: `out` chosen = out tint + ink dashed border + ring (also on hover); the ring rule now covers all four buttons.
- `src/components/ServiceMap.astro`: out area path, terrain image, minor roads, office badge (link on zone maps, marker + label on the office map), `focus="out"`, office view = Central & SW zoom, road clipping for static maps, muted zones dimmed not grey, credit line, hint, office nudge for `US 24`.
- `scripts/fetch-osm.mjs`, `src/data/osm.geojson`: minor roads (155 lines, 1,404 vertices; file 45.5 KB).
- `scripts/make-terrain.mjs` (new), `package.json` (`terrain` script), `src/assets/terrain.webp` (80.7 KB), `src/data/terrain.json`.
- `scripts/check-contrast.mjs`: out tint pairs.
- `tests/osm.test.ts` (existed; extended, not new), `tests/terrain.test.ts` (new), `README.md`.

**Checks**
- `npm test`: 55 pass, 0 fail, 2 todo (the two existing fixtures).
- `npm run build`: OK.
- `npm run check:wording`: OK; one warning, the expected About "fix".
- `npm run check:contrast`: all ok, including `ink on out tint 10.61` and `out tint on green-900 7.83`.
- Greps: no hex outside `tokens.css`; `zone-muted` / `radiusKm` only in `tokens.css:49` and `site.ts:62`; `grep -c office-area dist/book.html` → 0.
- Sizes: `osm.geojson` 45,525 B (minor: 1,404 vertices); `terrain.webp` 82,654 B (< 200 KB). Inline svg: `/book` mobile map 32,267 B (limit 70 KB), `/book` office map 12,582 B, `/book/north` 20,316 B, `/book/office` 12,554 B (limit 40 KB each). `dist/book.html` 58,781 B raw, 16,566 B gzip.
- Browser (built preview on 4321, Playwright, 375 and 1280, screenshots `docs/build/screens/9B-*.png`):
  - a, b: office map is at the Central & SW zoom with minor roads, terrain, badge and label; the mobile map shows terrain, faint minor roads and the badge, with no out tint.
  - c: hovering the map outside the zones sets `is-hot` on the out button and tints the area (fill-opacity 0.6); click → out card, out chosen, three zones dimmed (fill-opacity 0.35, still coloured), "Show all areas" visible; a second click deselects.
  - d: choosing Mid-north dims the other two zones, out stays clear (fill-opacity 0).
  - e: badge click → "At my office" checked, office section top at 64px (just under the header), focus on `#office-h`. Without JS the badge is a link to `/book/office` (clicked on `/book/home`, which navigated).
  - f: `/book/out` with JS off: out `is-focused`, three zones `is-muted`, out button `aria-current`.
  - g: header-bottom → H1-top gap is 32 at 375 and 48 at 1280 on `/services`, `/pricing`, `/about`, `/book`, `/book/north`, `/404`.
  - h: About H1 top 112 and Services H1 top 112 at 1280; picture starts 32px under the H1 zigzag.
  - i: header `.container` left edge is 56.5 on `/book` (fresh) and 56.5 on `/services`.
  - j: label reads `Not sure? Enter your address:`; the boundary line has the two links.
  - k: no horizontal scroll at 360 on `/book` (both sections), `/about`, `/pricing`.
  - l: Tab order home, shared, north, out, then the address field (the badge is `tabindex=-1`); Enter on Outside → card with focus on its heading; Enter again → deselected.
  - m: console shows only the two existing font-preload warnings, nothing from our code.
  - n: `/pricing` header labels all at the same top (403 at 375, 459 at 1280); font size equals body (17px / 18px); "includes $25 travel" sits under "At your place".
  - o, p: screenshots saved. Header numbers below.
- Header, logo width (full or icon): 1280 → 240, 768 → 240, 500 → 130, 400 → icon 48, 360 → icon 48. Spare space (after the 12px flex gap; this browser has a classic 15px scrollbar, so these are on the tight side of real phones): 320 → 8, 360 → 48, 390 → 46, 430 → icon 48 / 86, 441 → 15 (full 130 starts), 528 → 102, 568 → 142, 569 → 11 (full 200 starts), 768 → 164. No overflow at any of these widths.

**Deviations**
1. **Header breakpoints moved** (as the step asks): compact row up to 35.5rem (was 33rem); icon-only up to 27.5rem (was 25rem). The bigger logos pushed both up. I also added a tier at ≤ 22.5rem (tighter header gutter, gaps and Book padding) because the icon row needs about 352 px and 320 px has no room otherwise; the nav text didn't shrink.
2. **Road clipping** keeps a segment when its bounding box touches the view grown 5% (not "vertices inside plus one either side"), so a long simplified segment that crosses the view with both ends outside isn't dropped. Runs under 2 points can't occur.
3. **Terrain blur** is `sharp.blur(2)` rather than 0.6: at 0.6 the plains were noisy. (The DEM's horizontal banding still shows faintly on the east side; see Questions.) 63 tiles were downloaded, not ~80.
4. `tests/osm.test.ts` already existed, so I extended it. Its "only kind, name, major" test now also checks that the minor feature has only `kind`.
5. Done-when 6e says to click the badge on `/book/north`: that view doesn't contain the office, so the badge is off-canvas there. I checked `/book/home` instead; `/book/north` still carries the link (`href` → `/book/office`).
6. The office map's `US 24` label collided with "Manitou Springs"; I added `officeNudge['road:US 24'] = [45, 30]`.
7. Terrain opacity left at 0.6 (not tuned: Opus looks at it with Brian in 9R).

**Office badge values:** circle `r=36`, icon `x=-30 y=-30 width=60 height=60` (centred, clear of the ring). On a 375 px phone the badge is about 23 px across; it is pointer-only and the "At my office" radio is the real path, but it is small. Label `y=52` clears the ring.

**TODO(Brian):** none new.

**Questions for Opus**
- Terrain looks right in the mountains but shows faint horizontal banding on the flat east side (3DEP data artifacts amplified by the `a^0.8` curve). A dead zone (e.g. `a = max(0, a − 0.05)`) would clean it. The step fixes the formula, so I didn't change it. Opacity 0.6 is also yours to set in 9R.
- The badge is 23 px on a phone at `r=36`. Make it bigger (e.g. `r=48`)?

## Review
**Opus, 9R (Oct 6): accepted, with one real bug fixed by Opus.**

- **Terrain was broken, not just "banded".** `sharp(...).blur().raw()` on a one-channel raw input hands back **three** channels, and `make-terrain.mjs` read that buffer as one channel. Every output row was a 3× squeezed, interleaved slice, so the committed image was stripes and noise. No Front Range, no Pikes Peak; the "plains banding" was the whole image. The elevation and hillshade maths were right (checked by rendering the sampled DEM). Fix: `.extractChannel(0)` after the blur, plus a length guard that throws if the buffer is ever the wrong size. With the real hillshade, the blur goes back to near the spec (`1`, was `2`), and `alphaQuality` drops to 50 to stay under budget: `terrain.webp` 187 KB (was 82 KB of noise). Re-run from the cache, no downloads. Lesson for future steps: a visual check has to compare against what the thing should look like (here, the mountains on the west), not just whether it looks plausible.
- **Terrain opacity: 0.6, kept.** With the real relief, the mountains west of the city read clearly and the plains and city stay nearly untouched (`screens/9R-terrain-{full,central,office}.png`). For Brian to confirm.
- **Dead zone (Sonnet's question): not needed.** The banding was the bug.
- Deviations 1–7 accepted. Clipping by segment bbox (2) is better than the spec's vertex rule. The `/book/home` substitute check (5) is correct: the office isn't in `/book/north`'s view.
- `out` chosen button: Sonnet's `9B-c-out` screenshot caught it mid-transition (cream text). Settled, it's ink on the out tint as specified (`9R-out-chosen.png`).
- Opus also removed `--zone-muted` (tokens.css) and `office.mapArea.radiusKm` (site.ts, test line) as planned.
