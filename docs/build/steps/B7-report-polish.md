# B7: Body map report and polish (I-073)

Brief §15 R8, R10, R11 · Architecture §B12 Report and PDF, Wire contract, Checks, Privacy

Models: builder Sonnet (medium effort) · architect Opus (no planning in this step) · reviewer Fable 5.2 (the wire contract's report, client data in the PDF, the honeypot and caps). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
The full PDF:
- header: name, appointment, sent (Denver) and figure;
- both views with numbered pins, from the `png/` art at about 600×1200 JPEG;
- then `Priority` (starred), `Avoid` and `Other marks`, each line with number, type, region, `{n}/5` and note;
- footer `{site.name} · private client record`.

The JSON report has `{ v:1, figure, pins:[{ n, view, x, y, type, region, intensity, note, star }] }`.

The page side:
- client honeypot (`website`, visually hidden, `tabindex="-1"`, `autocomplete="off"`);
- size caps checked before sending;
- every error state wired to its string;
- focus moves to the result;
- `aria-live` for the star messages;
- labels on every control, 44 px targets, 16 px inputs.

`check:dist` adds the last two §B12 rules: no zone markup, and the JS chunk's host allowlist. Read-only: `src/data/bodymap.ts`, the zone files. Known gaps: none.

## AC covered (IDs)
- BM-4: PDF text order.
- BM-5 (PDF half): starred first.
- BM-9: both images, region names, name and date.
- BM-10 (page half): the e2e honeypot and oversize cases.
- BM-1 (flow): the e2e 3-front plus 2-back flow at 375 px.

## Files
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
- scripts/check-dist.mjs
- tests/check-dist.test.ts
- tools/bodymap-e2e.mjs
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
1. PDF: two images. Section order is Priority → Avoid → Other marks. Starred pins come first, and avoid pins appear only under `Avoid`. Every pin's region and intensity is present, pin numbers match the list, and the name and date are there.
2. Static: `bodymap-pdf.ts` and the figure rasteriser import no zone file.
3. Size: the JSON report is at most 64 KB at 60 pins with 140-character notes. A 1.6 MB PDF is refused before `fetch`.
4. Page: the honeypot is present and empty. Dist has no `data-zone`, no `bodymap-zones` and no zone key as an attribute.
5. e2e sequence: the 3-front plus 2-back flow sends once. Honeypot filled → `errServer` with no send. A request log shows only allowlisted hosts and no query string on the endpoint. The console listener records 0 messages.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes.
2. Screens of the form, a sent result and each error at 375 and 1280 px in `docs/build/screens/B7/`, made with `npm run shots -- B7 --route /body-map --stub <state>` (`ok`, `busy`, `invalid`, `server`, `network`, `nonjson`, `sending`) and `--nojs` (I-122), not throwaway scripts. A sample PDF made from fake data is attached to the report, and never committed.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
