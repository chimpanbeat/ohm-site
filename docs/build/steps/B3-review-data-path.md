# B3: Review the body map data path (reviewer)

Brief §15 · Architecture §B12 Filing script, Deploy, Privacy

Models: builder Sonnet (high effort; Brian's call, Nov 10) · architect Opus (plans the B2 fix items from a FIX verdict; Brian's call, Nov 10) · reviewer Fable 5.2 (the Apps Script, Drive filing, access and fixtures). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The reviewer confirms, read-only, that B2's script can only create files and leaks nothing. Their verdict is PASS or FIX with a numbered list. They check:
- No code path returns Drive data: the reviewer reads every Drive call and every reply.
- Replies, logs and cache values carry no name, date, note, folder or file ID.
- The Script ID and folder ID are absent from git history (`git log -p` grep).
- The push script can't cross the two projects.
- The live endpoint answers read-style requests with the generic reply.
- The fixtures are fake and follow the CLAUDE.md data rules.
- The runbook steps match the script.

Read-only: everything. Known gaps: none.

## AC covered (IDs)
- BM-8, BM-10, BM-12 (server side): the review findings, each with file:line evidence.

## Files
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
No new code. The reviewer runs:
1. `npm run check`.
2. `git grep -nE "drive\.google\.com|/folders/[A-Za-z0-9_-]{20,}|script\.google\.com/(home|d)/|\"scriptId\""` → nothing.
3. `git log -p --all -S CLIENTS_FOLDER_ID` → only the property name, never a value.
4. Live, in sequence:
   - `curl` GET `site.bodymapUrl?list=1`;
   - a POST `{"action":"list"}`;
   - a POST with `fileId`;
   - the same valid fake send twice (one pair of files, then Brian deletes them).

## Done when
1. A verdict line in STATUS → Change log, with each FIX item turned into a new B2 fix item.
2. On PASS, B4 may start.

## Report
Verdict · Findings with file:line · Commands run and results · Questions for the architect.
