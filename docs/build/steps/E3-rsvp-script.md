# E3: The RSVP Apps Script, its tests and runbook (I-049, I-050; Brian's answers I-062, I-064–I-066; Brian pastes it in I-058)

Brief §2 (the Apps Script exception), AC-9 · Architecture §B10 (Apps Script, Changes, wire contract, quotas, privacy), §D

## Goal
`apps-script/rsvp.js` is the whole web app, per §B10: `doGet` (status, or the change confirm page), `doPost` (RSVP, change request or change apply; JSON or `mode=html` page), `sendDueReminders`, `setup`, and `_`-suffixed helpers. Event facts come only from the site feed (`/events/<slug>.json`); the only config is the Script Property `SHEET_ID`. The cap is checked and saved inside one script lock; a Maybe holds no spot (`maybe` outcome); new yes-answers queue while anyone is waitlisted; one RSVP per email, and a repeat RSVP becomes a change confirmed from the stored address's inbox (I-064); the `Opt-in` column (I-065); honeypot; replies never carry an email, a name, a token or the list. `apps-script/appsscript.json` is the §B10 manifest. `docs/runbooks/events.md` tells Brian how to paste and deploy in the Ohm Workspace account (I-058, I-062) and run events. Read-only here: `src/data/events.ts`, `src/lib/events.ts`, `src/lib/rsvp.ts`, `tests/fixtures/rsvp-cases.json`, the docs. Known gaps: whether Brian's placeholder deployment is a standalone project in the Ohm Workspace account (if not, the `/exec` URL changes at I-058).

Notes:
- Plain V8 script, no `export`, no `import`. Tests load it with `node:vm` (append `;({ doGet, doPost, sendDueReminders, setup, validate_ })` to get the functions) and inject fakes and a settable clock. The fake `UrlFetchApp` serves `feedFor(event, site.deploy.site)`; no network, no `dist/` needed.
- Fakes: a sheet as an array of rows (`getSheetByName`, `insertSheet`, `getDataRange().getValues()`, `getRange(r, c, h, w).setValues()`, `deleteRow`; `appendRow` not used); `LockService.getScriptLock()` logging `tryLock`/`releaseLock`; `SpreadsheetApp.flush()` logging; `MailApp.sendEmail(obj)` recording and `getRemainingDailyQuota()`; `CacheService.getScriptCache()` (`get`, `put` with expiry on the clock, `remove`); `PropertiesService.getScriptProperties()`; `ContentService`, `HtmlService`, `ScriptApp` (triggers, `getService().getUrl()` → a fake `/exec`); `Utilities` (`getUuid`, `computeDigest`, `base64Encode`).
- Fixture emails use `example.com` only (`check:secrets`).

## AC covered (IDs)
- AC-9 (cap under the lock, waitlist queue, no leaks, no IDs in the repo): tests 2–9, 14.

## Files
- apps-script/rsvp.js
- apps-script/appsscript.json
- tests/rsvp-script.test.ts
- docs/runbooks/events.md

## Tests first (write them and see them fail before writing code)
`tests/rsvp-script.test.ts`:
1. Parity: every `rsvp-cases.json` case through `validate_` matches `validateRsvp` (incl. `optin`).
2. Cap sequence (limit 20, waitlist on): 19 one-person yes RSVPs → 19 `confirmed`, GET `spotsLeft` 1; you yes, g1 yes, g2 no → `['confirmed', 'waitlist', 'no']`, `Waitlist #` 1; GET 0, `full` true; next yes → `waitlist` #2; a `maybe` + yes RSVP → `['maybe']`, GET unchanged; Brian edits one `confirmed` cell to `no` → GET still 0 and the next yes is `waitlist` #3; Brian sets #1–#3 to `confirmed`, `no`, `no` → GET 0; a `no` RSVP still succeeds.
3. Waitlist off: at the limit a yes gives `full`, and `full`/`spotsLeft` read 0.
4. Lock: tryLock before the first sheet read, releaseLock after flush; `setValues` throwing still releases and replies `server`; `tryLock` false → `busy`, nothing written, no mail (new RSVP and change apply).
5. Change request: after `alex@example.com` (you yes, `Sam` yes), ` ALEX@example.com ` with maybe → `{ ok: true, status: 'maybe', pending: true, outcomes: [] }`, rows unchanged, one mail to the stored address greeting the stored name, with `getUrl() + '?change=' + uuid`; a 4th request within 6 h sends no mail, same reply; after 6 h mail resumes.
6. Change confirm and apply (sequence): GET `?change=` → a page with `changeConfirmLead`, the requested `answerLine`s and a `form[method=post][target=_top]` with hidden `change`, `mode=html`; nothing written by the GET. POST `change` → old rows gone, new rows appended with `Submitted` kept, `Changed` set, `Reminder sent` kept; both cells `maybe`, GET +2; the maybe confirmation mail has `maybeNote`. The same token again → `changeExpired`; two tokens, one applied → the other `changeExpired`; an expired cache entry → `changeExpired`; after `closesAt` → `closed`.
7. Change assignment: full session with a waitlist: a confirmed guest who stays going + yes keeps `confirmed`; a waitlisted one keeps their `Waitlist #`; a renamed guest is assigned fresh (`waitlist`, next #); maybe → going at a full session → `waitlist`; going → `cant` drops guests, blanks the cells and sends the can't-go note; freeing a `confirmed` cell while someone is waitlisted sends one spot-freed mail to `sender.replyTo` (no guest name or email in it) and promotes nobody, GET still 0; with no waitlist the freed spot shows in GET.
8. Opt-in: `optin=yes` → `Opt-in` `yes` on the `you` row only; absent → blank; a confirmed change applies the new answer (yes → blank); never in any reply or page; it gates no script mail (I-069): two RSVPs that differ only in `optin` get the same confirmation, change and reminder emails, and a change freeing a spot sends the same spot-freed note.
9. No leaks: across every reply in the run, `JSON.stringify` has no `@`, none of the submitted names, no token and not the `SHEET_ID` value; GET keys are exactly `ok`, `open`, `session.{spotsLeft, full, waitlist}`; the change pages show only the requested names, never the stored ones.
10. Honeypot filled → `{ ok: true, status, outcomes: [] }`, no row, no mail (also on a known email: no change mail).
11. Unknown and closed: slug `../x` → `unknown` with no fetch; feed 404 → `unknown`; two POSTs → one fetch (cache); now = `closesAt` → `closed`.
12. Injection: name `=HYPERLINK("x")` stored as `'=HYPERLINK("x")`; with `mode=html` a name `<script>` is escaped; every link and form on script pages has `target="_top"`; the back link is `pageUrl`.
13. Emails: the going confirmation equals the copy deck layout for `['confirmed', 'waitlist']` (`waitlistNote`, the waiver, `calendarLine`, `changeLine`, `name` = `site.name`, `replyTo` = `site.email`); all-confirmed has no `waitlistNote`; `cant` gets the short note; the change and spot-freed mails match their layouts; `sendEmail` throwing still returns ok with the rows saved.
14. Reminders (sequence): before `reminderAt` none; at it, one per going/maybe RSVP, none for `cant`, each with the wear items, parking, waiver and the session lines as the cells are now (a hand-promoted guest reads `Yoga: confirmed`, a `maybe` cell `outcomeMaybe` plus `maybeNote`); a second run sends none; a change after the reminder doesn't send another; quota 0 sends and stamps none; after `start` none.
15. `setup()` twice leaves one `sendDueReminders` trigger at `everyMinutes(15)` and logs the remaining mail quota; it throws a clear message when `SHEET_ID` is unset. The two `apps-script/` files contain no email address, no `docs.google.com`, no `/spreadsheets/d/` and no `script.google.com`.

## Done when
1. `npm run check` passes.
2. `docs/runbooks/events.md` covers: add an event (data, assets, copy, an architect step); paste and deploy (I-058, all in the **Ohm Workspace account**: script.google.com → New project (standalone, not from the sheet's Extensions menu); a new sheet or the existing `Ohm Events RSVPs` sheet owned by or shared with that account; Script Property `SHEET_ID`; paste both files; run `setup()`, authorise, read the logged quota; Deploy → Web app, Execute as Me, Who has access Anyone (if Anyone isn't offered, the Workspace admin's sharing settings block it); if the `/exec` URL differs from `site.rsvpUrl`, give Code the new one; later updates: Manage deployments → Edit → New version, so the URL stays); a test RSVP, a test change from the same email, and deleting the rows; how changes work and what the `Changed` column and the spot-freed email mean; freeing a spot and promoting the first waitlisted guest; quotas (1,500 recipients and 6 h of triggers a day; lower trial limits on a new Workspace); keeping the data (no deletion date, I-066), the three mail rules (I-069: event emails to every RSVPer; invitations to future events may go to every `you` row; news and offers only to `Opt-in` = `yes` rows; never +1s), invitations and news sent from a mail tool with an opt-out and Ohm's postal address, an opt-out ending both (CAN-SPAM, §B10 Privacy); what `busy` and the quota error mean; don't move or insert sheet columns.
3. Live (needs I-058): GET `site.rsvpUrl?slug=launch-party` returns `spotsLeft` 20; otherwise the report lists it as pending.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
