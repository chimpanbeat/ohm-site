# B6: Body map pins, details panel and log (I-073, I-148, I-150, I-153, I-155, I-158; I-149's layout)

Brief §15 R3–R6, R12 · Architecture §B12 Revision of Nov 13, Coordinates (Layout), Pins (Marker, Details panel and log), Storage, Zones (the list), §A1 pin tokens

Models: builder Sonnet (high effort; medium before the Nov 13 re-plan) · architect Opus (no planning in this step) · reviewer Opus (client data: the note, the details and intensity go into storage, and Start over clears it). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Re-planned Nov 13, 2026 (architect), twice: first intensity 1–10 and the structured details behind `Add details`, with the step making its own contract changes (high effort); then I-148's panel and per-view log, I-150's map-pin marker and I-149's desktop layout joined, while dragging pins and the skin tone went to B6b and zoom easing to B11. Needs B5d done (`zoneSet` 3) and Brian's OK on the copy deck's Details strings (asked with I-159).

## Goal
- **Contract** (`src/data/bodymap.ts`, as §B12 Pins): `intensity` = `{ min: 1, max: 10 }`, `qualities`, `courses`, types `PainQuality` and `Course`, `limits.detailChars` = 80, `limits.startedChars` = 40; the strings in copy deck → Body map → Details, and from → Pins and panel the B6 ones (`save` replaces `done`, `panelEmpty`, the per-view `marks`), copied as written. The copy deck's Details lines then say 1–10. `noteChars` stays 140.
- **Marker (I-150):** `src/lib/bodymap-shapes.ts` exports the five glyphs (circle, diamond, triangle, 4-point star, ring with slash) and the map-pin outline (point at 0, 0). Every pin on the page is that marker, point on the spot, head in the type colour with the glyph, star badge, open-pin ring, 44 px hit area (§B12 Marker). A legend shows the five markers.
- **`PinPanel` (I-148):** placing a pin adds it at once and opens the panel (below the figure under 48rem, left column from 48rem). Up front: heading, type chips (this pin only), intensity as ten chips `1`–`10` with `Mild` and `Strong` (two rows of five under 560 px, each at least 44 px; a tap on the chosen chip clears it), the note, star, `Remove`, `Save`. Then one closed `<details>`, `Add details`: quality (chips, any number), course (two chips), started, worse and better (one-line text). Nothing is required. Text inputs `autocomplete="off"`, at least 16 px. An avoid pin shows the type, the note, `Remove` and `Save`. `Save` closes the panel to `panelEmpty`. A tap on a pin opens it; a tap elsewhere while one is open keeps it and opens the new one.
- **`MarkLog` (I-148):** the current view's pins, `{view} marks ({n})`, each entry a button (glyph, type, coarse region name, never a fine name, star badge) that opens the pin, focus to the panel; it follows the view tabs, and each tab shows its count.
- **Layout (I-148, I-149's layout half):** §B12 Coordinates → Layout, at 375 and 1280 px.
- The star rules: at most 3 (`starLimit` on a 4th); avoid pins never starred (`starAvoid`).
- **`RegionList`:** `Prefer a list?`, one fieldset per view, head to toe, coarse regions only. A tick adds a pin of the current type at the region's anchor with `fromList: true` and a log entry, without opening the panel; unticking removes only that pin.
- `Start over` with its confirm (it also closes the panel), and the storage notes. The storage entry's `v` becomes 2.

Read-only: the zone files, `src/lib/bodymap-zones.ts`, `src/styles/tokens.css` (the tone tokens wait for B6b). Known gaps: the PDF and JSON carry the details from B7; moving pins and the skin tone are B6b; zoom easing is B11.

## AC covered (IDs)
- BM-1 (no added step): e2e case 6.
- BM-2 (the marker): e2e case 7, the point within 1 px of the tap at 1× and 3×.
- BM-3: `bodymap-shapes.test.ts` (glyphs), plus a greyscale legend screenshot `docs/build/screens/B6/legend-grey.png`.
- BM-5 (page half): state test plus an e2e message.
- BM-6: state test plus an e2e keyboard-only send.
- R12 (I-148, B6's half): e2e case 7. Layout: e2e case 8.

## Files
- src/data/bodymap.ts
- docs/build/copy-deck.md
- src/lib/bodymap-shapes.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinPanel.astro
- src/components/bodymap/MarkLog.astro
- src/components/bodymap/RegionList.astro
- tests/bodymap-shapes.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `tests/bodymap-data.test.ts` test 4 pins `limits` exactly; `tests/bodymap-state.test.ts` builds pins without the new fields.

## Tests first (write them and see them fail before writing code)
1. Stars, in sequence: star 3 pins, then a 4th → refused (`star-limit`), the 3 stay starred; unstar one, star the 4th → ok; star an avoid pin → refused (`star-avoid`); change a starred pin to avoid → its star is dropped.
2. Details: intensity takes 1 and 10; 0, 11, 5.5 and a string are refused and the old value stays; the same value again clears it. Quality: add `burning` then `sharp` → `['sharp', 'burning']`; `sharp` again → removed; an unknown key refused. Course takes `acute`, `chronic` or null only. Started cut at 40, worse and better at 80, the note at 140; a line break or control character becomes a space. Avoid and back → the answers are still there. Remove a pin, add it again → a new id and no answers. Each detail change drops the send `id`.
3. Storage, in sequence: a B4 entry (`v: 1`) is deleted on load; fill every field, reload → the same pins; a stored pin with intensity 11 or an unknown quality loads with that field cleared.
4. Region list, in sequence: tick `left-knee` → one pin at its anchor with `fromList: true`, in the log, panel still closed; tick again → still one; untick → only that pin is gone, tapped pins stay. 28 and 31 checkboxes, no fine zone.
5. Shapes: the five glyphs, rasterised and compared in pairs, overlap less than 60%; the marker outline's lowest point is exactly (0, 0) and its head is centred on x 0; each glyph is centred on the head.
6. e2e at 375 px: place 3 front and 2 back pins and send without touching the panel → sent, no field error, `Add details` closed for each; each intensity chip at least 44 px; an intensity set with the arrow keys; the greyscale legend; a keyboard-only send through the list (endpoint mocked); a 4th star shows `starLimit`. The built HTML holds no fine zone name.
7. e2e sequence at 375 px: tap → one pin, panel open with type and intensity visible; set 7, `Save` → `panelEmpty`, log `Front marks (1)`; tap a second spot, then a third without `Save` → 3 pins, the second kept; tap the first pin's head → it opens (still 3 pins) showing 7; `Back` → log `Back marks (0)`, tab `Front (3)`; place one, back to `Front` → 3 entries; open the second from the log → focus in the panel; `Remove` → 2 pins and 2 entries. At 1× and at 3× the marker's point is within 1 px of the tap.
8. e2e at 1280 px: the panel and log are left of the figure; the figure is at least 80% of the viewport height; at 375 px the panel is below the figure.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6/`: the panel empty, open, and with `Add details` open; the log on each view; the region list; the greyscale legend; a starred and an open marker at 3×.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
