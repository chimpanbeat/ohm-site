# E15: RSVP card polish, bigger celebration, credits width

Brief §2 (Apps Script exception) · Architecture §B10, §A3 (the eleventh to thirteenth motion exceptions, enlarged)

## Goal
Brian's Nov 8 asks after testing a two-guest RSVP.
1. **Guest lines** (card, change page, emails): `{name} — {Session}: {Yes|No}`. On the card the name is bold, Yes green, No and Full terracotta, Waitlist plain. Emails bold the name.
2. **Result card buttons** less busy: the two calendar buttons are quiet outlines on one row; the notice (waiver) is the one solid button on its own row.
3. **Celebration** (Going): 110 pieces (dots, rectangles, strips) from the top of the result card, a fixed layer over the viewport, 3.4 s. The page first scrolls the result to 28% down the viewport (jump with reduced motion), then the burst fires.
4. **First tip spin** is long (36 lines, 4.4 s from the same moment as the burst, so it lands after the confetti); "Another tip" keeps the short spin.
5. **Credits** cards narrower (10 to 12 rem) so more fit on a row.
6. Not a code change: the `undefined` guests and `{link}` in Brian's test email came from the script's 10-minute feed cache holding the feed from before the E14 deploy. The live feed is correct; a fresh RSVP after the cache expires is right.

## Files
- apps-script/rsvp.js
- src/data/events.ts
- src/lib/rsvp.ts
- src/scripts/rsvp.ts
- src/components/events/RsvpForm.astro
- src/components/events/EventCredits.astro
- tests/rsvp.test.ts
- docs/build/copy-deck.md
- docs/build/STATUS.md
- docs/build/steps/E15-rsvp-card-celebration-polish.md

## Done when
`npm run check` passes; Brian pastes `rsvp.js` and deploys a New version (the bold name in emails only).
