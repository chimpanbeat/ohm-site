# B3: Review the body map data path (reviewer)

Brief §15 · Architecture §B12 Filing script, Script state, Retries, Deploy, Off switch, Privacy, Pinned facts

Models: builder Sonnet (high effort; Brian's call, Nov 10) · architect Opus (plans the B2 fix items from a FIX verdict; Brian's call, Nov 10) · reviewer Fable 5.2 (the Apps Script, Drive filing, access and fixtures). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The reviewer confirms, read-only, that B2's script can only create files and leaks nothing. Their verdict is PASS or FIX with a numbered list. They check:
- No code path returns Drive data: the reviewer reads every Drive call and every reply.
- Replies, logs, cache keys and values, and Script Property names and values carry no name, folder key, appointment date, note, folder or file ID: the reviewer reads every `put`, `setProperty` and `console.*` call against §B12 Script state.
- The Script ID and folder ID are absent from git history (`git log -p` grep).
- The push script can't cross the two projects.
- The live endpoint answers read-style requests with the generic reply.
- The fixtures are fake and follow the CLAUDE.md data rules.
- The script does the four things §B12 now states (I-137), each with file:line in `bodymap.js` and the test that pins it:
  - it removes `pdf:<id>` once the pair is filed, so a lost `done:` gives a full second pair;
  - it allows the appointment date −15 to +366 days of the Denver date;
  - it skips a client folder in the trash;
  - it makes `_Unsorted_Intakes` again at send time when it is missing.
- The runbook steps match the script, including:
  - unexpected files (unverified until the client confirms);
  - a busy day, worked from Script Properties (`PAUSED`, `DAY_COUNTS`) and run durations in Executions, with both `DAY_COUNTS` resets. The log codes are documented as not visible for web-app runs (§B12 Pinned facts), and no step asks Brian to find one in Executions;
  - the off switch (`PAUSED` and the URL rotation);
  - the accepted duplicate.

Read-only: everything. Known gaps: none.

## AC covered (IDs)
- BM-8, BM-10, BM-12 (server side): the review findings, each with file:line evidence.

## Files
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
No new code. The reviewer runs:
1. `npm run check`.
2. The `check:secrets` rules from B2 (`tools/check-secrets.mjs`), as greps (I-138). They cover Drive folder addresses, script editor project addresses (not `/home/usersettings` or `/macros/s/…/exec`) and a `"scriptId"` key only when a value follows:
   - `git grep -nE "drive\.google\.com/[^[:space:]]*folders/|/folders/[A-Za-z0-9_-]{20,}|script\.google\.com/(home/projects|d)/|\"scriptId\"[[:space:]]*:" -- . ":(exclude).apps-script-ids.example.json"` → nothing;
   - `git grep -nE "\"scriptId\"" -- .apps-script-ids.example.json` → exactly lines 2 and 5, each value a placeholder sentence with spaces (a real Script ID has none).
3. `git log -p --all -S CLIENTS_FOLDER_ID` → only the property name, never a value.
4. Live, in sequence. Each result is judged by the reply bytes, Drive and Script Properties, never by a log line: Executions doesn't show web-app log lines (§B12 Pinned facts).
   - `curl` GET `site.bodymapUrl?list=1`;
   - a POST `{"action":"list"}`;
   - a POST with `fileId`;
   - each of those three replies exactly `{"ok":false,"error":"invalid"}`, and Drive gains nothing;
   - the same valid fake send twice, with a fake name and date not sent that Denver day. Both reply `{"ok":true}`, Drive gets one pair of files, and Brian deletes them. Brian reads Project Settings → Script Properties: `DAY_COUNTS` `n` went up by 1, not 2, with one new `k` entry. Executions shows two Web App rows, the second much shorter (a replay makes no Drive call).

## Done when
1. A verdict line in STATUS → Change log, with each FIX item turned into a new B2 fix item.
2. No finding and no live check depends on seeing a log code in Executions. The busy-day and fault routes are Script Properties and run durations, as in the runbook's parts 7 and 12.
3. On PASS, B4 may start.

## Report
Verdict · Findings with file:line · Commands run and results · Questions for the architect.
