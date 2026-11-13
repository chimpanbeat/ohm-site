# B5: Body map zones, lookup and the female figures (I-073, I-156, I-157, I-159)

Brief §15 R1, R9 · Architecture §B12 Revision of Nov 13, Zones, Report JSON, Art

Models: builder Sonnet (high effort; Brian's call, Nov 10) · architect Opus (no planning in this step) · reviewer Opus (zone geometry, lookup, and the report's new zone fields and version; storage and filing don't change). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Re-planned Nov 13, 2026 (architect): two zone levels and the report's zone fields joined the step, and the list grew from 57 to 120 polygons per sex, so the male figures and the figure picker moved to B5b.

**Starts only after Brian approves the zone list (I-159).** Use the approved list. If it differs from `docs/build/steps/B5-zone-list-draft.md`, the approved one wins and the counts below change with it.

## Goal
- **Contract** (`src/data/bodymap.ts`, as §B12 Zones and Report JSON): `zoneSet` = 1, `reportVersion` = 2, `zones` (`Record<View, Zone[]>`, `Zone` = `{ key, name, region }`: 51 front, 55 back), `sideOf(key)`, types `Side` and `Zone`. `regions` doesn't change. Keys and names are copied from the approved list, never typed fresh; the names also go in the copy deck → Body map → Region names.
- **Zone files** for `female_front` and `female_back`: `{ zoneSet, anchors, zones: [{ key, rings }] }`, leaves only (57 front, 63 back), authored for each figure and never mirrored. Polygons are simple (4 to 8 points), may reach 0.05 past the outline and don't trace it. Left and right are the client's own: on a front view `left-*` is on the viewer's right.
- **Lookup:** new pure `src/lib/bodymap-zones.ts`. `locate(file, view, x, y)` returns `{ zone, zoneName, region, regionName, side }` or `null`; the first leaf in file order wins.
- **Report:** `buildReport` writes `v: 2` and, on every pin, `zone`, `zoneName`, `region`, `regionName`, `side`, `zoneSet` and `fromList`, in §B12's key order. The PDF list shows the zone name. `bodymap-pdf.ts` still imports no zone file: the page script loads the files and passes the located pins in.
- **Page:** view tabs `Front` · `Back` for the female figure. Changing the view keeps the pins.
- **Tool:** new `scripts/bodymap-zones.mjs` (`npm run bodymap:zones`). Per figure it renders two overlay PNGs (leaves, coarse regions) into `docs/build/screens/bodymap-zones/`, prints coverage and each zone's smaller side, and with `--rows` prints the body's runs per row from `png/` (how the draft was measured). Brian looks the overlays over before done.

Read-only: `src/lib/geo.ts` (use `pointInRing`), the art. Known gaps: sit bones are faint, so `glute-lower` is one wide band; the male figures have no zones until B5b.

## AC covered (IDs)
- BM-9 (region names): the PDF test with known probes.
- BM-2 (zone sizes): test 5.
- BM-14 (zones half): tests 2–5. The swap rehearsal is in B9.

## Files
- src/data/bodymap.ts
- docs/build/copy-deck.md
- src/data/bodymap-zones/female_front.json
- src/data/bodymap-zones/female_back.json
- scripts/bodymap-zones.mjs
- src/lib/bodymap-zones.ts
- src/lib/bodymap-pdf.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- tests/bodymap-zones.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-pdf.test.ts
- tools/bodymap-e2e.mjs
- package.json
- docs/build/STATUS.md

Earlier tests that change: `tests/bodymap-pdf.test.ts` (about line 113) pins the report pin's keys, and `v: 1`.

## Tests first (write them and see them fail before writing code)
1. Contract: 28 and 29 regions as before; 51 and 55 zones; every zone's `region` is a region of the same view; every key is unique across both views and both levels and matches `^[a-z]+(-[a-z]+)*$`; every `left-` zone has a `right-` twin under the twin region; `sideOf` gives `left`, `right` and `midline`; no name is empty or has a licensure word.
2. Probes, written first from the art's landmarks (navel, xiphoid, knees, shoulder-blade spines, skull base): each gives its expected leaf and region on each female figure.
3. Coverage, silhouette rasterised at 512×1024: at most 0.1% of body pixels outside every leaf, no gap over 4 px.
4. File shape: `zoneSet` equals `bodymap.zoneSet`; the leaf keys are exactly the view's leaves; each region's anchor is inside one of its own leaves and inside the body; each polygon has at least 3 points, stays within −0.05 to 1.05 and doesn't cross itself. On front views every `left-*` anchor has x above the centreline, on back views below it.
5. Sizes: the smaller side of each leaf's bounding box is at least 105 canvas units, and of each region's at least 210, except `ribs-side` (170) and `shoulder-top` (195).
6. Sequence: a pin at the female-front navel reports the leaf and region the probe names, `side`, and `zoneSet` 1. Move it to the back view's skull base and it is looked up again. A pin with `fromList: true` reports its region, name and side with `zone: null`. A pin outside every leaf reports five nulls, and the PDF says `unlabelled`.
7. Static: `bodymap-pdf.ts` imports no zone file. The built page's HTML holds no fine zone name.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Overlay PNGs exist for both female figures at both levels, and Brian says OK (logged in STATUS → Change log).
3. Screens of the view tabs at 375 and 1280 px in `docs/build/screens/B5/`.

## Report
Files changed · Checks (command and result) · Coverage and smallest sizes · Deviations · New items (I-###) · Questions for the architect.
