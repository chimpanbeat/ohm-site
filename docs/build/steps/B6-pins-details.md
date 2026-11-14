# B6: Body map pins and details (I-073, I-153, I-155, I-158)

Brief §15 R3–R6 · Architecture §B12 Revision of Nov 13, Pins, Storage, Zones (the list), §A1 pin tokens

Models: builder Sonnet (high effort; medium before the Nov 13 re-plan) · architect Opus (no planning in this step) · reviewer Fable 5.2 (client data: the note, the details and intensity go into storage, and Start over clears it). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Re-planned Nov 13, 2026 (architect): intensity is 1–10, the details are structured fields behind `Add details`, and the step now makes its own contract changes, so it runs at high effort (the STATUS row's Effort and Command need the same change). Needs B5b, B5c and B5d done (B5d, I-161, splits the hands and closes the other two; `zoneSet` is 3 from then), and Brian's OK on the copy deck's Details strings (asked with I-159).

## Goal
- **Contract** (`src/data/bodymap.ts`, as §B12 Pins): `intensity` = `{ min: 1, max: 10 }`, `qualities`, `courses`, types `PainQuality` and `Course`, `limits.detailChars` = 80, `limits.startedChars` = 40, and the strings in copy deck → Body map → Details, copied as written (`details`, `quality`, `qualities`, `course`, `courses`, `started`, `startedPlaceholder`, `worse`, `better`, and the `pdf` ones). The copy deck's Details sheet and PDF lines then say 1–10. `noteChars` stays 140.
- All 5 pin types, with shapes from new `src/lib/bodymap-shapes.ts` (circle, diamond, triangle, 4-point star, ring with slash) and a legend.
- `PinSheet`: intensity as ten chips `1`–`10` with `Mild` and `Strong` (two rows of five under 560 px, each at least 44 px; a tap on the chosen chip clears it), the note, star, `Remove` and `Done`. Then one closed `<details>`, `Add details`: quality (chips, any number), course (two chips), started, worse and better (one-line text). Nothing is required. Text inputs have `autocomplete="off"` and are at least 16 px. An avoid pin shows only the note and `Remove`.
- The star rules: at most 3 (`starLimit` is shown on a 4th), and avoid pins are never starred (`starAvoid`).
- The marks list `Your marks ({n})`, each mark with its coarse region name (never a fine zone name).
- `RegionList`: `Prefer a list?`, one fieldset per view in head-to-toe order, coarse regions only. Ticking adds a pin of the current type at the region's anchor with `fromList: true`, and unticking removes only that pin.
- `Start over` with its confirm, and the storage notes. The storage entry's `v` becomes 2.

Read-only: the zone files, `src/lib/bodymap-zones.ts`. Known gaps: the PDF and JSON don't carry the details until B7.

## AC covered (IDs)
- BM-1 (no added step): e2e case 6.
- BM-3: `bodymap-shapes.test.ts`, plus a greyscale legend screenshot `docs/build/screens/B6/legend-grey.png`.
- BM-5 (page half): state test plus an e2e message.
- BM-6: state test plus an e2e keyboard-only send.

## Files
- src/data/bodymap.ts
- docs/build/copy-deck.md
- src/lib/bodymap-shapes.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinSheet.astro
- src/components/bodymap/RegionList.astro
- tests/bodymap-shapes.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `tests/bodymap-data.test.ts` test 4 pins `limits` exactly; `tests/bodymap-state.test.ts` builds pins without the new fields.

## Tests first (write them and see them fail before writing code)
1. Stars, in sequence:
   - star 3 pins, then star a 4th → refused (`star-limit`), and the 3 stay starred;
   - unstar one, then star the 4th → ok;
   - star an avoid pin → refused (`star-avoid`);
   - change a starred pin to avoid → its star is dropped.
2. Details:
   - intensity takes 1 and 10; 0, 11, 5.5 and a string are refused and the old value stays; setting the same value again clears it;
   - quality: add `burning` then `sharp` → `['sharp', 'burning']`; add `sharp` again → removed; an unknown key is refused;
   - course takes `acute`, `chronic` or null only;
   - started is cut at 40 characters, worse and better at 80, the note at 140; a line break or a control character becomes a space;
   - change a pin with answers to avoid and back → the answers are still there;
   - remove a pin, add it again → a new id and no answers;
   - each detail change drops the send `id` (§B12 Retries).
3. Storage, in sequence: a B4 entry (`v: 1`) is deleted on load; fill every field, reload → the same pins; a stored pin with intensity 11 or an unknown quality loads with that field cleared.
4. Region list, in sequence: tick `left-knee` → one pin at its anchor with `fromList: true`; tick it again → still one; untick → that pin only is gone, and tapped pins stay. The list has 28 and 31 checkboxes (31 back from B5c, I-160) and no fine zone.
5. Shapes: compared in pairs, the rasterised masks overlap less than 60%.
6. e2e at 375 px: place 3 front and 2 back pins and send without touching the sheet → sent, no field error, and `Add details` was closed for each pin; each of the ten chips is at least 44 px; set an intensity with the arrow keys; the greyscale legend screenshot; a keyboard-only send through the list (endpoint mocked); a 4th star shows `starLimit`. The built HTML holds no fine zone name.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6/`: the sheet closed and with `Add details` open, the marks list, the region list, and the greyscale legend.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
