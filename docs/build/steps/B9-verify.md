# B9: Verify the body map (I-111)

Brief §15 BM-1–BM-14 · Architecture §B12

Models: builder Opus (high effort; `/model opus` after the command stops) · architect Opus (plans the fixes as new items) · reviewer Opus (live Drive sends and the read-style access checks). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
Every BM passes, first in Playwright (Chromium and WebKit, at 375 and 1280 px), then with Brian on real devices over LAN preview (`OHM_BODYMAP_PREVIEW=1`, the real endpoint). He needs his iPhone (current iOS), one Android, a desktop, and two people who haven't seen the page (I-111). The results go in the Results section below. Fixes become new items, not edits here. Read-only: all code. Known gaps: none.

## AC covered (IDs)
- BM-1: two new testers, timed by Brian, each under 3 minutes, on the minimum path (name, date, marks, Send; BRIEF §15, I-177). They aren't told about `Add details` or the optional questions; the time counts whether or not they use them. Each filed JSON's `seconds` is noted beside Brian's stopwatch time (I-174).
- BM-2: an iPhone pinch to 3×, then a pin; zoom out and it stays put. Then, on the iPhone and the Android: press and hold that pin and drag it, and a one-finger pan right after still pans (I-148); the map-pin's point sits on the spot (I-150).
- BM-3: the greyscale legend and B6d's greyscale marks (all seven types, glyph and map-pin) on all six skin tones, checked by Brian's eye (I-151, I-167).
- R12 and R13 (I-148, I-151): on a phone, a pin and its log entry each open it, the log follows `Front` · `Back`, and a chosen skin tone shows `Grey` again after a reload; on the desktop, the panel and log sit left of the figure.
- R14 and R15 (I-168, I-170): on a phone, `Both sides` on the low back, drag one point, `Unlink`, `Undo`; the toolbar stays under the figure while scrolling; the loupe shows while holding and dragging and never on a quick tap. On the desktop, keys 1–7, F, B, Delete and Ctrl/Cmd+Z, and the tooltip. The two new testers' times (BM-1) include none of these.
- R17–R22 (I-171–I-179): on a phone, a whole-body item, a follow-up with `Since last time`, `Someone I'm helping` with a helper's name, the picker's two thumbnails `Figure 1` · `Figure 2` (and VoiceOver or TalkBack reads those names, no sex), and the consent line above Send; in Drive the file is under the client's name, the PDF opens with `Look at first` (a new injury and a numbness mark), `Filled in by …` and an unnumbered `Overall` line, and the JSON holds `consent: true`, `consentAt` (the send time) and `seconds`. A `curl` send without consent → `invalid`.
- BM-4, BM-5, BM-9: Brian opens the PDF in Drive. One send has every detail filled in (intensity 1–10, quality, acute or chronic, started, worse, better) and pins on his own left knee, front and back: the PDF and the JSON say left, name the zone he tapped, and the JSON pins carry `zone`, `zoneSet`, `side` and `regionName` (§B12 Report JSON).
- BM-6: a list-only send.
- BM-7: reload mid-entry; reload after sending; a Safari private window; a storage-throwing stub.
- BM-8: a "Test Client" send from the phone and from the desktop; read-style `curl` calls.
- BM-10: `curl` with an oversize body; the honeypot e2e.
- BM-11: airplane mode, then send, then retry.
- BM-12: DevTools → Network during one real send.
- BM-13: `check:dist` and `check:wording`.
- AC-5 on `/body-map` (BRIEF §12, Brian, Nov 14, 2026): Lighthouse mobile on the preview build, median of 3, performance, accessibility and best practices each 90+; SEO not scored (noindex by design).
- BM-14: swap rehearsal. On a scratch copy, replace one figure with an edited same-named SVG and rebuild; `git diff` shows no code change.

## Files
- docs/build/STATUS.md
- docs/build/steps/B9-verify.md

## Tests first (write them and see them fail before writing code)
No new code. Run `npm run check` and `npm run e2e:bodymap` on both engines. Then, as a sequence on each device: fill in, reload, send, then reload (empty). The live limits apply (§B12 Script state): use a different fake name or appointment date after every 3 sends, keep to 6 sends in 10 minutes, and expect `busy` past them. Brian deletes the test files from Drive afterwards.

## Done when
1. Every BM is marked pass in Results, with its evidence (test, screenshot or Brian's note).
2. Brian's go for launch is logged in STATUS → Change log.

## Results
(filled in by B9)

## Report
Files changed · Checks (command and result) · BM table · New items (I-###) · Questions for the architect.
