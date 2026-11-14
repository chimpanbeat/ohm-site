# B5d: Hand zones and further splits, zone set 3 (I-161, I-163, I-164, Brian's overlay look)

Brief §15 R9 · Architecture §B12 Zones (Hands, More splits, Arm and leg splits, Names, Side, Sizes, Zone-set version)

Models: builder Opus (largest geometry step: 162 leaves per sex, 324 polygons) · architect Opus (no planning in this step) · reviewer Opus (zone geometry, keys, names and the zone-set version; storage, report shape and filing don't change). No Fable. Ignored after Nov 16, 2026 11:59 pm PT (I-124). `/next-high` starts on Sonnet and stops: run `/model opus`, effort high, then `go`.

Runs after B5b's and B5c's wip commits (`91bbf9a`, `6f78544`) and before they close: both are `blocked: B5d`. Brian's one look (Done when 3) closes all three rows. Re-planned Nov 13, 2026 (architect, I-164): the zone audit's six arm and leg splits and the front elbow rename folded in, same `zoneSet` 3; builder Sonnet → Opus. **Re-planned again Nov 13, 2026 (architect), after Brian's overlay look** of the built, uncommitted step (the reviewer had accepted it): he drew new borders on the `-leaves.png` overlays (wrist/hand and forearm/wrist up on three figures, a slanted knuckle line on all four, `male_front`'s ankle line up) and asked for medial/lateral in the fine names. Same `zoneSet` 3, same keys, same counts. Changed below: At a glance, Goal (borders table, how to cut), test 1 (names), test 2 (moved probes), test 5 (sizes), test 6d, Files (`tests/bodymap-pdf.test.ts`), Done when 3.

## At a glance (per side unless midline; x on the client's left limb, F / M; §B12 has the reasons)
| Item | View | Old leaf → new leaves | Border |
|---|---|---|---|
| I-161 hands | front | `wrist-front`, `palm`, `fingers` → `wrist-front-inner`, `-outer`, `thumb`, `palm`, `index-middle-fingers`, `ring-little-fingers` | §B12 Hands, Borders 1–4 |
| I-161 hands | back | `wrist-back`, `knuckles`, `fingers-back` → `wrist-back-inner`, `-outer`, `thumb-back`, `knuckles`, `index-middle-fingers-back`, `ring-little-fingers-back` | §B12 Hands, Borders 1–4 |
| I-163 | front | `forehead` (midline) → `left-`/`right-forehead` | x 0.5 / 0.498, vertical |
| I-163 | front | `shin-upper`, `shin-lower` → `-inner`, `-outer` each | ridge 0.624 / 0.625; lower about 0.63 |
| I-163 | front | `foot-top` → `-inner` (big toe), `-outer` | middle of the foot's width |
| I-163 | back | `head-back-upper` (midline) → `left-`/`right-` | x 0.5 / 0.498, vertical |
| I-163 | back | `glute-lower` → `-inner`, `-outer` | x 0.393 / 0.395 |
| I-163 | back | `calf-upper` → `-inner`, `-outer`; upper/lower calf border moves | x 0.378 / 0.384; y 0.785→0.805 F, 0.771→0.80 M |
| I-164 | front | `forearm` (region leaf) → `forearm-upper-inner`, `-upper-outer`, `-lower-inner`, `-lower-outer` | middle of width; middle of length, to the moved wrist border |
| I-164 | back | `forearm-back` → the same four, `forearm-back-…` | as front |
| I-164 | back | `elbow-back` → `-inner`, `-outer` | middle of width |
| I-164 | back | `knee-back` → `-inner`, `-outer` | hamstring line (0.393–0.399 / 0.395) to calf line (0.378 / 0.384) |
| I-164 | front | `ankle-front` → `-inner`, `-outer` | x about 0.63 |
| Overlay look | front, back | wrist/hand, forearm/wrist and forearm upper/lower borders up, not `male_back` | Borders table below |
| Overlay look | all four | palm or back of hand / fingers → knuckle line | Borders table below |
| Overlay look | `male_front` | lower shin / ankle border | y 0.871 → about 0.865 (3542), above the malleolus marks |
| Overlay look | both | 42 fine names per side → medial/lateral, keys unchanged | copy deck → Zone names |

Counts: regions 28 / 31 (unchanged) · fine zones 74 / 80 · leaves 78 / 84 · 324 polygons for both sexes · `zoneSet` 3.

## Goal
- **Contract** (`src/data/bodymap.ts`, names exactly as copy deck → Body map → Zone names, medial/lateral): `zoneSet` 3; regions unchanged; keys and order as the I-164 plan: `zonesFront` = `zoneSplit('forehead', 'forehead and temple', 'head-face')`, `jaw`, `neck-front`, `collarbone`, `shoulder-front`, `chest-inner`, `chest-outer`, `elbow-inner` "front of elbow, medial", `elbow-outer` "front of elbow, lateral", `forearm-upper-inner`, `-upper-outer`, `-lower-inner`, `-lower-outer` (region `forearm`), `wrist-front-inner`, `wrist-front-outer`, `thumb`, `palm`, `index-middle-fingers`, `ring-little-fingers` (region `wrist-hand`), the belly, hip and thigh zones, `knee-inner`, `knee-outer`, `shin-upper-inner`, `-upper-outer`, `-lower-inner`, `-lower-outer`, `ankle-front-inner`, `-outer`, `foot-top-inner`, `-outer`. `zonesBack` = `zoneSplit('head-back-upper', 'back and top of head', 'head-back')`, `skull-base` to `glute-mid` as now, `glute-lower-inner`, `-outer`, `elbow-back-inner`, `-outer` (region `elbow-back`), `forearm-back-upper-inner`, `-upper-outer`, `-lower-inner`, `-lower-outer` (region `forearm-back`), `wrist-back-inner`, `-outer`, `thumb-back`, `knuckles`, `index-middle-fingers-back`, `ring-little-fingers-back` (region `hand-back`), the four hamstring zones, `knee-back-inner`, `-outer` (region `knee-back`), `calf-upper-inner`, `-outer`, `calf-lower`, `achilles`, `heel`. The code comment on the arm says inner = medial = little-finger side.
- **Zone files, all 4:** `zoneSet` 3, borders as §B12 Hands, More splits and Arm and leg splits. **Cut them from the HEAD files (`6f78544`), as before:** per arm, the union of HEAD's `forearm` (`forearm-back`) and its three hand leaves (`wrist-front`, `palm`, `fingers`; back `wrist-back`, `knuckles`, `fingers-back`), re-split into the ten leaves; on `male_front` per leg, the union of `shin-lower` and `ankle-front`, re-split into four; every other old leaf into its own new leaves. Each union's new leaves cover exactly what it covered (the calf pair: both calf leaves). Each twin's border is read off the art, never mirrored. Each arm has one inner/outer line from the upper arm through the wrist, running on into the thumb's border. The back of the leg has one line from glute to calf. File order: wrist halves, thumb, then `palm`/`knuckles`. On `male_back` the old `fingers-back` strip up the hand's outer edge goes to `thumb-back`. Free edges keep the 40-unit margin (don't trim the hands' and feet's extra margin: §B12 Sizes, later polish). Anchors don't move (each stays inside its region's leaves; `left-forearm`, `-forearm-back`, `-elbow-back`, `-knee-back` stay region keys and anchors).
- **Borders to cut** (canvas units, ±10 off the art; medial free edge · wrist's medial/lateral line · lateral free edge; free-edge points sit on HEAD's free edges, 40 past the outline). Wrist/hand = Brian's line; forearm/wrist = HEAD's moved up by the same amount along each of the three lines; knuckle line = Brian's, from the medial free edge to the thumb's border; forearm upper/lower = cut as before, from the midpoint of the forearm's lateral edge to the midpoint of its medial edge (and through the midpoint of its inner/outer line), each taken from the elbow border to the new forearm/wrist border (Brian, Nov 13: the quarters stay about equal; it moves up 15 to 25).

  | Figure, hand (viewer's) | Forearm upper/lower | Forearm/wrist | Wrist/hand | Knuckle line |
  |---|---|---|---|---|
  | female_front left | 595,1718 · 454,1694 · 308,1669 | 522,1858 · 401,1829 · 272,1797 | 485,1989 · 343,1952 · 221,1920 | 196,2134 → 476,2161 |
  | female_front right | 1458,1719 · 1600,1695 · 1746,1670 | 1531,1860 · 1653,1831 · 1783,1800 | 1568,1991 · 1710,1954 · 1830,1923 | 1587,2161 → 1861,2129 |
  | female_back left | 592,1724 · 447,1695 · 305,1668 | 519,1870 · 396,1832 · 269,1795 | 478,2001 · 342,1957 · 224,1918 | 211,2076 → 476,2161 |
  | female_back right | 1457,1718 · 1602,1694 · 1744,1670 | 1528,1859 · 1652,1829 · 1780,1799 | 1569,1990 · 1706,1954 · 1829,1922 | 1587,2161 → 1839,2076 |
  | male_front left | 587,1708 · 437,1681 · 290,1654 | 516,1846 · 392,1813 · 266,1779 | 487,1986 · 339,1946 · 210,1910 | 153,2125 → 487,2172 |
  | male_front right | 1463,1709 · 1609,1683 · 1759,1656 | 1537,1848 · 1655,1818 · 1786,1784 | 1558,1988 · 1706,1949 · 1833,1915 | 1576,2175 → 1878,2136 |
  | male_back both | mid-length, as already built | HEAD's, unchanged | HEAD's, unchanged | 200,2086 → 498,2147 · 1559,2151 → 1842,2076 |

  The thumb's border starts at the wrist/hand line's middle point and runs down the medial/lateral line to HEAD's meeting point, then as now. `male_front` ankles: one line at about y 3542 on both legs, just above the malleolus marks' tops (3548–3551).
- Read-only: `src/lib/bodymap-zones.ts`, `src/lib/geo.ts`, `scripts/bodymap-zones.mjs` (floors unchanged, no counts), `tools/bodymap-e2e.mjs` (it names no fine zone; one comment says "outer knee"), the art, the page.

## AC covered (IDs)
- BM-9 (region and zone names): test 2 on all 4 figures, test 5's report. BM-2 (tap accuracy, through the size floors): test 4.

## Files
- src/data/bodymap.ts
- src/data/bodymap-zones/female_front.json
- src/data/bodymap-zones/female_back.json
- src/data/bodymap-zones/male_front.json
- src/data/bodymap-zones/male_back.json
- tests/bodymap-zones.test.ts
- tests/bodymap-pdf.test.ts
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
1. **Contract (test 1):** `zoneSet` 3; 74 and 80 zones; 78 and 84 leaves; `wrist-hand` and `hand-back` six fine zones each, `forearm` and `forearm-back` four; the regions with no fine zones are exactly `left/right-upper-arm`, `-ribs-side` (front) and `-shoulder-top`, `-upper-arm-back` (back); no leaf has side `midline`; `sideOf('forehead')` becomes `sideOf('head-face')`. **Names:** no fine name matches `/\b(inner|outer)\b|finger side|thumb side|toe side|by the (little finger|thumb)/`; `Left front of elbow, medial`, `Right front of elbow, lateral`, `Left knee, medial`, `Right top of foot, medial`, `Left wrist, palm side, lateral`, `Left lower glute, medial, by the sit bone`, `Left shoulder blade, medial border, by the spine`, `Left lateral hip`; region names unchanged. `tests/bodymap-pdf.test.ts`: `Left knee, inner side` → `Left knee, medial` (three places).
2. **Old keys (test 8, zone set 3):** by exact key, none of these survives in `bodymap.zones` or any file's `zones[].key`: `forehead`, `head-back-upper`, and `left-`/`right-` + `fingers`, `fingers-back`, `glute-lower`, `calf-upper`, `shin-upper`, `shin-lower`, `foot-top`, `wrist-front`, `wrist-back`, `ankle-front`, `forearm`, `forearm-back`, `elbow-back`, `knee-back`. Don't check regions or anchors for the last four; keep zone set 2's shoulder checks.
3. **Probes (test 2; 0–1 unless canvas units; the architect checked every point on the art against the borders above, Nov 13: each moved or new point at least 33 units from every new border).** Hands, canvas units, the viewer's left hand (client's right on the front, left on the back):

   | Figure | wrist, medial | wrist, lateral | thumb | thumb base | palm/back of hand | index | middle | ring | little |
   |---|---|---|---|---|---|---|---|---|---|
   | female_front | 411,1890 | 333,1890 | 165,2070 | 255,2005 | 370,2080 | 188,2240 | 245,2280 | 310,2260 | 375,2240 |
   | male_front | 405,1880 | 327,1880 | 165,2070 | 255,2015 | 360,2090 | 185,2240 | 248,2270 | 309,2260 | 370,2250 |
   | female_back | 408,1894 | 330,1894 | 165,2085 | 235,2030 | 345,2045 | 185,2240 | 243,2290 | 302,2290 | 362,2275 |
   | male_back | 391,1868 | 319,1868 | 155,2090 | 220,2020 | 320,2020 | 177,2245 | 235,2285 | 295,2285 | 360,2265 |

   Moved: the wrist columns on the three moved figures (to the new wrist's middle; the old lateral points sat 10 to 25 from the new wrist/hand line, the medial 28 to 46) and female_back's back of hand (was 330,2080, 33 above the knuckle line). Wrist medial → `-wrist-front-inner`/`-wrist-back-inner`, lateral → `-outer`; thumb and base → `-thumb(-back)`; index, middle → `-index-middle-fingers(-back)`; ring, little → `-ring-little-fingers(-back)`. **New, the bug Brian saw** (both in the wrist leaves today): male_front (262, 1962) → `right-thumb`, (380, 1995) → `right-palm`. Twins: female_front (1743, 2260) → `left-ring-little-fingers`, (1885, 2075) → `left-thumb`; male_back (1863, 2245) → `right-index-middle-fingers-back`, (1880, 2085) → `right-thumb-back`. (40, 2300) → no zone.
   - **I-163,** unchanged: front (0.55, 0.07) → `left-forehead`, (0.45, 0.07) → `right-forehead`; (0.58, 0.76 F / 0.75 M) → `-shin-upper-inner`, (0.67, same y) → `-outer`; (0.60, 0.82) → `-shin-lower-inner`, (0.655, 0.82) → `-outer`; (0.60, 0.94) → `-foot-top-inner`, (0.665 F / 0.67 M, 0.94) → `-outer`. Back (0.45, 0.07) → `left-head-back-upper`, (0.55, 0.07) → `right-`; (0.44, 0.52 F / 0.505 M) → `-glute-lower-inner`, (0.33, same y) → `-outer`; (0.42, 0.74) → `-calf-upper-inner`, (0.335 F / 0.34 M, 0.74) → `-outer`; (0.42, 0.79 F / 0.78 M) → `-calf-upper-inner`; (0.38, 0.83 F / 0.82 M) → `left-calf-lower`. Twins: female_front (0.42, 0.76) → `right-shin-upper-inner`; male_front (0.40, 0.94) → `right-foot-top-inner`; female_back (0.665, 0.74) → `right-calf-upper-outer`; male_back (0.56, 0.505) → `right-glute-lower-inner`. Female only: (0.5, 0.07) → `left-forehead` front, `right-head-back-upper` back.
   - **I-164,** `left-`, F / M: front forearm (0.748 / 0.755, 0.402 / 0.40) → `-forearm-upper-inner`, (0.795 / 0.801, same y) → `-upper-outer`, **(0.775 / 0.779, 0.432 / 0.431) → `-lower-inner`, (0.816 / 0.822, same y) → `-lower-outer`; wrist (0.802 / 0.801, 0.462 / 0.46) → `-wrist-front-inner`, (0.84, same y) → `-outer`**; ankle (0.61 / 0.608, 0.887 / 0.888) → `-ankle-front-inner`, (0.649 / 0.647, same y) → `-outer`. Back forearm (0.253 / 0.241, 0.402 / 0.391) → `-forearm-back-upper-inner`, (0.206 / 0.188, same y) → `-upper-outer`, **(0.226 / 0.215, 0.432 / 0.424) → `-lower-inner`, (0.184 / 0.173, same y) → `-lower-outer`**; elbow (0.279 / 0.259, 0.357 / 0.348) → `-elbow-back-inner`, (0.236 / 0.213, same y) → `-outer`; knee (0.421 / 0.418, 0.677 / 0.672) → `-knee-back-inner`, (0.365 / 0.361, same y) → `-outer`. Twins: female_front (0.206, 0.402) → `right-forearm-upper-outer`; male_front (0.39, 0.888) → `right-ankle-front-inner`; female_back (0.636, 0.677) → `right-knee-back-outer`; male_back (0.737, 0.348) → `right-elbow-back-inner`, (0.823, 0.424) → `right-forearm-back-lower-outer`. Bold = moved: the old lower-forearm points (y 0.436) sat 22 to 39 from the new forearm/wrist line, the old wrist points (0.47 / 0.471) 12 to 42 from the new wrist/hand line. `male_back`'s didn't move. Checked again against the mid-length forearm line (Brian, Nov 13): every forearm point, upper and lower, front and back, F and M, twins included, is 38 or more from it (nearest: male_front upper lateral, 38), 38 or more from the inner/outer line and 44 or more from the elbow and forearm/wrist lines, so none moved.
   - Unchanged: `right upper arm` (0.30, 0.30 F / 0.28, 0.29 M) → `right-upper-arm`; `left palm` (0.85, 0.51 F / 0.845, 0.505 M), 54 and 87 from the knuckle line. Probe labels may follow the new names. Any probe you draw within about 0.007 of a border: move it, check it on the art, report it.
4. **Coverage (test 3) and file shape (test 4):** unchanged rules; `zoneSet` 3 in all 4 files; every anchor inside a leaf of its region.
5. **Sizes (test 5):** every leaf at least 105. Expect about 150 for the finger pairs, 154 or more for I-163's halves, 129 to 142 for the ankle halves, about 147 or more for the wrist halves, about 170 or more for the elbow and knee halves, and 153 to 176 for the forearm quarters (153 to 166 on the front and female back, 140 to 146 units long each on the arm). Region floors unchanged.
6. **Sequences (6, 6b, new 10):** (a) a pin at the female front ring finger (310, 2260), then switch to male → `right-ring-little-fingers` both times; the report pin has `zoneName` `Right ring and little fingers`, `regionName` `Right wrist and hand`, side `right`, `zoneSet` 3. (b) A list pin for `left-hand-back` reports that region with `zone: null`. (c) A tapped pin at (0.55, 0.07) front reports `left-forehead`, side `left`; then a list pin for `head-face` reports `zone: null`, side `midline`. (d) A tapped pin at back (0.421, 0.677) reports `left-knee-back-inner` "Left back of knee, medial" in region `left-knee-back` "Left back of knee"; switch to male → the same zone; then a list pin for `left-knee-back` reports that region with `zone: null`.

## Done when
1. `npm run check` passes. `npm run e2e:bodymap` passes.
2. `npm run bodymap:zones` renders all four figures; 0 flagged, coverage as before.
3. Brian looks at all four `-leaves.png` overlays: the hands with his moved borders, `male_front`'s ankles and every split; approves the medial/lateral names (copy-deck drafts) and says OK (logged in STATUS → Change log). The reviewer and Brian check by eye, as well as by the box floor: the lower-shin halves at the ankle (about 75 units of body each), the wrist halves (about 75), the lower forearm quarters at the wrist end (about 80 across) and the ankle halves (about 85). That OK meets B5b's Done when 2 and B5c's Done when 3; set B5b, B5c and B5d done.

## Report
Files changed · Checks (command and result) · Smallest sizes of the new hand and split leaves per figure · Probes moved and why · Deviations · New items (I-###) · Questions for the architect.
