# E6: Self-care tips: the Apps Script, the status reply, the tip card and the reminder line (I-082, I-084; live test needs I-083)

Brief §2 (the Apps Script exception), AC-9 · Architecture §B10 (Data, feed, RSVP form → Tip card, Wire contract, Apps Script → Tips, Emails, Privacy)

**Deadline:** the reminder run is **Sat Nov 21, 10:00 am MST**. This step must be committed and pushed, and Brian must share the sheet (I-083), set `TIPS_SHEET_ID`, paste the new `rsvp.js` and deploy a new version before then (runbook → Self-care tips). Built **before E5** for that reason; E5's page edits have no deadline.

## Goal
The Apps Script reads Brian's sheet `Self Care tip of the day` (tab `Sheet1`, column A, header `Tip`) through `openById(TIPS_SHEET_ID)`, cleans it, caches it 300 s and returns `tips: string[]` on every ok status reply (`[]` when the event's feed has no `tips: true`, the property is unset, or the sheet can't be read); each reminder email gets its own tip line (`reminderTip`) just before the sign-off, no repeat within a run until all are used, and none when the sheet can't be read. On `/launch-party`, after any successful RSVP reply, a "Self-care tip of the day" card shows under the result with one tip and an `Another tip` button (shuffled, no repeats until all seen, never twice in a row; no button with one tip; no card with no tips, on failure, or without JS). **Already done by the architect (read-only here):** `src/data/events.ts` (`EventRsvp.tips`, `rsvp.tips: true`, `rsvpText.tipTitle`, `tipNext`, `reminderTip`), `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `docs/runbooks/events.md`. Known gaps: I-083 (sheet access) blocks only Done when 3. E5's data edits are not in `events.ts` yet; leave E4's expectations in the tests as they are.

Notes:
- **Script (`apps-script/rsvp.js`; you write it, per §B10 Apps Script → Tips):** constants `TIPS_TAB = 'Sheet1'`, `TIPS_TTL = 300`, `TIP_MAX = 280`, `TIPS_MAX = 100`; `readTips_()`, `cleanTips_(values)`, `tipDeck_(tips)` (`{ size, next() }`, `Math.random`); `doGet` slug reply adds `tips` after `session`; `remindEvent_` builds one deck after the snapshot lock is released; `mailReminder_` pushes `fill_(t.reminderTip, { tip })` as its own block before `signoff`, only when both are non-empty; `setup()` logs `Tips read: <n>` (and `TIPS_SHEET_ID not set (no tips)` when unset). Same `function` style, `_` suffixes, no new scope, no new reply key elsewhere; every other reply, email, column and lock stays byte-for-byte.
- **Feed (`src/lib/events.ts`):** `EventFeed.tips: boolean`; `feedFor` sets `tips: rsvp.tips === true`.
- **Client (§B10 RSVP form → Tip card):** `src/lib/rsvp.ts` exports `TIP_MAX`, `TIPS_MAX`, `cleanTips`, `shuffle`, `tipDeck`; `StatusReply` ok gains `tips`; `createRsvp` gains `random?`, state `tip`, `moreTips`, and `nextTip()`. `RsvpForm.astro`: the `.rsvp-tip` markup after `.rsvp-result` and its CSS; strings `t.tipTitle`, `t.tipNext` only. `src/scripts/rsvp.ts`: render and the button, `textContent` only.

## AC covered (IDs)
- AC-9 (no leaks, privacy, script behaviour): tests S1–S5, C1–C6. Tips public by design (§B10 Privacy): S1 checks nothing else leaks.

## Files
- apps-script/rsvp.js
- src/lib/events.ts
- src/lib/rsvp.ts
- src/scripts/rsvp.ts
- src/components/events/RsvpForm.astro
- tests/rsvp-script.test.ts
- tests/rsvp.test.ts
- tests/events.test.ts
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/rsvp-script.test.ts`. Fakes: `props.TIPS_SHEET_ID = TIPS_ID` (`'fake-tips-id-0123456789'`); `openById(TIPS_ID)` logs `openTips` and returns a spreadsheet whose `Sheet1` is a FakeSheet of `state.tips` (one-cell rows); `state.tipsFail` makes it throw; `state.tipsTab` renames the tab. `openById(SHEET_ID)` unchanged.
- S1. GET: rows `Tip`, `  Drink water  `, ``, `drink WATER`, `Stretch\nslowly`, 281 × `x`, `42` (a number), `Breathe\u0007out` → `tips` = `['Drink water', 'Stretch slowly', '42', 'Breathe out']`. Test 9 now expects GET keys exactly `ok, open, session, tips`; no reply or log line contains `TIPS_ID`.
- S2. Cache sequence: GET (1 `openTips`) → add a row → GET at +299 s: same tips, still 1 → at +300 s: the new row, 2. 150 distinct rows → 100 tips.
- S3. Failures: property unset → `[]`, no `openTips`; `tipsFail` → `[]` with `ok`, `open`, `spotsLeft` as without tips, and a second GET inside 300 s makes no new `openTips`; header only → `[]`; `tipsTab = 'Tips'` → first tab read; feed `tips: false` or no `tips` key → `[]`, no `openTips`.
- S4. Reminders at `reminderAt` (sequence): 5 going RSVPs, 3 tips → 5 mails, each with exactly one line `Self-care tip of the day: <tip>` as the block before the sign-off; the first 3 tips distinct, none used 3 times; with 7 tips all 5 distinct; `tipsFail` → 5 mails without the line, all stamped; feed `text` without `reminderTip` → no line; feed `tips: false` → no line, no `openTips`. With tips set, the confirmation, can't-go, change and spot-freed mails (tests 7, 13) contain no `Self-care tip` and no tip.
- S5. `setup()` logs `Tips read: 3`; unset → `Tips read: 0` and `TIPS_SHEET_ID not set (no tips)`; no log holds a tip. Test 15's file scan still passes.

`tests/rsvp.test.ts`:
- C1. `cleanTips([' a ', 'A', '', 5, null, 'b\nc', 281 × 'x', 280 × 'x'])` → `['a', 'b c', 280 × 'x']`; `cleanTips('a')` and `cleanTips(undefined)` → `[]`; 150 strings → 100.
- C2. `parseStatus`: the existing shapes now carry `tips: []`; `tips: ['A', 'B']` kept; `tips: 'A'` or `[1, {}]` → `[]`; a bad `session` is still `{ ok: false }` even with good tips.
- C3. `tipDeck` with a seeded LCG: 3 tips × 9 `next()` → each block of 3 is a permutation, no two in a row equal, the first equals `shuffle(tips, same seed)[0]`; 2 tips × 6 → strictly alternating; 1 tip → `size` 1, same tip twice; seeds 1–50, 4 tips × 30 → no repeat in a row.
- C4. Controller sequence: GET tips `A, B, C` → after `load` `tip` null; going reply → `tip` in the list, `moreTips` true; `nextTip()` × 6 → no repeat in a row, first three distinct; `cant` and `pending` replies → a tip; `invalid` and `server` → no result, no tip; an E3-shape GET (no `tips`) → `tip` null after the send; one tip → `moreTips` false; load fails then the post-send re-read has tips → the tip appears; a later read with other tips doesn't reset the deck.
- C5. Dist: `.rsvp-tip` starts after `.rsvp-result` ends (not inside), carries `hidden`, holds `<h3>` = `tipTitle`, `<p class="rsvp-tip__text"` with `aria-live="polite"`, a `<button type="button"` = `tipNext` with `hidden`; `data-text` JSON has `tipTitle` and `tipNext`.
- C6. Source: `src/scripts/rsvp.ts` has no `innerHTML` or `insertAdjacentHTML`; the `.rsvp-tip` CSS in `RsvpForm.astro` has no `transition` or `animation`; test 7 holds.

`tests/events.test.ts` test 7: feed keys add `tips`, `feed.tips === true`; a clone without `rsvp.tips` → `false`.

## Done when
1. `npm run check` passes (paste the test count; `check:contrast` and `check:wording` unchanged).
2. Screens in `docs/build/screens/E6/` (Playwright with the web app stubbed, as in E2): at 375 and 1280 px the going result with the tip card (3 tips), the card after one `Another tip`, one tip (no button), and the page with JS off (no card).
3. Live (needs I-083, this commit deployed, and Brian's runbook → Self-care tips steps 1–6): `setup()` logs `Tips read: n > 0`; a signed-out GET of `site.rsvpUrl?slug=launch-party` ends with the tips; one test RSVP shows the card. Otherwise list it as pending with the Nov 21, 10:00 am deadline.
4. `git diff apps-script/rsvp.js` touches only the tips code, `doGet`'s reply, `remindEvent_`, `mailReminder_` and `setup`.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
