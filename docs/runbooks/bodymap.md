# Body map runbook

How to set up, update, test, pause and look after the body map filing script ("Ohm Bodymap"). The design is in ARCHITECTURE §B12; the script is `apps-script/bodymap/bodymap.js` with `apps-script/bodymap/appsscript.json`. The repo never holds the Script ID, the clients folder ID, a client's name or a filed map; keep it that way. Never paste either ID into a chat, an email or a commit.

## 1. What it does, and what it never does
- The `/body-map` page sends one map (a PDF and its report) to the web app at `site.bodymapUrl`. The script files the PDF and a JSON copy of the report in Google Drive, in the client's folder or in `_Unsorted_Intakes`, and answers with one of four fixed replies: `{"ok":true}`, or `{"ok":false,"error":"…"}` with `invalid`, `busy` or `server`.
- It is **write-only**. It opens the clients folder, reads the *names* of its subfolders to pick one, and creates files. It never opens, lists, copies, moves, shares or deletes a file, sends no email and makes no outside request. Every GET, and every POST that asks for something, gets the same `invalid` reply.
- Write-only is a promise the code keeps, not a Google permission: the script runs as you, and the one permission it asks for is Google's full Drive scope (§B12 fixes it), so Google itself would allow more. The promise is checked by `tests/bodymap-script.test.ts` (a ban on read, share, mail and fetch APIs; fixed replies and log lines), by the reviewer at B3 and B8, and by the live checks in part 5.
- Outside Drive it keeps only: three kinds of cache entry (a done marker and a PDF-filed marker per send, keyed by the send's random id, and the 10-minute count), and the Script Property `DAY_COUNTS` (the send day, the day's count, and a count per name-and-date *digest*). None holds a name, a date typed by a client, a note or an ID.

## 2. One-time setup (I-110, about 30 minutes)
Do all of this signed in to the **Ohm Workspace account**, not a personal Google account.

1. **Create the project.** script.google.com → **New project** → rename it `Ohm Bodymap`. It must be standalone: never Extensions → Apps Script from a sheet or doc, and never inside the RSVP project.
   - With clasp instead: `clasp create-script --type standalone --title "Ohm Bodymap"`. It writes a `.clasp.json` holding the new Script ID into the folder you run it in, so run it in an empty scratch folder outside the repo, copy the ID, and delete that folder. The editor way is simpler.
2. **Script ID.** Project Settings (the gear) → IDs → copy the Script ID into `.apps-script-ids.json` (gitignored) as the `bodymap` entry, with an empty `deploymentId` for now. `.apps-script-ids.example.json` shows the shape.
3. **Script Property.** Project Settings → Script Properties → add `CLIENTS_FOLDER_ID` with the ID of the Drive folder that holds the client folders (I-075): open that folder in Drive and copy the long string at the end of its address. Type it only there.
4. **Push the code.** `npm run push:bodymap -- --dry` stages the two files in `.apps-script-build/` without touching Google. `npm run push:bodymap -- "first push"` pushes them (`bodymap.js` as `Code.js`, plus the manifest) and stops there, because there is no deployment yet. It needs `clasp` logged in as the Ohm account and the Apps Script API switched on, as in the Events runbook → Push the script with clasp.
   - By hand instead: replace `Code.gs` with the contents of `bodymap.js`; Project Settings → tick "Show appsscript.json manifest file in editor"; replace the manifest with `appsscript.json`.
5. **Run `setup()`.** In the editor pick `setup` in the function menu and press Run. Google asks you to authorise Drive access: choose the Ohm account and allow. The execution log should show `bodymap: reachable`, then `bodymap: unsorted-created` (or `bodymap: unsorted-found` if the folder was already there). `_Unsorted_Intakes` now exists inside the clients folder.
   - `CLIENTS_FOLDER_ID is not set`: redo step 3. `The clients folder is not reachable`: the ID is wrong, or this account can't open that folder.
6. **Deploy as a web app.** Deploy → **New deployment** → type **Web app** → Execute as **Me**, Who has access **Anyone** → Deploy. If "Anyone" isn't offered, the Workspace admin's sharing settings are blocking it.
7. **Hand over the URL only.** Copy the Web app URL (it ends `/exec`) and give it to Code: it becomes `site.bodymapUrl`, which is public by design. Copy the Deployment ID (Deploy → Manage deployments) into `.apps-script-ids.json` as `bodymap.deploymentId`, so later pushes move this deployment. The Deployment ID is the middle of the `/exec` URL, so it is public too; the Script ID is not.
8. Code then runs parts 4 and 5 with you.

## 3. Updates
A change to `bodymap.js` is a contract change: the architect or a step file makes it, with its tests. To publish it:
- `npm run push:bodymap -- "what changed"` pushes the files, makes a new version, moves the existing deployment to it and checks that it did. The `/exec` URL doesn't change. The commands it runs are `clasp push --force`, `clasp create-version "<description>"`, `clasp update-deployment <deploymentId> -V <version> -d "<description>"` and `clasp list-deployments` (clasp README, https://github.com/google/clasp/blob/master/README.md, read 2026-11-10, and `clasp --help`, v3.4.1).
- By hand: paste the new `bodymap.js`, then Deploy → **Manage deployments** → pencil (Edit) → Version: **New version** → Deploy. Never "New deployment" for an update: that makes a different URL (part 8 is the one exception).
- A push needs no `setup()` unless the step says a new permission was added. To roll back: Manage deployments → pencil → pick the older version.
- The push script stages only this target's two files, so the body map project can never receive the RSVP script, or the other way round (`tests/push-apps-script.test.ts`).

## 4. Test send
1. Send a map as **Test Client** (or another fake name) with any appointment date in range. Until the page is open (B10), Code sends a fake one from the PC; after that, send one from a phone and one from a desktop at `/body-map`.
2. In Drive, `_Unsorted_Intakes` gets one PDF and one JSON named `<appointment date> Body map, Test Client (sent <date> <HH.mm>)`. Open the PDF to check it.
3. Delete the two test files.
4. Tests count toward the limits in part 7: use a different fake name for each test send (a name and appointment date allow 3 a day) and no more than 6 sends in 10 minutes.

## 5. The read-style check
The endpoint must never hand anything back. Run both lines with the real URL in place of `<URL>`; each must print exactly `{"ok":false,"error":"invalid"}`:
- `curl -sL "<URL>?list=1&folder=x"`
- `curl -sL -H "Content-Type: text/plain;charset=UTF-8" -d '{"action":"list"}' "<URL>"`

Run them after the first deployment, after any change to the script, and at B9.

## 6. Where a map is filed
- **The match is exact, after tidying.** The typed name and each client folder's name are compared with case, accents, punctuation, underscores and extra spaces ignored, so `Alex_Example` receives "alex  EXAMPLE" and "Álex Example". There is no fuzzy matching: "Alex Examples", "Alex" and "Example Alex" don't match.
- **Exactly one matching folder** → the files go there. **None, or two folders that tidy to the same name** → `_Unsorted_Intakes`. A folder in the trash never receives a map. If `_Unsorted_Intakes` is missing, the script makes it again.
- **Folder names:** `First_Last`. A client who types a nickname or a married name lands in `_Unsorted_Intakes`; move the two files to their folder by hand.
- **File names:** `<appointment date> Body map, <name as typed> (sent <yyyy-MM-dd HH.mm>)`, `.pdf` and `.json`, Denver time. The name loses `/ \ : * ? " < > |` and stops at 60 characters. The JSON is the report exactly as the page sent it.
- **Duplicates (I-127).** A retry that the script can't recognise files the same map twice. You then see two copies of one send with the same marks, in one of three shapes: two pairs with different sent times; a lone PDF followed by a later pair; or, after a failed marker removal, a second JSON with the same name beside the first pair. Keep the later pair and delete the rest by hand (in the third shape, delete the extra JSON). It takes a retry more than 6 hours after the first try, or Google dropping a cache entry early, so it should be rare.
- **Unexpected files (I-128).** The URL is public, so anyone can file a well-formed map under any name. Treat every map as unverified until the client confirms it at the session. A map the client didn't send: delete it by hand. Several: pause the endpoint (part 8), then delete them.

## 7. Limits, and what clients see
| Limit | Value | The client sees |
|---|---|---|
| Whole send | 2,000,000 characters | "Something went wrong, and it didn't send…" (`errServer`); the page stops a PDF over 1,500,000 base64 characters or a report over 64,000 characters before sending |
| Pins, note, name | 60 pins, 140 characters, 80 characters | the page enforces these; the script refuses anything over them |
| Appointment date | today −14 to +365 days (the script allows one more day each way for time zones) | the page's date field enforces it |
| Sends in 10 minutes, everyone together | 6 | "A lot of maps are coming in right now. Your marks are saved here. Try again in a few minutes." (`errBusy`) |
| Sends in a Denver day, everyone together | 30 | the same `errBusy` |
| Sends for one name and appointment date in a Denver day | 3 | the same `errBusy` |

- Only filed maps count. A refused send, a failed one and a replay of a filed one count nothing.
- A client who gets `errBusy` keeps their marks on their device for 24 hours and can send again later.
- **A busy day (I-128).** If clients say they can't send, look in two places:
  1. Project Settings → **Script Properties**. `PAUSED` there means the off switch is on (part 8). `DAY_COUNTS` shows a day's counts: first check that `d` is today's date in Denver. If it isn't, the counts are stale (the property is written only when a map is filed) and the day cap is not the cause. If it is today, `n` is the number of maps filed today, so `30` means the day's cap is used; an entry under `k` at `3` means one name and appointment date's cap is used (the entry is a digest, not a name).
  2. **Executions**. Each send is a `doPost` row of type Web App. A filed map takes several seconds; a refused one takes under a second. A run of short rows is a run of refused sends. The 7th send in a 10-minute window is the one refused, so the sign of the 10-minute cap is 6 filed rows followed by short rows. Two other things also make a short row: a send refused because another was being filed waits up to 10 seconds for the lock first, and a replay of an already filed send is short too but replies ok, so the client sees the thank-you.
  The script also logs one fixed code per refusal (part 12), but Executions doesn't show log lines for the web app's runs: the rows don't open (checked live Nov 10, 2026). The codes show only for runs from the editor, such as `setup()`.
  The day and name counts reset by themselves at the first send after midnight in Denver. To reset them at once, delete `DAY_COUNTS` in Script Properties. If the 30 went to junk, see Unexpected files in part 6.

## 8. Off, on, and a new URL
- **Pause (seconds, no push).** Project Settings → Script Properties → add `PAUSED` with the value `1`. Every send then gets `busy` at once and nothing is filed; clients see `errBusy` and keep their marks. **Resume:** delete `PAUSED`. The script only reads this property; it never sets or clears it.
- **A new URL**, only if the URL itself is being targeted:
  1. Keep `PAUSED` set.
  2. Deploy → **New deployment** → Web app, Execute as Me, Anyone. Copy the new `/exec` URL.
  3. Give Code the URL: a master-list Item sets `site.bodymapUrl`, and the site deploys. Put the new Deployment ID in `.apps-script-ids.json`.
  4. Deploy → Manage deployments → archive the old deployment.
  5. `curl -sL "<old URL>"` must no longer print `{"ok":false,"error":"invalid"}`. Google doesn't document what an archived URL returns; if it still answers, keep `PAUSED` and raise an Item.
  6. Delete `PAUSED`.
  A new URL is public again as soon as it is committed, so this only shakes off whoever saved the old one.
- **After launch (B10)** the page itself can also be closed: an Item sets `bodymap.open: false` and the site deploys. The page then shows only "This page isn't open yet."

## 9. Keeping and deleting maps
The build deletes nothing, ever. How long a map stays in Drive is your records policy (BRIEF §15); delete or archive files by hand in Drive. Test files and duplicates can go at once.

## 10. Shared devices
A client's marks are saved on their own device for at most 24 hours, and cleared when the map is sent or when they tap **Start over**. The page says so ("On a shared device? Tap Start over when you're done."). Nothing a client sent can be read back through the page or the endpoint. If a client filled the map in on your device, tap Start over after the send.

## 11. Adding Turnstile later
Not built (BRIEF §15: it can be added later). It would be a new decision and an architect step, because it changes four promises at once: the send gains a `token` field (the script refuses unknown fields today), the script would call Cloudflare to check the token (outside requests are banned today, and it adds a permission to accept), the page would load Cloudflare's script (a third party, so BRIEF §15 and `check:dist` change), and a secret would live in a Script Property. Until then the spam controls are the honeypot, the size caps, the limits in part 7 and the pause in part 8.

## 12. Troubleshooting
The script logs one fixed line per refusal or fault, and nothing else. **You can't see those lines for client sends today:** Executions lists each web-app run with its time, duration and status, but its rows don't open to show a log (checked live Nov 10, 2026). So work from what the client saw, Script Properties and the run durations (part 7 → A busy day). The table says what each code means, for the day the logs are made visible. Whether and how they can be is an open decision (I-141).

| Log line | The client saw | What it means, and what to do |
|---|---|---|
| (none) | the thank-you screen | Filed. |
| `bodymap: invalid` | `errServer` | The send was malformed, over a cap, had the hidden field filled in (a bot), or was a read-style probe. Nothing to do unless a real client reports it; then ask what they typed and tell Code. |
| `bodymap: busy-window`, `busy-day`, `busy-name` | `errBusy` | A limit in part 7. See A busy day there. |
| `bodymap: busy-lock` | `errBusy` | Another send was being filed. The client retries. |
| `bodymap: paused` | `errBusy` | `PAUSED` is set (part 8). |
| `bodymap: drive-error` | `errServer` | Drive refused: the clients folder was moved, deleted or unshared, `CLIENTS_FOLDER_ID` is wrong or missing, or Drive is down. Run `setup()` again to see which; it says "not reachable" if it is the folder. If the PDF was filed before the fault, the client's retry adds only the JSON. |
| `bodymap: state-error` | the thank-you screen, or `errServer` | The cache or Script Properties failed. If both files were already filed the client still got the thank-you; a duplicate may follow (part 6). If it repeats, pause and tell Code. |

- **"Folder not reachable"** from `setup()`: check `CLIENTS_FOLDER_ID` in Script Properties against the folder's address in Drive, and that the Ohm account can open it.
- **The client says it sent, but there is no file:** look in `_Unsorted_Intakes` first (the name didn't match a folder), then in Executions for that time.
- **A sign-in page instead of a reply** when testing the URL signed out: the deployment's access isn't "Anyone". Manage deployments → pencil → Who has access: Anyone.
