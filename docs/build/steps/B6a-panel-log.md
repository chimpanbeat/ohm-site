# B6a: Body map details panel, log, desktop layout, region list and Start over (I-073, I-148, I-149's layout, I-167, I-170's heading)

Brief §15 R4–R6, R12, BM-1, BM-5, BM-6 · Architecture §B12 Coordinates → Layout, Pins (Types and fields, Details panel and log, Avoid and other pins), Storage

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (client data: every detail field reaches storage, and Start over clears it). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Planned Nov 14, 2026 (architect), split from B6 (I-167, I-170). Needs B6 done. The strings are approved (Brian, Nov 14: `Slight` · `Very tight`, `Anything else?`, `What's here? (optional)`).

## Goal
- **`PinPanel`** (§B12 Details panel and log, Types and fields): placing a mark adds it at once and opens the panel (below the toolbar under 48rem, left column from 48rem). Heading `{type} · {region}` at once. Up front: the seven type chips (this mark only), the type's up-front field (intensity as ten chips `1`–`10` with the ends, `Mild` · `Strong` or for tight `Slight` · `Very tight`, two rows of five under 560 px, each at least 44 px, a tap on the chosen chip clears it; or the note for avoid, `Why avoid it? (optional)`, and other, `What's here? (optional)`), star (not avoid), `Remove`, `Save`. Behind one closed `Add details` (not for avoid or other): the type's fields in §B12's order, the note last as `Anything else?`. Text inputs `autocomplete="off"`, at least 16 px. `Save` closes it to `panelEmpty`. A tap on a mark opens it; a tap elsewhere while one is open keeps it and opens the new one. The open mark is the map-pin.
- **`MarkLog`:** the current view's marks, `marks` heading, each entry a button (glyph, type, coarse region, star badge) that opens the mark with focus in the panel; follows the toolbar's toggle.
- **Layout** at 375 and 1280 px (§B12 Layout). **`RegionList`:** `Prefer a list?`, one fieldset per view, head to toe, coarse regions only; a tick adds a mark of the toolbar's type at the anchor with `fromList: true` and a log entry, panel closed; unticking removes only that mark.
- `Start over` with its confirm (also closes the panel); the storage notes. Strings: `save`, `panelEmpty`, `marks`, `tightIntensity`, `tightEnds`, `avoidNote`, `otherNote`, `note` (copy deck, as written).

Read-only: the zone files, `src/lib/bodymap-zones.ts`, `src/styles/tokens.css`, `src/lib/bodymap-shapes.ts`. Known gaps: moving, the loupe and Undo are B6b; Both sides B6c; the tone and the shortcuts B6d; the whole-body item and `since` B6e; the report's details B7.

## AC covered (IDs)
- BM-1: e2e case 5 (the minimum-path flow, panel untouched). BM-5 (page half): e2e case 5. BM-6: state test 3, e2e keyboard-only list send. R12 (panel and log): e2e cases 1 and 2. Layout: e2e case 4.

## Files
- src/data/bodymap.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinPanel.astro
- src/components/bodymap/MarkLog.astro
- src/components/bodymap/RegionList.astro
- tests/bodymap-state.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `bodymap-data` (the `text` keys); `bodymap-page` (the B4 marks list becomes the log).

## Tests first (write them and see them fail before writing code)
1. e2e sequence at 375 px: tap the left knee → one mark, panel open, heading `Pain · Left knee`, intensity visible, `Add details` closed; set 7, `Save` → `panelEmpty`, log `Front marks (1)`; tap a second spot, then a third without `Save` → 3 marks, the second kept; tap the first → it opens showing 7 (still 3 marks); toolbar `Back` → `Back marks (0)`, toggle `Front 3`; place one, back to `Front` → 3 entries; open the second from the log → focus in the panel; `Remove` → 2 marks, 2 entries.
2. e2e panel per type: pain → `Add details` holds 4 quality chips, course, started, worse, better and `Anything else?` last; tight → `How tight is it?` with `Slight` and `Very tight`, 3 qualities (`Tight or pulling` first), 5 worst chips; injury → no quality; numb → its 3 qualities; avoid → only `Why avoid it? (optional)`, no star, no disclosure; other → `What's here? (optional)` up front, a star, no disclosure. Pain with `sharp` → numb → no chip ticked → pain → `sharp` ticked.
3. State, region list in sequence: tick `left-knee` → one mark at its anchor, `fromList: true`, in the log, panel closed; tick again → still one; untick → only that mark gone, tapped marks stay. 28 and 31 checkboxes, no fine zone in the built HTML. Then open a mark, `Start over`, `Keep my marks` → unchanged; `Start over`, `Clear everything` → no marks, panel closed, storage entry gone.
4. e2e at 1280 px: panel and log left of the figure; figure at least 80% of the viewport height; toolbar under it; at 375 px the panel is below the toolbar.
5. e2e at 375 px: the minimum-path flow (3 front and 2 back marks, panel never touched) passes unchanged; a 4th star shows `starLimit`; a keyboard-only send through the list (endpoint mocked).

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6a/`: the panel empty, open for each of the seven types, and with `Add details` open (pain, tight); the log on each view; the region list.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
