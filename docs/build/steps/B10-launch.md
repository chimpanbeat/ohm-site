# B10: Launch the body map (I-073, I-074, I-112)

Brief §15 · Architecture §B12 Page

## Goal
`bodymap.open` becomes `true` (contract: this step lists `src/data/bodymap.ts`). The tests that pinned "closed" now pin "open":
- `tests/bodymap-data.test.ts` 1;
- the page test;
- `page-transition` (`body-map.html`: 1 script).

Push to `main` (Brian says push), wait for the deploy, then Brian sends "Test Client" from a phone and from a desktop on production. Both land as PDF plus JSON in `_Unsorted_Intakes`, and Brian deletes them. The runbook gets a "Launched" line.

Close I-073 and I-074. Hand the link to Brian with UTM-tagged variants for the intake form and texts (`docs/runbooks/analytics.md` conventions). Umami never runs on this page, so the tags only label the link. I-112 (the PocketSuite link) stays Brian's. Read-only: everything else. Known gaps: none.

## AC covered (IDs)
- Spec §10 "Launched": the two production test sends.

## Files
- src/data/bodymap.ts
- tests/bodymap-data.test.ts
- tests/bodymap-page.test.ts
- tests/page-transition.test.ts
- tests/client-policies.test.ts
- docs/runbooks/bodymap.md
- docs/build/STATUS.md

Earlier tests that change (I-123), each pinning the closed page:
- `tests/bodymap-data.test.ts` 1: `bodymap.open === false`.
- `tests/bodymap-page.test.ts`: the "closed" case (0 scripts, no form).
- `tests/page-transition.test.ts`: `body-map.html` has 0 scripts.
- `tests/client-policies.test.ts` test 15: the exact list of pages that carry a script. The open page adds `body-map.html`.

## Tests first (write them and see them fail before writing code)
1. Flip the three assertions first (open → 1 script, the form present, no `closed` text) and watch them fail.
2. Then set `open: true` and see them pass.
3. Sequence on production: load → send "Test Client" → confirmation → reload shows an empty form.

## Done when
1. `npm run check` passes, and `npm run check:wording`, `check:contrast`, `check:dist`, `check:secrets` and `check:reviewer` each pass on their own against the open build (the open page is a new kind of built page, I-123).
2. Both production sends are in Drive, and Brian confirms.
3. The link is in the report: `https://ohmprecisionbodywork.com/body-map`, plus the UTM-tagged variants.

## Report
Files changed · Checks (command and result) · Links for Brian · New items (I-###) · Questions for the architect.
