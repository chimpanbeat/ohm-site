# 15: Payment methods and the card-surcharge notice near the booking buttons (I-041)

Brief §5 (Payment notice), AC-6 · Architecture §B2 (`client-policies.ts` payment constants), §B3 (`PaymentNotice`), §D

## Goal
New `src/components/PaymentNotice.astro` renders, per ARCHITECTURE §B3, the methods line `paymentMethodsLine`, then `surchargeLine`, then a bordered box with the head `Colorado notice` and `coloradoNotice`, all three imported from `src/data/client-policies.ts` (copy deck → Payment notice; the component types no copy). It appears once on `/book` (after the `#mobile` section, before the `<template>`s), once on `/book/central`, `/book/midnorth`, `/book/north` and `/book/office` (directly after `.result`), never on `/book/out`, and directly above `<BookCta />` on Services and Pricing. `/client-policies` is unchanged. Read-only here (done by the architect): `src/data/client-policies.ts` (now exports `acceptedPayments`, `zelleDetails`, `paymentMethodsLine`), `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `src/styles/tokens.css`. Known gaps: none.

Notes:
- Tokens only (`--line-dark`, `--radius`, `--s-*`, `--fs-small`, `--measure`); every placement is on the green band. No hex, no new token, no script, no dependency.
- Leave the Pricing intro's travel-fee sentence and the Book intro as they are (Brian, Oct 29).
- Astro adds `data-astro-cid-*` and escapes `'` as `&#39;`: decode entities and strip tags before comparing text; match attributes with tolerant regexes (as `tests/client-policies.test.ts` does).
- Dist tests skip with a clear reason when `dist/book.html` is missing (`deploy.yml` runs `npm test` before the build); the data and source tests never skip.
- The commit gate runs `npm run check` on any Bash call that mentions check or test: do red-test runs from PowerShell, and edit with Edit. Write greps as `grep -E` with one `-e '…'` per pattern, never `a|b` or a pipe.

## AC covered (IDs)
- AC-6: tests 1 and 2 (one source in `client-policies.ts`; no copy or amount typed in the component or pages).
- AC-8 (policies text unchanged): step 14's tests 5, 7, 8 and 11 still pass.

## Files
- src/components/PaymentNotice.astro
- src/pages/book/index.astro
- src/pages/book/[zone].astro
- src/pages/services.astro
- src/pages/pricing.astro
- tests/payment-notice.test.ts

## Tests first (write them and see them fail before writing code)
`tests/payment-notice.test.ts`. Helper `text(html)`: drop `<script>`/`<style>`, strip tags, decode entities, collapse whitespace. Helper `missing(html)`: which of `paymentMethodsLine`, `surchargeLine`, `coloradoNotice` are not in `text(html)`. `SHOWN` = `book.html`, `book/central.html`, `book/midnorth.html`, `book/north.html`, `book/office.html`, `services.html`, `pricing.html`.
1. Data: `paymentMethodsLine` equals the copy deck's methods line typed in the test; `surchargeLine` equals `Ohm Precision Bodywork adds a 3% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.`; the `booking` section's bullets 3 and 4 are `acceptedPayments` and `zelleDetails` (`===`), and `paymentMethodsLine === acceptedPayments + ' ' + zelleDetails`.
2. Source: `PaymentNotice.astro` imports `paymentMethodsLine`, `surchargeLine` and `coloradoNotice` from `../data/client-policies.ts`, and no file under `src/` except `client-policies.ts` contains `Tap to Pay`, `5-2-212`, `3% surcharge` or `Venmo`. The component has no `#` hex colour, no `<script` and no `<h1`–`<h6`.
3. Dist (skip if `dist/book.html` is missing): for each `SHOWN` page, `missing(html)` is `[]`, `class="payment-notice"` (attribute-tolerant) occurs exactly once, `Colorado notice` is in the box, and in the text the methods line comes before the surcharge line, which comes before `coloradoNotice`.
4. `book/out.html` contains none of the three strings and no `payment-notice` class; it still has `Send a request`.
5. Placement: on `services.html` and `pricing.html` the notice closes immediately before the BookCta `<a class="btn" href="/ohm-site/book">` (only whitespace or tags between, no text); on each `book/<zone>.html` in `SHOWN` the notice starts after the card's booking link (`href` = `bookingUrl(key)`, office for `book/office.html`) and before the map (`class="service-map`, attribute-tolerant); on `book.html` it starts after `</section>` of `id="mobile"` and before the first `<template`.
6. Sequence: `missing` on `book/central.html` with the surcharge line removed returns exactly `[surchargeLine]`; then the unmodified file returns `[]`; then with the methods line's `Venmo, PayPal` changed to `Venmo` returns exactly `[paymentMethodsLine]`.
7. Nothing wrong, anywhere in `dist/**/*.html` (decoded text): no `\bACH\b`, `bank transfer` or `wire transfer` (case-insensitive); no phone pattern `\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}`; no email other than `site.email`; every sentence that names Venmo or PayPal contains `don't accept`; no `Zelle` followed within 20 characters by `@` or a digit.
8. `client-policies.html` has no `payment-notice` class, and still contains `paymentMethodsLine`'s two sentences and `coloradoNotice` once each in the policy body (unchanged page).

## Done when
1. `npm run check` passes, including the new tests and step 14's (paste any `check:wording` warnings; expected: About `fix`, client-policies `health` ×2, nothing new).
2. `npm run build`, then `npm run shots -- 15`: `book`, `book/central`, `book/office`, `book/out`, `services`, `pricing` at 375 and 1280 px in `docs/build/screens/15/`. The box border shows on green, the text is readable, the notice sits under the card on `/book/central` and above the button on Services and Pricing, and `/book/out` has none.
3. JS on, `/book`: choose office, then mobile with an address in Central: the notice stays once, under the visible card. JS off: it shows under both sections.
4. `grep -c -E -e 'class="payment-notice' dist/book/out.html dist/client-policies.html` prints 0 for both. No hex outside `tokens.css`, no new dependency, `client-policies.ts` untouched.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
