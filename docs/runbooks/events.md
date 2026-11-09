# Events runbook

How to add an event, paste and deploy the RSVP script (master-list item I-058), and run an event. The design is in ARCHITECTURE §B10; the script is `apps-script/rsvp.js` (with `apps-script/appsscript.json`). The repo holds no sheet ID, script ID, guest data or guest email; keep it that way.

## Add an event
An event is data (§B10), so a new event needs no new page, component or script.
1. **Data:** a new entry in `src/data/events.ts` (slug, times with the UTC offset in force that day, venue, timeline, info blocks, notices, `rsvp` block and `session` if there is a capped session).
2. **Assets:** its images under `src/assets/events/<slug>/`.
3. **Copy:** every string in the copy deck → Events. Builders do not write copy.
4. **An architect step.** `events.ts` is a contract file, so a step file and the architect come first, then `/next-high` builds it.

The RSVP script needs nothing: it reads each event's public facts from `https://ohmprecisionbodywork.com/events/<slug>.json`, and the first RSVP creates the event's tab in the sheet. A copy change reaches the emails after the site deploys and the script's 10-minute feed cache lapses.

## Paste and deploy the script (I-058)
Do all of this signed in to the **Ohm Workspace account**, not a personal Google account.

1. **The sheet.** Use the existing `Ohm Events RSVPs` sheet if the Ohm account owns it or has edit access, otherwise make a new sheet in that account. Copy its ID from the address bar (the long string between `/d/` and `/edit`). Never paste the ID into the repo, the chat or an email. **Rename or delete any tab named after an event (like `launch-party`) before the first RSVP:** the script writes the header and the plain-text format only when it creates the tab itself, and without them Sheets can turn IDs, times or names into numbers and dates.
2. **Which project?** First check whether the placeholder deployment behind `site.rsvpUrl` is a **standalone** project in the Ohm account (script.google.com → My Projects, signed in as Ohm; a project opened from a sheet's Extensions menu is not standalone). If it is, open it, paste the files (steps 3–5) and update that deployment (step 8), so the URL stays and you skip step 7. If it is not, or you can't tell, go to script.google.com → **New project** (never Extensions → Apps Script from the sheet: the change page's Confirm button needs a standalone project, §B10), name it something plain like `Ohm RSVPs`, and do step 6 as a **New deployment** and step 7.
3. **Script Property.** Project Settings (the gear) → Script Properties → add `SHEET_ID` with the sheet's ID. (From E6, an optional second property, `TIPS_SHEET_ID`: see Self-care tips below. From E13, the optional `SIGNATURE_PHONE` and `HOST_PHONE`: see Email copy, signature and phone numbers below.)
4. **Paste both files.** Replace `Code.gs` with the contents of `apps-script/rsvp.js`. Project Settings → tick "Show appsscript.json manifest file in editor", then replace the manifest with the contents of `apps-script/appsscript.json`.
5. **Run `setup()`.** Pick `setup` in the function menu and press Run. Google asks you to authorise it (spreadsheets, sending mail, external requests, the trigger, and from E7 full Gmail access, see Sending from the events alias below): choose the Ohm account and allow. Read the log: it should say `Sheet reachable: yes` and show `Remaining daily mail quota`. It also makes the reminder trigger (every 15 minutes) and replaces it if you run `setup()` again. If it throws `SHEET_ID is not set`, redo step 3.
6. **Deploy as a web app.** Deploy → New deployment → type **Web app**: Execute as **Me**, Who has access **Anyone**. If "Anyone" is not offered, the Workspace admin's sharing settings are blocking it; ask the admin to allow it for this account.
7. **The `/exec` URL.** Copy the Web app URL. If it differs from `site.rsvpUrl` in `src/data/site.ts` (it does when the placeholder deployment was not a standalone project in this account), give Code the new one; that is a one-line `site.ts` Item. Until then the form posts to the old URL.
8. **Later updates.** Paste the new `rsvp.js`, then Deploy → **Manage deployments** → pencil (Edit) → Version: **New version** → Deploy. Never "New deployment": that makes a different URL.

### Test it
1. Open `https://ohmprecisionbodywork.com/events/launch-party` (it is `noindex` and not linked; since E8 the old `/launch-party` is a redirect page to it) and send an RSVP with an address you own. You should get the confirmation email, and the tab `launch-party` appears in the sheet with the header and your rows.
2. Send a second RSVP from the **same email** with a different answer. The page says to check your email; nothing in the sheet changes. Check that the link in that email starts `https://script.google.com/macros/s/` and ends `/exec?change=…`, like `site.rsvpUrl`. On a Workspace account it can come back in the `/a/macros/<domain>/…` form or ending `/dev`; if it does, stop and tell the architect, because guests outside the domain would hit a sign-in wall. Then open the link in a **private, signed-out window** and press **Confirm change**: the rows are replaced and the `Changed` column fills in. (Testing while signed in as Ohm hides a sign-in wall.)
3. In the same signed-out window, open `site.rsvpUrl?slug=launch-party`: you should see `spotsLeft` and `full`, and no names or emails.
4. Delete the test rows in the sheet (rows only, not the header).

## Push the script with clasp (I-107)
Replaces the paste-and-redeploy steps for every later update. Needs `clasp` logged in as the Ohm account (`clasp login`; `clasp show-authorized-user` must say `@ohmprecisionbodywork.com`), the Apps Script API switched on at script.google.com/home/usersettings, and `.apps-script-ids.json` (gitignored; copy `.apps-script-ids.example.json` and fill in the Script ID and the Deployment ID behind `site.rsvpUrl`). The repo holds neither ID.

1. `npm run push:script -- --dry` stages the files in `.apps-script-build/` without touching Google.
2. `npm run push:script -- "what changed"` pushes `apps-script/rsvp.js` (as `Code.js`) and `appsscript.json`, makes a new version, moves the existing deployment to it and checks it did. The `/exec` URL does not change.
3. Keep the order in the step sections below (site deploy first, then the script). A push needs no `setup()` unless the section says a new permission is added.

If it says it is not logged in as Ohm, run `clasp logout` then `clasp login`. If it says the API is off, do the user-settings switch above. To roll back, Deploy → Manage deployments → pencil → pick the older version.

## Self-care tips (I-082, I-084; after step E6)
The tip card under the RSVP result and the tip line in each reminder email come from the Google Sheet **`Self Care tip of the day`**, tab `Sheet1`, column A, with `Tip` in row 1 and one tip per row. The script reads it; the site never stores the tips.

**Deadline: before Sat Nov 21, 10:00 am** (the launch-party reminder run). Aim for Fri Nov 20 so there is time to test. Until it is done, the page shows no card and the reminder goes without a tip; nothing else is affected.

1. **The sheet (I-083): done Nov 7.** The sheet is owned by the Ohm account (private; nothing is public), and Marea has Editor access to add or change tips. If it is ever recreated, create it in the Ohm account and share it with Marea as **Editor**, so the script (which runs as Ohm) needs no sharing step.
2. **Wait for the site.** Step E6 must be pushed to `main` and deployed (its feed carries `tips: true` and the `reminderTip` line). Check: `https://ohmprecisionbodywork.com/events/launch-party.json` contains `"tips":true`.
3. **Script Property.** Signed in as Ohm, open the RSVP script → Project Settings → Script Properties → add `TIPS_SHEET_ID` with the tips sheet's ID (the long string between `/d/` and `/edit` in its address). Never paste it into the repo, the chat or an email.
4. **Paste the new version.** Replace `Code.gs` with the new `apps-script/rsvp.js` (the manifest is unchanged), save, then run `setup()`. The log should say `Sheet reachable: yes`, the mail quota and **`Tips read: <n>`** with your number of tips. `Tips read: 0` means the share (step 1) or the ID (step 3) is wrong, or the tab has no tips. The tips add no permission (the script already reads sheets), but from step E7 the same `rsvp.js` also asks for Gmail access, so expect the new permission screen described under Sending from the events alias and allow it as Ohm. If you have not pasted E6 yet, do steps 1–3 here, then the E7 section's paste covers both.
5. **Deploy.** Deploy → Manage deployments → pencil (Edit) → Version: **New version** → Deploy. Never "New deployment" (the URL would change).
6. **Test.** In a signed-out window open `site.rsvpUrl?slug=launch-party`: the reply ends with `"tips":[…]` holding your tips. Then send a test RSVP on `/events/launch-party` (or a can't-go): a "Self-care tip" card shows under the result (the sheet keeps its name); `Another tip` steps through them. Delete the test rows afterwards. The reminder's tip line can't be tried live without emailing guests; the tests cover it.

**Writing tips.** Every tip is **public**: anyone who opens the script's address can read all of them, whether or not they RSVP. Write each as you would for the website: no client names or stories, no email address or phone number, no medical claims (treat, cure, diagnose, fix, heal). Links show as plain text. One tip per row, up to 280 characters (longer rows are skipped); blank and repeated rows are skipped; only the first 100 tips are used. Edits reach the page and the next reminder run within about 5 minutes, with no deploy. Keep the tips in column A of the first tab (`Sheet1`), and keep `Tip` in A1.

**Rewording the reminder line.** The words `Self-care tip: {tip}` (E9, I-095) are `reminderTip` in the copy deck (open in I-081): a reword is a site change, not a script paste.

## Sending from the events alias (I-087; after step E7)
Until this is done, **no event email reaches an address outside the domain**: Google rejects every `MailApp` send before it leaves (Admin → Email Log Search shows "Bounced: Message rejected"), while the same mail through Gmail arrives. Step E7 sends all script mail through Gmail, From `Ohm Precision Bodywork <events@…>` (the alias in `site.eventsEmail`), Reply-To the same alias. Design: ARCHITECTURE §B10 → Mail.

**Deadline: before Sat Nov 21, 10:00 am** (the reminder run). Aim for Fri Nov 20 at the latest. Do steps 3–5 **in one sitting**: once the new code is saved, the reminder trigger runs it and fails with "Authorization is required" until you allow the new permission in step 4.

1. **The alias (done Nov 8).** Signed in as the Ohm account, Gmail → Settings → Accounts → "Send mail as" lists the events address, verified. If it is ever removed, the script still sends, from the account's own address, and `setup()` says so (step 4).
2. **Wait for the site.** Step E7 must be pushed to `main` and deployed. Check: `https://ohmprecisionbodywork.com/events/launch-party.json` contains `"from":"events@`. Then wait 10 minutes (the script caches the feed that long).
3. **Paste.** Signed in as Ohm, open the RSVP script and replace `Code.gs` with the new `apps-script/rsvp.js` (the manifest is unchanged). Save.
4. **Run `setup()` and allow the new permission.** Google shows a **new permission screen**: besides the old ones it asks to read, compose, send and permanently delete your Gmail. This is expected (Gmail's sending path needs Gmail's one permission; there is no send-only version of it). Choose the Ohm account and allow. Read the log: `Sheet reachable: yes`, the mail quota, `Tips read: <n>`, and **`From alias for launch-party: ready`**. If it says `not a Gmail send-as address`, fix step 1 and run `setup()` again (mail still goes, from the account's own address); `not in the feed yet` means step 2's 10 minutes haven't passed.
5. **Deploy.** Deploy → Manage deployments → pencil (Edit) → Version: **New version** → Deploy. Never "New deployment" (the URL would change).
6. **Test (step E7, Done when 3).** In a private, signed-out window, RSVP on `/events/launch-party` with an address you own **outside the domain** (a Gmail address, say). The confirmation arrives From `Ohm Precision Bodywork <events@…>`; pressing Reply addresses the events alias. Then RSVP again from the same address with a different answer: the change email arrives with the same From; open its link in the signed-out window and press Confirm change: the new confirmation arrives. In Admin → Email Log Search for that address, each message shows a remote IP and no "Bounced". Then, in the script editor → Executions, the next `sendDueReminders` run (within 15 minutes) shows **Completed**, not failed: that proves the reminder trigger has the new permission (a reminder itself can't be tried live without emailing guests; the tests cover its text). Delete the test rows (rows only).
7. **If a guest says they got nothing:** Email Log Search for their address. Delivered: ask them to check spam. Missing: Executions shows the failed run.

## Email copy, signature and phone numbers (after step E13)
Step E13 gives the guest emails Maréa's copy, sends them as HTML (with a plain-text copy for mail apps that want one) and ends each with your reply signature: `Brian Clarke, LMT, CNMT` / `Ohm Precision Bodywork` / your phone • `ohmprecisionbodywork.com`. The words come from the site's feed; the two phone numbers come from **Script Properties**, so they are never in the repo, the feed or the chat. The spot-freed note to you is unchanged.

**Deadline: before Sat Nov 21, 10:00 am** (the reminder run). Do steps 2–5 in one sitting.

1. **The phone properties** (done by Brian, Nov 8; this is how to change them). Signed in as Ohm, open the RSVP script → Project Settings (the gear) → Script Properties → **Edit script properties**:
   - `SIGNATURE_PHONE`: your number, written the way it should appear in the signature (for example `719-555-0100` style). Delete the property to drop the phone: the signature's last line becomes the website alone.
   - `HOST_PHONE`: Maréa's number, written the same way, **only with her OK to put it in every confirmation** (master-list item for her consent). Unset: the line reads `If you have any questions, reply to this email.` and names no one.
   Changes take effect on the next email; no paste or deploy is needed for a new number. Never put either number in the repo, a master-list item or a chat.
2. **Wait for the site.** Step E13 must be pushed to `main` and deployed. Check: `https://ohmprecisionbodywork.com/events/launch-party.json` contains `"signature":` and `"bookUrl":`. Then wait 10 minutes (the script caches the feed that long).
3. **Paste.** Replace `Code.gs` with the new `apps-script/rsvp.js` (the manifest is unchanged; no new permission). Save.
4. **Run `setup()`.** The log should show, besides the usual lines, `Signature phone: set` and `Host phone: set` (or `not set`), never a number. `Signature for launch-party: not in the feed yet` means step 2's 10 minutes haven't passed: wait and run it again.
5. **Deploy.** Deploy → Manage deployments → pencil (Edit) → Version: **New version** → Deploy. Never "New deployment".
6. **Test.** In a private window, RSVP on `/events/launch-party` as Going with one guest, from an address you own outside the domain. Check: the greeting and lines match Maréa's copy; `Here's all the details:` and the waiver title are bold and green; `Click here to book` opens `/book`; the signature has the green text, the terracotta left bar and bullet, your phone as a tap-to-call link. Then RSVP again from the same address as Can't go and confirm the change link: the can't-go note arrives with the signature. Delete the test rows (rows only).

## Calendar buttons, Maybe, email details, confirm fix (after step E14)
Step E14 is a site deploy **and** a script paste. Order: push to `main` and wait for the deploy; check `https://ohmprecisionbodywork.com/events/launch-party.json` contains `"googleCalUrl":`; wait 10 minutes (feed cache); paste `apps-script/rsvp.js` over `Code.gs`; Deploy → Manage deployments → pencil → **New version**. No new permission, no `setup()` needed. An old script with the new feed (or the reverse) still works: it just shows the old layout.

Test (private window, an address you own): (1) RSVP Maybe with a guest: no Yoga question appears, the email has `Your RSVP: Maybe`, `Guests:` and the name, no Yoga line. (2) RSVP Going with a guest answering No: `Yoga: Yes` green, `- Name — Yoga: No` terracotta, the orange `Click here to book` button on its own line, both calendar links. (3) RSVP again from the same address, open the link, press Confirm once: the button reads `Confirming…`, the result shows, and the new status's email arrives once. Opening the link again shows the same result. Delete the test rows (rows only).

**Add to Google Calendar** needs a Google account; the other button downloads the `.ics` file that Apple Calendar, Outlook and the rest open.

## Guest emails and the Nov 9 copy (Brian, Nov 9, 2026)
A site deploy **and** a script paste, in the E14 order: push to `main`, wait for the deploy, check `https://ohmprecisionbodywork.com/events/launch-party.json` contains `"guestLead":`, wait 10 minutes (feed cache), paste `apps-script/rsvp.js` over `Code.gs`, Deploy → Manage deployments → pencil → **New version**. No new permission, no `setup()`. Until the paste, the live script ignores guest emails (it saves the RSVP without them) and keeps sending its older email layout; the new feed alone already drops `Brian's site is now live!` and changes the thanks line.

What changes: the confirmation reads `I'm looking forward to…` and loses `Brian's site is now live!`. Each guest row on the form has an optional **Email**. A guest given an address (Going or Maybe, not Can't go) gets one short email: `Hi {guest},`, `{RSVPer} RSVPed you to Ohm Launch Party. I'm looking forward…`, when and where, both calendar links, the waiver notice, the event page, the questions line, `See you there!` and your signature. The address goes in that guest's row, in the `Email` column (their `Opt-in` stays blank: never use it for news or offers). Each address gets at most one guest email per event: an address already anywhere in the event's tab (another RSVP's guest, an RSVPer, or this RSVP's old rows after a confirmed change) gets none, though its row still keeps it. If you delete every row holding an address, a later RSVP listing it emails it again. Guests are not reminded; only the RSVPer is. Each guest email counts against the daily mail quota (Quotas below).

Test (private window, two addresses you own): RSVP Going with a guest whose Email is your second address: both inboxes get their email, and the sheet's guest row shows the address. Delete the test rows (rows only).

The one-per-event cap (Brian, Nov 9, 2026) is script only: it needs no new feed words, so the feed check above is unchanged and it can go in the same paste. Test (a third address you own): after the test above, RSVP Going from the third address with a guest whose Email is the second address: only the third inbox gets mail, and the new guest row still shows the second address. Delete the test rows (rows only).

## Guests taking themselves off (Brian, Nov 9, 2026)
Same order as Guest emails above (the two can go out together in one paste): push to `main`, wait for the deploy, check `https://ohmprecisionbodywork.com/events/launch-party.json` contains `"guestRemoveLead":`, wait 10 minutes (feed cache), paste `apps-script/rsvp.js` over `Code.gs`, Deploy → Manage deployments → pencil → **New version**. No new permission, no `setup()`. The site must go first: the script only does this when the feed has the new words; before the paste, a guest's address that RSVPs is saved as a new RSVP, as today.

What it does: a guest's email now ends with `To change or cancel, RSVP again on the event page with this email address, or reply to this email.` (no remove links). When an address that is only on a guest row RSVPs again, the page says `Check your email.`, the same as for an RSVPer, so it never reveals who is on the list. **Can't go:** the guest gets a link (6 hours, as for changes); pressing Confirm deletes **only that guest's row**, the page says `You're off the list.`, and the RSVPer gets `{guest} removed themselves from your RSVP to Ohm Launch Party.` If the guest held a Yoga `confirmed` spot and anyone is on the waitlist, you get the usual spot-freed email (promote by hand, as below). **Going or Maybe:** nothing changes; the guest gets `You're already on the list…`. If the RSVPer changes their RSVP before the guest presses Confirm, the guest's link expires (they just send it again). A guest can't RSVP for themselves while their address is on a guest row; once removed, the address RSVPs like anyone new. A guest replying to the email instead reaches you: delete their row by hand (and promote from the waitlist if it was `confirmed`).

## Guest email in the confirmation's format, "open this link" (Brian, Nov 9, 2026, after testing)
**Order: the script first, then the site.** Run `npm run push:script -- "guest email as the confirmation; open this link is the link"` (above), then push to `main` and wait for the deploy. The new script still reads the older feed (it shows the bare link, as now); the older script would not read the new feed's change line, so don't deploy the site before the push. No new permission, no `setup()`. Check: `https://ohmprecisionbodywork.com/events/launch-party.json` contains `"changeLinkWords":`, then wait 10 minutes (feed cache).

What changes: a guest's email now looks like your confirmation: `Here's all of the details:`, `Your RSVP: Going` (or `Maybe`) and, for Going, that guest's own `Yoga: Yes`/`No`/`Waitlist` (coloured as in yours; the waitlist note when they are on it), then the change-or-cancel line and the event page, when and where, the calendar links, the waiver notice, `Ready to book a massage?` with the `Click here to book` button, the questions line and `See you there!`. It never shows the RSVPer's answer or the other guests. In the change and guest-removal emails, the words `open this link` are now the link (the plain-text copy still gives the address on the next line).

Test (private window, two addresses you own): RSVP Going with a guest whose Email is your second address and who answers Yoga No: the second inbox shows `Yoga: No` in terracotta and the book button, and no other names. Then RSVP again from the first address: the change email's `open this link` opens the confirm page. Delete the test rows (rows only).

Test (private window, two addresses you own): RSVP Going with a guest whose Email is your second address. From the second address RSVP **Going**: `Check your email.`, the second inbox gets `You're already on the list…`, the sheet is unchanged. Then RSVP **Can't go** from it: the second inbox gets `Confirm you can't make it…`; open the link signed out, press **Confirm change**: `You're off the list.`, only the guest row is gone, the first inbox gets the removal note. Press Confirm again (or reopen the link): the same page, no new email. Delete the test rows (rows only).

## Event-day swap (Nov 22) (I-091; after step E8)
Brian's joke: at about 4:00 pm on Sun Nov 22, 2026 the launch-party page changes Tai Chi to chai tea. A static page changes only with a deploy, so a scheduled deploy does it.

**What changes.** Two strings, together or not at all: the schedule bullet `Tai Chi led by John Marshall ☯️ 🥋` becomes `Chai tea by John Marshall 🍵🫖`, and John Marshall's credit role `Tai Chi instruction` becomes `Chai Tea ceremony`. Nothing else changes. The words are `CHAI_NOTE` in `src/data/events.ts`; the moment is `CHAI_AT` (4:00 pm MST, 23:00 UTC).

**When.** `.github/workflows/deploy.yml` has three scheduled runs on Nov 22: **4:07, 4:22 and 4:45 pm MST** (23:07, 23:22 and 23:45 UTC). GitHub can start a scheduled run late or drop one under load, hence three, none on the hour. Each run rebuilds and redeploys the whole site; the first one after 4:00 pm makes the swap and the others change nothing.

**Check at about 4:15 pm.**
1. Open `https://ohmprecisionbodywork.com/events/launch-party` and reload hard: the schedule shows `Chai tea by John Marshall 🍵🫖` and the credits show `John Marshall` / `Chai Tea ceremony`.
2. If it still says Tai Chi, open the repository's **Actions** tab → **Deploy**: a run from `schedule` should be queued, running or green. Give it a few minutes before the fallback.

**Fallback.** Actions → **Deploy** → **Run workflow** (branch `main`) any time after 4:00 pm. A manual run is allowed in any year and deploys the version for the time it runs, so after 4:00 pm it is the chai version.

**Cancel the joke.** Before 4:00 pm set `CHAI_NOTE` to `null` in `src/data/events.ts` and push (do not delete it: `null` is the off switch, and the bullet and the role then stay Tai Chi together).

**Year guard.** The cron lines fire every Nov 22, so the workflow's first job (`gate`) lets a scheduled run go on only when the year is 2026; in any later year the scheduled run builds and deploys nothing. A push to `main` or a manual run is never blocked.

**After the party.** Delete the `schedule:` block (the three crons) from `deploy.yml` (a master-list reminder for Brian). The chai version can stay as the page's last state. GitHub also turns schedules off in a public repo after 60 days without repository activity.

**Previewing either side.** `OHM_EVENTS_NOW=2026-11-22T23:30:00Z npm run build` builds the chai version, `OHM_EVENTS_NOW=2026-11-22T22:59:59Z npm run build` the Tai Chi version; an unparseable value stops the build. Run a normal `npm run build` again afterwards.

## Running an event
**What a change is.** One RSVP per email. A second submission from the same email changes nothing until the owner of that address opens the emailed link and presses Confirm (a link lasts 6 hours; Google's cache may drop it sooner, in which case the guest just sends the RSVP again; at most 3 such emails per RSVP per 6 hours). This stops anyone changing or cancelling another person's RSVP just by knowing their email. When a change is confirmed, the RSVP's rows are replaced together, `Submitted` stays, `Changed` shows when, and `Reminder sent` stays so nobody gets a second reminder. A guest who stays Going and Yes keeps their spot or their place in the waitlist; a renamed guest counts as a new person.

**The spot-freed email.** When a guest's confirmed change (or, from Nov 9, a guest taking themselves off) gives up a `confirmed` spot while people are on the waitlist, the script emails the business address once, saying how many spots were freed. It names no one. It does not promote anyone.

**Freeing a spot and promoting by hand (I-050).** In the event's tab, set the `confirmed` cell to `no` (or delete the row), then set the first `waitlist` row, the lowest `Waitlist #`, to `confirmed` and email that guest yourself. Do this once per freed spot. New yes-answers queue behind anyone on the waitlist, so a freed spot never jumps the line. The site's "spots left" reads 0 while anyone is waiting.

**Don't move or insert columns.** The script reads by position. Add notes only to the right of `Reminder sent`. Hand edits to the session cell (`confirmed`, `waitlist`, `full`, `maybe`, `no`) are fine and are what the reminders and counts read.

**Reminders.** The trigger runs every 15 minutes. From the event's `reminderAt` until it starts, every Going or Maybe RSVP that has no `Reminder sent` stamp gets one reminder, showing each person's session status as the cell reads now. A can't-go RSVP gets none. From E6, each reminder carries one self-care tip just above the sign-off (a different one per email until all have been used in that run); if the tips sheet can't be read, the reminders go without it.

**Quotas** ([Google](https://developers.google.com/apps-script/guides/services/quotas), read Nov 6, 2026). 1,500 email recipients a day and 6 hours of trigger time a day on a Workspace account; a new Workspace has lower limits until the domain has paid at least USD 100 and 60 days have passed. `setup()` logs the real remaining quota. When the quota hits 0 the reminder run stops and sends the rest on the next run after it resets; unsent reminders are not stamped. A confirmation that cannot be sent never undoes the RSVP: the row is saved and the guest sees success.

**Error replies.** `busy` means two RSVPs arrived at the same moment and the script could not get its lock within 20 seconds; the guest sees the "something went wrong" line and tries again. A quota error shows up as missing emails with saved rows; check the Executions page in the script editor.

## Keeping and using the data (I-065, I-066, I-069; narrowed by I-078, Nov 7, 2026)
- The form promises: "I'll use your name and email only to send event details and reminders. If you add a guest's email, I'll use it only to send them the same." News and offers go only to people who tick the separate box ("Yes, send me Ohm news and offers.").
- The sheet is kept; there is no deletion date.
- **Two kinds of mail, two rules.** (1) Emails about this event (confirmation, can't-go note, change link, reminder) go to every RSVPer whatever the `Opt-in` column says, and the script sends only these (plus the spot-freed note to the business address). (2) News, offers and invitations to future events go only to `you` rows whose `Opt-in` is `yes`. A row without `yes` is never emailed again after this event. Guests (`guest` rows) are never contacted, except (Brian, Nov 9, 2026) the one guest email for this event when the RSVPer typed the guest's address, and the reply to a guest's own RSVP from that address (Guests taking themselves off); a guest row's address is never used for anything else.
- Send invitations and news from a mail tool that gives every message an opt-out link and Ohm's postal address, and honour an opt-out within 10 business days. An opt-out from either kind ends both for that address (CAN-SPAM: [FTC guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business), read Nov 6, 2026). The script does none of this.
