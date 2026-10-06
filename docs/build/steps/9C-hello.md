# 9C: The `/hello` entrance page, the traced Ω, and the map office mark

Model: sonnet
Brief: §5 (`/hello` row)
Architecture: §A2, §A3 (motion exception), §B1, §B3 (`Base` `bare`), §B5 (`npm run omega`, `npm run check:dist`), §B7 (sitemap, robots), §B8 (`/hello`), §C 2026-10-06 (9A, batch 5)
Copy: `docs/build/copy-deck.md` → Hello (`/hello`)
Context: `steps/9A-review-contracts.md` (batch 4 superseded by batch 5)

## Decision (Brian, Oct 6, 2026)
The splash is **not** an overlay on Home. It's its own page, **`/hello`**: a deliberate entrance for business cards, QR codes, social bios and referrals. Home (`/`) stays a normal page, and search, Maps and the Google Business Profile link there.

Why: Google's intrusive-interstitial signal penalises pages that cover their content with a full-screen splash on arrival from search (mobile and desktop). Search visitors also want prices and booking straight away, so a splash is friction for them. Visitors from a card or QR code have already chosen to come, so the splash is a welcome rather than an obstacle.

`/hello` is `noindex` for good, is never linked from the site, and isn't in the sitemap. It still can't be blocked in robots.txt, because Google has to crawl it to see the `noindex`.

**Nothing was built for the earlier overlay plan** (the old `9C-splash.md` never ran). So this step has nothing to remove from Home. It only has to keep Home unchanged, and Done-when 2 checks that.

Two parts: the `/hello` page (below), then **Part 2, the map office mark** (Brian's change after seeing 9B; near the end). Runs after 9B. **Don't edit `site.ts`, `wording.ts`, `tokens.css`, `geo.ts` or `astro.config.mjs`. No new dependencies** (`sharp` as in `make-icons.mjs`).

## Files
| File | Change |
|---|---|
| `scripts/trace-omega.mjs` (new) + `package.json` `"omega": "node scripts/trace-omega.mjs"` | See "Trace". Run it; it writes `src/data/omega.json`. |
| `src/layouts/Base.astro` | New prop `bare?: boolean` (default false). When true, no skip link, no `Header`, no `Footer`. `<main id="main">` stays. Everything in `<head>` is unchanged: the `noindex` prop already gives `<meta name="robots" content="noindex">` whatever `indexable` says, and the canonical is self-referencing. |
| `src/pages/hello.astro` (new) | `<Base title=… description=… noindex bare>` with the page markup and CSS below. **No `<script>` of any kind.** |
| `public/hello/index.html` (new) | A static redirect so `/hello/` works. GitHub Pages answers `/services/` with a 404, checked live on Oct 6, so a trailing slash on a card would break. See "Trailing slash". |
| `scripts/check-dist.mjs` (new) + `package.json` `"check:dist": "node scripts/check-dist.mjs"` | See "Build check". |
| `.github/workflows/deploy.yml` | Run `npm run check:dist` right after `npm run check:wording`, before the Pages upload. A `/hello` without `noindex` never deploys. |
| `tests/omega.test.ts` (new) | `omega.json`: `viewBox` is 4 numbers with positive width and height; `d` starts with `M`, ends with `Z` and contains exactly one `M` (a single closed path); 150 ≤ `points` ≤ 1500; every coordinate is inside the viewBox. |
| `tests/check-dist.test.ts` (new) | Runs `scripts/check-dist.mjs` against a tiny synthetic `dist` in a temp dir (pass `--dist <dir>`). It must pass for a good tree and fail (exit 1) for each of these: `hello.html` without the robots meta; `hello.html` with a canonical to another page; `sitemap.xml` listing `/hello`; another page linking to `/hello`; an indexable `robots.txt` that disallows `/hello`. |
| `README.md` | A "`/hello` entrance page" section. What it is, and where to use it: print, QR codes and social bios get `/hello`; search, Maps and the Google Business Profile get `/`. Use the exact lowercase URL with no trailing slash (the slash form redirects). Why it's `noindex` and not linked or in the sitemap. `npm run check:dist`. `npm run omega` (traced from `icon.png` until JohnMark's SVG arrives). |

### Trace (`npm run omega`)
1. Read `src/assets/icon.png` (1000×1000 RGBA) with `sharp(...).ensureAlpha().extractChannel('alpha').raw()`. Binary mask: alpha ≥ 128.
2. Keep the largest 4-connected component (report how many smaller ones were dropped).
3. Trace its **outer** contour with marching squares (your own ~60 lines; no dependency). Ignore holes and report their count. The hand cut-out opens to the bottom edge, so it's part of the outer contour: one path around the arch, down the legs and up into the fingers.
4. Simplify with Douglas–Peucker, tolerance **1.5 px**, then round to integers. If the result has more than 1,500 points, raise the tolerance to 2.5 px.
5. `viewBox` = the path's bbox padded 2% each side, as `"x y w h"` (integers).
6. Write `src/data/omega.json` (2-space): `{ "source": "src/assets/icon.png", "viewBox": "…", "d": "M…Z", "points": n }`. Print the point count, dropped components and holes.
7. **Visual check:** the path filled, next to `icon.png` at the same size, in the browser. Save `docs/build/screens/9C-trace.png`. The silhouettes should match within a couple of pixels at 200px.

### Page (`hello.astro`)
```astro
<a class="hello" href={href('/')}>
  <span class="visually-hidden">Enter Ohm Precision Bodywork. </span>
  <Image class="hello-art" src={graphic} alt="" widths={[480, 800, 1200]} sizes="100vw" … same format props as the home hero … loading="eager" fetchpriority="high" />
  <svg class="hello-omega" viewBox={omega.viewBox} aria-hidden="true" focusable="false">
    <path class="omega-fill"  d={omega.d} />
    <g class="omega-glow-wrap"><path class="omega-glow" d={omega.d} pathLength="1" /></g>
    <path class="omega-idle"  d={omega.d} pathLength="1" />
    <path class="omega-light" d={omega.d} pathLength="1" />
  </svg>
  <span class="hello-line">Take the path of least resistance</span>
</a>
```
- **Entering is plain navigation** to `/`. Back returns to `/hello`.
- **Accessible name:** "Enter Ohm Precision Bodywork. Take the path of least resistance", from the visually hidden text plus the visible line. Brian's spec says `aria-label="Enter Ohm Precision Bodywork"`. An `aria-label` would replace the visible line in the name, which fails WCAG 2.5.3 (the visible text must be in the name). The hidden-text version starts with exactly his label and keeps the line, so use it.
- `graphic` is `../assets/graphic-green.png`, through the same component and format props as the home hero, so a visitor going on to `/` reuses the cached files.

### CSS (scoped in `hello.astro`)
Tokens only; no hex. The class names and timings below are the contract. Tune values only where noted.
- **Layout:** `.hello { position: relative; display: grid; place-items: center; place-content: center; gap: var(--s-6); min-height: 100vh; min-height: 100dvh; overflow: hidden; background: var(--bg-dark); color: var(--text-on-dark); text-decoration: none; cursor: pointer; }`. No horizontal scroll at 320px.
- **Art:** `position: absolute`, bleeding off the bottom-right the way the home hero does (`height: 100%; width: auto; right: -8%`; tune so it reads as the same art), `opacity: 0.9`, `pointer-events: none`. Absolutely positioned, so no layout shift.
- **Ω:** `position: relative; width: min(50vmin, 28rem); height: auto` (`aspect-ratio` from the viewBox so it reserves its box). `.omega-fill { fill: var(--accent) }`. The three stroke paths: `fill: none; stroke: var(--text-on-dark); stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke`.
  - `.omega-idle`: `stroke-width: 2px; stroke-dasharray: 0.08 0.92; opacity: 0.35; animation: ohm-current 7s linear infinite` (from 0s, the faint looping current; `stroke-dashoffset` 1 → 0).
  - `.omega-light`: `stroke-width: 3px; stroke-dasharray: 0.14 0.86; stroke-dashoffset: 1; opacity: 0; animation: ohm-signature 2.4s ease-in-out 0.3s 1 forwards`. Keyframes: opacity 0 → 1 in the first 10%, dashoffset 1 → 0, opacity → 0 in the last 15%. The light makes one lap.
  - `.omega-glow`: `stroke-width: 6px; filter: blur(6px)` (static; never animate `filter`). `animation: ohm-pulse 3.5s ease-in-out infinite alternate` (opacity 0.25 ↔ 0.55).
  - `.omega-glow-wrap`: `opacity: 0.45; animation: ohm-settle 0.8s ease-out 3s forwards` (→ 1). That's the "glow strengthens at 3s".
- **Line:** `.hello-line`: DM Sans (not the display face, §A2), `font-size: var(--fs-h2)`, weight 500, `letter-spacing: 0.01em`, `color: var(--text-on-dark)`, `opacity: 0; animation: ohm-reveal 0.8s ease-out 3s forwards`, `position: relative`, `text-align: center`, `padding-inline: var(--gutter)`. If the art sits behind the text, add a `text-shadow` halo in `--bg-dark` and measure the contrast (Done-when 5g).
- **Hover:** inside `@media (hover: hover) and (pointer: fine)`, `.hello:hover` puts `.omega-glow-wrap` and `.hello-line` straight into their end state (`animation: none; opacity: 1`, with a 300ms `transition: opacity`).
- **Focus:** `.hello:focus-visible` does the same, **outside** that media query (a keyboard on a touch tablet still needs it), with `outline: var(--focus-ring); outline-offset: calc(-1 * var(--s-4))`. The ring is inset so it stays on screen.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no animations; `.omega-idle` and `.omega-light` hidden; `.omega-glow-wrap` and `.hello-line` at opacity 1 from the start.

### Trailing slash (`public/hello/index.html`)
A complete tiny document: `<!doctype html>`, `<meta charset="utf-8">`, `<meta name="robots" content="noindex">`, `<meta http-equiv="refresh" content="0; url=../hello">` (relative, so it works under `/ohm-site/` now and at the root of the custom domain later), `<title>Ohm Precision Bodywork</title>`, and a body link `<a href="../hello">Continue</a>`. No script. Check that Astro copies it to `dist/hello/index.html` beside `dist/hello.html`.

### Build check (`npm run check:dist`)
No dependencies. Reads `dist/` (or `--dist <dir>`). Exits 2 if it's missing. Reads `indexable` the way `check-wording.mjs` reads `site.licensed` (dynamic import of `src/data/site.ts`). Fails (exit 1) with a clear message for each problem:
1. `hello.html` lacks `<meta name="robots" content="noindex">`, **whatever `indexable` is**.
2. `hello.html` has a `<link rel="canonical">` whose path isn't `/hello` (under the base).
3. `sitemap.xml` mentions `hello`.
4. `robots.txt` disallows `/hello` specifically. While `indexable` is false, the whole-site `Disallow: /` is expected and allowed: the site is pre-launch. On license day it becomes `Allow: /` and `/hello` stays crawlable.
5. Any other `dist/**/*.html` (except `hello/index.html`) contains an `href` to `hello`.
6. `index.html` contains `class="hello"`, `omega-` or `splash` (no splash on Home).
7. `hello.html` contains a `<script` (it must have no JavaScript). The JSON-LD block (`type="application/ld+json"`) is data, not JavaScript, so allow it.

## Done when
1. `npm test`: 0 fail (the new tests pass; the 2 `todo` fixtures stay todo). `npm run build` succeeds. `npm run check:wording` passes (paste the warnings). `npm run check:dist` passes. There's no lint script in this repo; say so in the Report.
2. **Home unchanged:** `dist/index.html` differs from the 9B build only where 9B itself changed it. Diff the two and paste the result, or confirm "identical". The header logo still links to `/` (no `#home`). Lighthouse (mobile) on `/` has CLS 0.
3. `dist/hello.html`: the robots `noindex` meta, a self canonical, no `<script` apart from JSON-LD, no header, footer or nav. `dist/hello/index.html` exists. `dist/sitemap.xml` has no `hello`. `grep -rl 'hello' dist --include=*.html` finds only `hello.html` and `hello/index.html`.
4. Sizes: `omega.json` bytes and point count; `dist/hello.html` bytes.
5. **In the browser, JS disabled** (`javaScriptEnabled: false`), at 390×844 (touch emulation: `hasTouch`, `isMobile`) and 1280×800. Screenshots of a and b at both widths to `docs/build/screens/9C-*.png`:
   a. `/hello` shows only the green background, the art, the Ω and, later, the line. No horizontal scroll at 320.
   b. Before 3s the line is hidden. After 3.5s it's visible and the glow is stronger: compare the `getComputedStyle` opacity of `.hello-line` and `.omega-glow-wrap` at 1s and 3.5s.
   c. Desktop: hovering at 1s puts the line and glow at full strength straight away. Touch: no hover state.
   d. One tap or click lands on `/`. Back goes to `/hello`.
   e. Keyboard: the first Tab focuses the link and the inset ring is visible; Enter goes to `/`.
   f. Reduced motion (`reducedMotion: 'reduce'`): a static Ω with the line visible at once.
   g. Contrast: the line's colour against the pixels behind it (sample the screenshot around the text box) is ≥ 4.5:1. Paste the worst value.
   h. `/hello/` lands on `/hello`.
6. `git status --porcelain` lists no `.kml`, `.kmz`, `.env` or `.cache/` file, and there are no edits to contract files.

## Part 2: the map office mark (Brian, after seeing 9B)
Brian saw the 9B badge (the Ω on a cream disc with a ring, about 23px on a phone) and wants **just the Ω logo, larger, labelled "Ohm Office" on every map view**. This replaces the 9B badge, and do it after the trace above, because it uses the traced path. It also answers 9B's question about the badge being too small.

| File | Change |
|---|---|
| `scripts/trace-omega.mjs` | Also write **`dMap`**: the same contour simplified at **6 px** (target ≤ 250 points; raise to 8 px if over), integer coordinates, a single closed path, plus `pointsMap`. The map shows the Ω at about 40–60px, where brush detail is invisible, and it's inlined in every map. Same viewBox as `d`. |
| `tests/omega.test.ts` | `dMap`: one `M`, ends `Z`, `pointsMap` ≤ 300, all coordinates inside the viewBox. |
| `src/components/ServiceMap.astro` | Replace the badge (see "Office mark"). Drop the `icon` import and `badgeImg`. Office mode: the label becomes `Ohm Office` (was `My office is in this area`). |
| `src/scripts/book.ts` | Nothing, unless the class it listens on changes. Keep `.map-office` as the link class so `goOffice()` still works. |

### Office mark
```astro
<Mark class="map-office" {...markProps}>            <!-- <a … tabindex="-1" aria-hidden="true"> on zone maps; <g> on the office map -->
  {!office && <title>Ohm Office</title>}
  <g transform={`translate(${officeX} ${officeY})`}>
    <g class="office-mark-scale">                     <!-- transform: scale(calc(1 / var(--map-scale, 1))) -->
      <svg class="office-mark" viewBox={omega.viewBox} x={-W / 2} y={-H / 2} width={W} height={H} overflow="visible">
        <path d={omega.dMap} />
      </svg>
      <text class="office-label" y={H / 2 + 14} text-anchor="middle" dy="0.35em">Ohm Office</text>
    </g>
  </g>
</Mark>
```
- **Size:** `W = 110` map units at scale 1 (`H` from the viewBox aspect). That's about 38px wide on a 375px phone and 60px at the 34rem max width, versus 23–39px for the badge's disc. Tune `W` between 100 and 130 so the Ω reads clearly on a phone without swamping the Central & SW area at the full view. Report the value.
- **Look:** `.office-mark path { fill: var(--accent); stroke: var(--bg-light); stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; vector-effect: non-scaling-stroke; }`. The cream halo keeps it legible over terrain, roads and zone tints. No disc, no ring, no image.
- **Label:** `Ohm Office`, the zone-label style (`--ink`, 700, cream halo via `paint-order: stroke`), on **every** map: the `/book` mobile map, `/book/[zone]` maps where the office is in view, the office map, and `/book/office`. It sits inside the scaled group, so it's the same size at every zoom.
- **Hover (zone maps):** `.map-office:hover .office-mark path { stroke-width: 5px; }` and `.map-office:hover .office-label { text-decoration: underline; }`. No motion.
- **Collisions:** the office sits in the Central & SW zone near where the `Colorado Springs` place label and the zone label land. Check the full view, the Central & SW zoom and the office map at 375 and 1280. If the Ω or "Ohm Office" overlaps another label, move **the other label** with `labelNudge` / `officeNudge` (never the office mark, which must sit on `site.office.mapArea`). Report any nudge.
- **Layer order:** after zone labels, before the pin (unchanged).
- **Size budget:** `dMap` is inlined per map. Re-report the four inline svg sizes; the limits from 9B still apply.

### Done when (Part 2)
1. `npm test` and `npm run build` pass; `grep -c 'office-badge\|badgeImg' src/components/ServiceMap.astro` → 0; `grep -c 'My office is in this area' dist/book.html` → 0; `grep -c 'Ohm Office' dist/book.html` → ≥ 2 (both maps).
2. Screenshots `docs/build/screens/9C-mark-*.png` at 375 and 1280: the `/book` mobile map (full view), Central & SW chosen, the office map, `/book/home`. The Ω is bare (no disc), terracotta with a cream edge, clearly larger than in `9B-*`, with "Ohm Office" under it and no label overlaps.
3. Clicking the Ω (or its label) on the `/book` mobile map still runs `goOffice()`. JS off, it's a link to `/book/office`.

## TODO(Brian) proposal: Ω and body graphic in the Home hero (not built)
Brian asked for a proposal only. The constraint is that the H1, subline and "Book a session" stay in the first screen at 390×844 and 1280×800.
- **Desktop (≥ 48rem):** the hero is two columns already. The text takes the left 40% and the anatomy art bleeds off the right. Put the Ω (the same `omega.json` path, filled `--accent`, about `min(32vmin, 20rem)`) in the right column, centred over the art's upper back, and dim the art to `opacity: 0.6` so the Ω leads. It takes no layout space (absolute, like the art), so the text column doesn't move.
- **Mobile:** the art currently sits behind the text. Put a small Ω (about 56px) above the H1, in the space the hero's top padding already gives (48px). Or place it top-right over the art at about 30vw, with the art's opacity lowered behind the text for contrast. The first adds about 64px; measure that the Book button still clears 844px. The second adds nothing.
- **Motion:** none on Home (§A3). If Brian wants a hint of the `/hello` light, one lap on first load (no loop) is the most §A3 can stretch to. That's his call.
- Decide after JohnMark's SVGs arrive, since a clean vector Ω looks better at hero size than the trace.

## Report

**Files changed**
- `scripts/trace-omega.mjs` (new), `package.json` (`omega`, `check:dist` scripts), `src/data/omega.json` (new, 2,797 bytes): own marching squares on the alpha channel (main component plus a 2 px fringe, contour at 0.5), Douglas–Peucker at 1.5 px → `d` 267 points; at 6 px → `dMap` 66 points; viewBox `131 192 738 617`; 0 dropped components, 0 holes.
- `src/layouts/Base.astro`: `bare` prop (no skip link, Header, Footer).
- `src/pages/hello.astro` (new): the page, markup and CSS as specified. No script.
- `public/hello/index.html` (new): the trailing-slash redirect; Astro copies it to `dist/hello/index.html`.
- `scripts/check-dist.mjs` (new), `.github/workflows/deploy.yml` (runs `check:dist` after `check:wording`).
- `tests/omega.test.ts` (new, 3 tests), `tests/check-dist.test.ts` (new, 10 tests: good tree, missing dist → 2, seven bad trees → 1, whole-site `Disallow: /` allowed).
- `src/components/ServiceMap.astro` (Part 2): the badge is gone (no `icon` import, no `badgeImg`, no `getImage`); the bare Ω from `omega.dMap` plus the `Ohm Office` label on every map.
- `README.md`: `/hello` section, scripts table, deploy line, map bullet.
- `docs/build/screens/9C-*.png` (gitignored).

**Checks**
- `npm test`: 70 tests, 68 pass, 0 fail, 2 todo (the two existing fixtures). `npm run build` OK. `npm run check:wording` OK (one warning, the expected About "fix"). `npm run check:dist` OK. `npm run check:contrast` OK. There is no lint script in this repo.
- Home unchanged: `dist/index.html` is identical to the 9B build (diff empty). No `#home` links. Lighthouse mobile on `/` (local Lighthouse, performance only): performance 1.00, **CLS 0**.
- `dist/hello.html` (15,166 bytes): robots `noindex`, self canonical, one `<script>` which is the JSON-LD, no header/footer/nav. `dist/hello/index.html` is 366 bytes. `sitemap.xml` has no `hello` (0). `grep -rl hello dist --include=*.html` → `hello/index.html` and `hello.html` only. `omega.json` 2,797 bytes.
- Trace vs `icon.png`: IoU 0.9895 for `d`, 0.9638 for `dMap` (side by side in `9C-trace.png`; the brush edge is kept).
- Browser, JS disabled (Playwright `javaScriptEnabled: false`), 390×844 touch and 1280×800:
  - a. only the green, the art, the Ω and later the line. No horizontal scroll at 390, 1280 or 320 (scrollWidth 305 at 320, scrollbar aside).
  - b. at 1s `.hello-line` opacity 0 and `.omega-glow-wrap` 0.45; at 3.5s 0.91 / 0.95 on mobile, 0.99 / 0.99 on desktop.
  - c. desktop hover at 1s (after 0.5 s): line 1, glow 1. Touch at 1s: line 0, glow 0.45 (no hover state).
  - d. a click (desktop) and a tap (touch) land on `/ohm-site/`; Back returns to `/ohm-site/hello`.
  - e. first Tab focuses `.hello`, outline `solid 2px`, offset −16px, line and glow at 1; Enter lands on `/`.
  - f. reduced motion: line 1, glow 1, `.omega-idle` and `.omega-light` `display: none`.
  - g. worst contrast of the cream line against the pixels behind it (sampled from the 1s screenshots, before the line and its halo appear): **10.22** at 390, **10.31** at 1280 (the 1280 sample was taken before I added the desktop mask, so it is the conservative one).
  - h. `/hello/` ends on `/ohm-site/hello`.
- Part 2: `grep -c 'office-badge\|badgeImg' ServiceMap.astro` → 0; `grep -c 'My office is in this area' dist/book.html` → 0; `grep -o 'Ohm Office' dist/book.html | wc -l` → 3 (two labels plus the `<title>` on the zone map). Screenshots `9C-mark-{375,1280}-{full,central,office,home}.png`. With the DOM bounding-box test, no road, place or zone label overlaps the Ω or "Ohm Office" in either `/book` view at 375 or 1280, so **no nudge was needed**. The Ω is 41×34 px at 375 and 65×54 px at 1280, and stays 41 px when a zone is chosen.
  - Clicking the Ω (centre) or tapping the label on `/book` ticks "At my office". Without JS `/book/home`'s mark is a link to `/book/office` and the click navigates there. Hover (desktop) sets stroke 5px and underlines the label. No console errors.
  - Inline map SVG sizes: `/book` mobile map 33,004 B (limit 70 KB), `/book` office map 13,195 B, `/book/north` 21,053 B, `/book/home` 19,365 B, `/book/office` 13,167 B (limit 40 KB each). `dist/book.html` 60,131 B.
- `git status --porcelain`: no `.kml`, `.kmz`, `.env` or `.cache/` file. No edits to contract files from me (`tokens.css` shows only Opus's 9A edits).

**Deviations**
1. **Mark width `W = 125`** (the step suggested 110, tune 100–130). 110 gave a 36 px Ω on a phone, only 13 px more than the badge; 125 gives 41 px at 375 and 65 px at 1280 without crowding the Central & SW label.
2. **Transparent hit box** (`<rect class="office-hit">`, fill transparent) added behind the Ω. The hand cut-out isn't painted, so a click or hover in the middle of the Ω fell through to the zone underneath. Not in the step.
3. **`a.map-office { text-decoration: none }`**: the global link underline was showing on "Ohm Office" at rest; the step wants underline on hover only. Also `a.map-office .office-label { pointer-events: auto }` because the global `text` rule turns pointer events off and the label has to be clickable.
4. **`/hello` art has the Home hero's left-edge fade** at ≥ 48rem (`mask-image`), because without it the art's hard top-left edge reads as a box on desktop. Not in the step; easy to drop.
5. The hello line carries a `text-shadow` halo in `--bg-dark`, as the step allows; contrast is measured without it.
6. `check-dist.mjs` imports `indexable` as the step says, but no check depends on it; it only appears in the "OK" line.
7. The accessible-name approach is the step's (visually hidden "Enter Ohm Precision Bodywork. " plus the visible line), not Brian's `aria-label`.

**TODO(Brian):** none new. (The `/hello` defaults Opus chose in 9A, JohnMark's SVGs and the Home hero proposal are already in STATUS.)

**Questions for Opus**
- The traced Ω keeps the rough brush edge of `icon.png`. At the `/hello` size (up to 28 rem) it looks like the logo; at 6 px the map version is deliberately plain. Say if you want the `/hello` path smoother (a larger tolerance).
- 9B's questions still stand for 9R: terrain banding on the flat east side and the 0.6 terrain opacity. The badge-size question is answered by Part 2.

## Review
**Opus, 9R (Oct 6): accepted.**

- Deviations 1–7 accepted: `W = 125`, the transparent hit box, the label link fixes, the desktop mask on the `/hello` art (it removes the visible box edge; `9R-hello-1280.png`), and the hidden-text accessible name.
- **Opus fix:** the global `scrollbar-gutter: stable` (9B) reserved a 15 px strip on `/hello` on classic-scrollbar desktops (Windows), cutting the art off short of the right edge. `/hello` never scrolls, so `hello.astro` sets `:global(html:has(.hello)) { scrollbar-gutter: auto }`. The rule ships only with `/hello`'s CSS; `check:dist` still passes.
- **Smoother `/hello` path (Sonnet's question): no.** The brush edge is the logo's character. JohnMark's SVG replaces the trace anyway.
- Re-ran: `npm test` 68 pass / 0 fail / 2 todo, build, `check:wording` (the expected About "fix" warning), `check:dist`, `check:contrast`.
