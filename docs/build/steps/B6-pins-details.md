# B6: Body map pins and details (I-073)

Brief §15 R3–R6 · Architecture §B12 Pins, §A1 pin tokens

Models: builder Sonnet (medium effort) · architect Opus (no planning in this step) · reviewer Fable 5.2 (client data: the note and intensity go into storage, and Start over clears it). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The page has:
- All 5 pin types, with shapes from new `src/lib/bodymap-shapes.ts` (circle, diamond, triangle, 4-point star, ring with slash) and a legend.
- `PinSheet`: intensity 1–5 with `Mild` and `Strong`, the note (`autocomplete="off"`, at most 140 characters), star, `Remove` and `Done`.
- The star rules: at most 3 (`starLimit` is shown on a 4th), and avoid pins are never starred (`starAvoid`).
- The marks list `Your marks ({n})`.
- `RegionList`: `Prefer a list?`, one fieldset per view in head-to-toe order. Ticking adds a pin of the current type at the zone's anchor, and unticking removes only that pin.
- `Start over` with its confirm, and the storage notes.

Strings come only from `bodymap.text`. Read-only: `src/data/bodymap.ts`, the zone files. Known gaps: none.

## AC covered (IDs)
- BM-3: `bodymap-shapes.test.ts`, plus a greyscale legend screenshot `docs/build/screens/B6/legend-grey.png`.
- BM-5 (page half): state test plus an e2e message.
- BM-6: state test plus an e2e keyboard-only send.

## Files
- src/lib/bodymap-shapes.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinSheet.astro
- src/components/bodymap/RegionList.astro
- tests/bodymap-shapes.test.ts
- tests/bodymap-state.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
1. Stars, in sequence:
   - star 3 pins, then star a 4th → refused (`star-limit`), and the 3 stay starred;
   - unstar one, then star the 4th → ok;
   - star an avoid pin → refused (`star-avoid`);
   - change a starred pin to avoid → its star is dropped.
2. Details: intensity takes only 1–5 or null. A note is cut to 140 characters. Changing the type keeps the details. Remove a pin, add it again → a new id.
3. Region list, in sequence: tick `left-knee` → one pin at its anchor; tick it again → still one; untick → that pin only is gone, and tapped pins stay. A list-only state's report has the same region names as the ticks.
4. Shapes: compared in pairs, the rasterised masks overlap less than 60%.
5. e2e: the greyscale legend screenshot; a keyboard-only send through the list (endpoint mocked); a 4th star shows `starLimit`.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6/`, including the greyscale legend.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
