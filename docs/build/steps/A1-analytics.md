# A1: Umami analytics, /body-map excluded

Brief §2, §3 · Architecture §B11 (new), §B8 (`/hello`), §B5 `check:dist`, §B3 `Base`, §D

## Goal
I-114, I-115 (plan approved by Brian, Nov 8, 2026). Every page built from Base loads the Umami Cloud tag (`https://cloud.umami.is/script.js`, `defer`, `data-website-id`, `data-domains` = the production hostname only), so production counts pageviews and localhost or previews send nothing. A delegated click listener (client script 7) sends `book`, `contact`, `email`, `call`, `text` or `policies`; `rsvp.ts` sends `rsvp` on submit. Each event is a name plus `{ page: location.pathname }`, never an href, query string or form field. `/body-map` (planned, not built) never gets the tag, the click script, the rules meta or any `data-umami*` attribute: Base's `analytics` prop plus Base's own path opt-out, and a `check:dist` rule. `/hello` gets the tag only (no click script); its one-inline-script limit stays. No copy. Read-only here: `src/data/site.ts`, `src/data/client-policies.ts`, `docs/build/ARCHITECTURE.md`. Known gaps: none (the Website ID is in `src/data/analytics.ts`).

## AC covered (IDs)
- AC-5 (Lighthouse): mobile performance median of 3 on `/` and `/book`, before and after, drops no more than 2 points.
- Privacy (§D, I-115): the tests below and Done when 3–4.

## Files
- src/layouts/Base.astro
- src/data/analytics.ts
- src/lib/analytics.ts
- src/scripts/analytics.ts
- src/scripts/rsvp.ts
- scripts/check-dist.mjs
- tests/analytics.test.ts
- tests/check-dist.test.ts
- tests/page-transition.test.ts
- tests/events.test.ts
- tests/rsvp.test.ts
- docs/runbooks/analytics.md
- docs/build/STATUS.md
- docs/build/steps/A1-analytics.md

## Tests first (write them and see them fail before writing code)
1. `classifyHref`: each of the four `bookingUrl` links → `book`; `site.contact.lead` and `.chat` → `contact`; `mailto:` → `email`; `tel:` → `call`; `sms:` → `text`; the policies PDF (base-aware) → `policies`; `/book`, `/pricing`, another PocketSuite URL, a garbage href → `null`.
2. `isExcluded`: `/body-map`, `/body-map.html`, `/body-map/`, `/body-map/index.html`, `/body-map/x` → true; `/`, `/book`, `/body-mapping` → false; same with a non-root base.
3. `trackEvent`: with a fake `umami`, sends exactly `(name, { page: pathname })`; with no `umami`, does nothing; a throwing `track` does not throw. Sequence: click a booking link, then an email link → two calls, `book` then `email`, neither carrying the href.
4. Built pages: every Base page has one Umami tag with `defer`, the website ID and `data-domains="ohmprecisionbodywork.com"`; no `data-exclude-*` or other options; `hello.html` has the tag, no click script and at most one inline script.
5. `check:dist` on synthetic trees: `body-map.html` with the tag, `data-umami-event`, `data-website-id` or the rules meta → exit 1 (also `body-map/index.html`); a clean `body-map.html` → 0; no body-map file → 0; a Base page missing the tag or with a second domain → 1; `hello.html` with a second `src` script → 1.
6. Script counts in `page-transition`, `events` and `rsvp` tests updated to the new totals, still pinned per page.

## Done when
1. `npm run check` passes, including the new tests.
2. Lighthouse mobile (`astro preview`, median of 3, baseline at the parent commit): `/` and `/book` performance each drop no more than 2 points; numbers in the report.
3. On `localhost:4321`: `script.js` loads and DevTools shows no `api/send` request on load or on a booking-link click.
4. `/body-map` check: `check:dist` rule in place (test 5); no file in `dist/` yet.
5. After the push, Brian opens the live site, clicks a booking link, and confirms a pageview and a `book` event in the Umami dashboard (STATUS change log).
6. `docs/runbooks/analytics.md`: where the dashboard is, the event list, how to test, how to turn it off for one page (`analytics={false}`) or the site, the /body-map rule.

## Report
Files changed · Checks (command and result) · Lighthouse before/after · Deviations · New items (I-###) · Questions for the architect.
