# B1: Body map art (I-074)

Brief §15 · Architecture §B12 Art, §A1 pin tokens, §D

Models: builder Sonnet (medium effort) · architect Opus (no planning in this step) · reviewer Opus (art and a contrast rule, no client data). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The delivered art is committed under `src/assets/bodymap/`, clean and checked. New `scripts/bodymap-art.mjs` (`npm run bodymap:art -- <extracted folder>`) copies the 8 SVGs to `svg/<sex>_<view>.svg` and the 8 2048×4096 PNGs to `png/<sex>_<view>.png`, keeping the delivered names. The views are `front`, `back`, `left_side` and `right_side`. The script also:
- strips any `<metadata>`, editor attributes and comments;
- rounds path numbers to at most 1 decimal;
- reports each SVG's size;
- writes `README.md`.

Any v1 SVG (front or back) still over 400 KB gets a transparent `webp/<sex>_<view>.webp` (1024×2048, rendered from the SVG with sharp). The README is the art's own, plus one dated line: `Hosting: Brian decided on Nov 7, 2026 to keep this set in the public ohm-site repo, with a copy in his Workspace Drive.` That line replaces the "Keep out of the public repo" sentence.

Source: extract `C:\Users\Brian Clarke\Claude_Projects\_INBOX\ohm_bodymap_art.zip` into a new empty folder outside the repo, and never into `brief/` or `src/`. The 887×1774 sources are not committed.

`check:contrast` gains the §A1 pin rules. Read-only here: `src/styles/tokens.css` (the tokens exist since B0), `src/data/bodymap.ts`. Known gaps: none.

## AC covered (IDs)
- BM-14 (art half): test 1–4 below. Names, viewBox and layers are fixed, so a same-named set drops in.
- BM-3 (colour half): the `check:contrast` pin rules.

## Files
- scripts/bodymap-art.mjs
- src/assets/bodymap/README.md
- src/assets/bodymap/svg/female_front.svg
- src/assets/bodymap/svg/female_back.svg
- src/assets/bodymap/svg/female_left_side.svg
- src/assets/bodymap/svg/female_right_side.svg
- src/assets/bodymap/svg/male_front.svg
- src/assets/bodymap/svg/male_back.svg
- src/assets/bodymap/svg/male_left_side.svg
- src/assets/bodymap/svg/male_right_side.svg
- src/assets/bodymap/png/female_front.png
- src/assets/bodymap/png/female_back.png
- src/assets/bodymap/png/female_left_side.png
- src/assets/bodymap/png/female_right_side.png
- src/assets/bodymap/png/male_front.png
- src/assets/bodymap/png/male_back.png
- src/assets/bodymap/png/male_left_side.png
- src/assets/bodymap/png/male_right_side.png
- src/assets/bodymap/webp/female_front.webp
- src/assets/bodymap/webp/female_back.webp
- src/assets/bodymap/webp/male_front.webp
- src/assets/bodymap/webp/male_back.webp
- tests/bodymap-art.test.ts
- scripts/check-contrast.mjs
- package.json
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/bodymap-art.test.ts`:
1. Exactly the 8 SVG and 8 PNG names, `artName(sex, view)` for 2 sexes × 4 views. A WebP exists only for a v1 SVG over 400 KB.
2. Each SVG has viewBox `0 0 2048 4096` and the groups `silhouette`, `landmarks` and `outline`, in that order. The `silhouette` fill equals `--bodymap-figure`.
3. Hygiene: no `<metadata>`, `sodipodi:`, `inkscape:`, `<!--`, `xlink:href` or `href` to a file, `C:\`, `/Users/` or `\Users\`. Each PNG is 2048×4096 and has no `tEXt`, `iTXt` or `zTXt` chunk.
4. The silhouette bounding boxes, rasterised with sharp, share one centreline within ±4 units across all 8.
5. Sequence: run `bodymap-art.mjs` on a synthetic folder holding one SVG with `<metadata>` and a comment, then run it again. The output is clean, and the second run gives identical bytes.
6. `check:contrast` on synthetic `tokens.css` copies: a pin fill under 3:1 against `--pin-halo` exits 1, and the real tokens exit 0.

## Done when
1. `npm run check` passes, including the new tests.
2. The report gives each SVG's size before and after, and says which (if any) got a WebP.
3. `git status` shows nothing under `brief/` and no source PNGs.
4. If the art isn't 8 figures in this naming, stop and send it to the architect.

## Report
Files changed · Checks (command and result) · Sizes · Deviations · New items (I-###) · Questions for the architect.
