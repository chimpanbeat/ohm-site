# B9: Verify the body map (I-111)

Brief §15 BM-1–BM-14 · Architecture §B12

Models: builder Fable 5.2 (high effort) · architect Fable 5.2 (plans the fixes as new items) · reviewer Fable 5.2 (live Drive sends and the read-style access checks). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
Every BM passes, first in Playwright (Chromium and WebKit, at 375 and 1280 px), then with Brian on real devices over LAN preview (`OHM_BODYMAP_PREVIEW=1`, the real endpoint). He needs his iPhone (current iOS), one Android, a desktop, and two people who haven't seen the page (I-111). The results go in the Results section below. Fixes become new items, not edits here. Read-only: all code. Known gaps: none.

## AC covered (IDs)
- BM-1: two new testers, timed by Brian, each under 3 minutes.
- BM-2: an iPhone pinch to 3×, then a pin; zoom out and it stays put.
- BM-3: the greyscale legend, checked by Brian's eye.
- BM-4, BM-5, BM-9: Brian opens the PDF in Drive.
- BM-6: a list-only send.
- BM-7: reload mid-entry; reload after sending; a Safari private window; a storage-throwing stub.
- BM-8: a "Test Client" send from the phone and from the desktop; read-style `curl` calls.
- BM-10: `curl` with an oversize body; the honeypot e2e.
- BM-11: airplane mode, then send, then retry.
- BM-12: DevTools → Network during one real send.
- BM-13: `check:dist` and `check:wording`.
- BM-14: swap rehearsal. On a scratch copy, replace one figure with an edited same-named SVG and rebuild; `git diff` shows no code change.

## Files
- docs/build/STATUS.md
- docs/build/steps/B9-verify.md

## Tests first (write them and see them fail before writing code)
No new code. Run `npm run check` and `npm run e2e:bodymap` on both engines. Then, as a sequence on each device: fill in, reload, send, then reload (empty). Brian deletes the test files from Drive afterwards.

## Done when
1. Every BM is marked pass in Results, with its evidence (test, screenshot or Brian's note).
2. Brian's go for launch is logged in STATUS → Change log.

## Results
(filled in by B9)

## Report
Files changed · Checks (command and result) · BM table · New items (I-###) · Questions for the architect.
