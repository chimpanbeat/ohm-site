# E7: Script mail through Gmail, from the events alias (I-087)

Brief §2 (the Apps Script exception), AC-9 · Architecture §B10 (feed `sender`, Apps Script → Mail, Changes, Reminders, Quotas, Tests)

**Deadline:** the reminder run is **Sat Nov 21, 10:00 am MST**. Every `MailApp` send to an outside address is rejected by Google today, so until this is live no guest gets a confirmation or a reminder. Commit and push by Fri Nov 13 so Brian has a week for the runbook → Sending from the events alias (paste, `setup()`, the **new permission screen**, New version, live test).

## Goal
`send_` is the only send point and calls `GmailApp.sendEmail(to, subject, body, { name, replyTo, from })`; `MailApp.sendEmail` is gone from the file. The feed's `sender` becomes `{ name: site.name, from: site.eventsEmail, replyTo: site.eventsEmail, contact: site.email }`; the spot-freed note goes to `sender.contact` and the server-error page links it (both fall back to `replyTo` on an older feed). A missing or rejected alias never blocks mail: no `from`, one log line. **Already done by the architect (read-only here):** `src/data/site.ts` (`eventsEmail`, `secrets-scan: allow`), `docs/build/ARCHITECTURE.md` (§B10 Mail), `docs/build/copy-deck.md` (Emails → Sender), `docs/runbooks/events.md`. No new copy, no UI.

Notes (script, per §B10 Mail; same `function` style and `_` suffixes):
- `fromAlias_(ev)`: `sender.from` (a non-empty string) when it equals, ignoring case, an entry of `GmailApp.getAliases()`; else `''`, also when `getAliases` throws. Called per send, no global memo.
- `send_`: `opts = { name: ev.sender.name, replyTo: ev.sender.replyTo }`, plus `from` only when `fromAlias_` gives one. No alias → send without it and `Logger.log('Mail: the events alias is not a Gmail send-as address; sent from the account address')`. A throw with `from` → one retry without it, same log line. A throw without `from` → `return false` (unchanged). Never log an address, name or subject.
- `mailSpotFreed_` sends to `ev.sender.contact || ev.sender.replyTo`; the error page's mailto (now line ~598) uses the same value.
- Keep `MailApp.getRemainingDailyQuota()` in `remindEvent_` and `setup()` as read-only checks (decided: the `script.send_mail` scope is already granted; if Gmail sends don't lower it, the check is looser and a refused send just retries next run).
- `setup()`: for each tab whose name matches `SLUG_RE` and whose `loadEvent_` succeeds, log `From alias for <slug>: ready` · `…: not a Gmail send-as address (mail goes from the account address)` · `…: not in the feed yet` (no `sender.from`).
- `loadEvent_` unchanged: `from` and `contact` are optional, so an E6-shape feed (cached up to 600 s) still loads.
- Mark I-087 in the header comment and at `send_`. No email address anywhere in `apps-script/` (test 15): say "the events alias".
- Feed (`src/lib/events.ts`): `EventFeed.sender` gains `from` and `contact`; `feedFor` per the Goal.

## AC covered (IDs)
- AC-9 (script behaviour, no leaks): G1–G7, events test 7.

## Files
- apps-script/rsvp.js
- src/lib/events.ts
- tests/rsvp-script.test.ts
- tests/events.test.ts
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/rsvp-script.test.ts` fakes: `GmailApp.sendEmail(to, subject, body, opts)` throws when `state.failMail`, or when `opts.from` is set and `state.rejectFrom`; else pushes `plain({ to, subject, body, ...opts })` to `mails` and lowers `state.quota`. `GmailApp.getAliases()` returns `state.aliases` (default `['other@example.com', feed.sender.from]`, read from the feed, no literal) or throws when `state.aliasesFail`. `MailApp.sendEmail` pushes `'MailApp.sendEmail'` to `log` and throws; `getRemainingDailyQuota` unchanged.
- G1. Sequence: going RSVP, can't-go RSVP, a repeat RSVP (change link), its confirm freeing a spot with a waitlist (limit 1), then `sendDueReminders` at `reminderAt`. Every mail has `from` and `replyTo` = `site.eventsEmail`, `name` = `site.name`; the spot-freed note's `to` = `site.email`; `log` never holds `MailApp.sendEmail`. Bodies as before (tests 7, 13, 14 pass with only their recipient and replyTo expectations moved to `contact` and `eventsEmail`).
- G2. `state.aliases = [feed.sender.from.toUpperCase()]` → `from` is set.
- G3. `aliases = []`, then `aliasesFail` → mails without a `from` key, same `name` and `replyTo`, same JSON reply; `logger` has the fallback line once per mail; no `logger` line contains `@`.
- G4. `rejectFrom` → one mail per send, without `from`, the log line. `failMail` at `reminderAt` → nothing stamped; next run with `failMail` off → all sent and stamped once.
- G5. E6-shape feed (tweak deletes `sender.from` and `sender.contact`) → no `from`, no `getAliases` crash, spot-freed `to` = `sender.replyTo`, error-page mailto = `sender.replyTo`.
- G6. `setup()` with a `launch-party` tab: `From alias for launch-party: ready`; `aliases = []` → `… not a Gmail send-as address …`; E6 feed → `… not in the feed yet`; no tab → no such line; the quota line stays.
- G7. Source: no `MailApp.sendEmail` in `rsvp.js`; `GmailApp.sendEmail` only inside `function send_`; test 15's scan and manifest checks unchanged (no `oauthScopes`).
- Test 20: mailto is `sender.contact`.

`tests/events.test.ts` test 7: `feed.sender` deep-equals `{ name: site.name, from: site.eventsEmail, replyTo: site.eventsEmail, contact: site.email }`; `site.eventsEmail !== site.email`; the addresses matched in `JSON.stringify(feed)`, sorted, equal `[site.email, site.eventsEmail, site.eventsEmail].sort()` (replaces "the only @"). Test 9e (dist feed equals `feedFor`) needs no edit.

## Done when
1. `npm run check` passes (paste the test count; `check:secrets` OK).
2. `git diff apps-script/rsvp.js` touches only the header comment, `fromAlias_`, `send_`, `mailSpotFreed_`, the error page's mailto and `setup`.
3. Live (Brian, runbook → Sending from the events alias, steps 2–6): `setup()` logs `From alias for launch-party: ready`; an RSVP to an outside address arrives From `Ohm Precision Bodywork <events@…>`, Reply-To the alias; the change email and the post-confirm confirmation arrive; Email Log Search shows no "Bounced"; the next `sendDueReminders` execution is Completed. Otherwise list it as pending with the Nov 21, 10:00 am deadline.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
