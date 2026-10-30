# M2: Motion set two, part 2: scroll-linked header, content entrance, Home hero drift (Brian approved Oct 30, 2026)

Brief §3, §9 · Architecture §A1 (`--green-300`), §A3 (motion rules; eighth, ninth and tenth motion exceptions), §A4, §B3 `Header`, `Dropdown`, `PriceTable`, §D

## Goal
Three CSS-only scroll motions, exactly as ARCHITECTURE §A3 specifies them. (1) Header: over the first 40px of scroll (`scroll(root block)`, `0px 40px`) a `--green-300` hairline (`.site-header::after`) fades in over the existing border and `.site-header__logo` scales to 0.88 from its left edge; the header height and padding never change, and nothing touches `.logo-omega` / `.logo-icon` (the Home spin keeps working while scrolled). (2) Entrance: the `.rise` utility in `global.css` fades items up 8px once when they enter the viewport (`animation-trigger: --ohm-rise play-once`, 400ms, 60ms stagger by `:nth-of-type`), on exactly nine items: Home's three `.info > div`, Pricing's two `.rate-card`, Services' four specialty `Dropdown`s (new prop `rise`). (3) Home: `.hero-art` drifts 16px down as the hero scrolls away (named `view-timeline: --ohm-hero` on `.hero`, `translate` only). Each sits behind its `@supports` and `prefers-reduced-motion: no-preference`; the resting style is the static design. No copy, no script, no new token, no dependency. Read-only here: `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `src/styles/tokens.css`. Known gaps: Safari and Firefox get no entrance (no `animation-trigger`); accepted, see §A3.

Notes:
- Write `animation-timeline` / `animation-trigger` after the `animation` shorthand in each rule (the shorthand resets the timeline).
- Never an anonymous `view()` or `scroll()` on `.hero-art` (`.hero` is `overflow: hidden`, a scroll container). Keep the desktop `transform: translateY(-50%)`; drift with `translate`.
- Nothing on Home may contain `omega-` (`check:dist`).
- `.rise` gets no opacity or translate outside the `@supports` / `@media screen and (prefers-reduced-motion: no-preference)` block, so content is visible without support, with reduced motion and in print.
- The commit gate runs `npm run check` on any Bash call that mentions check or test: do red-test runs from PowerShell, and edit with Edit. Write greps as `grep -E` with one `-e '…'` per pattern.
- Dist tests skip with a clear reason when their file is missing; source tests never skip. Built CSS is minified: use tolerant regexes.

## AC covered (IDs)
- AC-5 (Lighthouse ≥ 90, CLS 0): only `opacity`, `translate` and `scale` animate; browser check 4 records CLS 0; Lighthouse at PL.
- AC-3 (works without JS): test 15 (M1's script inventory) still passes; no script added.

## Files
- src/components/Header.astro
- src/styles/global.css
- src/pages/index.astro
- src/pages/services.astro
- src/components/Dropdown.astro
- src/components/PriceTable.astro
- tests/header-scroll.test.ts
- tests/entrance-stagger.test.ts
- tests/hero-drift.test.ts

## Tests first (write them and see them fail before writing code)
`tests/header-scroll.test.ts` (reads `src/components/Header.astro`; dist where noted)
1. Inside `@supports (animation-timeline: scroll())` and `@media (prefers-reduced-motion: no-preference)`: `.site-header::after` with `background: var(--green-300)`, `height: 1px`, `animation-timeline: scroll(root block)`, `animation-range: 0px 40px` (or `0 40px`); `@keyframes ohm-header-line` ends at `opacity: 1`.
2. Same block: `.site-header__logo` with `transform-origin: left center`, the same timeline and range; `@keyframes ohm-header-logo` ends at `scale: 0.88`.
3. In each of those two rules, `animation-timeline` comes after `animation:`.
4. The scroll block never names `.logo-omega`, `.logo-icon` or `transform`; neither keyframe has `height`, `padding`, `margin`, `width` or `border`. `.site-header` keeps `height: var(--header-h)`.
5. Sequence (spin while scrolled): the spin rule `.site-header__logo.is-spinning .logo-omega, .site-header__logo.is-spinning .logo-icon { animation: ohm-spin 0.9s ease-in-out 1 }` is unchanged and animates `transform` on children, while the scroll rule animates `scale` on the link; `tests/logo-spin.test.ts` still passes.
6. Dist: Home's CSS contains `scroll(root block)` and `ohm-header-logo`.

`tests/entrance-stagger.test.ts`
7. `global.css`: `@keyframes ohm-rise` has only a `from` with `opacity: 0` and `translate: 0 8px`.
8. `.rise` is set only inside `@supports (animation-trigger: --t play-once)` › `@media screen and (prefers-reduced-motion: no-preference)`, with `animation: ohm-rise 400ms ease-out both`, `animation-delay: calc(var(--rise-i, 0) * 60ms)`, `timeline-trigger: --ohm-rise view()` and `animation-trigger: --ohm-rise play-once` (after the shorthand); no `infinite`; `--rise-i` is 1, 2, 3 for `:nth-of-type(2)`, `(3)`, `(n + 4)`.
9. Dist count of elements whose `class` contains the word `rise`: `index.html` 3, `pricing.html` 2, `services.html` 4, every other page 0.
10. Never on an H1, the hero, the header or the footer: no `<h1`, `class="hero`, `site-header` or `site-footer` element carries `rise`; on `pricing.html` the Travel info dropdown has no `rise`.
11. Sequence (no-support, then support): with the `@supports` block removed from the CSS text, no rule left gives `.rise` any opacity, translate or animation; with it present, the only hidden state is the keyframe `from`.
12. Dist: the CSS `index.html` loads contains `animation-trigger:--ohm-rise play-once` (the minifier kept it).

`tests/hero-drift.test.ts` (reads `src/pages/index.astro`; dist where noted)
13. Inside `@supports (animation-timeline: scroll())` and `@media (prefers-reduced-motion: no-preference)`: `.hero` has `view-timeline: --ohm-hero block`; `.hero-art` has `animation: ohm-drift linear both`, then `animation-timeline: --ohm-hero` and `animation-range: exit 0% exit 100%`; `@keyframes ohm-drift` animates only `translate`, ending at `0 16px` (between 10 and 20px).
14. `index.astro` contains no `view()` and no `scroll(`; no `animation` on `.hero-text`, `h1`, `.subline` or `.cta-row`; the desktop `transform: translateY(-50%)` on `.hero-art` is still there.
15. Dist: Home's CSS contains `view-timeline:--ohm-hero`; M1's script inventory test still passes; `npm run check:dist` passes.

## Done when
1. `npm run check` passes, including the new tests and M1's, `logo-spin`, `divider-pulse` and `hello-breathe`.
2. `npm run shots -- M2` (reduced motion, from M1): `index`, `services`, `pricing`, `about` at 375 and 1280 px in `docs/build/screens/M2/`: they match M1's screens (static design, every block visible).
3. Browser checks with Playwright Chromium (scratch script, not committed; paste its output), at 375 and 1280: (a) Home at load: every `.rise` inside the first viewport reaches opacity 1 within 700ms; scroll to the bottom and wait 700ms: all three are 1; scroll to the top, then to the bottom again: the opacity read 30ms later is still 1 (no replay). Same on Pricing (2 cards) and Services (4 dropdowns). (b) Header: at scroll 0 the logo's computed `scale` is `none` or `1` and `::after` opacity 0; at 60px, `0.88` and 1; the header's `getBoundingClientRect().height` is 64 at both. (c) Home hero: `.hero-art` computed `translate` is `0px` at the top and `0px 16px` once the hero has scrolled out. (d) Click the header logo on Home at scroll 200: `is-spinning` is added and removed, and the logo's `scale` stays 0.88 throughout. (e) With `reducedMotion: 'reduce'`: nothing animates and every `.rise` is at opacity 1.
4. The same script sums `layout-shift` entries (no `hadRecentInput`) while scrolling Home, Services and Pricing top to bottom and back in 200px steps: 0.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
