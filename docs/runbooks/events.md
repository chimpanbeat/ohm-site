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
3. **Script Property.** Project Settings (the gear) → Script Properties → add `SHEET_ID` with the sheet's ID.
4. **Paste both files.** Replace `Code.gs` with the contents of `apps-script/rsvp.js`. Project Settings → tick "Show appsscript.json manifest file in editor", then replace the manifest with the contents of `apps-script/appsscript.json`.
5. **Run `setup()`.** Pick `setup` in the function menu and press Run. Google asks you to authorise it (spreadsheets, sending mail, external requests, the trigger): choose the Ohm account and allow. Read the log: it should say `Sheet reachable: yes` and show `Remaining daily mail quota`. It also makes the reminder trigger (every 15 minutes) and replaces it if you run `setup()` again. If it throws `SHEET_ID is not set`, redo step 3.
6. **Deploy as a web app.** Deploy → New deployment → type **Web app**: Execute as **Me**, Who has access **Anyone**. If "Anyone" is not offered, the Workspace admin's sharing settings are blocking it; ask the admin to allow it for this account.
7. **The `/exec` URL.** Copy the Web app URL. If it differs from `site.rsvpUrl` in `src/data/site.ts` (it does when the placeholder deployment was not a standalone project in this account), give Code the new one; that is a one-line `site.ts` Item. Until then the form posts to the old URL.
8. **Later updates.** Paste the new `rsvp.js`, then Deploy → **Manage deployments** → pencil (Edit) → Version: **New version** → Deploy. Never "New deployment": that makes a different URL.

### Test it
1. Open `https://ohmprecisionbodywork.com/launch-party` (it is `noindex` and not linked) and send an RSVP with an address you own. You should get the confirmation email, and the tab `launch-party` appears in the sheet with the header and your rows.
2. Send a second RSVP from the **same email** with a different answer. The page says to check your email; nothing in the sheet changes. Check that the link in that email starts `https://script.google.com/macros/s/` and ends `/exec?change=…`, like `site.rsvpUrl`. On a Workspace account it can come back in the `/a/macros/<domain>/…` form or ending `/dev`; if it does, stop and tell the architect, because guests outside the domain would hit a sign-in wall. Then open the link in a **private, signed-out window** and press **Confirm change**: the rows are replaced and the `Changed` column fills in. (Testing while signed in as Ohm hides a sign-in wall.)
3. In the same signed-out window, open `site.rsvpUrl?slug=launch-party`: you should see `spotsLeft` and `full`, and no names or emails.
4. Delete the test rows in the sheet (rows only, not the header).

## Running an event
**What a change is.** One RSVP per email. A second submission from the same email changes nothing until the owner of that address opens the emailed link and presses Confirm (a link lasts 6 hours; Google's cache may drop it sooner, in which case the guest just sends the RSVP again; at most 3 such emails per RSVP per 6 hours). This stops anyone changing or cancelling another person's RSVP just by knowing their email. When a change is confirmed, the RSVP's rows are replaced together, `Submitted` stays, `Changed` shows when, and `Reminder sent` stays so nobody gets a second reminder. A guest who stays Going and Yes keeps their spot or their place in the waitlist; a renamed guest counts as a new person.

**The spot-freed email.** When a guest's confirmed change gives up a `confirmed` spot while people are on the waitlist, the script emails the business address once, saying how many spots were freed. It names no one. It does not promote anyone.

**Freeing a spot and promoting by hand (I-050).** In the event's tab, set the `confirmed` cell to `no` (or delete the row), then set the first `waitlist` row, the lowest `Waitlist #`, to `confirmed` and email that guest yourself. Do this once per freed spot. New yes-answers queue behind anyone on the waitlist, so a freed spot never jumps the line. The site's "spots left" reads 0 while anyone is waiting.

**Don't move or insert columns.** The script reads by position. Add notes only to the right of `Reminder sent`. Hand edits to the session cell (`confirmed`, `waitlist`, `full`, `maybe`, `no`) are fine and are what the reminders and counts read.

**Reminders.** The trigger runs every 15 minutes. From the event's `reminderAt` until it starts, every Going or Maybe RSVP that has no `Reminder sent` stamp gets one reminder, showing each person's session status as the cell reads now. A can't-go RSVP gets none.

**Quotas** ([Google](https://developers.google.com/apps-script/guides/services/quotas), read Nov 6, 2026). 1,500 email recipients a day and 6 hours of trigger time a day on a Workspace account; a new Workspace has lower limits until the domain has paid at least USD 100 and 60 days have passed. `setup()` logs the real remaining quota. When the quota hits 0 the reminder run stops and sends the rest on the next run after it resets; unsent reminders are not stamped. A confirmation that cannot be sent never undoes the RSVP: the row is saved and the guest sees success.

**Error replies.** `busy` means two RSVPs arrived at the same moment and the script could not get its lock within 20 seconds; the guest sees the "something went wrong" line and tries again. A quota error shows up as missing emails with saved rows; check the Executions page in the script editor.

## Keeping and using the data (I-065, I-066, I-069)
- The sheet is kept for future events; there is no deletion date.
- **Three kinds of mail, three rules.** (1) Emails about this event (confirmation, can't-go note, change link, reminder) go to every RSVPer whatever the `Opt-in` column says, and the script sends only these (plus the spot-freed note to the business address). (2) Invitations to future events may go to every `you` row that RSVPed, opted in or not. (3) News and offers go only to `you` rows whose `Opt-in` is `yes`. Guests (`guest` rows) have no email and are never contacted.
- Send invitations and news from a mail tool that gives every message an opt-out link and Ohm's postal address, and honour an opt-out within 10 business days. An opt-out from either kind ends both for that address (CAN-SPAM: [FTC guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business), read Nov 6, 2026). The script does none of this.
