# B7: Body map report: the full PDF and JSON (I-073, I-153, I-155, I-167, I-168, I-169's reserved keys, I-171–I-174, I-178, I-179)

Brief §15 R4, R8, R14, R16–R22 · Architecture §B12 Pins → Types and fields, Both sides, Whole-body item, Visit … timing, Report and PDF, Report JSON, Wire contract (size), Privacy

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (client data in the PDF and JSON). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Re-planned Nov 13 and Nov 14, 2026 (architect). Nov 14, late: with I-171 to I-179 the old B7 (report, script, push and polish) was too big for one session, so it splits: this step builds the report; B7b changes the filing script, runs the real payload through it, pushes, and does the send polish (honeypot, caps, error states, accessibility, `check:dist`). The file keeps its name because history step files link to it. Needs B6e done. The PDF strings are approved (Brian, Nov 14: `Filled in by {name}`, `Filled in by someone helping`, `Look at first`, `Overall`, `Worst`).

## Goal
The full PDF (`src/lib/bodymap-pdf.ts`, §B12 Report and PDF):
- header: name, appointment, sent (Denver), figure, the visit when answered, `Filled in by …` when `forWhom` is `helper`;
- the `Look at first` box when it has a line: injury marks with `course` `acute` or unanswered and every numb mark, then the whole item first if it qualifies, each `{n} {type} · {region}` (region name with its side; a pair's `pairName`; `Overall` for the whole item, unnumbered), no other words;
- both views with numbered glyphs from the displayed art, always the art's grey (I-151); a pair: a glyph on each point, one number;
- `Overall` (`pdf.overall`): the whole item as one line, no number, never moved into `Priority` (its star badge in place when starred); then `Priority`, `Avoid`, `Other marks`. Each line: number, type, zone name (a pair's `pairName`), `{n}/10`, qualities, `Worst` and the times, each answered detail, `Since last time` on a follow-up, the note. A field unanswered or not the type's prints nothing. A list pin: region name and `pdf.fromList`;
- footer `{site.name} · private client record`.

The JSON (`buildReport`) is §B12 Report JSON in full: top-level keys in order with `visit`, `forWhom`, `helperName`, `consent`, `consentAt`, `seconds`, `whole`; every pin's keys in order with `since`, `mirror` (with `to`, `area` null), `to`, `area` null. `limits.reportBytes` becomes 96,000. Read-only: the zone files, `apps-script/`. Known gaps: the script accepts these from B7b.

## AC covered (IDs)
- BM-4: test 1. BM-5 (PDF half): test 1. BM-9: tests 1, 2. R14 (pairs): tests 2, 3. R16: test 3. R17, R18, R21, R22: test 2. R19, R20: test 3.

## Files
- src/data/bodymap.ts
- src/lib/bodymap-pdf.ts
- src/lib/pdf.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- tests/bodymap-pdf.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-data.test.ts
- docs/build/STATUS.md

Earlier tests that change: `bodymap-data` test 4 (`reportBytes`).

## Tests first (write them and see them fail before writing code)
1. PDF order: header → `Look at first` → two images → `Overall` → `Priority` → `Avoid` → `Other marks`; starred first among pins; avoid only under `Avoid`; numbers match; name and date present.
2. PDF content: pain 7, `sharp`, `burning`, chronic, all texts → `7/10`, both qualities, `Chronic`, each text after its label; no answers → no labels; avoid and other → no intensity; tight with `mornings`, `still` → after `Worst`; a pain pin that was tight → no `Worst`; a pain pin that was numb with `tingling` → no `Tingling`; a list pin → region and `chosen from the list`; a low-back pair → `Low back, beside the spine (L and R)` once, two glyphs with one number. Look at first: an acute injury, an unanswered-course injury, a chronic injury, a numb pair and a pain pin → exactly 3 lines (the chronic and pain absent), the pair's line `(L and R)`; none qualifying → no box; a numb whole item → an unnumbered `Overall` line first; the `Overall` section has no number and a starred whole item isn't under `Priority`. Header: `Follow-up` and `Filled in by Sam Sample`; helper with no name → `Filled in by someone helping`; `self` → no line. `since` `worse` on a follow-up → `Since last time` `Worse`; on a first visit → absent.
3. JSON: `v` 2; top-level and pin keys exactly §B12's, in order; avoid and other pins' details empty; a single pin's `mirror` null, a pair's with both points' zone fields and null `to`/`area`; `to` and `area` null everywhere; `consent` true and `consentAt` equal to `sent` on every report; `seconds` = floor((sent − firstAt)/1000); `whole` null or its type's fields only; `since` null unless follow-up; `helperName` `''` unless helper; text trimmed.
4. Static: `bodymap-pdf.ts` and the rasteriser import no zone file or `png/` path; seven types draw their own glyph and none the marker; no tone read, no filter.
5. Size: 60 pairs with every field full of `"` (every quality and worst, `since`), a full whole item and an 80-character helper name → under 96,000 characters.
6. Sequence: build, send fails (mocked), retry 30 s later → same `id`, `seconds` 30 more, `sent` and `consentAt` 30 s later and still equal, report otherwise equal.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes (the minimum-path flow unchanged).
2. A sample PDF from fake data (every type, a pair, a whole item, a follow-up, a helper, a Look at first box) is attached to the report, never committed; Brian looks at it.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
