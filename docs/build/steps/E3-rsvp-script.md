# E3: The RSVP Apps Script, its tests and runbook (I-049, I-050; Brian pastes it in I-058)

Brief §2 (the Apps Script exception), AC-9 · Architecture §B10 (Apps Script, wire contract, quotas, privacy), §D

## Goal
`apps-script/rsvp.js` is the whole web app, per §B10: `doGet` (status), `doPost` (RSVP, JSON or `mode=html` page), `sendDueReminders`, `setup`, and `_`-suffixed helpers. Event facts come only from the site feed (`/events/<slug>.json`); the only config is the Script Property `SHEET_ID`. The cap is checked and saved inside one script lock; new yes-answers queue while anyone is waitlisted; one RSVP per email; honeypot; replies never carry an email, a name or the list. `apps-script/appsscript.json` is the §B10 manifest. `docs/runbooks/events.md` tells Brian how to paste and deploy (I-058) and run events. Read-only here: `src/data/events.ts`, `src/lib/events.ts`, `src/lib/rsvp.ts`, `tests/fixtures/rsvp-cases.json`, the docs. Known gaps: whether the script runs on a consumer or a Workspace account (100 vs 1,500 email recipients a day) is Brian's answer; the runbook states both.

Notes:
- Plain V8 script, no `export`, no `import`. Tests load it with `node:vm` (append `;({ doGet, doPost, sendDueReminders, setup, validate_ })` to get the functions) and inject fakes and a fixed `Date`. The fake `UrlFetchApp` serves `feedFor(event, site.deploy.site)`; no network, no `dist/` needed.
- Fakes: a sheet as an array of rows (`getSheetByName`, `insertSheet`, `getDataRange().getValues()`, `getRange(r, c, h, w).setValues()`, `appendRow` not used); `LockService.getScriptLock()` logging `tryLock`/`releaseLock`; `SpreadsheetApp.flush()` logging; `MailApp.sendEmail(obj)` recording and `getRemainingDailyQuota()`; `CacheService.getScriptCache()`; `PropertiesService.getScriptProperties()`; `ContentService`, `HtmlService`, `ScriptApp` triggers.
- Fixture emails use `example.com` only (`check:secrets`).

## AC covered (IDs)
- AC-9 (cap under the lock, waitlist queue, no leaks, no IDs in the repo): tests 2–7, 12.

## Files
- apps-script/rsvp.js
- apps-script/appsscript.json
- tests/rsvp-script.test.ts
- docs/runbooks/events.md

## Tests first (write them and see them fail before writing code)
`tests/rsvp-script.test.ts`:
1. Parity: every `rsvp-cases.json` case through `validate_` matches `validateRsvp`.
2. Cap sequence (limit 20, waitlist on): 19 one-person yes RSVPs → 19 `confirmed`, GET `spotsLeft` 1; an RSVP of you yes, g1 yes, g2 no → `['confirmed', 'waitlist', 'no']`, `Waitlist #` 1; GET `spotsLeft` 0, `full` true; next yes → `waitlist` #2; Brian edits one `confirmed` cell to `no` → GET still 0 and the next yes is `waitlist` #3; Brian changes #1, #2, #3 to `confirmed`, `no`, `no` → GET 0 (20 confirmed); a `no`-answer RSVP still succeeds.
3. Waitlist off: at the limit a yes gives `full`, and `full`/`spotsLeft` read 0.
4. Lock: tryLock comes before the first sheet read and releaseLock after flush; when `setValues` throws, the lock is still released and the reply is `server`; `tryLock` false → `busy`, nothing written, no mail.
5. One per email: ` ALEX@example.com ` after `alex@example.com` → `duplicate`, nothing written, no mail.
6. Honeypot filled → `{ ok: true, status, outcomes: [] }`, no row, no mail.
7. No leaks: across every reply in the run, `JSON.stringify` has no `@`, none of the submitted names and not the `SHEET_ID` value; GET keys are exactly `ok`, `open`, `session.{spotsLeft, full, waitlist}`.
8. Unknown and closed: slug `../x` → `unknown` with no fetch; feed 404 → `unknown`; two POSTs → one fetch (cache); now = `closesAt` → `closed`.
9. Injection: name `=HYPERLINK("x")` is stored as `'=HYPERLINK("x")`; with `mode=html` a name `<script>` is escaped in the page, which links to `pageUrl`.
10. Emails: the going confirmation equals the copy deck layout for `['confirmed', 'waitlist']` (with `waitlistNote`, the waiver, `calendarLine`, `name` = `site.name`, `replyTo` = `site.email`); all-confirmed has no `waitlistNote`; `cant` gets the short note; `sendEmail` throwing still returns ok with the rows saved.
11. Reminders (sequence): before `reminderAt` none; at it, one per going/maybe RSVP, none for `cant`, each with the wear items, parking, waiver and the session lines as the cells are now (a hand-promoted guest reads `Yoga: confirmed`); a second run sends none; quota 0 sends and stamps none; after `start` none.
12. `setup()` twice leaves one `sendDueReminders` trigger at `everyMinutes(15)`; it throws a clear message when `SHEET_ID` is unset. The two `apps-script/` files contain no email address, no `docs.google.com`, no `/spreadsheets/d/` and no `script.google.com`.

## Done when
1. `npm run check` passes.
2. `docs/runbooks/events.md` covers: add an event (data, assets, copy, an architect step); paste and deploy (I-058: new sheet or the existing `Ohm Events RSVPs` sheet, Script Property `SHEET_ID`, paste both files, run `setup()` and authorise, Deploy → Manage deployments → Edit → New version, so the URL stays); a test RSVP and deleting its row; freeing a spot and promoting the first waitlisted guest; quotas (100 or 1,500 recipients a day); deleting guest data after the event (TODO(Brian): when); what `busy` and the quota error mean.
3. Live (needs I-058): GET `site.rsvpUrl?slug=launch-party` returns `spotsLeft` 20; otherwise the report lists it as pending.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
