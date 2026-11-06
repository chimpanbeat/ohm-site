# E2: RSVP form and client, with the capped-session states (I-049, I-050)

Brief §2, §3, §5 (`/<event>`), AC-9 · Architecture §B10 (RSVP form, wire contract, `site.rsvpUrl`), §D (five client scripts)

## Goal
`site.rsvpUrl` holds the public web app URL (§B10). `RsvpForm` renders the §B10 form on every event with `rsvp` (all strings from `rsvpText`), inside `section.band-light#rsvp` between the info blocks and the notice, and `EventHero` gains the `RSVP` button. Without JS the form posts to `site.rsvpUrl` with `mode=html`. With JS, `src/scripts/rsvp.ts` (client script 5) shows spots left, toggles the session question and guest rows, validates, posts form-urlencoded with `mode=json`, and shows the result or the error. All logic that can be pure lives in `src/lib/rsvp.ts` and is tested in Node; the script is a thin DOM layer. Read-only here: `src/data/events.ts`, `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `src/styles/tokens.css`. Known gaps: the live round trip needs Brian's pasted script (I-058, after E3); until then, check against a Playwright route stub.

Notes:
- Field `name`s and reply shapes are the §B10 wire contract; E3's script reads the same `tests/fixtures/rsvp-cases.json`.
- `fetch` with only `method` and `body` (a `URLSearchParams`), no `headers` and no JSON: the web app has no CORS preflight answer. Anything that isn't a valid reply (HTML, a parse error, a timeout, a network error) is `server`.
- Copy reaches the script through `data-text` on the form. Form on the cream band: inputs `--bg-light` with a 1px `--ink` border, invalid fields outlined in `--terra-700`, error text `--ink` with weight 600; tokens only.
- `tests/page-transition.test.ts` pins scripts per page: add `'launch-party.html': 1`.

## AC covered (IDs)
- AC-9 (form with and without JS; no email, name or list in replies reaches the page): tests 1–6, Done when 2–3. AC-6: test 7.

## Files
- src/data/site.ts
- src/lib/rsvp.ts
- src/scripts/rsvp.ts
- src/components/events/RsvpForm.astro
- src/components/events/EventHero.astro
- src/pages/[event].astro
- tests/rsvp.test.ts
- tests/fixtures/rsvp-cases.json
- tests/page-transition.test.ts

## Tests first (write them and see them fail before writing code)
`tests/fixtures/rsvp-cases.json`: at least 20 `{ label, event: 'session' | 'plain', input, ok, fields, normalized? }` cases: valid going with yes; maybe with no; `cant` with guests and answers (all dropped); blank name; 81-character name; `a@b`, `a b@c.d`; ` Alex@Example.COM ` → `alex@example.com`; no status; going without `session` → `['session']`; `g1name` without answer → `['g1session']`; answer without name → `['g1name']`; blank `g1`, filled `g2` (kept, in order); `g4name` with `maxGuests` 3 (ignored); session fields on a `plain` event (ignored); honeypot filled (`ok: true, bot: true`).
`tests/rsvp.test.ts`:
1. Every fixture case through `validateRsvp(input, event)` gives `ok`, `fields` and `normalized`.
2. `toBody`: the wire fields plus `slug` and `mode=json`, kept guests only, no `website` when empty.
3. `parseReply` on each §B10 shape, and on HTML, `{}`, `{ ok: true }` without `outcomes`, a non-200 → `{ ok: false, error: 'server' }`.
4. Text: `spotsText` for 20, 2, 1 and 0 (waitlist on and off) gives the copy deck lines; `outcomeLine('Alex', 'waitlist')` → `Alex · Yoga: waitlist`; `errServer` carries `site.email`.
5. Sequence with a fake `fetch` through the controller (`createRsvp({ fetch, event, text })`): load → GET `site.rsvpUrl?slug=launch-party` → `2 yoga spots left`; submit you yes, g1 yes, g2 no → the POST init has only `method` and `body`, the reply `['confirmed', 'waitlist', 'no']` pairs with the three names in order; then the re-read says `Yoga is full. Answer yes to join the waitlist.`; a second submit with the same email gets `errDuplicate`; a fetch that never settles gives `errServer` after the 15 s timeout (fake timers).
6. Dist: `launch-party.html` has `form[method=post][action=site.rsvpUrl]` with hidden `slug` and `mode=html`, `name`/`email`/`status` `required`, three guest rows, the honeypot (`aria-hidden`, `tabindex="-1"`), `section#rsvp` before the notice, exactly one module script, and `data-text` parsing to `rsvpText`.
7. Source: `rsvp.ts` has no `localStorage`, `sessionStorage`, `document.cookie`, `console.`, `history.`, `location.search` or `headers:`; the URL appears only in `site.ts`.

## Done when
1. `npm run check` passes.
2. `npm run shots -- E2`: `launch-party` at 375 and 1280 px (form, error state, success state, full-with-waitlist state) in `docs/build/screens/E2/`, using Playwright `page.route` on `site.rsvpUrl` to stub replies.
3. JS off: the form shows all guest rows and submits to `site.rsvpUrl` (stubbed). Keyboard only: every field reachable, errors announced, focus lands on the result.
4. After I-058 (if Brian has pasted the script): one live RSVP from `npm run dev` with Brian's own test email, then Brian deletes the row. Otherwise the report lists it as pending.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
