# 11B: `/hello` light fix and timing, tighter spacing, About photo at text width

Model: sonnet
Brief: §5 (`/hello` row)
Architecture: §A3 (spacing), §A4 (footer), §A5 (About), §B8 (`/hello` motion), §C 2026-10-06 (11A)
Context: `steps/11A-review-contracts.md` (the cause of the mobile speed bug, and the prototype numbers)

Opus already made the Home "Why Ohm" copy edits in 11A (two paragraphs and the About link). Don't touch that text.

**Don't edit `site.ts`, `wording.ts`, `tokens.css`, `geo.ts` or `astro.config.mjs`. No new dependencies.**

## Files
| File | Change |
|---|---|
| `src/pages/hello.astro` | (1) **The light bug:** remove `vector-effect: non-scaling-stroke` from `.omega-light` and `.omega-glow`. Their stroke widths become viewBox units: `.omega-light { stroke-width: 5; }`, `.omega-glow { stroke-width: 8; }` (no `px`). Keep `pathLength="1"`, the dasharray `0.14 1` and the offsets. (2) **Timing:** the lap is **3s**: `ohm-lap` keyframes `0%` (offset 0.14, `ease-in-out`), **`27.3%`** (−1) and `100%` (−1); duration 11s, delay 0.4s, unchanged. The line's reveal delay is **3.4s** (was 4.9s). Update the comments. |
| `src/styles/global.css` | `.section`: `--s-8` mobile, `--s-12` desktop (were `--s-10` / `--s-16`). `main > .section:first-child` unchanged (`--s-6` / `--s-10`). New `.section--end { padding-block: var(--s-8); }` at every width (declare it after the `.section` rules so it wins). |
| `src/pages/services.astro`, `src/pages/pricing.astro` | The closing section that holds only `<BookCta />`: `class="section section--end"`. Services `.scope` `margin-top` → `--s-6`. |
| `src/pages/index.astro` | `.hero` padding: `--s-10` mobile (was `--s-12`), `--s-12` desktop (was `--s-16`). |
| `src/components/Footer.astro` | Desktop `padding-block` → `--s-8` (was `--s-12`). Mobile unchanged. |
| `src/pages/about.astro` | Desktop (outside `mobileMedia`): the picture and image get `max-width: var(--measure)` (the paragraphs' width); the image `aspect-ratio: 16 / 9; object-position: 50% 55%` (was 21/9, 50% 60%). Mobile unchanged. |
| `README.md` | `/hello`: the lap is 3s; the light's widths are in viewBox units (a `non-scaling-stroke` breaks `pathLength` dashes; one line on why). |

## Done when
1. `npm test` 0 fail (2 todo), `npm run build`, `npm run check:wording` (paste warnings), `npm run check:dist`, `npm run check:contrast` pass. No hex outside `tokens.css`.
2. `grep -c 'non-scaling-stroke' src/pages/hello.astro` → 0.
3. **The light, the same at every size** (Playwright; pause the light's animations and set `currentTime` with `getAnimations()`, as in 11A). At 390×844 and 1280×800, screenshots at `currentTime` 1000, 2000 and 3400 ms (`10B` naming → `11B-hello-{390,1280}-{1.0,2.0,3.4}s.png`). At the same time, both sizes show the light at the same place on the Ω. At 3.4s the lap is over: no light visible. At 1.0s it's on the thumb side. Paste `stroke-dashoffset` at each time (it's identical by construction; the screenshots are the real check).
4. The line: opacity 0 at 3.3s, 1 at 4.6s (wall clock from load, ±0.3s).
5. The light's rendered width: about 4px at 1280 and about 2px at 390 (measure from a screenshot crop; ±1px).
6. Page heights (scrollHeight) at 375 and 1280 for `/`, `/services`, `/pricing`, `/about`, next to 11A's "Prototype" column (within ±10px of its right-hand values).
7. Screenshots at 1280 and 375 (`11B-layout-*.png`): `/services` top (intro band → next band) and bottom (scope note → button band → footer), `/pricing` bottom, Home, `/about` top. On `/about` at 1280: the photo's left and right edges match the first paragraph's (±1px), 16:9, and he's whole (head to feet).
8. Lighthouse mobile on `/` and `/about`: CLS 0.
9. `git status --porcelain`: no `.kml`, `.kmz`, `.env` or `.cache/` file; no contract-file edits.

## Report
**Files changed**
- `src/pages/hello.astro`: removed `non-scaling-stroke`. `.omega-light` width is 5 and `.omega-glow` width is 8 (viewBox units). `ohm-lap` ends its lap at 27.3% (3 s of 11 s). The line's reveal delay is 3.4s. Comments updated, including why the stroke is in viewBox units.
- `src/styles/global.css`: `.section` is `--s-8` / `--s-12`. New `.section--end` (`--s-8`, declared after the `.section` rules).
- `src/pages/services.astro`, `src/pages/pricing.astro`: the closing BookCta section gets `section--end`. Services `.scope` margin-top is `--s-6`.
- `src/pages/index.astro`: `.hero` padding is `--s-10` / `--s-12`.
- `src/components/Footer.astro`: desktop padding is `--s-8`.
- `src/pages/about.astro`: desktop `picture` is `display: block; max-width: var(--measure)`. The image is `16 / 9`, `object-position: 50% 55%`. Mobile unchanged.
- `README.md`: 3 s lap, the line at 3.4 s, one sentence on why the stroke widths are in viewBox units.

**Checks**
1. `npm test`: 72 pass, 0 fail, 2 todo. `npm run build` OK (12 pages). `check:dist` OK. `check:contrast` all ok. `check:wording` OK with one warning, which was there before: `dist\about.html: medical-claim word "fix" ... testing each fix until it held` (Brian's bio text). No hex added outside `tokens.css`.
2. `grep -c 'non-scaling-stroke' src/pages/hello.astro` → 0. (The first version of my comment named the property and scored 1; I reworded it.)
3. Light, `currentTime` = delay + t, `getAnimations()` paused. `stroke-dashoffset` at 1.0 / 2.0 / 3.4 s is -0.1237 / -0.7347 / -1 at both 390 and 1280. The Ω's rendered width is 292.5px at 390 and 600px at 1280. Screenshots `11B-hello-{390,1280}-{1.0,2.0,3.4}s.png` (gitignored). The light is at the same place on the Ω at both sizes. At 1.0 s it's on the inner finger/thumb side, and at 3.4 s no light is visible. (Pausing every animation also froze the line's reveal in those shots, so the line is absent from them.)
4. Line opacity, sampled from navigation start: 0 at 3.05 s, about 0.37 at 3.66 s, 0.97 at 4.3 s, 1 at 4.9 s (both sizes). The sampling runs about 0.2 s ahead of the page's own load clock, so this matches a 3.4 s delay and a 1 s fade within ±0.3 s.
5. Light width in rendered px: 5 viewBox units × (292.5 / 738) = 1.98px at 390, and × (600 / 738) = 4.07px at 1280. This is computed from the stroke width and the measured svg width. I didn't measure it from a screenshot crop.
6. scrollHeight (11A's right-hand value in brackets): `/` 2076 (2060) at 375 and 1418 (1418) at 1280. `/services` 2536 (2544) and 1724 (1732). `/pricing` 1270 (1270) and 1068 (1068). `/about` 2008 (2008) and 1568 (1568). All within ±10px except **`/` at 375, which is +16**. See Deviations.
7. Screenshots `11B-layout-{home,about}-{375,1280}-top.png` and `11B-layout-{services,pricing}-{375,1280}-full.png`. The services and pricing shots are full-page, not separate top/bottom crops. On `/about` at 1280 the photo's left and right edges equal the first paragraph's (72.5 / 872.77), the box is 800.27 × 450.14 (16:9), and he's whole, head to feet.
8. Lighthouse mobile (performance category only), `/` and `/about`: performance 100 on both, CLS 0 on both.
9. `git status --porcelain`: no `.kml`, `.kmz`, `.env` or `.cache/`. No contract-file edits. Modified files outside this step's list are Opus's uncommitted 11A edits (`ARCHITECTURE.md`, `copy-deck.md`, `STATUS.md`, and the Why Ohm copy in `index.astro`).

**Deviations**
- Home at 375 is 2076, not within ±10 of 2060. The computed paddings are exactly as specified (hero 40px, sections 32px, footer 24px), so it's not a spacing mistake. I think the extra 16px is a wrapped line from Opus's 11A Why Ohm copy edit, which the prototype might not have had. I didn't confirm this.
- Home's last section (`cta-band`) is a section but isn't in the step's `.section--end` list, so it uses the plain `.section` padding of `--s-8`. I left it alone.
- The 11B-layout screenshots for services and pricing are full-page.

**TODO(Brian):** none new.

**Questions for Opus**
- Is the +16px on Home at 375 acceptable? Should the Home `cta-band` get `section--end` too?

## Review
(Opus, 11R.) **Accepted.** Re-ran build, `npm test` (72 pass, 0 fail, 2 todo), `check:wording` (the same "fix" warning in Brian's bio; fine), `check:dist`, `check:contrast`. The diff matches the step. Looked at `11B-hello-390-1.0s.png` (light on the finger side, thin) and `11B-layout-about-1280-top.png` (photo at the text measure, 16:9, whole figure).
- **Home +16px at 375:** accepted. 11A's prototype numbers were taken in batch 1, before batch 2 split Why Ohm into two paragraphs; the extra paragraph margin is the 16px.
- **Home `cta-band`:** stays plain `.section`. It has a heading and a line of text, so it's a content section, not a button-only closing band.
- Full-page screenshots for services and pricing instead of crops: fine.
