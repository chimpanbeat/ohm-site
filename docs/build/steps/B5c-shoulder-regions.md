# B5c: Back shoulder regions along the axillary line (I-160)

Brief §15 R9 · Architecture §B12 Zones (Back shoulder, Sizes, Zone-set version)

Models: builder Sonnet (medium effort) · architect Opus (no planning in this step) · reviewer Opus (zone geometry, keys and the zone-set version; storage, report shape and filing don't change).

Runs before B5b closes (B5b is `blocked: B5c`): it moves the male shoulder border that B5b's wip commit `91bbf9a` drew, so Brian looks at the male overlays once, after this step, and that one look closes both.

Nov 13, 2026 (architect, I-161): built in wip `6f78544`; Brian said "overlays ok" for the shoulders and the male divisions. Before the rows close he asked for the hand split, so B5c is `blocked: B5d`, doesn't run again, and is set done with B5b when B5d's hand look passes (B5d Done when 3).

## Goal
- **Contract** (`src/data/bodymap.ts`, as §B12 Back shoulder; names from copy deck → Body map): `zoneSet` 2. Back regions gain `...pair('shoulder-back', 'back of shoulder')` between `shoulder-top` and `shoulder-blade` (31 back). Back zones lose `shoulder-top-inner`, `shoulder-top-outer` and `shoulder-blade-outer` and gain `zonePair('shoulder-back-upper', 'back of shoulder, upper', 'shoulder-back')` and `zonePair('shoulder-back-lower', 'back of shoulder, by the armpit', 'shoulder-back')` (53 back). `shoulder-top` has no fine zones, so it is its own leaf. Front unchanged.
- **Zone files, back only** (63 leaves each, unchanged count). Re-key `left/right-shoulder-top-inner` → `left/right-shoulder-top`, `-shoulder-top-outer` → `-shoulder-back-upper`, `-shoulder-blade-outer` → `-shoulder-back-lower`; set `zoneSet` 2 in all 4 files; add `left/right-shoulder-back` anchors inside `-shoulder-back-lower` (about x 0.29 / 0.71, y 0.245 female; 0.27 / 0.73, 0.24 male). `female_back.json`: no point moves (its border already runs at x 707–717 canvas units). `male_back.json`: the top-inner/top-outer border runs diagonally from (477, 709) to (653, 852) on the left and (1559, 709) to (1386, 852) on the right; make it vertical at x 653 (right 1386) from the top outline to y 852, so it continues the blade and upper-arm border. Both leaves change; neighbours and coverage don't.
- `scripts/bodymap-zones.mjs`: `REGION_EXEMPT['shoulder-top']` 180 and its printed note; the stale comment that the male figures have no zones until B5b.

Read-only: `src/lib/bodymap-zones.ts`, `src/lib/geo.ts`, the front zone files, the art. Don't touch the page or the picker.

## AC covered (IDs)
- BM-9 (region names): probes in test 2 on both sexes.
- BM-2 (sizes): test 5.

## Files
- src/data/bodymap.ts
- src/data/bodymap-zones/female_front.json
- src/data/bodymap-zones/female_back.json
- src/data/bodymap-zones/male_front.json
- src/data/bodymap-zones/male_back.json
- scripts/bodymap-zones.mjs
- tests/bodymap-zones.test.ts
- tests/bodymap-data.test.ts
- docs/build/STATUS.md

(The front files change only their `zoneSet`.)

## Tests first (write them and see them fail before writing code)
1. `bodymap-data` 5: 28 front, 31 back regions; `left-shoulder-back` has its right twin. `bodymap-zones` 1: `zoneSet` 2; 51 and 53 zones; 57 and 63 leaves; no region has exactly one fine zone; none of the three old keys exists anywhere.
2. Probes on all 4 figures (canvas 0–1, check each on the art first): back (0.30, 0.19) → `left-shoulder-back-upper`, region `left-shoulder-back`; (0.70, 0.19) → `right-shoulder-back-upper`; (0.40, 0.185) → leaf and region `left-shoulder-top`. The two blade-outer probes (female 0.32, 0.23; male 0.29, 0.225) now expect `left-shoulder-back-lower`, region `left-shoulder-back`. The 0.19 probes fall on the male's old top-inner, so they fail until the border moves.
3. File shape (4): `zoneSet` 2 in all 4 files; 31 back anchors, each inside its own region's leaf.
4. Sizes (5): `shoulder-top` exemption 180; `shoulder-back` meets 210 (about 223 female, 256 male).
5. Sequence (6, 6b): the `zoneSet: 1` assertions read `bodymap.zoneSet`; a back pin at (0.30, 0.19) on female then male reports `left-shoulder-back-upper` both times, and a list pin for `right-shoulder-back` reports that region with `zone: null`.

## Done when
1. `npm run check` passes. `npm run e2e:bodymap` passes.
2. `npm run bodymap:zones` renders all four figures; 0 flagged, coverage as before.
3. Brian looks over `female_back` and `male_back` regions and leaves, and the male front, and says OK (logged in STATUS → Change log). That OK also meets B5b's Done when 2; then set both rows done.

## Report
Files changed · Checks (command and result) · Smallest sizes for `shoulder-top` and `shoulder-back` · Deviations · New items (I-###) · Questions for the architect.
