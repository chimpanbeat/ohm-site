# B7: Body map report and polish (I-073, I-153, I-155, I-156)

Brief §15 R4, R8, R10, R11 · Architecture §B12 Revision of Nov 13, Report and PDF, Report JSON, Wire contract, Filing script, Checks, Privacy

Models: builder Sonnet (high effort; medium before the Nov 13 re-plan) · architect Opus (no planning in this step) · reviewer Fable 5.2 (the wire contract's report, client data in the PDF, the honeypot and caps, the filing script's one change). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

Re-planned Nov 13, 2026 (architect): the report carries the detail fields, the report cap rises, and the filing script changes once, here (the STATUS row's Effort and Command need the same change).

## Goal
The full PDF:
- header: name, appointment, sent (Denver) and figure;
- both views with numbered pins, each figure drawn from the art the page displays (never `png/`) onto a 600×1200 canvas as a JPEG;
- then `Priority` (starred), `Avoid` and `Other marks`. Each line: number, type, zone name, `{n}/10`, the qualities, each answered detail (`pdf.courses`, then `pdf.started`, `pdf.worse` and `pdf.better` as labels) and the note. An unanswered field prints nothing. A pin from the list prints its region name and `pdf.fromList`;
- footer `{site.name} · private client record`.

The JSON report is §B12 Report JSON in full: `v: 2`, and every pin's `intensity`, `quality`, `course`, `started`, `worse`, `better` and `note` join B5's zone fields. An avoid pin sends them empty.

**Caps and the script, once.** `limits.reportBytes` becomes 96,000. In `apps-script/bodymap/bodymap.js`, `LIMITS` gains `detailChars: 80` and `startedChars: 40`, `reportBytes` becomes 96000, and the per-pin loop caps `worse`, `better` (80) and `started` (40) as it caps `note`. Nothing else in the script changes. `docs/runbooks/bodymap.md` part 7 states the new caps.

The page side:
- client honeypot (`website`, visually hidden, `tabindex="-1"`, `autocomplete="off"`);
- size caps checked before sending;
- every error state wired to its string;
- focus moves to the result;
- `aria-live` for the star messages;
- labels on every control, 44 px targets, 16 px inputs.

`check:dist` adds the last two §B12 rules: no zone markup, and the JS chunk's host allowlist. Read-only: the zone files. Known gaps: none.

## AC covered (IDs)
- BM-4: PDF text order.
- BM-5 (PDF half): starred first.
- BM-9: both images, zone names, name and date.
- BM-10 (page half): the e2e honeypot and oversize cases. (Script half: test 6.)
- BM-1 (flow): the e2e 3-front plus 2-back flow at 375 px.

## Files
- src/data/bodymap.ts
- apps-script/bodymap/bodymap.js
- src/lib/bodymap-pdf.ts
- src/lib/pdf.ts
- src/lib/bodymap.ts
- src/scripts/bodymap.ts
- src/pages/body-map.astro
- src/components/bodymap/PinSheet.astro
- src/components/bodymap/RegionList.astro
- tests/bodymap-pdf.test.ts
- tests/bodymap-page.test.ts
- tests/bodymap-state.test.ts
- tests/bodymap-data.test.ts
- tests/bodymap-script.test.ts
- tests/fixtures/bodymap-payloads.json
- scripts/check-dist.mjs
- tests/check-dist.test.ts
- tools/bodymap-e2e.mjs
- docs/runbooks/bodymap.md
- docs/build/STATUS.md

Earlier tests that change: `tests/bodymap-data.test.ts` test 4 (`reportBytes`); `tests/bodymap-script.test.ts` (about lines 328 and 381 to 402: the caps the script copies, and the report-size cases).

## Tests first (write them and see them fail before writing code)
1. PDF: two images. Section order is Priority → Avoid → Other marks. Starred pins come first, and avoid pins appear only under `Avoid`. Every pin's zone name is present, pin numbers match the list, and the name and date are there.
2. PDF details: a pin with intensity 7, `sharp` and `burning`, `chronic`, and started, worse, better and a note prints `7/10`, both qualities, `Chronic`, and each text after its label. A pin with none prints no label at all. An avoid pin prints no intensity. A list pin prints its region name and `chosen from the list`.
3. JSON: `v` is 2; every pin has exactly §B12's keys in order; an avoid pin's detail fields are empty; text is trimmed.
4. Static: `bodymap-pdf.ts` and the figure rasteriser import no zone file and no `png/` path.
5. Size: 60 pins with every text field full of `"` characters give a report under 96,000 characters. A 1.6 MB PDF is refused before `fetch`.
6. Script (`node:vm`, fake data): the script's caps equal `bodymap.limits` (now with `detailChars` and `startedChars`); a pin with `worse` of 81 characters, `better` of 81 or `started` of 41 → `invalid`, nothing filed, nothing counted; the same at the caps → `ok`; a 96,001-character report → `invalid`; a B4-shaped report with none of the new keys → `ok`. Then in sequence: a send at the caps, a retry with the same `id` → `ok` with no second pair.
7. Page: the honeypot is present and empty. Dist has no `data-zone`, no `bodymap-zones`, no zone key as an attribute and no fine zone name in the HTML.
8. e2e sequence: the 3-front plus 2-back flow sends once. Honeypot filled → `errServer` with no send. A request log shows only allowlisted hosts and no query string on the endpoint. The console listener records 0 messages.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens of the form, a sent result and each error at 375 and 1280 px in `docs/build/screens/B7/`, made with `npm run shots -- B7 --route /body-map --stub <state>` (`ok`, `busy`, `invalid`, `server`, `network`, `nonjson`, `sending`) and `--nojs` (I-122), not throwaway scripts. A sample PDF made from fake data is attached to the report, and never committed.
3. The script is pushed once, from the main session: `npm run push:bodymap -- "B12 revision: detail caps"` (needs clasp logged in as the Ohm account; runbook part 3). Then two live sends with fake data from the main session, each under a fresh fake name: one with every detail at its cap → `{"ok":true}`, one with `worse` of 81 characters → `{"ok":false,"error":"invalid"}`. Brian deletes the filed pair. The push and both replies are logged in STATUS → Change log.

## Report
Files changed · Checks (command and result) · The push and the two live replies · Deviations · New items (I-###) · Questions for the architect.
