# B6e: Body map whole-body item, visit and who-for questions, figure thumbnails, consent line and timer (I-073, I-171, I-172, I-173, I-174, I-176, I-178)

Brief §15 R1, R17–R21, BM-1 (minimum path), BM-5, BM-12 · Architecture §B12 Layout, Pins (Whole-body item; Visit, who it's for, figure picker, consent and timing; Decisions; Undo; Helper … review line), Storage, Privacy, Checks (minimum-path flow)

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (new health and personal data in storage; the timer must be the only measurement; consent adds no control). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Planned Nov 14, 2026 (architect) from I-171 to I-178; revised the same day after Brian's answers (consent is a line, not a tick; thumbnails in the picker). B6 already set the keys and storage shape; this step gives them behaviour and UI. Needs B6d done. Every string is approved (copy deck → Whole body, visit, …; Brian, Nov 14); I-175 and I-178 keep their defaults.

## Goal
- **Whole-body item** (§B12): at most one `whole`; `wholeAdd` (with `wholeHint`) above the log adds it (the toolbar's type, `pain` if that is avoid) and opens the panel `{type} · Whole body`; the panel minus `Both sides` and `Move`, avoid hidden from its chips; first log entry on both views; star counts toward 3; Undo covers add and remove; Delete removes it; one mark in the review line, none in the toggle counts; not one of the 60; a send with only it is allowed.
- **Visit:** `visit` radios, none at load, stored; on `followup`, `since` chips first behind `Add details` (marks and the whole item). **Who it's for:** `forWhom` radios (`self` read when unanswered); `helper` relabels the name `Their name` and shows the optional `Your name (optional)` (80, `autocomplete="off"`).
- **Figure picker** (§B12 Figure picker): two options, each a `<picture>` over the figure's own `<sex>_front` files by B6's rule (`<source media={bodymap.artQuery} srcset={svg}>`, then the WebP `<img>`; only the `<img>`, the SVG, when there is no WebP; never `png/`; no new asset), 40×80 px by CSS, `alt=""`, `aria-hidden`, with `Figure 1` / `Figure 2` as the visible label and the radio's accessible name; `figureLabel` from the copy deck; stored values unchanged.
- **Consent:** the line `Sending saves this to my private client file.` directly above Send; no checkbox, nothing stored. The report builder sets `consent: true`, `consentAt` = `sent`. **Timer:** `firstAt` per §B12 Timing; a pure `secondsSince(firstAt, sent)` for B7.
- The minimum-path flow stays exactly as B6 wrote it.

Read-only: `src/styles/tokens.css`, the zone files, `src/lib/bodymap-zones.ts`, `src/lib/bodymap-pdf.ts`, `apps-script/`. Known gaps: the report and PDF carry these from B7; the script refuses a report without consent from B7b.

## AC covered (IDs)
- R1, R18, R21: e2e case 7, state test 2. R17: state test 1, e2e case 6. R19 (page half): e2e case 4. R20: state test 3. BM-5: state test 1. BM-1: e2e case 5. BM-12: state test 3.

## Files
- src/data/bodymap.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinPanel.astro
- src/components/bodymap/MarkLog.astro
- tests/bodymap-data.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-page.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
1. State, whole item in sequence: add → `whole` of type pain, no `x`/`y`; add again → refused; change to avoid → refused; star 3 pins then the whole → `star-limit`; with 60 pins, add whole → ok; Remove → `null`; undo → back with its fields; Start over → `null`.
2. State, visit: `since` set with `visit` null → kept, `fieldsOf` hides it; `visit` `followup` → shown; back to `first` → hidden, still kept; avoid and other never take `since`.
3. State, timer in sequence (clock injected): empty entry, place at t=1000 → `firstAt` 1000; remove, place again at t=5000 → still 1000; reload → 1000; `secondsSince(1000, 62999)` → 61; Start over → `null`; whole item first at t=9000 → 9000. The stored entry has only §B12 Storage's keys (no counters, flags or consent).
4. e2e consent at 375 px: the consent line is directly above Send and no input sits between the review line and Send; the minimum-path flow's POST body has `report.consent` `true` and `report.consentAt` equal to `report.sent`.
5. e2e minimum path: B6's flow passes unchanged; the visit, who-for, picker and whole-body controls untouched.
6. e2e whole item: `wholeAdd` → panel `Pain · Whole body`; the log on Front and on Back starts with it; the toggle reads `Front` (no count); review line `1 mark`; `Delete` at 1280 px removes it; `Undo` brings it back.
7. e2e questions and picker: `Someone I'm helping` → `Their name` and `Your name (optional)`; `Me` → hidden; `Follow-up`, open a mark's `Add details` → `Since last time` first with `Better` · `Same` · `Worse`; `First visit` → gone. The picker has 2 options, each with an `img` whose `src` equals that figure's front URL, rendered 40×80, and accessible names exactly `Figure 1`, `Figure 2`; tapping `Figure 2` shows the male figure; neither `Female` nor `Male` is in the visible text or accessible names; no request goes to a `png/` path.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens at 375 and 1280 px in `docs/build/screens/B6e/`: the top of the form with both questions and the thumbnails, the helper's field, the whole item in the panel and the log, a follow-up's `Add details` with `Since last time`, the consent line above Send.
3. The report states the page weight on load (bytes transferred, from the preview build served like Pages and from one LAN-phone load), before and after the thumbnails, at 375 px with touch (default figure `female_front.webp`, 104,840 bytes) and at 1280 px with a mouse (default figure `female_front.svg`, 412,647 bytes), and confirms by request log that each viewport fetched one female front file, the same one its `Figure 1` thumbnail showed; plus a Lighthouse mobile run on `/body-map` (median of 3) before and after, reporting performance, accessibility and best practices; after this step each must be 90+ (BRIEF §12 AC-5's `/body-map` exception), and SEO isn't scored.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
