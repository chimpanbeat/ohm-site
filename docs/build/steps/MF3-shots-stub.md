# MF3: Shots stub mode and B step file fixes (I-121, I-122, I-123)

Method feedback E2, E8 · tooling and step files only

## Goal
`npm run shots` can capture form states without throwaway Playwright scripts: `--stub <state>` answers the Apps Script endpoint with a fixture reply (`ok`, `busy`, `invalid`, `server`, `network`, `nonjson`, `sending`), `--nojs` turns JavaScript off, `--route /x` captures one route, and files are named `<route>-<state>-<width>.png` (with `-nojs`). Any other `script.google.com` request is aborted, and the stub never reads or logs a request body. The B step files name the earlier tests that pin "no page, form or script yet" and run new kinds of built page through every `check:*` script.

I-121 (load lazy images before a full-page capture) is **Parked**: no B step has a visual check on a lazy image. The figure is an SVG `<image>` in one `<svg viewBox>`, capped at 70% of screen height, so it is in the first viewport; the B6 legend shot comes from `tools/bodymap-e2e.mjs`; B9 checks the art by eye. Reopen it if a later step adds an `<img loading=lazy>` with a shot check.

Read-only: `src/`, `apps-script/`, deploy files, protected contracts.

## AC covered (IDs)
- Method feedback E2 (I-122), E2 and E8 (I-123); no brief AC.

## Files
- tools/shots.mjs
- tools/shots-stub.mjs
- tools/shots-scenarios.mjs
- tests/shots-stub.test.ts
- docs/build/steps/MF3-shots-stub.md
- docs/build/steps/B2-filing-script.md
- docs/build/steps/B4-thin-slice.md
- docs/build/steps/B7-report-polish.md
- docs/build/steps/B8-review-privacy.md
- docs/build/steps/B10-launch.md
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/shots-stub.test.ts`, no browser: argument parsing (unknown state throws and lists the valid ones), the endpoint matcher, the reply per state parsed by the real RSVP client, other Google requests aborted, file names, a static privacy check (no `postData`), and the wiring in `shots.mjs`.

## Done when
1. `npm run check` passes, including the new test.
2. Local smoke: `npm run shots -- MF3 --route /events/launch-party --stub busy` shows the busy error under the RSVP form at 375 and 1280 px.
3. `npm run shots` with no new flags behaves as before.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
