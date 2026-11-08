# E10: Event page: floating RSVP bar, entrance, timeline, countdown, credit lift (I-097, I-098, I-100, I-101, I-102)

Brief §3 (JS only where a feature needs it), §5, AC-5, AC-9 · Architecture §A3 (fourteenth and fifteenth exceptions), §B10 → E8–E11 (Floating RSVP bar, Entrance, Timeline, Countdown, `event-time.ts`, Client script 6, Credit lift), §D

Runs after E9 (both touch `src/scripts/rsvp.ts`). Aim to push by Sat Nov 21: the countdown and the bar only help before the party.

## Goal
On event pages: a fixed bar of `Going` / `Maybe` / `Can't go` buttons shows while the RSVP section is below the viewport (JS only, not closed, no result) and a tap scrolls to the form with that answer checked and focus in Name; the sections after the hero fade up with the existing `.rise`; the schedule has round dots on per-item segments, the segment into the optional climb dashed, and the item happening now marked (`aria-current="time"`) in the browser; under the hero date a countdown reads `In {n} days`, `Tomorrow`, `Today!` or nothing, in the event's time zone; credits lift 2px with `--shadow-lift` on hover and keyboard focus. **Already done by the architect (read-only here):** `--shadow-lift` in `tokens.css`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`. Known gaps: none.

Notes:
- **`events.ts`: values only:** add `countdownDays`, `countdownTomorrow`, `countdownToday` to `rsvpText` (after E9's keys); move their three rows into the deck's `### RSVP text` table (no word changes); delete the then-empty "changes" section's table and heading.
- **`src/lib/event-time.ts`** (new, no imports): `countdown`, `currentItem` per §B10; dates by `Intl.DateTimeFormat` parts in `tz`.
- **`src/scripts/event.ts`** (client script 6, imported only by `events/[event].astro`): fills `.event-countdown` from its data attributes and marks the current timeline item on load and every 60 s while `document.visibilityState === 'visible'`. Imports only `event-time.ts`.
- **`RsvpBar.astro`** (new) and its logic in `src/scripts/rsvp.ts` per §B10; `events/[event].astro` places it after the hero section, adds `rise` to the later sections' containers and imports `event.ts`.
- **`EventTimeline`:** circles, per-item segments, `data-start` / `data-end`, the `--now` style; the item's text layout unchanged. **`EventHero`:** the countdown line (only when the build time is before `event.end`). **`EventCredits`:** the lift. Tokens only.
- **Reviewer page:** at the step boundary, add E10's review cards to `CARDS3` and republish (CLAUDE.md).

## AC covered (IDs)
- AC-9: tests 1–5. AC-5: Done when 3.

## Files
- src/data/events.ts
- src/lib/event-time.ts
- src/scripts/event.ts
- src/scripts/rsvp.ts
- src/components/events/RsvpBar.astro
- src/components/events/EventHero.astro
- src/components/events/EventTimeline.astro
- src/components/events/EventCredits.astro
- src/pages/events/[event].astro
- docs/build/copy-deck.md
- tests/event-time.test.ts
- tests/events.test.ts
- tests/rsvp.test.ts
- tests/page-transition.test.ts
- tests/entrance-stagger.test.ts
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/event-time.test.ts` (tz `America/Denver`, the launch party's times):
1. `countdown`: Nov 20 10:00 MST → days 2; `2026-11-21T03:00:00Z` (Nov 20, 8 pm in Denver) → days 2, not tomorrow; Nov 21 23:59 MST → tomorrow; Nov 22 00:00 → today; 17:59 → today; 18:00 → `null`; Oct 31 12:00 MDT (before the Nov 1 DST change) → days 22.
2. `currentItem` with the four items and ends built as §B10 says: 13:44 → −1, 13:45 → 0, 14:00 → 1, 15:00 → 2, 18:00 → 3, 19:59 → 3, 20:00 → −1; one call per time in that order on the same array (no state).

`tests/events.test.ts` (built `events/launch-party.html`):
3. `.rsvp-bar` once, `hidden`, `role="group"`, `aria-label="Are you coming?"`, three `button[type=button]` with `data-status` `going`/`maybe`/`cant` and texts `Going`/`Maybe`/`Can't go`, after the hero section and before `id="rsvp"`. Each timeline `li` has `data-start` and `data-end` (item 0's end = item 1's start; item 3's end `2026-11-22T20:00:00-07:00`). `.event-countdown` has `data-tz="America/Denver"` and `data-text` equal to the three strings (skip this assertion when the build ran after the event's end). Exactly five `.rise` elements, each a section's `.container`, none in the first section.
4. Source: `EventCredits` has `box-shadow: var(--shadow-lift)` for `:hover` and `:focus-visible`, and `translate: 0 -2px` only inside `prefers-reduced-motion: no-preference`; `EventTimeline` has `border-radius: 50%`, `:has(+ .timeline__item--optional)` with `dashed`, no `border-left` on `.timeline`; `RsvpBar` has `position: fixed` and the `scroll-padding-bottom` rule; `src/scripts/event.ts` imports only `../lib/event-time.ts` and has no `fetch`, `localStorage`, `sessionStorage` or `document.cookie`.

`tests/rsvp.test.ts`: 5. `src/scripts/rsvp.ts` uses `IntersectionObserver`, dispatches a bubbling `change`, focuses `#rsvp-name` with `preventScroll`. `page-transition`: `events/launch-party.html: 2`. `entrance-stagger`: add `events/launch-party.html: 5` (and rename the test's count).

## Done when
1. `npm run check` passes (paste the test count).
2. Browser check (Playwright, `astro preview`, `page.clock.setFixedTime`, `page.route` for `site.rsvpUrl`): Nov 20 noon MST → `In 2 days`; Nov 21 → `Tomorrow`; Nov 22 1:30 pm → `Today!`, item 0 current; 3:30 pm → item 2 current, bar hidden (RSVPs closed); 7 pm → countdown empty, item 3 current. At the top with JS the bar shows; scrolled to `#rsvp` and past it, hidden; tapping `Maybe` scrolls, checks Maybe and focuses Name; tapping `Can't go` also hides the yoga question and guests; Tab reaches the bar right after the hero's links; after a mocked RSVP it stays hidden. Reduced motion: no rise, no lift translate. Without JS: no bar, empty countdown.
3. Lighthouse mobile on `astro preview` `/events/launch-party`: performance, accessibility, best practices ≥ 90; CLS 0.
4. `npm run shots -- E10` at 375 and 1280 (timeline, countdown, the bar at the top of the page, a credit in its hover state).

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
