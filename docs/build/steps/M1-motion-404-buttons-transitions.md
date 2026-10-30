# M1: Motion set two, part 1: 404 Ω trace, button settle, page transitions (Brian approved Oct 30, 2026)

Brief §3, §9 · Architecture §A3 (motion rules; fifth, sixth and seventh motion exceptions), §A4, §B3 `Header`, §D

## Goal
Three CSS-only motions, exactly as ARCHITECTURE §A3 specifies them. (1) `/404` shows the traced Ω above the H1 (`svg.nf-mark` from `src/data/omega.json`): the line draws once from the right foot's inner corner, clockwise (`ohm-trace`, 700ms, delay 0.2s), then the fill settles in (`ohm-trace-fill`, 300ms, delay 0.9s); at rest and under reduced motion it is the filled Ω. (2) Every `.btn` lifts 2px through a 1px overshoot on hover (`ohm-settle`, 260ms), drops back on press (60ms), springs again on release, and returns over 150ms on leave; fine pointers only. (3) Pages cross-fade in 200ms through native `@view-transition { navigation: auto; }`, and the header (`view-transition-name: site-header`) stays still. Reduced motion turns all three off. `npm run shots` captures with reduced motion. No copy changes (the 404 text stays exactly as it is), no script, no new token, no dependency. Read-only here: `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `src/styles/tokens.css`, `src/data/omega.json`. Known gaps: none.

Notes:
- Do not add Astro `ClientRouter`, `astro:transitions` or any `transition:*` directive. No `<script>` anywhere in this step.
- Button rules go in one `@media (hover: hover) and (prefers-reduced-motion: no-preference)` block in `global.css`. Leave the existing `.btn`, `.btn:hover`, `.btn--quiet` rules above it as they are. `:hover` must not list `translate` in its `transition` (a running transition overrides the animation).
- The 404 stroke width is in viewBox units (20); no `non-scaling-stroke` (ARCHITECTURE §B8 explains why). No class starting with `omega-`.
- The commit gate runs `npm run check` on any Bash call that mentions check or test: do red-test runs from PowerShell, and edit with Edit. Write greps as `grep -E` with one `-e '…'` per pattern.
- Dist tests skip with a clear reason when the file they read is missing (`deploy.yml` runs `npm test` before the build); source tests never skip. Astro minifies built CSS (no spaces after `:` and `{`): match it with tolerant regexes, as `tests/hello-breathe.test.ts` does.

## AC covered (IDs)
- AC-5 (Lighthouse ≥ 90, CLS 0): nothing here animates layout; checked at PL. Browser check 4 below records CLS 0 on `/404`.
- AC-3 (works without JS): test 13 (no new script on any page).

## Files
- src/pages/404.astro
- src/styles/global.css
- src/components/Header.astro
- tools/shots.mjs
- tests/notfound-trace.test.ts
- tests/button-settle.test.ts
- tests/page-transition.test.ts

## Tests first (write them and see them fail before writing code)
`tests/notfound-trace.test.ts`
1. Source: `404.astro` imports `../data/omega.json`; has `class="nf-mark"`, `aria-hidden="true"`, two `d={omega.d}` paths, `pathLength="1"` on `.nf-mark__line`; no `<script`, no `#` hex, no `omega-` class. The H1 is `Page not found` and the paragraph text is unchanged (`That page doesn't exist, or it has moved.`).
2. Dist `404.html`: `noindex` meta present; the svg sits before the `<h1`; both paths' `d` equal `omega.d`.
3. Built CSS for 404 (inline `<style>` plus linked `.css`): `@keyframes ohm-trace` animates `stroke-dashoffset`; `@keyframes ohm-trace-fill` animates `opacity`; the line's animation is `.7s`/`700ms` with delay `.2s`, the fill's `.3s`/`300ms` with delay `.9s`; no `infinite` in any nf-mark rule; a `prefers-reduced-motion` block (or the `no-preference` wrapper) leaves the resting end state with no animation.
4. Sequence: the resting styles (outside any animation) are `stroke-dashoffset: 0` and fill opacity 1, and the keyframes start at 1 and 0, so no-motion and finished-motion look the same.

`tests/button-settle.test.ts` (reads `src/styles/global.css`)
5. `@keyframes ohm-settle` holds `translate: 0 0`, `0 -3px` (at 60%) and `0 -2px`, and nothing but `translate`.
6. Inside `@media (hover: hover) and (prefers-reduced-motion: no-preference)`: `.btn:hover` has `translate: 0 -2px` and `animation: ohm-settle 260ms ease-out`; `.btn:active` has `translate: 0 0` and `animation: none`.
7. Sequence hover → press → release → leave, by transition lists in that block: `.btn` lists `translate 150ms`; `.btn:hover`'s `transition` has no `translate`; `.btn:active` lists `translate 60ms`. Every duration in the block is ≤ 300ms.
8. Outside that block, no `.btn` rule sets `translate`, `transform` or `animation`, and the original `.btn` rule still has `transition: background-color var(--transition), border-color var(--transition), color var(--transition)`.
9. Dist: the CSS `index.html` loads (inline `<style>` or linked `.css`) contains `ohm-settle` and `hover:hover` (the minifier kept both).

`tests/page-transition.test.ts`
10. `global.css`: `@view-transition { navigation: auto; }` occurs once, inside `@media (prefers-reduced-motion: no-preference)`; the same block sets `animation-duration: 200ms` on `::view-transition-group(*)`, `::view-transition-old(*)` and `::view-transition-new(*)`.
11. `Header.astro`: `.site-header` has `view-transition-name: site-header`; the `ohm-spin` rules are unchanged (`animation: ohm-spin 0.9s ease-in-out 1`).
12. No file under `src/` contains `ClientRouter`, `ViewTransitions`, `astro:transitions` or `transition:` followed by `name`, `animate` or `persist`.
13. Dist script inventory (non-JSON-LD `<script` tags per built page): `index.html` 1, `book.html` 2, `client-policies.html` 1, `hello.html` 1, every other `.html` (including `404.html` and `hello/index.html`) 0.
14. Dist: the CSS each of `index.html`, `404.html` and `hello.html` loads (inline or linked) contains `@view-transition` and `navigation:auto`.

## Done when
1. `npm run check` passes, including the new tests and `logo-spin`, `divider-pulse` and `hello-breathe`.
2. `tools/shots.mjs` creates its contexts with `reducedMotion: 'reduce'`. `npm run shots -- M1`: `404`, `index`, `services`, `book/central` at 375 and 1280 px in `docs/build/screens/M1/`: the filled Ω sits above `Page not found` with `--s-4` below it, about 4.5rem wide; nothing else changed.
3. Browser checks with Playwright Chromium (a scratch script, not committed; paste its output): (a) `pagereveal` listener via `addInitScript`; click the header `Services` link from Home: `event.viewTransition` is non-null; same with `reducedMotion: 'reduce'`: null. (b) Hover the header Book button: computed `translate` is `0px -2px` after 400ms; press (mouse down): `0px 0px` after 100ms; release: `0px -2px` after 400ms; move away: `none` or `0px 0px` after 300ms. (c) `/404` at 30ms the line's `stroke-dashoffset` is between 0 and 1; at 1.4s it is 0 and the fill opacity is 1.
4. The same script sums `layout-shift` entries on `/404` and Home over 2s: 0.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
