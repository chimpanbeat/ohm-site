# B8: Review body map privacy end to end (reviewer)

Brief §15 · Architecture §B12 (all), §B11 (excluded page), §D

Models: builder Fable 5.2 (high effort) · architect Fable 5.2 (plans the fix items from a FIX verdict, and the jsPDF decision) · reviewer Fable 5.2 (client data end to end). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The reviewer confirms, read-only, that health information goes only where §B12 Privacy allows: page memory, `localStorage` for at most 24 h, the POST body and Drive. Their verdict is PASS or FIX with a numbered list. The areas to check:
- storage: the wrapper, the expiry, and clearing on send and on Start over;
- console: page and script;
- network: hosts, and no query strings;
- URLs and the page title;
- PDF and JSON contents and the Drive file names;
- fixtures: fake data only;
- the pin-greyscale screenshot;
- that the PDF writer is sound: if it is fragile, the architect brings jsPDF to Brian.

Read-only: everything. Known gaps: none.

## AC covered (IDs)
- BM-1 to BM-14: each mapped to its test or screenshot, with any gap listed.

## Files
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
No new code. The reviewer runs `npm run check`, then these greps:
1. `git grep -nE "drive\.google\.com/[^[:space:]]*folders/|/folders/[A-Za-z0-9_-]{20,}"` → none. These are Drive folder addresses only, B2's `check:secrets` rule (I-138).
2. `git grep -nE "script\.google\.com/(home/projects|d)/|\"scriptId\"[[:space:]]*:" -- . ":(exclude).apps-script-ids.example.json"` → none. These are script editor project addresses only (not `/home/usersettings` or `/macros/s/…/exec`) and a `"scriptId"` key only when a value follows (I-138). Then `git grep -nE "\"scriptId\"" -- .apps-script-ids.example.json` → exactly its two placeholder sentences (each has spaces; a real Script ID has none).
3. `git ls-files | grep -iE "\.clasp\.json$|\.pdf$|bodymap.*\.json$"` → only `public/ohm-client-policies.pdf`, the 4 zone files, `apps-script/bodymap/appsscript.json` and `tests/fixtures/bodymap-payloads.json` (the last two are B2's, fake data only).
4. `git grep -nE "console\.|localStorage\.(setItem|getItem)" -- src/scripts/bodymap.ts src/lib/bodymap*.ts src/lib/pdf.ts` → no console; storage only inside the one wrapper.
5. `git grep -nE "Logger\.log|console\.(log|info|error)" -- apps-script/bodymap/` → none.
6. `grep -ohE "https?://[^\"' )]+" dist/body-map.html dist/_astro/*.js | sort -u`, for the body map chunk → only the site, `script.google.com` and `www.w3.org`.

## Done when
1. A verdict line in STATUS → Change log, with each FIX item turned into a fix item for the step that owns the file.
2. On PASS, B9 may start.

## Report
Verdict · BM coverage table · Findings with file:line · Commands and results · Questions for the architect.
