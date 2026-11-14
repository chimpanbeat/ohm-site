# B7b: Body map sending: the filing script's one change (caps and consent), the real payload through it, the push, and the send polish (I-073, I-153, I-155, I-173)

Brief §15 R10, R11, R19, BM-1, BM-10, BM-11, BM-13 · Architecture §B12 Who applies (the script changes once), Wire contract, Filing script, Checks, Privacy

Models: builder Sonnet (high effort) · architect Opus (no planning in this step) · reviewer Opus (the wire contract, the honeypot and caps, the script's one change, the consent refusal). No Fable (Brian, Nov 13). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Planned Nov 14, 2026 (architect), split from B7. Needs B7 done (the report builders).

## Goal
- **Script, once** (`apps-script/bodymap/bodymap.js`, §B12 Who applies): `LIMITS` gains `detailChars: 80`, `startedChars: 40`; `reportBytes` 96000; the per-pin loop caps `worse`, `better` (80) and `started` (40) as it caps `note`, and the same four on `report.whole` when it is an object; `report.helperName` when present a string of at most 80; **consent**: `report.consent === true` and `report.consentAt` an ISO UTC string, else `invalid`. Nothing else changes. `docs/runbooks/bodymap.md` part 7 states the caps and the consent rule.
- **Page polish:** client honeypot (`website`, visually hidden, `tabindex="-1"`, `autocomplete="off"`); size caps before sending; every error state wired to its string; focus to the result; `aria-live` for the star messages; the consent line stays directly above Send in every state (sending, error, retry); labels on every control, 44 px targets, 16 px inputs.
- `check:dist` adds §B12's last two rules: no zone markup; the JS chunk's host allowlist.

Read-only: the zone files, `src/lib/bodymap-pdf.ts`. Known gaps: none.

## AC covered (IDs)
- BM-10: test 1 (script), e2e case 4 (page). R19 (script half): test 1. BM-11: e2e case 4. BM-13: test 3. BM-1: e2e case 4 (the minimum-path flow sends once). Master-list I-155: test 2.

## Files
- apps-script/bodymap/bodymap.js
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinPanel.astro
- src/components/bodymap/RegionList.astro
- tests/bodymap-script.test.ts
- tests/fixtures/bodymap-payloads.json
- tests/bodymap-page.test.ts
- scripts/check-dist.mjs
- tests/check-dist.test.ts
- tools/bodymap-e2e.mjs
- docs/runbooks/bodymap.md
- docs/build/STATUS.md

Earlier tests that change: `tests/bodymap-script.test.ts` (about lines 328 and 381 to 402: the copied caps and the report-size cases); its fixtures gain `consent` and `consentAt`, since every send without them is now `invalid`.

## Tests first (write them and see them fail before writing code)
1. Script (`node:vm`, fake data): caps equal `bodymap.limits`; `worse` 81, `better` 81, `started` 41, a `whole` with `worse` 81, `helperName` 81 → each `invalid`, nothing filed or counted; the same at the caps → `ok`; 96,001 characters → `invalid`; no `consent`, `consent: false`, `consent: 'yes'`, no `consentAt`, `consentAt: 'today'` → each `invalid`, logged `bodymap: invalid`; a B4-shaped report with consent added → `ok`. In sequence: a send at the caps, a retry with the same `id` → `ok`, no second pair.
2. Wire, end to end (master-list I-155): a state with a pair, a tight pin, an avoid pin, a whole item, a follow-up and a helper; `buildPayload(state, buildReport(...), toBase64(buildPdf(...)))` into the script under `node:vm` with fake Drive → `ok`, exactly 2 files, the `.json` parsed equals the report, and the file names hold the client's name, never the helper's.
3. Page and dist: the honeypot present and empty; dist has no `data-zone`, no `bodymap-zones`, no zone key as an attribute, no fine zone name.
4. e2e sequence: the minimum-path flow sends once; honeypot filled → `errServer`, no send; a 1.6 MB PDF refused before `fetch`; offline → `errNetwork` and `Try again`, marks kept, back online → `ok`; only allowlisted hosts, no query string; 0 console messages.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens of the form, a sent result and each error at 375 and 1280 px in `docs/build/screens/B7b/`, with `npm run shots -- B7b --route /body-map --stub <state>` (`ok`, `busy`, `invalid`, `server`, `network`, `nonjson`, `sending`) and `--nojs` (I-122).
3. The script is pushed once, from the main session: `npm run push:bodymap -- "B12 revision: detail caps and consent"` (clasp logged in as the Ohm account; runbook part 3). **The live endpoint files sends without consent until this push lands.** Then three live sends with fake data, each under a fresh fake name: every detail at its cap with consent → `{"ok":true}`; `worse` of 81 → `{"ok":false,"error":"invalid"}`; without `consent` (a crafted payload with `curl`, since the page always sends `true`) → `{"ok":false,"error":"invalid"}`. Brian deletes the filed pair. The push and the three replies are logged in STATUS → Change log.

## Report
Files changed · Checks (command and result) · The push and the three live replies · Deviations · New items (I-###) · Questions for the architect.
