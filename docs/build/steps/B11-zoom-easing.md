# B11: Body map zoom easing, after launch (I-149)

Brief §15 (Should, after launch) · Architecture §A3 sixteenth exception, §B12 Coordinates

Models: builder Sonnet (medium effort) · architect Opus (no planning in this step) · reviewer Opus (motion rules, phones unchanged). No Fable (Brian, Nov 13).

Planned Nov 13, 2026 (architect). I-149 is a Should that must not delay the launch, so it runs after B10; its desktop layout half was built in B6. Needs B10 done.

## Goal
The §A3 sixteenth exception, and nothing else: the wheel and the `+`, `−` and reset buttons ease the `viewBox` to its target in at most 200 ms (ease-out), the wheel toward the cursor, through one `requestAnimationFrame` loop that stops at the target and is retargeted by a new wheel step; the panel's content fades and rises 8 px in 150 ms when a pin opens (CSS). Pinch, pan, double tap and drag stay one to one, and the loupe (B6b) follows the eased `viewBox` frame by frame. The buttons sit in the toolbar since B6 (I-170). Reduced motion gives the instant behaviour. The pure easing lives in `src/lib/bodymap-view.ts`.

Read-only: `src/data/bodymap.ts`, `src/styles/tokens.css`, the zone files. Known gaps: none.

## AC covered (IDs)
- BM-2 still holds: e2e case 3.
- I-149 (Should): tests 1 and 2, e2e case 3, Brian's look on a desktop.

## Files
- src/lib/bodymap-view.ts
- src/scripts/bodymap.ts
- src/components/bodymap/PinPanel.astro
- tests/bodymap-view.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
1. Easing, pure: from zoom 1 to 3 about a cursor point, every frame's zoom lies between the two and rises; the last frame equals `zoomAt`'s result exactly; the canvas point under the cursor stays under it on every frame (within 0.5 canvas units); at 200 ms or later the target is reached.
2. Retarget, in sequence: a second wheel step at 80 ms aims at the new target from the current frame, with no jump back; reduced motion → one step, straight to the target.
3. e2e: wheel-zoom at 1280 px → a frame mid-way differs from the start and the end, and the end equals the instant result; with `reducedMotion: 'reduce'` the first frame is the end; at 375 px pinch and pan are unchanged and a pin placed at 3× lands within 10 px.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Brian tries the wheel and the buttons on his desktop and says keep or change.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
