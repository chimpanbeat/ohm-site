# 10B: `/hello` motion and line, office mark and map buttons, hover dimming, site-wide spacing

Model: sonnet
Brief: §5 (`/hello` row), §6 (map)
Architecture: §A3 (spacing, motion exception), §A4 (footer), §A5 (About), §B4 ("Office map", "Office mark", "Hover dimming", "Map buttons"), §B5 (`npm run omega`, `npm run check:dist`), §B8, §C 2026-10-06 (10A)
Copy: `docs/build/copy-deck.md` → Book ("Office map button"), Hello
Context: `steps/10A-review-contracts.md` (item map, the measured spacing table, and **"Line"**, which has the exact CSS Brian approved)

Opus already made these edits in 10A (the build passes):
- `src/styles/tokens.css`: `--s-10: 2.5rem`.
- `src/data/site.ts`: `office.mapArea` → `38.8, -104.85`.
- `src/pages/index.astro`: Why "Ohm" without "the shape in my logo".

**Don't edit `site.ts`, `wording.ts`, `tokens.css`, `geo.ts` or `astro.config.mjs`. No new dependencies.** The office's street address must not appear anywhere in the repo.

## Files
| File | Change |
|---|---|
| `scripts/trace-omega.mjs` | Rotate the contour to its new start **before** simplifying (see "Ω start"), then simplify `d` and `dMap` as now. Run `npm run omega`. |
| `tests/omega.test.ts` | For `d` and `dMap`: the shoelace area (y down) is positive (clockwise on screen); the first vertex is on the baseline (y ≥ maxY − 6% of the viewBox height) and right of the viewBox centre; the second vertex is higher (smaller y) than the first. |
| `src/pages/hello.astro` | See "`/hello`". |
| `scripts/check-dist.mjs` + `tests/check-dist.test.ts` | Rule 7 becomes: `hello.html` may contain the JSON-LD block and **at most one** other `<script>`, which must have no `src`. Fail on any `<script src`, or on two or more non-JSON-LD scripts. Tests: one inline script passes; a `src` script fails; two inline scripts fail. |
| `src/components/ServiceMap.astro` | `markW` 125 → **105**. Office mode: add the `Show mobile service areas` link-button (see "Map"). Both map buttons get the dark style. `.is-dim` and hover rules (see "Hover"). |
| `src/scripts/book.ts` | `goMobile()`, the `#office` click handler, the `#mobile` hash on load, `hot()` dimming (see "book.ts"). |
| `src/styles/global.css` | `.section`: `--s-10` mobile, `--s-16` desktop. `main > .section:first-child` top: `--s-6` mobile, `--s-10` desktop. |
| `src/pages/index.astro` | Hero padding at ≥ 48rem: `--s-16` (was `--s-24`); mobile unchanged (`--s-12`). Subline at ≥ 48rem: `max-width: min(36rem, 52%)` (the H1 stays at 40%) and `text-wrap: balance`. Two lines at 1024, 1280, 1440 and 1920; three on phones is expected. |
| `src/pages/services.astro` | `.stack .gap` → `--s-10`. `.footnote`: drop the `font-size` (body size); keep `margin-top: var(--s-2)`. |
| `src/pages/about.astro` | Crop the photo shorter (see "About"). `picture` `margin-bottom` → `--s-6`; `.cta-p` → `--s-6`. |
| `src/components/Footer.astro` | Mobile (< 48rem): `padding-block: var(--s-8)`, grid `gap: var(--s-4)`, `.site-footer__legal` `margin-top: var(--s-2)`. Desktop unchanged. Target ≤ 200px tall at 375 (was 269). |
| `README.md` | `/hello` section: the light, the repeat, the click pause (one inline script; works without JS), the line sizing note. `npm run omega`: the start rule. |

### Ω start (`trace-omega.mjs`)
The contour is already clockwise on screen. Today it starts at the top of the arch. It must start at the **right foot's inner corner**, where the hand cut-out meets the baseline on the right (Brian circled it). A rule that also works for JohnMark's SVG later:
1. Baseline vertices: y ≥ maxY − 6% of the bbox height.
2. Split the closed contour into runs of non-baseline vertices. Exactly one run starts right of the bbox's centre x and ends left of it: that's the cut-out (up the thumb side, across the fingers, down the palm). (The outer run goes left to right, over the arch.)
3. The start vertex is the baseline vertex just before that run. Rotate the vertex list so it's first. Keep the direction.
4. Then simplify. Douglas–Peucker keeps endpoints, so `d` and `dMap` both start there. Print the start vertex. With today's trace it's about (664, 788) in viewBox units.

### `/hello`
Implement the CSS in `10A-review-contracts.md` → **Line** exactly: the `--omega-w`, `--line-fs` and `--line-ls` variables on `.hello`, the Ω width and the line styles. Remove the `text-shadow` halo and `padding-inline` from the line. The constants (`26.54`, `17.84`, `32`, `1.04`) are DM Sans metrics for this string; don't change them unless Done-when 5 fails, and report any change.

**Paths:** remove `.omega-idle` (markup and CSS). Keep `.omega-fill`, `.omega-glow-wrap` > `.omega-glow` and `.omega-light`.

**Light** (`.omega-light`): `stroke-width: 3px; opacity: 1; stroke-dasharray: 0.14 1; stroke-dashoffset: 0.14`. The pattern period (1.14) is longer than the path (`pathLength="1"`), so the dash never shows twice. At offset 0.14 it sits just before the start (hidden); at −1 it has run off the end (hidden); in between it enters at the start corner, runs once clockwise and drains back into it.
```css
.omega-light { animation: ohm-lap 11s 0.4s infinite; }
@keyframes ohm-lap {
  0%   { stroke-dashoffset: 0.14; animation-timing-function: ease-in-out; }
  41%  { stroke-dashoffset: -1; }   /* 4.5 s of 11 s: the lap */
  100% { stroke-dashoffset: -1; }   /* rest, then the next lap */
}
```
**Line:** `opacity: 0; animation: ohm-reveal 1s ease-out 4.9s forwards` (4.9s = 0.4s + 4.5s, when the first lap ends). It stays. **Nothing else ever changes its opacity** (no hover or focus rule on the line).

**Glow** (`.omega-glow`: `stroke-width: 6px; filter: blur(6px)`, static, no animation). `.omega-glow-wrap { opacity: 0; transition: opacity 300ms; }`, and `opacity: 1` for:
- `.hello:hover` inside `@media (hover: hover) and (pointer: fine)`
- `.hello:focus-visible` (outside that query; keep the inset ring)
- `.hello.is-entering`

Delete `ohm-current`, `ohm-signature`, `ohm-pulse` and `ohm-settle`.

**Click pause:** one `<script is:inline>` at the end of the page:
```js
const a = document.querySelector('.hello');
a.addEventListener('click', (e) => {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  e.preventDefault();
  if (a.classList.contains('is-entering')) return;
  a.classList.add('is-entering');
  setTimeout(() => { location.href = a.href; }, 500);
});
addEventListener('pageshow', (e) => { if (e.persisted) a.classList.remove('is-entering'); });
```
Enter on the focused link fires `click`, so the keyboard gets the same pause.

**Reduced motion:** no `.omega-light` (`display: none`), the line at `opacity: 1` with no animation, the glow transition off (hover and focus may still show it).

### Map
- **Office mark:** `markW = 105`. Re-check label collisions at 375 and 1280 on the `/book` full view, Central & SW, the office map and `/book/home` at the new position (38.80, −104.85). Move other labels with `labelNudge`/`officeNudge` if needed, never the mark. Report any nudge.
- **`Show mobile service areas`** (office mode only, so on `/book` `#office` and on `/book/office`): `<a class="map-areas" href={href('/book') + '#mobile'}>Show mobile service areas</a>` inside `.map-frame`, where `.map-reset` sits on zone maps.
- **Dark map buttons** (`.map-reset`, `.map-areas`): `background: var(--bg-dark); color: var(--text-on-dark); border: 0; box-shadow: 0 1px 4px color-mix(in srgb, var(--ink) 35%, transparent)`; hover `background: var(--bg-mid)`; no underline; `min-height: 44px`; `--fs-small`, weight 700; focus ring visible. No raw colours.

### Hover (`ServiceMap` CSS)
- `.zone.is-dim { fill-opacity: 0.35; }` (the regions; `out` is never dimmed: it's clear at rest).
- `.map-office.is-dim { opacity: 0.5; }`
- `.zone.is-muted.is-hot { fill-opacity: 1; }`: the hovered area shows its full tint even when another area is chosen.

### book.ts
- **`hot(zone | 'office' | null)`:** clear `is-hot` and `is-dim` everywhere in `#mobile`. Then:
  - a region (`home`, `shared`, `north`): `is-hot` on its picker button, its outline (as now) **and its fill path**; `is-dim` on the other two region fills and on `.map-office`.
  - `out`: as now, plus `is-dim` on all three region fills and `.map-office`.
  - `office`: `is-dim` on all three region fills.
- **Pointer:** the `pointerover` selector adds `.map-office`; it maps to `'office'`. `pointerleave` as now.
- **`goMobile()`:** check the `mobile` radio, `choose('mobile')`, `deselect()`, `mobile.scrollIntoView({ block: 'start' })`, focus `#mobile-h` (`tabindex="-1"` in JS if missing).
- **`#office` click handler:** `.map-areas`, plain left click only (modifiers pass through, as for the picker) → `preventDefault()`, `goMobile()`.
- **On load:** if `location.hash === '#mobile'`, call `goMobile()` after `init()` sets things up.
- No `console.*`.

### About
The `<img>` gets `width: 100%; object-fit: cover; height: auto`, plus:
- Desktop (the media where the landscape sources apply): `aspect-ratio: 21 / 9; object-position: 50% 60%`. That's 1120×480 at 1280, down from 630. He stays whole, head to feet.
- Mobile (the portrait `mobileMedia`): `aspect-ratio: 1; object-position: 50% 20%`. That's 328×328 at 375, down from 492. He and the cliff edge stay in frame.

Check both screenshots: no part of him is cut off. If he is, move `object-position` (not the ratio) and report the value.

## Done when
1. `npm test` 0 fail (2 todo), `npm run build`, `npm run check:wording` (paste warnings), `npm run check:dist`, `npm run check:contrast` pass.
2. `npm run omega` output: the start vertex and point counts. `git diff src/data/omega.json`: only the rotation, so the point counts change by at most ±2.
3. Greps: no hex outside `tokens.css`; `grep -c 'omega-idle\|ohm-pulse\|ohm-settle' src/pages/hello.astro` → 0; `grep -c '<script' dist/hello.html` → 2 (JSON-LD + the inline one); no `src=` on either.
4. Page heights (scrollHeight) at 375 and 1280 for `/`, `/services`, `/pricing`, `/about`, `/book/home`, `/book/office`, next to the "before" column in `10A-review-contracts.md`. The footer height at 375 (≤ 200).
5. **`/hello` in the browser** (JS on unless noted; 1280×800 and 390×844 touch; screenshots to `docs/build/screens/10B-hello-*.png`):
   a. The light appears at the right foot's inner corner and goes up the thumb side first (screenshots at 0.9s and 2.5s); the lap ends near 4.9s; the next starts near 11.4s.
   b. The line: opacity 0 at 4.5s, 1 at 6.5s, still 1 at 15s. At 1280, 390, 320 and 1920×1080, its glyph edges match the Ω's ink edges within ±2px (left and right; method as in 10A → Line). No horizontal scroll at 320.
   c. No glow at rest (`.omega-glow-wrap` opacity 0 at 2s and 8s). Desktop hover → 1; leave → 0; the line unaffected throughout.
   d. Click: `.is-entering`, the glow at 1, navigation to `/` after ~500ms. Back: `/hello` with no glow. Ctrl-click opens a tab with no pause. Enter on the focused link: the same pause.
   e. JS off: a click navigates at once; the light and line still work (CSS).
   f. Reduced motion: no light, the line visible at once, a click navigates at once.
   g. The line's contrast against the pixels behind it (sampled, art included) ≥ 4.5:1. Paste the worst value.
6. **Map** (screenshots `10B-map-*.png` at 375 and 1280):
   a. The office mark at the new spot on the full view, Central & SW, the office map and `/book/home`; no label overlaps; the mark's rendered width at 375 and 1280.
   b. Both dark buttons read clearly on the light map; their contrast is ≥ 4.5:1 (`--text-on-dark` on `--bg-dark`).
   c. `/book` → At my office → `Show mobile service areas`: "At your place" checked, the full map, the page scrolled to `#mobile`, focus on `#mobile-h`. Then click Mid-north on the map: its card. From `/book/office`, the link lands on `/book#mobile` in the same state. JS off: the link goes to `/book#mobile` and scrolls.
   d. Hover Mid-north (map and button): the other two regions at 0.35 and the mark at 0.5, Mid-north at full tint. Hover the mark: all three regions at 0.35. Hover outside: the out tint, regions and mark dimmed. With North chosen, hover Central & SW: Central & SW at full tint. Leave restores each state.
   e. Clicking the mark on the mobile map still runs `goOffice()`.
7. **Layout** (screenshots `10B-layout-*.png` at 375 and 1280): `/services` (intro band → office/mobile band: paste the gap in px), the footnote at body size, `/about` (photo cropped, him whole), Home (subline: 2 lines at 1024/1280/1440/1920; paste line counts at 375, 768, 1024, 1280, 1440, 1920), the footer at 375. The subline's contrast over the hero art ≥ 4.5:1.
8. Lighthouse mobile on `/` and `/about`: CLS 0.
9. `git status --porcelain`: no `.kml`, `.kmz`, `.env` or `.cache/` file; no contract-file edits beyond Opus's 10A ones; no street address anywhere (Opus checks for the street name in 10R).

## Report

**Files changed**
- `scripts/trace-omega.mjs`, `src/data/omega.json`: the contour is forced clockwise (positive shoelace) and rotated to start at the right foot's inner corner before simplifying; the script prints the start vertex. `tests/omega.test.ts`: orientation and start tests for `d` and `dMap` (+2 tests).
- `src/pages/hello.astro`: the 10A "Line" CSS verbatim (`--omega-w`, `--line-fs`, `--line-ls`); `.omega-idle`, `ohm-current`/`-signature`/`-pulse`/`-settle` removed; the `ohm-lap` light (11 s, 0.4 s delay); the line at 4.9 s; glow off at rest (hover, `:focus-visible`, `.is-entering`); the `<script is:inline>` click pause; reduced motion.
- `scripts/check-dist.mjs`, `tests/check-dist.test.ts`: rule 7 is "JSON-LD plus at most one inline script, never a `src`". Tests: `script src` fails, two inline scripts fail, one inline passes (+2 tests).
- `src/components/ServiceMap.astro`: `markW` 105; `Show mobile service areas` link in office mode; both buttons dark; `.is-dim`, `.map-office.is-dim`, `.zone.is-muted.is-hot`; two label nudges (below).
- `src/scripts/book.ts`: `hot()` dims (and takes `'office'`), `.map-office` pointer hover, `goMobile()`, the `#office` click handler, the `#mobile` hash on load.
- `src/styles/global.css`, `src/pages/index.astro`, `src/pages/services.astro`, `src/pages/about.astro`, `src/components/Footer.astro`: the spacing, Home hero padding and subline, footnote, About crop and footer, as specified.
- `README.md`: `/hello` section (light, repeat, click pause, line sizing), omega start rule, `check:dist` wording.

**Checks**
- `npm test`: 74 tests, 72 pass, 0 fail, 2 todo. `npm run build` OK. `check:wording` OK (one warning, the expected About "fix"). `check:dist` OK. `check:contrast` exit 0. No hex outside `tokens.css`.
- `npm run omega`: `d` 267 points, `dMap` 66 points (before: 267 / 66); start vertex **(662, 783)**; viewBox `131 191 738 618` (was `131 192 738 617`, one pixel from the new DP endpoint). `git diff src/data/omega.json`: 4 lines (viewBox, `d`, `dMap`, counts).
- Greps: `grep -c 'omega-idle\|ohm-pulse\|ohm-settle' src/pages/hello.astro` → 0. `grep -c '<script' dist/hello.html` → 2 (JSON-LD and the inline one); neither has `src`.
- **`/hello`** (Playwright, 1280×800 and 390×844 touch; screenshots `10B-hello-*.png`):
  - a. At animation time 0.9 s the light is at the right foot's inner corner and has gone up the thumb side; at 2.5 s it is on the left of the hand cut-out (`-0.9s`, `-2.5s`). `stroke-dashoffset` is −0.99999 at 4.9 s (lap over) and back to 0.14 at 11.4 s (next lap starts). (Timings are read off the animation clock; page-load time offsets wall-clock by about 0.8 s.)
  - b. Line opacity 0 at 4.5 s, 1 at 6.5 s, 1 at 8, 12 and 15 s. Glyph edges vs the Ω's ink edges (pixel-measured; terracotta vs the line colour): 320 → left 0 / right −1 px; 390 → 0 / 0; 1280 → 0 / −1; 1920 → +1 / −2. No horizontal scroll at 320, 390, 1280, 1920.
  - c. `.omega-glow-wrap` opacity 0 at rest (every sample). Desktop hover → 1; leaving the document → 0 (the page is one full-screen link, so there is no "off the link" inside the window); the line stays at 1 throughout.
  - d. Click: `.is-entering` set, glow 1, navigation after 548 ms. Back: `/hello`, glow 0, `is-entering` gone. Ctrl-click: a new tab opens on `/`, the original tab has no `is-entering`. Enter on the focused link: the same pause (549 ms).
  - e. JS off: a click navigates in 67 ms; at 5.8 s the line is at 0.98 (CSS still runs).
  - f. Reduced motion: line 1 at once, `.omega-light` `display: none`, a click navigates in 61 ms.
  - g. Worst contrast of the line colour against the pixels behind it (line hidden, art included): **6.48** (320 and 390), **6.56** (1280), **6.48** (1920).
- **Map** (screenshots `10B-map-*.png`):
  - a. Mark width 37 px at 375, 58 px at 1280 (the same on `/book` full, Central & SW, the office map; it does not change with zoom). No label overlaps the mark or "Ohm Office" on the `/book` full view, Central & SW, the office map, `/book/home` or `/book/office` at 375 and 1280 (DOM bounding-box test).
  - b. The buttons are `--text-on-dark` on `--bg-dark` (rgb 243,242,240 on rgb 12,63,53): 10.6:1. Height 44 px, no underline.
  - c. `/book` → At my office → `Show mobile service areas`: "At your place" checked, the office section hidden, the full map, `#mobile` at 64 px from the top, focus on `#mobile-h`. Clicking Mid-north's label on the map shows "You're in my Mid-north Springs area." with the Mid-north button chosen. From `/book/office` the link lands on `/book#mobile` in the same state, focus included (see Deviation 6). JS off: the link goes to `/book#mobile` and the section is 64 px from the top.
  - d. Hover Mid-north (map): home 0.35, north 0.35, Mid-north 1, mark 0.5. Hover Mid-north (button): the same. Hover the mark: all three 0.35, mark 1. Hover outside: out 0.6, regions 0.35, mark 0.5. North chosen, hover the Central & SW button: Central & SW 1, others 0.35, mark 0.5. Leaving restores each state (rest: all 1, out 0; North chosen: North 1, others 0.35).
  - e. Clicking the mark on the mobile map switches to "At my office".
- **Layout** (screenshots `10B-layout-*.png`):
  - Page heights, scrollHeight, before (10A) → now, at 375: `/` 2276 → 2081, `/services` 2780 → 2497, `/pricing` 1510 → 1310, `/about` 2300 → 1979, `/book/home` 1812 → 1726, `/book/office` 1597. At 1280: `/` 1767 → 1546, `/services` 2038 → 1868, `/pricing` 1380 → 1212, `/about` 1851 → 1645, `/book/home` 1720 → 1680, `/book/office` 1612. (`/book/office` had no before value.)
  - Footer at 375: **197 px** (was 269; at 1280 it is 156).
  - `/services`: the gap from the end of the intro band's content to the start of the next band's content is 80 px at 375 and 128 px at 1280 (two section paddings). Footnote 17 px at 375 and 18 px at 1280, equal to body.
  - `/about`: the photo is 343×343 at 375 (`object-position: 50% 20%`) and 1120×480 at 1280 (`50% 60%`). He is whole in both, and the cliff edge stays in frame on the phone. No change to `object-position` was needed.
  - Home subline lines: 375 → 3, 768 → 3, 1024 → 2, 1280 → 2, 1440 → 2, 1920 → 2. Worst subline contrast over the hero art 10.56 at 375, 1280 and 1920.
- Lighthouse mobile (local, performance): `/` 1.00 and `/about` 1.00, **CLS 0** on both.
- `git status --porcelain`: no `.kml`, `.kmz`, `.env` or `.cache/` file. No edits to contract files from me (`site.ts` and `tokens.css` show only Opus's 10A edits). No street address anywhere.

**Deviations**
1. **Ω start vertex.** The step's rule ("the baseline vertex just before that run") gave (668, 761), the top of the 6% band 27 units up the cut-out edge, not the corner (about (664, 788) in the step). I added a refinement: walk back down that edge (x within 25, y rising) and take the leftmost vertex within 12 units of the lowest one reached. That gives (662, 783). The test and the README describe the result (right of centre, on the baseline, second vertex higher).
2. **Point counts / viewBox.** `d` is 267 (unchanged), `dMap` 66 (unchanged); the viewBox moved by 1 px at the top (`191`/`618`).
3. **Footer mobile padding is `--s-6`, not `--s-8`.** With `--s-8` the footer measured 213 px at 375, over the 200 target. Gap `--s-4` and legal margin `--s-2` are as specified.
4. **Label nudges.** The mark's new spot (38.80, −104.85) put it under the "Colorado Springs" place label on the `/book` full view; `labelNudge['place:Colorado Springs']` is now `[10, 35]` (was `[0, 75]`). On the office map the new button covered the top of the "Garden of the Gods" label at 375; `officeNudge['road:Garden of the Gods'] = [-30, 55]`. The mark was not moved.
5. **`.map-reset` keeps its default `display`.** Giving both buttons `display: inline-flex` overrode `.map-reset`'s `hidden`, so "Show all areas" showed on the full map. `inline-flex` is on `.map-areas` only.
6. **`#mobile` focus on load.** On `/book#mobile` the browser's own fragment handling blurs `#mobile-h` about 11 ms after the script focuses it (the section isn't focusable). `book.ts` focuses the heading again on `load` (`preventScroll`). Not in the step.
7. The step says the hover rule `.zone.is-muted.is-hot { fill-opacity: 1 }`; I kept it as written. `hot('office')` dims only the three region fills (the mark itself is the hovered thing).

**TODO(Brian):** none new.

**Questions for Opus**
- At 375 the "Colorado Springs" label now sits right under the "Central & Southwest Springs" label on the `/book` full view (no overlap, about 3 px between them). Say if you want it moved elsewhere.
- The `/hello` page is one link, so "leave" only happens when the pointer leaves the window; moving anywhere on the page keeps the glow on. That is how the step reads, but it means the glow can't be dismissed while the cursor is over the page.

## Review
**Opus, 10R (Oct 6): accepted, with one fix by Opus.**

- **Hover glow (Sonnet's question): fixed.** The page is one full-screen link, so `.hello:hover` glowed whenever the pointer was anywhere in the window, which isn't "only when hovering the logo". The hover rule is now `.hello-omega:hover .omega-glow-wrap` (still fine pointers only). Checked live: the glow is 0 with the pointer on the line or the background, and 1 on the Ω. Focus and `.is-entering` are unchanged; clicking anywhere still enters.
- Deviations 1–7 accepted. The start-vertex refinement (1) lands on the corner Brian circled; `10B-hello-1280-0.9s.png` shows the light climbing the thumb side. Footer `--s-6` (3) meets the ≤ 200px target. The nudges (4) are fine. The `inline-flex`/`hidden` catch (5) and the hash refocus (6) are good finds.
- "Colorado Springs" sitting ~3px under the Central & SW label at 375: acceptable; no overlap.
- Re-ran: `npm test` 72 pass / 0 fail / 2 todo, build, `check:wording` (expected About warning), `check:dist`, `check:contrast`. The diff matches the step. No street name in the repo.
