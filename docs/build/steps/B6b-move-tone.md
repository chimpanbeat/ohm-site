# B6b: Body map, moving pins and the skin tone (I-073, I-148, I-151)

Brief §15 R12, R13, BM-2, BM-3, BM-12 · Architecture §B12 Pins (Moving a pin, Skin tone), Storage, Report and PDF, Privacy, Checks; §A1 tone tokens; §A3 (no motion until B11)

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (touch gestures against pan and pinch; the tone must reach no storage, report, PDF or request). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Planned Nov 13, 2026 (architect) from I-148's drag and I-151, which made B6 too big for one session. Needs B6 done.

## Goal
- **Moving a pin** (§B12 Moving a pin): mouse drag from 8 px; touch and pen hold 500 ms within 8 px, then drag with the point under the finger; an earlier move is a pan, a second finger cancels and pinches; no long-press callout or text selection in the figure. A move keeps every field, drops the send `id`, saves, and looks the region up again; a moved list pin becomes `fromList: false` and its box unticks. `Move` in the panel (`moveHint`) is the single-pointer way; `dragHint` sits under the figure. The lifted pin is drawn larger with no animation.
- **Skin tone** (§B12 Skin tone): `bodymap.tones` and the strings `move`, `moveHint`, `dragHint`, `tone`, `tones`, `toneHint` (copy deck → Body map → Pins and panel, as written). A radio group of six 44 px swatches beside the figure picker, `grey` at load; one `feComponentTransfer` filter on the figure `<image>` (silhouette → tone, outline → line, landmarks → halfway), none for `grey`. Memory only: a reload, Start over and an `ok` send show `grey`. The PDF figure stays the art's grey.
- **`check:contrast`:** for every tone key, `--bodymap-line-<key>` at least 3:1 against `--bodymap-tone-<key>`, and the better of `--pin-edge` and `--pin-halo` at least 3:1 against it (the tokens are in `tokens.css` since the Nov 13 plan).

Read-only: `src/styles/tokens.css`, the zone files, `src/lib/bodymap-zones.ts`, `src/lib/bodymap-pdf.ts`. Known gaps: zoom easing is B11.

## AC covered (IDs)
- BM-2: e2e case 4, a dragged pin's point lands within 1 px of the release at 3× and stays there zoomed out.
- BM-3 on every tone: greyscale screens `docs/build/screens/B6b/pins-grey-<tone>.png`, one per tone, and the contrast rules.
- BM-12 (the tone): state test 3 and e2e case 6.
- R12 (I-148, the drag half), R13 (I-151): e2e cases 4 to 6.

## Files
- src/data/bodymap.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinPanel.astro
- scripts/check-contrast.mjs
- tests/bodymap-art.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `tests/bodymap-art.test.ts` test 6 (the contrast rules it fakes gain the tone pairs); `tests/bodymap-data.test.ts` (the `text` keys and `tones`).

## Tests first (write them and see them fail before writing code)
1. State, move, in sequence: place a pin with intensity 7 and a note, star it, move it → same id, type, intensity, note and star, new `x`, `y`, send `id` null; move to 1.2, −0.1 → clamped to 1, 0; move a list pin → `fromList: false`; reload → the moved spot.
2. Contrast: a tone whose line is under 3:1 fails; a tone where both edge and halo are under 3:1 fails; the real tokens pass.
3. Storage and report: choose `dark`, add pins, reload → the stored entry, the report and the payload hold no `tone`, no tone key and no tone hex; the restored page shows `grey`.
4. e2e at 375 px with touch: hold a pin 600 ms and drag 60 px → it moves and the view doesn't pan; press a pin and move at once → the view pans and the pin stays; hold, then add a second finger → pinch, the pin stays; at 3× drag and release → the point within 1 px of the release, and still there at 1×; a dragged list pin's box is unticked. Mouse at 1280 px: drag 20 px → moved; click → opens.
5. e2e `Move`: open a pin, `Move` → `moveHint`; tap a spot → the pin moves there, no new pin; `Move` twice → cancelled, the next tap adds a pin.
6. e2e tone, in sequence: pick `medium-dark` → the figure `<image>` carries the filter and the swatch is checked; send with the endpoint mocked and the clock frozen, then again with `grey` → the two `pdf` fields are equal and neither body contains a tone word or hex; `localStorage` and `sessionStorage` hold no tone; reload → `grey`; pick `dark`, Start over → `grey`.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6b/`: the figure on each of the six tones with pins of all five types, in colour and in greyscale; a lifted pin; `Move` waiting for its tap.
3. Brian looks at the six tone screens (the values are the architect's proposal) and says keep or change.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
