# E14: Google Calendar button, Maybe hides Yoga, email details and book button, change-confirm fix

Brief §2 (the Apps Script exception), AC-9 · Architecture §B10 (Feed, Emails, Mail, Changes)

## Goal
Brian's Nov 8 requests, one step. Everything is generic (the session's label, the feed, `rsvpText`), so the next event gets it with no new code.
1. **Add to Google Calendar** (`googleCalUrl(event)` in `src/lib/events.ts`, in the feed as `googleCalUrl`): a button beside the `.ics` button on the hero and the RSVP result card, and a line beside `calendarLine` in the Going/Maybe confirmation and the reminder. The `.ics` stays for Apple, Outlook and everything else. Labels: `calendarGoogle` and `calendar` (the `.ics`, now `Add to another calendar`).
2. **Maybe hides the session question and each guest's.** Client: `data-going-only` fieldsets hidden unless Going is chosen (the floating bar and the form's radios both go through the `change` event); the guests help line switches to `guestsHelpPlain` while hidden. `validateRsvp` and `validate_` (parity fixture) require the session answers only for Going. Script: a Maybe stores cell `maybe` for every person; the result card, the page and the reminder show no per-person session lines for a Maybe (the `maybeNote` stays).
3. **Confirmation email** (Going and Maybe): `Here's all of the details:` · `Your RSVP: {status}` · `{Session}: {Yes|No}` (Yes green, No terracotta; no line for a Maybe or an event without a session) · `Guests:` + a bulleted list `{name} — {Session}: {Yes|No}` (name only for a Maybe or no session; no list without guests).
4. **Book block:** `bookLine` loses its link; the link becomes a button on its own line (terracotta table button, the site's CTA colours, no image). Plain text: the URL on the next line.
5. **Change confirmation:** the confirm page's button disables and reads `Confirming…` on submit; a confirmed token keeps a 6-hour done marker, so a second press or a reopened link shows the finished page instead of "expired". The guest still gets the confirmation/note email for the new status, once, on the first confirm only.

## AC covered (IDs)
- AC-9 (script behaviour, no leaks): rsvp-script E14-1 to E14-8; events 7c; rsvp tests for Maybe validation and the result view.

## Files
- apps-script/rsvp.js
- src/data/events.ts
- src/lib/events.ts
- src/lib/rsvp.ts
- src/scripts/rsvp.ts
- src/components/events/EventHero.astro
- src/components/events/RsvpForm.astro
- tests/rsvp-script.test.ts
- tests/events.test.ts
- tests/rsvp.test.ts
- tests/fixtures/rsvp-cases.json
- docs/build/copy-deck.md
- docs/build/ARCHITECTURE.md
- docs/runbooks/events.md
- docs/build/STATUS.md
- docs/build/steps/E14-calendar-maybe-email-confirm.md

## Tests first
- E14-1 Going + guests: exact body (`Your RSVP: Going`, `Yoga: Yes`, `Guests:`, `- Gee — Yoga: No`); HTML has the yes/no colours, a `<ul>`, and no `<img>`.
- E14-2 Maybe: `Your RSVP: Maybe`, no Yoga line, guests listed by name only.
- E14-3 no guests: no `Guests:` heading. No session event: no Yoga text anywhere.
- E14-4 book block: its own line; HTML button table with the CTA colours; text puts the URL on the next line; can't-go email has it too.
- E14-5 Google line in the confirmation and the reminder; URL is the feed's `googleCalUrl`.
- E14-6 Maybe without session answers: ok, every person's cell `maybe`, no spot held; with answers sent anyway: same.
- E14-7 confirm twice: one email, the second press shows the done page, not expired; reopening the link after confirming shows it too.
- E14-8 confirm page: the button disables on submit (the script is in the page).

## Done when
1. `npm run check` passes.
2. Live (Brian: paste `rsvp.js`, New version): a Going and a Maybe email read as above; a change confirms, shows its result and sends the new status's email.

## Report
Files changed · Checks · Deviations · New items · Questions for the architect.
