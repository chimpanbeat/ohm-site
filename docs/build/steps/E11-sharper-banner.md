# E11: Sharper desktop banner: traced mark over a cleaned background (I-104)

Brief §5, AC-5, AC-9 · Architecture §B10 → E8–E11 (Sharper desktop banner), §B6

Interim until JohnMark sends a 2x file (then this is replaced). Runs after E10 (both touch `EventHero`).

## Goal
From 48rem the hero banner is `banner-bg.png` (header-green with its artwork filled in and a soft dark-green scrim, cropped to today's 31:10 view) with the launch mark drawn on top as inline SVG traced from `launch-mark-on-dark.png`, so the letters stay sharp at 1120 px; same box, crop and position as today; below 48rem nothing changes; the link preview stays `header-green.png`. The look is the one Brian approved on Nov 8 (option 2, "vector", of the Code-chat preview); the muscle figures show only at the edges, accepted. **Already done by the architect (read-only here):** `graphics.wideMark` in `events.ts`, `docs/build/ARCHITECTURE.md` (the whole algorithm, numbers included). Known gaps: none.

Notes:
- **`scripts/make-event-banner.mjs`** (`npm run event-banner` in `package.json`; sharp only, no new dependency): implement §B10 exactly. Reference only: Brian's approved scratch script was `preview.mjs` in an earlier Code session's scratchpad (`…\3a1d68db-125a-495f-b890-36b34e675425\scratchpad\banner\`, with `2-vector.png`, the approved render); it may be gone, and §B10 adds what it lacked (Douglas–Peucker, tokens for the fills, the JSON output, the percent box). Header comment: inputs, outputs, I-104, "replace with JohnMark's file". Print the art box and both output sizes. Deterministic: no randomness, no dates in the output.
- **`events.ts`: values only:** `graphics.wide: 'launch-party/banner-bg.png'`, `graphics.wideMark: 'launch-party/banner-mark.json'`.
- **`event-assets.ts`:** `eventMark(path)` per §B10 (throws `missing event asset: <path>` like `eventAsset`).
- **`EventHero`:** the `.event-banner` wrapper, wide sources from `banner-bg` (widths `[620, 1240]`), the inline SVG per §B10, no `scale`; keep E10's countdown and everything below the picture unchanged; update the component comment.

## AC covered (IDs)
- AC-9: tests 1–4. AC-5: Done when 3.

## Files
- scripts/make-event-banner.mjs
- package.json
- src/assets/events/launch-party/banner-bg.png
- src/assets/events/launch-party/banner-mark.json
- src/data/events.ts
- src/lib/event-assets.ts
- src/components/events/EventHero.astro
- tests/events.test.ts
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/events.test.ts`:
1. Outputs: `banner-bg.png` PNG header 1240×400, colour type 2; `banner-mark.json` parses to `viewBox` `0 0 694 203`, each `box` value a number in (0, 100), `accent` and `light` start with `M` and contain `Z`, no `NaN`, no number with more than one decimal, file ≤ 40 KB.
2. Sequence: run `node scripts/make-event-banner.mjs --out <temp dir>` twice (the script takes `--out`, default the repo folder; tests never write into the repo): both runs give byte-identical files, and the JSON equals the committed `banner-mark.json` (the PNG is not compared with the committed one: libvips output can differ by platform).
3. Data and source: `graphics.wide`, `wideMark` as above, `og` still `launch-party/header-green.png`; `EventHero` has no `scale: 1.6129`, has `event-banner__mark`, `preserveAspectRatio="none"`, `aria-hidden="true"`, `fill: var(--accent)`, `fill: var(--text-on-dark)`, and the mark hidden below 48rem; E5's 31:10 assertions still hold.
4. Dist (`events/launch-party.html`): one inline `svg.event-banner__mark` with two `fill-rule="evenodd"` paths; the `(min-width: 48rem)` sources list two `banner-bg` widths; the narrow sources unchanged; `og:image` and its 857×450 (test 9a) unchanged.

## Done when
1. `npm run check` passes (paste the test count); `git status` shows `header-green.png` and `launch-mark-on-dark.png` unchanged.
2. `npm run shots -- E11` plus 768 and 1280 px captures at device scale 2 of the hero: letters crisp (no upscale blur on `PRECISION BODYWORK`), mark inside the same box as before within ±2 px at 1280 (overlay today's screenshot), scrim soft, no hard edge; 375 unchanged. If `2-vector.png` still exists, compare and report any visible difference.
3. Lighthouse mobile and desktop on `astro preview` `/events/launch-party`: performance ≥ 90; report the HTML size before and after.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
