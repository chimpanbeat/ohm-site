# B6c: Body map, Both sides pairs and Unlink (I-073, I-168 (1))

Brief §15 R14, BM-1, BM-5 · Architecture §B12 Pins (Both sides, Moving a pin, Undo, Details panel and log), Zones → Side, Storage

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (a pair's two points and one set of details through state, storage and Undo). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Planned Nov 14, 2026 (architect) from I-168 (1). Needs B6b done (each point drags; Undo exists). Brian confirmed, Nov 14: hidden on head, neck, belly, base of spine, list marks and unlabelled marks; Unlink drops the copy's star.

## Goal
- **Contract:** `bodymap.centreline` = `{ female: 0.5, male: 0.498 }`; strings `bothSides`, `unlink`, `pairName` (as written).
- **State** (§B12 Both sides): `bothSides(id)` sets `mirror` to `x' = 2c − x`, same `y`, clamped; refused for a midline region, an unlabelled mark, a list mark or a pair. A pair is one mark (one star, one of the 60, one log entry); `movePoint(id, which, x, y)` moves either point; `Remove` removes both; `unlink(id)` splits it (first point keeps id and fields; the mirror becomes a new mark straight after, every field but the star). Undo also reverts `Both sides` and `Unlink` (§B12 Undo). `pairName(a, b)` pure. Storage keeps `mirror`.
- **Page:** `Both sides` in the panel where allowed, `Unlink` in a pair's; both points drawn (both as map-pins while open); a tap on either opens the pair; each point drags and `Move`s on its own; the log entry shows `pairName` of the region names and the `Both sides` tag; the heading `{type} · {pairName}`; a figure change looks both points up again.

Read-only: the zone files, `src/lib/bodymap-zones.ts`, `src/styles/tokens.css`, `src/lib/bodymap-pdf.ts`. Known gaps: the report, PDF and JSON carry the pair (`mirror`, two glyphs with one number) from B7.

## AC covered (IDs)
- R14 (Both sides): state tests 1 to 4, e2e case 5. BM-5: state test 2 (a pair is one star). BM-1: e2e case 5 ends with the minimum-path flow.

## Files
- src/data/bodymap.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/components/bodymap/PinPanel.astro
- src/components/bodymap/MarkLog.astro
- tests/bodymap-data.test.ts
- tests/bodymap-state.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `bodymap-data` (the `text` keys and `centreline`).

## Tests first (write them and see them fail before writing code)
1. Mirror: female (0.40, 0.50) → (0.60, 0.50); male (0.40, 0.50) → (0.596, 0.50); (1, 0.3) on male → x −0.004 clamped to 0 (pure function; no real tap is that far out); refused on each of the seven midline regions (`head-face`, `neck-front`, `belly-upper`, `belly-lower`, `head-back`, `neck-back`, `spine-base`), an unlabelled spot, a list mark and a pair; allowed on `left-low-back` and `right-knee`.
2. Pair rules, in sequence: star 3 singles, make one a pair → still 3 stars; a 4th star refused; 59 singles + 1 pair → a new mark refused (`pins` 60); move the mirror → the first point stays, both keep the fields; set intensity 6 → one value for both; `Remove` → both gone.
3. Unlink, in sequence: a starred pair with intensity 6 and a note → `unlink` → two marks, the first keeps id and star, the second has a new id, intensity 6, the note, no star, and sits straight after the first; storage round trip → equal.
4. Undo, in sequence: `Both sides`, undo → single again; `Unlink`, undo → one pair with the first id and the star; remove a pair, undo → both points back.
5. e2e at 375 px: tap the left low back, `Both sides` → a mark on the right low back; the log shows one entry `Low back (L and R)` tagged `Both sides`; tap the right point → the same pair opens; drag the right point (hold) → only it moves; `Unlink` → two entries; `Undo` → one again; `Remove` → none; open a mark on the upper belly → no `Both sides` button. Then the minimum-path flow passes unchanged.
6. `pairName`: `Left low back, beside the spine` + `Right low back, beside the spine` → `Low back, beside the spine (L and R)`; `Left knee, medial` + `Right knee, lateral` → `Left knee, medial; Right knee, lateral`.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6c/`: a pair open, a pair in the log, the panel of a midline mark (no `Both sides`).

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
