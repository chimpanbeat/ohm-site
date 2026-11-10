# B5: Body map figures and zones (I-073)

Brief §15 R1, R9 · Architecture §B12 Zones, Art, Pins

Models: builder Sonnet (high effort; Brian's call, Nov 10) · architect Opus (no planning in this step) · reviewer Opus (zone geometry and lookup; storage, payload shape and filing don't change). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The figure picker (`Female` · `Male`) and the view tabs (`Front` · `Back`) show the 4 v1 figures. Changing either keeps the pins. Four hidden zone files, `src/data/bodymap-zones/<sex>_<view>.json` with the keys of `bodymap.regions`, give every pin its region, and the PDF list shows region names. Zones are authored per figure and never mirrored. Left and right are the client's own: on a front view, `left-*` sits on the viewer's right.

New `scripts/bodymap-zones.mjs` (`npm run bodymap:zones`) renders an overlay PNG per figure into `docs/build/screens/bodymap-zones/` and prints coverage. Brian looks the overlays over (about 20 min) before done.

Read-only: `src/data/bodymap.ts`, `src/lib/geo.ts` (use `pointInRing`), the art. Known gaps: sit bones are faint and need coarse regions there (art README).

## AC covered (IDs)
- BM-9 (region names): the PDF test with known probes.
- BM-14 (zones half): tests 1–5. The swap rehearsal is in B9.

## Files
- src/data/bodymap-zones/female_front.json
- src/data/bodymap-zones/female_back.json
- src/data/bodymap-zones/male_front.json
- src/data/bodymap-zones/male_back.json
- scripts/bodymap-zones.mjs
- tests/bodymap-zones.test.ts
- src/lib/bodymap.ts
- src/lib/bodymap-pdf.ts
- tests/bodymap-pdf.test.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- package.json
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
1. Probe points are written first, from the art's landmarks (navel, xiphoid, knees, shoulder-blade spines, skull base), and each gives its expected key for each figure.
2. Coverage: the silhouette rasterised at 512×1024. At most 0.1% of body pixels fall outside every zone, with no gap over 4 px.
3. Each anchor lies inside its own zone and inside the body.
4. Left and right: on front views every `left-*` anchor has x above the centreline, and on back views below it.
5. Both sexes have the same key set per view. Every key has a name and every name a key. Each polygon has at least 3 points, stays within −0.05 to 1.05, and doesn't cross itself.
6. Sequence: a pin at the female-front navel is `belly-lower` or `belly-upper` as probed. Switching to male front looks it up again. A pin outside every zone shows `unlabelled`.

## Done when
1. `npm run check` passes, including the new tests.
2. Overlay PNGs exist for all 4 figures, and Brian says OK (logged in STATUS → Change log).
3. Screens of the picker at 375 and 1280 px in `docs/build/screens/B5/`.

## Report
Files changed · Checks (command and result) · Coverage numbers · Deviations · New items (I-###) · Questions for the architect.
