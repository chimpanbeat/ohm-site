# B2: Body map filing script (I-073, I-075, I-110)

Brief §15 · Architecture §B12 Wire contract, Filing script, Script state, Deploy, Privacy; §B10 (simple-request pattern)

Models: builder Fable 5.2 (high effort) · architect Opus (no planning in this step) · reviewer Fable 5.2 (the Apps Script, Drive filing and access). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
`apps-script/bodymap/bodymap.js` and `appsscript.json` implement §B12's filing script exactly: `doPost` in the listed order, `doGet` always `invalid`, `setup()`, write-only, `folderKey` matching (a copy of `src/data/bodymap.ts`'s, kept equal by a test), `_Unsorted_Intakes`, file names, rate limits from `bodymap.rate`, idempotency and every key in Script state, and fixed replies. `scripts/push-apps-script.mjs` gains `--target bodymap`. The default stays `rsvp` and is unchanged. The bodymap target stages only `bodymap.js` (as `Code.js`) and its manifest. Its IDs come from a `bodymap` entry in `.apps-script-ids.json`.

`docs/runbooks/bodymap.md` follows the plan's 12-part outline (`brief/bodymap-plan_2026-11-08.md` §5). Part 6 (filing rules) states §B12's accepted duplicate: two copies of one send with the same marks (two pairs, or a lone PDF and a later pair); keep the later pair and delete the rest by hand. In `docs/runbooks/events.md`, "The repo holds neither ID" becomes "the repo never holds the Script ID; the Deployment ID is public in every `/exec` URL".

`check:secrets` flags Drive folder URLs, script editor URLs, a `"scriptId"` key and `.clasp.json` names. `.apps-script-ids.example.json` is exempt only while its values are the placeholder sentences. **Brian at the PC (about 30 min, I-110):** create the project as Ohm, set `CLIENTS_FOLDER_ID` (I-075; never in chat or the repo), push, run `setup()`, allow Drive, make the first web-app deployment (Execute as Me, Anyone), and give Code the `/exec` URL only. Then `site.bodymapUrl` is set.

Pin the clasp create and deploy commands from the clasp docs, with URL and date. Read-only: `src/data/bodymap.ts`, `apps-script/rsvp.js`. Known gaps: none.

## AC covered (IDs)
- BM-8 and BM-10 (server half), BM-12 (script half): tests 1–13, plus the live checks in Done when 3.

## Files
- apps-script/bodymap/bodymap.js
- apps-script/bodymap/appsscript.json
- tests/bodymap-script.test.ts
- tests/fixtures/bodymap-payloads.json
- scripts/push-apps-script.mjs
- tests/push-apps-script.test.ts
- .apps-script-ids.example.json
- .gitignore
- docs/runbooks/bodymap.md
- docs/runbooks/events.md
- tools/check-secrets.mjs
- tests/check-secrets.test.ts
- src/data/site.ts
- tests/bodymap-data.test.ts
- package.json
- docs/build/STATUS.md

Earlier tests that change (I-123): `tests/bodymap-data.test.ts` test 1 pins `site.bodymapUrl === ''` ("no script yet"). Setting the `/exec` URL makes it fail, so it now pins the URL shape: `https://script.google.com/macros/s/<id>/exec`. `tests/check-secrets.test.ts` is listed above for the new rules.

## Tests first (write them and see them fail before writing code)
`tests/bodymap-script.test.ts` runs the script in `node:vm` with fakes for Drive, Cache, Lock, Properties, ContentService and Utilities, and a settable clock (as in `tests/rsvp-script.test.ts`). The cases are the plan's §4 B2 list, with these names:
1. "Test Client" on `2026-12-03` gives one PDF and one JSON in `_Unsorted_Intakes`, with the right names and MIME types.
2. The folder `Alex_Example` receives "alex  EXAMPLE" and "Álex Example". Two folders with the same key → `_Unsorted_Intakes`. The script's `folderKey` equals `bodymap.ts`'s on every fixture name.
3. Honeypot filled → generic error and 0 Drive writes.
4. A 2,000,001-character body → error, no parse, no writes.
5. Bad PDF magic, bad date, unknown figure, 61 pins or a 141-character note → `invalid`.
6. Rate-limit sequence: 6 sends in 10 min pass and the 7th is `busy`; after 10 min it passes. The 31st of the day is `busy` and the next Denver day resets. A 4th send for the same name and appointment date is `busy`, also typed `test  CLIENT`; another appointment date passes. Refused sends count nothing. Stores, keys and expiries exactly as §B12 Script state; a bad `id` → `invalid`.
7. The same `id` twice → `ok` both times, with one pair of files.
8. `tryLock` false → `busy`. A Drive throw → `server`, and the lock is released.
9. Read-style GET or POST → the same bytes, with 0 Drive calls.
10. Every reply is one of 4 strings. No reply, `console.*` argument, cache key or value, or Script Property name or value the run writes holds a fixture name, its `folderKey`, appointment date, note, folder name, folder or file ID, or the `CLIENTS_FOLDER_ID` value (the fake clock's days differ from every fixture `apptDate`). The `nameKey` for `test client|2026-12-03` equals the first 16 hex characters of its SHA-256 from `node:crypto`.
11. Static bans: the API list in plan §4 B2.11, string-literal `console.*` only, and the manifest exactly as §B12.
12. `setup()`: a clear throw when the property is unset; creates `_Unsorted_Intakes` once.
13. Retry sequences (§B12 Retries), each retrying with the same `id`:
    - (a) the JSON `createFile` throws after the PDF → `server`, nothing counted; the retry writes the JSON only, with the PDF's sent stamp → `ok`, one pair;
    - (b) both written, the same body again within 6 h → `ok`, 0 Drive calls, counts unchanged, also with the day cap full;
    - (c) as (b) with `done:<id>` evicted by the fake cache → a second pair with a later stamp; as (a) with `pdf:<id>` evicted → a lone PDF, then a pair;
    - a throw putting `done:` or the counts after both files → `ok` and `bodymap: state-error`.

`tests/push-apps-script.test.ts` runs `--dry` against a temp IDs file. `rsvp` stages `Code.js` from `rsvp.js` plus the manifest. `bodymap` stages `Code.js` from `bodymap.js` plus its manifest. Neither stage holds the other's file.

## Done when
1. `npm run check` passes, including the new tests.
2. `npm run push:script -- --dry` is unchanged for RSVP.
3. Live, after Brian deploys:
   - a "Test Client" send creates one PDF and one JSON in `_Unsorted_Intakes`, and Brian deletes them; Project Settings → Script Properties then shows `DAY_COUNTS` with one `k` entry equal to the test's `nameKey`;
   - a 1.9 MB body is accepted and a 2.1 MB body is refused;
   - two read-style `curl` calls get the generic reply.
4. `site.bodymapUrl` is the `/exec` URL. No Script ID or folder ID is anywhere in git.

## Report
Files changed · Checks (command and result) · Live results · Deviations · New items (I-###) · Questions for the architect.
