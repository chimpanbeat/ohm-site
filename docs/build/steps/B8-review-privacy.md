# B8: Review body map privacy end to end (reviewer)

Brief §15 · Architecture §B12 (all), §B11 (excluded page), §D

Models: builder Opus (high effort; `/model opus` after the command stops) · architect Opus (plans the fix items from a FIX verdict, and the jsPDF decision) · reviewer Opus (client data end to end). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The reviewer confirms, read-only, that health information goes only where §B12 Privacy allows: page memory, `localStorage` for at most 24 h, the POST body and Drive. Their verdict is PASS or FIX with a numbered list. The areas to check:
- storage: the wrapper, the expiry, and clearing on send and on Start over;
- console: page and script;
- network: hosts, and no query strings;
- URLs and the page title;
- PDF and JSON contents and the Drive file names;
- the detail fields from the Nov 13 revision (quality, course, started, worse, better): health information like the note, on the same paths and no others;
- the skin tone (I-151, B6d) and the Undo stack (I-168, B6b): page memory only, never in `localStorage`, `sessionStorage`, the report, the PDF's figure, a request, a URL or the console; a moved pin (I-148), an undo and a Both sides or Unlink (I-168, B6c) drop the send `id` like any edit;
- the seven types (I-167): each sends only its own fields; a pair's `mirror` carries the same zone fields as the pin; `to` and `area` are `null` (I-169); the keys (B6d) never fire while the client types in a field;
- the Nov 14 additions (I-171–I-174, I-178, B6e, B7, B7b): the whole-body item, `since` and the visit on the same paths as the pins; the helper's name only in storage, the POST body and the report, never a file name, folder match or state key; consent is the line above Send (no control, nothing stored), every report carries `consent: true` with `consentAt` = `sent`, and the pushed script refuses a report without it; `seconds` the only measurement and `firstAt` only in the one storage entry (no tap, field or timing record anywhere else); the figure thumbnails and their names name no sex on the page, and load only the existing art (never `png/`);
- zones: the JSON pins carry §B12's zone fields, a fine zone name is never rendered on the page, and left and right are the client's own;
- the filing script changed once at B7b (`LIMITS`, the per-pin and whole-item caps, the helper's name cap and the consent check only), and the repo's copy is what was pushed;
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
3. `git ls-files | grep -iE "\.clasp\.json$|\.pdf$|bodymap.*\.json$"` → only `public/ohm-client-policies.pdf`, the 4 zone files (geometry, anchors and `zoneSet` only), `apps-script/bodymap/appsscript.json` and `tests/fixtures/bodymap-payloads.json` (the last two are B2's, fake data only).
4. `git grep -nE "console\.|localStorage\.(setItem|getItem)" -- src/scripts/bodymap.ts src/lib/bodymap*.ts src/lib/pdf.ts` → no console; storage only inside the one wrapper.
5. `git grep -nE "Logger\.log|console\.(log|info|error)" -- apps-script/bodymap/` → none.
6. `grep -ohE "https?://[^\"' )]+" dist/body-map.html dist/_astro/*.js | sort -u`, for the body map chunk → only the site, `script.google.com` and `www.w3.org`.

## Done when
1. A verdict line in STATUS → Change log, with each FIX item turned into a fix item for the step that owns the file.
2. On PASS, B9 may start.

## Report
Verdict · BM coverage table · Findings with file:line · Commands and results · Questions for the architect.
