# B6d: Body map skin tone, helper, desktop keys and tooltip, review line (I-073, I-151, I-170)

Brief §15 R13, R15, BM-1, BM-3, BM-12 · Architecture §B12 Pins (Skin tone; Helper, shortcuts, tooltip and review line), Storage, Privacy, Checks; §A1 tone tokens

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (the tone must reach no storage, report, PDF or request; keys must never fire while a client types). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Planned Nov 14, 2026 (architect): the tone from the Nov 13 B6b, with I-170's helper, keys, tooltip and review line. Needs B6c done (Delete and the tooltip cover pairs). Brian gave the missing strings Nov 14 (`How this works`, the review line's forms, `Change`, "mark" in the shortcuts).

## Goal
- **Skin tone** (§B12 Skin tone): `bodymap.tones` and `tone`, `tones`, `toneHint`; a radio group of six 44 px swatches beside the figure picker, `grey` at load; one `feComponentTransfer` filter on the figure `<image>`, none for `grey`. Memory only: a reload, Start over and an `ok` send show `grey`. The PDF figure stays the art's grey. The loupe shows the chosen tone.
- **`check:contrast`:** for every tone key, `--bodymap-line-<key>` at least 3:1 against `--bodymap-tone-<key>`, and the better of `--pin-edge` and `--pin-halo` at least 3:1 against it.
- **Helper and `?`** (§B12): `helper` under the toolbar until the first mark; `?` (accessible name `How this works`, also the title of what it opens) brings it back, with `shortcuts` on a fine pointer.
- **Keys:** `1`–`7` set the toolbar's type, `F` and `B` the view, `Delete` removes the open mark (a pair: both); never while focus is in an input, textarea or select, or with Ctrl, Cmd or Alt held (Ctrl/Cmd+Z stays B6b's).
- **Tooltip:** on a mouse hover over a mark, `{type} · {region}` (a pair's `pairName`), `aria-hidden`.
- **Review line:** above Send once a mark exists: `reviewMarks` (`{n} mark` / `{n} marks`), `reviewStarred` (left out at 0), `reviewViews` (`front`, `back`, `front and back`), joined by ` · `, then `Change` (`reviewEdit`, focus to the first log entry). Strings as written in the copy deck.

Read-only: `src/styles/tokens.css`, the zone files, `src/lib/bodymap-zones.ts`, `src/lib/bodymap-pdf.ts`. Known gaps: zoom easing is B11.

## AC covered (IDs)
- BM-3 on every tone: `docs/build/screens/B6d/pins-grey-<tone>.png`, all seven types as glyph and map-pin, and the contrast rules. BM-12 (the tone): state test 2, e2e case 3. BM-1: e2e case 6 (Send still one tap; the helper needs no dismissal). R13, R15: e2e cases 3 to 6.

## Files
- src/data/bodymap.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- scripts/check-contrast.mjs
- tests/bodymap-art.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `bodymap-art` test 6 (the faked rules gain the tone pairs); `bodymap-data` (the `text` keys and `tones`).

## Tests first (write them and see them fail before writing code)
1. Contrast: a tone whose line is under 3:1 fails; a tone where both edge and halo are under 3:1 fails; the real tokens pass.
2. State and report: choose `dark`, add marks, reload → the stored entry, the report and the payload hold no `tone`, no tone key and no tone hex; the restored page shows `grey`.
3. e2e tone, in sequence: pick `medium-dark` → the figure `<image>` has the filter, the swatch is checked; send (endpoint mocked, clock frozen), then again with `grey` → the two `pdf` fields are equal and neither body holds a tone word or hex; `localStorage` and `sessionStorage` hold no tone; reload → `grey`; `dark`, Start over → `grey`.
4. e2e helper, in sequence: load with nothing stored → `helper` shown; place a mark → gone; `?` (accessible name `How this works`) → shown under the title `How this works`, `aria-expanded="true"`, and at 1280 px with a mouse the four shortcut lines, the last `Delete removes the selected mark`; at 375 px with touch no shortcut lines; reload with the mark restored → helper hidden.
5. e2e keys at 1280 px: `3` → `Tight or stiff` pressed; type `3` and `B` into the name field → type and view unchanged; `B` → Back, `F` → Front; open a mark, `Delete` → removed; `Delete` in the note → only text deleted; Ctrl+3 → nothing; a pair open, `Delete` → both gone; Ctrl+Z → back.
6. e2e tooltip and review: hover a mark with the mouse → `Pain · Left knee` shown, leave → gone; a touch tap shows none; in sequence: one front mark → `1 mark · front`; then 2 more front (2 starred) and 2 back → `5 marks · 2 starred · front and back`; remove the front ones → `2 marks · back`; `Change` → focus on the first log entry of Back; the minimum-path flow passes unchanged.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6d/`: the figure on each of the six tones with marks of all seven types, in colour and greyscale; the helper and the `?` panel with shortcuts; a tooltip; the review line.
3. Brian looks at the six tone screens (approved as values, I-166 (2)) and says keep or change.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
