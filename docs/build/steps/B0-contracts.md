# B0: Body map contracts (I-073, I-074, I-108)

Brief §2, §3, §15 (new) · Architecture §A1, §A3, §B1, §B7, §B11 (cross-ref), §B12 (new), §D, §C

## Goal
The architect turns the Nov 8 plan (`brief/bodymap-plan_2026-11-08.md`, git-ignored) and the spec (`_INBOX/ohm-bodymap-spec.md`) into contracts, docs and step files. No page, script or art is built here. Brian's Nov 8 answers apply everywhere and win over the plan text: client folders `First_Last`, unsorted folder `_Unsorted_Intakes` in the same parent, avoid pins can't be starred, PDF order Priority, Avoid, Other marks, link `/body-map` (bare: no header or footer), copy approved as drafted, no email, limits 6 per 10 min, 30 per Denver day and 3 per name and date per day, no auto-delete. The Nov 23 start no longer applies.
Changes to the plan, made here:
- Step IDs are B0 to B10, digits only. `status-closeout.mjs` only sees IDs matching `[A-Z]\d{1,2}`, so `B2R`, `B-V` and `B-L` would slip past it. The mapping is B2R→B3, B3→B4, B4→B5, B5→B6, B6→B7, B6R→B8, B-V→B9 and B-L→B10.
- The new ARCHITECTURE section is §B12, because §B11 is Analytics (A1). The page script is client script 8, because 7 is `analytics.ts`. §B12 points to the existing `/body-map` analytics exclusion in §B11.
- The art keeps its delivered names: `<sex>_<view>`, with views `front`, `back`, `left_side` and `right_side`. Zone files are `src/data/bodymap-zones/<sex>_<view>.json`, as spec §7 has it. Keeping the names means an art swap needs no renames (AC-14).
- `--bodymap-figure` is `#d3d7dc`, the silhouette fill measured from the delivered SVGs. B1's art test confirms it.
- Clasp: `scripts/push-apps-script.mjs:16-21` stages only `rsvp.js` and `appsscript.json` into a fresh `.apps-script-build/`, so `apps-script/bodymap/` can't reach the RSVP project. This satisfies P9 (I-109) by construction. B2 adds a `bodymap` target to that script and a `bodymap` entry in the gitignored `.apps-script-ids.json`. There is no per-folder `.clasp.json`.
- Every step's `## Files` list spells out each path. There are no braces or globs, because the guard matches exact paths.
Read-only here: `src/data/wording.ts`, `src/data/analytics.ts`, `src/lib/events.ts`. Known gaps: none block B0. I-075 (the folder ID) is typed by Brian at B2, never into the repo.

## AC covered (IDs)
- None built. BRIEF §15 lists BM-1 to BM-14 (the spec's AC-1 to AC-14, same text, `_Unsorted_Intakes`), each mapped to a step and a check.

## Files
- .claude/hooks/protected.json
- brief/BRIEF.md
- docs/build/ARCHITECTURE.md
- docs/build/copy-deck.md
- docs/build/STATUS.md
- docs/build/steps/B0-contracts.md
- docs/build/steps/B1-art.md
- docs/build/steps/B2-filing-script.md
- docs/build/steps/B3-review-data-path.md
- docs/build/steps/B4-thin-slice.md
- docs/build/steps/B5-figures-zones.md
- docs/build/steps/B6-pins-details.md
- docs/build/steps/B7-report-polish.md
- docs/build/steps/B8-review-privacy.md
- docs/build/steps/B9-verify.md
- docs/build/steps/B10-launch.md
- src/data/bodymap.ts
- src/data/site.ts
- src/styles/tokens.css
- tests/bodymap-data.test.ts

## Tests first (write them and see them fail before writing code)
`tests/bodymap-data.test.ts`:
1. `bodymap.open === false` and `site.bodymapUrl === ''`.
2. The figures are `['female','male']` and the views `['front','back']`. The art names are `<sex>_<view>`.
3. There are 5 pin types (`pain`, `discomfort`, `injury`, `numb`, `avoid`). Keys and shapes are unique. Each token name resolves in `tokens.css` through its alias to a hex value, and `--pin-halo`, `--pin-edge` and `--bodymap-figure` also resolve.
4. The limits are exactly 3 stars, 60 pins, 140-character notes, 80-character names, 24 h, 1.5 MB PDF and 64 KB report.
5. Regions: front has 28 keys and back has 29. Names are unique per view. Every `left-*` key has its `right-*` twin. Every key has a name.
6. Every `text` value is a non-empty string. None matches `/massage therapist|\bLMT\b|licensed/i`.
7. Sequence: the unsorted folder name is `_Unsorted_Intakes`. Normalising the folder `Alex_Example` and the typed name `alex  EXAMPLE` gives the same key (a pure helper, `folderKey`, in `bodymap.ts`, which B2 mirrors in the script).
8. `npm run check:contrast` still passes, and `tests/page-transition.test.ts` is unchanged (no page yet).

## Done when
1. `npm run check` passes, including the new test.
2. `protected.json` adds `src/data/bodymap.ts`, `src/data/bodymap-zones/*.json`, `apps-script/bodymap/bodymap.js` and `apps-script/bodymap/appsscript.json`. The change is logged in STATUS → Change log and in ARCHITECTURE §C.
3. BRIEF gains the §2 second write-only backend exception (not PocketSuite intake), the §3 JavaScript and `<noscript>` exception for `/body-map`, and §15 (purpose, R1 to R11, non-goals, BM-1 to BM-14, Google as processor, write-only as a code-level promise).
4. ARCHITECTURE gets §A1 pin tokens, §A3 "zoom is instant, no motion", §B1 rows, §B7 "never in the sitemap", §B12 (the plan's sections 2, 5 and 6 with the changes above) and §D (client script 8, the second Apps Script exception, art hex exempt). The pinned facts are re-read today, with URL and date.
5. The copy deck gains a Body map section with the plan's section-3 copy verbatim. `bodymap.ts` `text` and the region names match it.
6. STATUS has rows B0 to B10 between E16 and F1, with these effort levels: B1 medium, B2 high, B3 high, B4 high, B5 high, B6 medium, B7 medium, B8 high, B9 high, B10 low.
7. Each step file B1 to B10 follows `_template.md`, has exact Files lines and includes the plan's section-4 tests, updated for the names above.
8. Master list: I-108 done; I-109 done (with the evidence in Goal); I-076 done (the zip is in `_INBOX`).

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for Brian.
