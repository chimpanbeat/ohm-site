# B6b: Body map, moving pins, the loupe and Undo (I-073, I-148, I-168 (2), I-170's loupe)

Brief §15 R12, R14 (Undo), R15 (loupe), BM-1, BM-2 · Architecture §B12 Pins (Moving a pin, Loupe, Undo), Storage, Privacy; §A3 (no motion until B11)

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (touch gestures against pan and pinch; the Undo stack holds health information and must stay in memory). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Planned Nov 13, 2026 (architect) as moving and the tone; re-planned Nov 14, 2026: the tone goes to B6d, and the loupe (I-170) and Undo (I-168 (2)) join, because both act on the same gestures and the same changes as moving. Was `B6b-move-tone.md`. Needs B6a done. Brian confirmed Undo's scope, 20 steps including Both sides and Unlink, Nov 14.

## Goal
- **Moving a pin** (§B12 Moving a pin): mouse drag from 8 px; touch and pen hold 500 ms within 8 px, then drag with the point under the finger; an earlier move is a pan; a second finger cancels and pinches; no long-press callout or text selection in the figure. A move keeps every field, drops the send `id`, saves, and looks the region up again; a moved list mark becomes `fromList: false` and its box unticks. `Move` in the panel (`moveHint`) is the single-pointer way; `dragHint` sits under the figure. The lifted mark is drawn larger with no animation.
- **Loupe** (§B12 Loupe): touch and pen only; from 150 ms still on the figure and through a lifted drag; 112 px, 88 px above the finger, twice the zoom, a crosshair at the landing spot; gone on release, pan, second finger, cancel. Never on a quick tap; never changes where a mark lands.
- **Undo** (§B12 Undo): `Undo` in the toolbar's second row and Ctrl/Cmd+Z outside text fields; reverts the last place (tap or tick), move or `Remove`; a stack of 20 in page memory only; disabled when empty; emptied by reload, Start over and an `ok` send; shows the change's view, closes the panel, drops the send `id`.
- Strings `move`, `moveHint`, `dragHint`, `undo` (copy deck, as written).

Read-only: `src/styles/tokens.css`, the zone files, `src/lib/bodymap-zones.ts`, `src/lib/bodymap-pdf.ts`. Known gaps: Undo of Both sides and Unlink comes with B6c, of the whole-body item with B6e; zoom easing is B11.

## AC covered (IDs)
- BM-2: e2e case 4 (a dragged point within 1 px of the release at 3×, and still there at 1×). BM-1: e2e case 6 (no loupe on a quick tap; the minimum-path flow passes unchanged). R12 (drag): e2e cases 4 and 5. R14 (Undo): state test 3, e2e case 7. R15 (loupe): e2e case 6.

## Files
- src/data/bodymap.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinPanel.astro
- tests/bodymap-data.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `bodymap-data` (the `text` keys).

## Tests first (write them and see them fail before writing code)
1. State, move, in sequence: a mark with intensity 7, a note and a star, moved → same id and fields, new `x`, `y`, send `id` null; move to 1.2, −0.1 → clamped to 1, 0; move a list mark → `fromList: false`; reload → the moved spot.
2. State, Undo storage: after any change the stored entry has no undo key; `localStorage` and `sessionStorage` hold nothing but the one entry.
3. State, Undo in sequence: place A, place B, undo → only A; move A, undo → A at its old spot with every field; star A (intensity 7), `Remove`, undo → A back, same id, starred; star 3 others, remove A, undo → A back unstarred; tick `left-knee`, undo → unticked, no mark; 21 changes → 20 undos, then empty; a detail edit isn't undone; Start over → empty; a change on Back undone while on Front → shows Back.
4. e2e at 375 px with touch: hold a mark 600 ms and drag 60 px → moved, no pan; press and move at once → pans, mark stays; hold, then a second finger → pinch, mark stays; at 3× drag and release → point within 1 px of the release, still there at 1×; a dragged list mark's box unticks. Mouse at 1280 px: drag 20 px → moved; click → opens.
5. e2e `Move`: open a mark, `Move` → `moveHint`; tap a spot → it moves there, no new mark; `Move` twice → cancelled, the next tap adds a mark.
6. e2e loupe at 375 px with touch: hold 200 ms on an empty spot → the loupe is shown above the finger; release → a mark at the release spot, loupe gone; a 60 ms tap → the loupe never appears (checked on every frame); press and move 20 px → pan, loupe gone; during a lifted drag → shown; with a mouse → never.
7. e2e Undo: `Undo` disabled at load; place, `Undo` → gone; with focus in the note, Ctrl+Z → the note's text changes and the mark stays; outside it, Ctrl+Z → the last change undone; reload → `Undo` disabled.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6b/`: a lifted mark, the loupe while placing and while dragging, `Move` waiting for its tap, the toolbar with `Undo`.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
