# E13: RSVP emails in Maréa's copy, as HTML, with Brian's reply signature

Brief §2 (the Apps Script exception), AC-9 · Architecture §B10 (Data, feed, Emails, Mail, setup), §B2 (`site.owner`, `postNominals`), §D (`check:secrets`)

## Goal
The confirmation (Going and Maybe, `mailConfirmation_`) and the can't-go note (`mailCant_`) follow Maréa's approved layout (copy deck → Events → Emails); the change email (`mailChange_`) and the reminder (`mailReminder_`) keep their words. All four go as HTML (`htmlBody`) with a plain-text body through `send_`, and end with Brian's reply signature instead of `signoff` (removed). The spot-freed note to Brian is unchanged (plain, unsigned). Phones are Script Properties `SIGNATURE_PHONE` and `HOST_PHONE`, read at send time only; unset → the short signature line or the short questions line. `setup()` logs `Signature phone: set|not set` and `Host phone: set|not set`. `check:secrets` finds phone numbers. Known gaps: the RSVP form's "hide yoga when Maybe" is out of scope (proposed item); HOST_PHONE needs Maréa's consent (item).

Decisions (architect):
- **Event words are per event:** `rsvp.mail = { name, thanks?, host? }` in `events.ts` (`Ohm Launch Party`, Maréa's thanks sentence, `Maréa`), sent in the feed as `mail`; `rsvpText` stays shared (`{eventName}`, `{thanks}`, `{host}`). Reason: `rsvpText` serves every event, and the full `title` is still the subjects'.
- **Signature facts from data:** new `site.owner` and wording key `postNominals` (`credential` is built from both, value unchanged); feed `signature`, `bookUrl` (`/book`, `bookUrl()` in `src/lib/events.ts`). `rsvp.js` types none of them.
- **Colours:** `MAIL_GREEN`/`MAIL_TERRA` constants in `rsvp.js` (= tokens `--green-700`/`--terra-500`, a test keeps them equal); the no-raw-hex rule covers the site, not the script.
- **`maybeNote` leaves the confirmation:** beside `Yoga? No` and `changeLine` it repeated the same instruction. It stays on the pages and the reminder.
- **`Yoga? Yes`** with one space (Maréa's sample had two on one line). A waitlisted person reads `Waitlist` (`sessionWaitlist`).
- **Non-fatal:** an email that can't be built logs one line and is skipped; the RSVP stands.

## AC covered (IDs)
- AC-9 (script behaviour, no leaks): rsvp-script E13-1 to E13-13, tests 6, 7, 13, 14, S4; events 7b; check-secrets tests.

## Files
- apps-script/rsvp.js
- src/data/events.ts
- src/data/site.ts
- src/data/wording.ts
- src/lib/events.ts
- tests/rsvp-script.test.ts
- tests/events.test.ts
- tests/check-secrets.test.ts
- tools/check-secrets.mjs
- docs/build/copy-deck.md
- docs/build/ARCHITECTURE.md
- docs/runbooks/events.md
- docs/build/STATUS.md
- docs/build/steps/E13-rsvp-email-copy-signature.md

## Tests first (write them and see them fail before writing code)
Fakes: props default `SIGNATURE_PHONE = '719-555-0100'`, `HOST_PHONE = '719-555-0123'` (fictional 555-01xx); `GmailApp.sendEmail` records `htmlBody`.
- E13-1 Going + guest `no`: body equals Maréa's copy line for line (`Hi Alex Rivera,` … `See you there!`, signature `Brian Clarke, LMT, CNMT` / `Ohm Precision Bodywork` / `719-555-0100 • ohmprecisionbodywork.com`); subject unchanged.
- E13-2 HTML: headings `<strong style="color:#125245">`; `<a href=".../book">Click here to book</a>`; feed URLs linked; a name `Kim <b>Lee</b> & Co` escaped; a guest named `https://evil.example` is never a link; the signature table, span, `tel:7195550100`, `&nbsp;&bull;&nbsp;`; no `<img>`.
- E13-3 sequence in one env: phone set → unset (site alone, no bullet, no `tel:`) → `(719) 555-0199` (trimmed, `tel:7195550199`).
- E13-4 `HOST_PHONE` set → `…or text Maréa: 719-555-0123.`; unset → `questions`; event without host → `questions`.
- E13-5 Maybe with guests yes/no: `Your RSVP: Maybe`, every `Yoga? No`, no `maybeNote`.
- E13-6 limit 1: `Yes`, `Waitlist`, `No`, then `waitlistNote`; waitlist off: full → `No`.
- E13-7 no session: no `Yoga?` lines. E13-8 can't go: exact body, book link, signature.
- E13-9 change: words unchanged + signature; HTML link `<a href="…?change=…">`; that token confirms the change.
- E13-10 reminder: old content + signature; tip escaped in HTML; no headings added. Test 7: spot-freed body unchanged, `htmlBody` undefined.
- E13-11 setup logs set/not set, `Signature for <slug>: not in the feed yet`, no number in any log line.
- E13-12 older feed (no `signature`, `bookUrl`, `mail`) signs with `site.name`; a feed without `venue` → RSVP ok, row saved, no mail, the build log line.
- E13-13 source: colours equal tokens.css, only two hex values, no `LMT`, `CNMT`, owner, business name, `/book`, `Maréa` or phone in `rsvp.js`.
- events 7b: feed `bookUrl`, `mail` (and defaults), `signature` (= `w('credential')` split), no phone; new `text` keys, no `signoff`. 1c: deck table = `rsvpText`.
- check-secrets: six US formats and `tel:`/`sms:` links found (value never printed); 555-01xx, the allow marker, dates, coordinates, SVG numbers, hashes pass; 555-0200 found.

## Done when
1. `npm run check` passes (test count; `check:secrets` OK with the new pattern over the whole repo).
2. Live (Brian, runbook → Email copy, signature and phone numbers, steps 2–6), before Sat Nov 21, 10:00 am: `setup()` logs both phone lines; a Going and a Can't-go email arrive as designed.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
