# <<ID>>: <<title>>

Brief §<<n>> · Architecture §<<n>>

## Goal
What exists or works when this is done, in two or three sentences a reviewer can check: exports, behaviour, edge cases, and the copy (or its copy-deck key) for each file below. Read-only here: <<contract files>>. Known gaps and what to do meanwhile: <<TODO(Brian) items, or none>>.

## AC covered (IDs)
- AC-<<n>>: <<the test or named screenshot that proves it>>

## Files
<!-- One exact repo path per line, nothing else on the line. The contract guard reads this list: a protected path not listed here is blocked. -->
- <<path/to/file>>

## Tests first (write them and see them fail before writing code)
The cases to write, each with its input and expected result. Include sequences across calls ("upload, then save"), not only single calls. Every AC above has at least one case here or a named screenshot check under Done when.

## Done when
1. `npm run check` passes, including the new tests.
2. Screenshots of <<screens>> at 375 and 1280 px in `docs/build/screens/<<ID>>/` (UI steps only; static site: `npm run shots -- <<ID>>`).
3. <<Any other observable result.>>

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
