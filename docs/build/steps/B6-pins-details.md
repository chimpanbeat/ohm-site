# B6: Body map pin model: seven types, fields, glyphs, tokens and the toolbar (I-073, I-150, I-158, I-166, I-167; I-170's toolbar; the Nov 14 data contract for I-171–I-174, I-178)

Brief §15 R3–R5, R15, BM-1, BM-2, BM-3 · Architecture §A1 pin tokens and `check:contrast` pin rules, §B12 Who applies, Pins (Types and fields, Fields, Marker), Coordinates → Layout (Toolbar), Storage, Report JSON, Checks (minimum-path flow)

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (contract and storage: the detail fields are health information). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Re-planned Nov 14, 2026 (architect), a third time: I-167's seven types, the two marker states (I-166 (4)) and I-170's toolbar split the Nov 13 B6 into B6 (model, art, toolbar), B6a (panel, log, layout, list), B6b (move, loupe, Undo), B6c (Both sides), B6d (tone, helper, keys, review line) and B6e (whole body, visit, who-for, figure thumbnails, consent line, timer). Later on Nov 14: this step also makes the one data-contract change for I-171–I-174 and I-178 (types and storage keys only; no UI). Needs B5d done (`zoneSet` 3). Copy deck → Details and → Seven types are approved (Brian, Nov 14).

## Goal
- **Contract** (`src/data/bodymap.ts`, §B12 Who applies): `types` in I-167's order with `shape`, `token`, `starrable` (false only for `avoid`) and each type's fields; `PinTypeKey` gains `tight`, `other`; `PinShape` `hexagon`, `bubble`; `intensity` `{ min: 1, max: 10 }`; `qualities` (three lists), `worsts`, `courses`, `visits`, `sinces`, `forWhoms`; `limits.detailChars` 80, `startedChars` 40 (`noteChars` 140); the Pin type with `since` and `mirror`; the entry type with `whole`, `visit`, `forWhom`, `helperName`, `firstAt`; the report types with `consent`, `consentAt`, `seconds`, `whole`, and `to`, `area` (`{ x, y, r, zones }`) on pins and mirrors. Strings: Details, Seven types (with `tightEnds`, `otherNote`, `note` = `Anything else?`) and `viewCount`, as written; `pdf.intensity` `{n}/10`.
- **Tokens** (§A1): the seven `--pin-<type>`, `--pin-injury-edge`, `--pin-injury-on`, `--pin-on`. **`check:contrast`** gets the seven-type rules. **Shapes:** the seven glyphs and the map-pin outline.
- **State** (`src/lib/bodymap.ts`): the pin fields and per-type rules (refuse what the type can't take; keep answers across type changes; `fieldsOf(pin)`), stars (avoid never; other yes), storage `v: 2` with every pin and entry key (new entry keys empty until B6e), bad values cleared.
- **SVG only** (Brian, Nov 14; §B12 Art): `body-map.astro` drops the `webps` glob and its comment, so every figure (and the PDF rasteriser, which draws what the page shows) uses `svg/<sex>_<view>.svg`; delete `src/assets/bodymap/webp/female_front.webp` and the WebP branch of `scripts/bodymap-art.mjs` (B1's over-400 KB rule is removed, not kept as an unused fallback).
- **Page:** marks in the two states (glyph; the last placed or tapped as the map-pin). **The toolbar** (§B12 Toolbar), sticky under the figure: seven glyph-only chips, each named by its type (`aria-label` from `types`), `pain` at load, the chosen type's name beside the row; `Front` · `Back` with `viewCount`; the zoom buttons. The view tabs go. The e2e **minimum-path flow** helper (§B12 Checks).

Read-only: the zone files, `src/lib/bodymap-zones.ts`, `apps-script/`. Known gaps: the panel, log and list are B6a; the new entry keys get UI in B6e; the report carries the fields from B7.

## AC covered (IDs)
- BM-1 (minimum path, BRIEF §15): e2e case 7. BM-2: e2e case 7. BM-3: test 5, `docs/build/screens/B6/legend-grey.png`, each type as glyph and map-pin in greyscale at 3×. R15 (chip names): e2e case 7.

## Files
- src/data/bodymap.ts
- src/styles/tokens.css
- scripts/check-contrast.mjs
- src/lib/bodymap-shapes.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- tests/bodymap-shapes.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-art.test.ts
- scripts/bodymap-art.mjs
- src/assets/bodymap/webp/female_front.webp
- tests/bodymap-page.test.ts
- tests/bodymap-pdf.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

Earlier tests that change: `bodymap-data` tests 3 and 4; `bodymap-art` test 1 (`tests/bodymap-art.test.ts` lines 24–43: "a WebP only for a v1 SVG over 400 KB" becomes "no `webp/` folder") and test 6; `bodymap-state` and `bodymap-pdf` pin builders; `bodymap-page`'s view-tab case.

## Tests first (write them and see them fail before writing code)
1. Data: seven types in order `pain`, `discomfort`, `tight`, `injury`, `numb`, `avoid`, `other`; shapes unique; tokens resolve; only `avoid` unstarrable; fields equal §B12's table; the quality lists, `worsts`, `visits` (`first`, `followup`), `sinces` (`better`, `same`, `worse`), `forWhoms` (`self`, `helper`) as §B12.
2. Stars, in sequence: star 3, a 4th → `star-limit`; unstar one, star the 4th → ok; star avoid → `star-avoid`; star other → ok; a starred pin changed to avoid → unstarred.
3. Fields, in sequence: intensity 1 and 10 ok; 0, 11, 5.5, `'7'` refused, old value kept; same value again clears. Pain `burning` then `sharp` → `['sharp', 'burning']`; `tingling` refused; to numb → `fieldsOf` quality `[]`, state keeps both; add `tingling`; back to pain → `['sharp', 'burning']`. Tight: `evenings`, `mornings` → `['mornings', 'evenings']`; `worst` on pain refused. Avoid and other: intensity refused, note kept. `since` `'better'` ok, `'gone'` refused. Caps: started 40, worse and better 80, note 140; control characters → space. Remove, add again → new id, no answers. Each change drops the send `id`.
4. Storage, in sequence: a `v: 1` entry deleted; a tight and an other pin with every field (`since` too) and an entry with `visit`, `forWhom`, `helperName`, `firstAt` and a `whole` object, reload → equal; stored intensity 11, unknown quality, worst, since or visit → that field cleared; unknown type → pin dropped; a `whole` of type `avoid` → dropped.
5. Shapes: seven glyphs at 40 samples per unit, every pair's IoU under 0.75; each centred within 0.25; the marker's lowest point (0, 0), head centred on x 0.
6. Contrast: a fill under 3:1 against the halo fails; injury without its edge fails; a `-on` under 3:1 fails; the real tokens pass.
7. e2e at 375 px: the toolbar under the figure, on screen while the figure scrolls; 7 chips, each at least 44 px, glyph only, accessible names exactly `types`; `Pain` pressed at load and shown beside the row; each type tapped → its glyph; the last is the map-pin; tap a glyph → it becomes the map-pin, no new mark; at 1× and 3× the point and a glyph's centre within 1 px of the tap; the toggle reads `Front 3`, `Back 2`; the minimum-path flow passes; the figure `<image>` loads `female_front` as an `.svg` URL and no request ends in `.webp`; the built `dist/_astro/` holds no bodymap WebP.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens in `docs/build/screens/B6/` at 375 and 1280 px: the toolbar; each type as glyph and map-pin at 3×, colour and greyscale; `legend-grey.png`; a starred glyph and map-pin.
3. Every chip's accessible name is its type name (e2e case 7; the reviewer checks it in the accessibility tree).
4. Brian looks at the seven glyphs and colours and says keep or change.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
