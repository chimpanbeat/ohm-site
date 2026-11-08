# E9: RSVP result card: your answer, a line by answer, waiver button, confetti, emoji, tip card (I-094, I-095, I-096, I-099, I-103, I-105)

Brief §5, AC-9 · Architecture §A3 (eleventh to thirteenth exceptions), §B10 → E8–E11 (RSVP result card, Confetti, Result emoji, Tip card)

**Deadline:** pushed by Fri Nov 20, so `Self-care tip: {tip}` is in the feed before the Sat Nov 21, 10:00 am reminder. **No Apps Script paste:** the reminder line comes from the feed (`text.reminderTip`); `apps-script/rsvp.js` does not change (the item's "Brian re-pastes the script" is not needed; tell Brian in the report).

## Goal
After a successful RSVP the form's `RSVP` heading is visually hidden (kept for screen readers), the intro and spots line are hidden, and the card shows `RSVP: Going|Maybe|Can't go`, then `Can't wait to see you there!` / `Hope to see you there! 🤞` / `Sorry you can't make it! 🥲`, then the yoga lines; Going and Maybe get `Add to calendar` and `Fill out the waiver` (the notice's link, new tab); Going gets one confetti burst; the emoji animates once; the tip card is titled `Self-care tip`, styled like a Pricing rate card, and its tip lands through a slot-machine reel. Reduced motion: no confetti, no reel, emoji still. A `pending` reply and the honeypot's quiet success show none of the new lines. **Already done by the architect (read-only here):** `Notice.inResult` in `events.ts`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md` (every string). Known gaps: none.

Notes:
- **`events.ts`: values only:** `inResult: true` on the waiver notice; in `rsvpText` change `tipTitle`, `reminderTip` and add `resultStatus`, `cheerGoing`, `cheerMaybe`, `cheerCant`, `cheerMaybeEmoji`, `cheerCantEmoji` (after `reminderTip`), verbatim from the deck's "RSVP text changes in E9 and E10" table.
- **Copy deck:** move those eight rows into the `### RSVP text` table (replace `tipTitle` and `reminderTip`, add the six after `reminderTip`); leave the three countdown rows for E10. Change no words (test 1c).
- **`src/lib/rsvp.ts`:** `ResultView` fields, `resultView`, `confettiPieces`, `reelFor`, `createRsvp().allTips()` per §B10. Pure and Node-tested.
- **`RsvpForm.astro`:** result markup order and the actions row per §B10 (notice buttons rendered from `event.notices`, `hidden`); `.rsvp-tip__window`; the tip card, confetti, emoji and reel CSS and keyframes per §B10 and §A3, every keyframe inside `@media (prefers-reduced-motion: no-preference)`; tokens only.
- **`src/scripts/rsvp.ts`:** render the new fields with `textContent` only; heading `visually-hidden`, intro and spots hidden whenever `s.result`; the notice buttons follow `calendar`; confetti once when `answer === 'going'`; emoji class by answer; the reel each time `s.tip` changes. One `matchMedia('(prefers-reduced-motion: reduce)')` check gates confetti and reel. Remove every added node when its animation ends.
- **Runbook:** the tip-card line says `Self-care tip`; the sheet keeps its name.
- **Reviewer page:** at the step boundary, add E9's review cards to `CARDS3` and republish (CLAUDE.md).

## AC covered (IDs)
- AC-9: tests 1–6 (the form still works with and without JS; no reply data beyond the wire contract).

## Files
- src/data/events.ts
- src/lib/rsvp.ts
- src/scripts/rsvp.ts
- src/components/events/RsvpForm.astro
- docs/build/copy-deck.md
- tests/rsvp.test.ts
- tests/rsvp-script.test.ts
- tests/events.test.ts
- docs/runbooks/events.md
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/rsvp.test.ts`:
1. `resultView`: going → `answer` `going`, `statusLine` `RSVP: Going`, `cheer` `Can't wait to see you there!`, `cheerEmoji` `''`, `calendar` true; maybe → `RSVP: Maybe`, `Hope to see you there!`, `🤞`; cant → `cantTitle`, `cantText`, `RSVP: Can't go`, `Sorry you can't make it!`, `🥲`, `calendar` false, `lines` `[]`; pending → no `answer`, `statusLine` or `cheer`.
2. Flow (fake fetch): honeypot submit → result without `answer`; going submit → result with `answer`; then a status re-read with tips → `tip` set and `allTips()` equals the cleaned list; `nextTip()` twice → `allTips()` unchanged. Before any read `allTips()` is `[]`.
3. `confettiPieces(24, seeded)`: 24 pieces, every field in its range, `colour` an integer 0–3; the same seed gives the same pieces.
4. `reelFor`: `(['a'], 'a', r, 6)` → `['a']`; two tips → six items ending with the landing tip, fillers all the other; five tips → six items, last the landing tip, no filler equals it, no two neighbours equal; seeded runs repeat.
5. Built page (`events/launch-party.html`): `.rsvp-result` children in the §B10 order; `.rsvp-result__emoji` has `aria-hidden="true"`; `.rsvp-result__actions` holds the calendar link then one `a.rsvp-result__notice` (waiver URL, `target="_blank"`, `rel="noopener"`, text `Fill out the waiver`, `hidden`); the tip H3 is `Self-care tip`; `.rsvp-tip__text` sits inside `.rsvp-tip__window`; `data-text` carries the new keys.
6. Source: `RsvpForm.astro` has `@keyframes ohm-confetti`, `ohm-wiggle`, `ohm-droop`, `ohm-reel`, all inside a `prefers-reduced-motion: no-preference` block, no `infinite`, no hex; `.rsvp-tip` has `background: var(--bg-dark)` and `border-top: 3px solid var(--accent)`. `src/scripts/rsvp.ts` has `prefers-reduced-motion: reduce`, `visually-hidden`, and no `.animate(`, `requestAnimationFrame` or `innerHTML`.

`tests/rsvp-script.test.ts`: `TIP_LINE` becomes `/^Self-care tip: (.*)$/m`; the reminder tip tests pass unchanged otherwise. `tests/events.test.ts` 1c passes after the rows move.

## Done when
1. `npm run check` passes (paste the test count); `git diff --stat apps-script/` is empty.
2. Browser check (Playwright on `astro preview`, `page.route` answering `site.rsvpUrl` with wire-contract JSON, tips `['a', 'b', 'c']`): Going → status line, cheer, both buttons, confetti nodes appear and are gone within 1.5 s, the waiver opens in a new tab; Maybe → 🤞 with the wiggle class, both buttons; Can't go → 🥲, no buttons; pending → title and text only; each time the heading is visually hidden and intro and spots hidden. `Another tip` runs the reel and lands on the text the live region holds. With `reducedMotion: 'reduce'`: no confetti or reel nodes ever.
3. `npm run shots -- E9` plus screenshots of the Going and Can't go cards at 375 and 1280 (scrolled into view).

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
