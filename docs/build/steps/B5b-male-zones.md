# B5b: Body map male figures and the figure picker (I-073, I-157)

Brief §15 R1, R9 · Architecture §B12 Zones, Pins, Art

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (zone geometry and lookup; the contract, storage, report shape and filing don't change). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Split from B5 on Nov 13, 2026 (architect): 120 polygons per sex is a step's worth, and Brian's notes on the female overlays should shape the male ones. Needs B5 done.

Nov 13, 2026 (architect, I-160): built in wip `91bbf9a` by registering the female polygons onto the male art (Brian's call; §B12 Files now says so), then blocked by B5c, which re-keys the back shoulder and moves the male top-of-shoulder border. B5b doesn't run again: Brian's one overlay look after B5c meets Done when 2, and Done when 3's screens are taken then if missing.

## Goal
Zone files for `male_front` and `male_back`, with the same leaf keys as the female files (57 front, 63 back), authored on the male art and never mirrored or copied from the female files. The figure picker (`Female` · `Male`) shows all 4 v1 figures. Changing the figure keeps the pins and looks every zone up again in the new figure's file. `npm run bodymap:zones` renders the male overlays, and Brian looks them over before done.

Read-only: `src/data/bodymap.ts`, `src/lib/bodymap-zones.ts`, `src/lib/geo.ts`, the female zone files, the art. Known gaps: the hip-bone circles were removed from the male front, so the hip zones are placed from the brief line.

## AC covered (IDs)
- BM-1 (figure choice): the e2e picker case at 375 px.
- BM-9 (region names): the PDF test with male probes.
- BM-14 (zones half): tests 1–3.

## Files
- src/data/bodymap-zones/male_front.json
- src/data/bodymap-zones/male_back.json
- tests/bodymap-zones.test.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
1. B5's tests 2 to 5 (probes, coverage, file shape, sizes) run on all 4 figures, with male probes written first from the male art.
2. Both sexes have the same leaf keys and the same anchor keys for each view.
3. No male polygon equals a female polygon, or its mirror image, point for point.
4. Sequence: a pin at the female-front navel; switch to male → the same x and y, looked up in the male file, with the zone the male probe names; switch back → the first answer again. The pins, the name and the date are kept, and the send `id` is dropped (§B12 Retries: the figure is an edit).
5. Page (dist, preview): the picker has two options and the view tabs two. e2e at 375 px: pick `Male`, tap, and the pin stays on the spot; the report's `figure` is `male`.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Overlay PNGs exist for both male figures at both levels, and Brian says OK (logged in STATUS → Change log).
3. Screens of the picker at 375 and 1280 px in `docs/build/screens/B5b/`.

## Report
Files changed · Checks (command and result) · Coverage and smallest sizes · Deviations · New items (I-###) · Questions for the architect.
