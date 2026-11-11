# B4: Body map thin slice (I-073)

Brief §15 · Architecture §B12 Page, Coordinates and zoom, Storage, Report and PDF, Wire contract, Retries (page half), Checks; §B7, §B8 (the `/hello` pattern), §B11

Models: builder Sonnet (high effort; Brian's call, Nov 10) · architect Opus (no planning in this step) · reviewer Fable 5.2 (the wire contract, client data in storage and the PDF, a real Drive send). Ignored after Nov 16, 2026 11:59 pm PT (I-124).

## Goal
`/body-map` exists behind `bodymap.open`. While closed, the page is `closed` only, with 0 scripts and no form. With `OHM_BODYMAP_PREVIEW=1` it shows:
- name, date and the honeypot;
- the female front only, one pin type (pain);
- zoom, pan, pinch and the buttons;
- autosave;
- send with a minimal PDF (one figure, the pin list without regions) and the JSON;
- the confirmation, `errNetwork` with retry, `errBusy` and `errServer`;
- `noscript`.

Client script 8, `src/scripts/bodymap.ts`, is imported only by the page. The pure logic lives in `src/lib/bodymap.ts` (state, storage wrapper, payload) and `src/lib/bodymap-view.ts` (zoom math). `src/lib/pdf.ts` is the writer and `src/lib/bodymap-pdf.ts` the report. `body-map` joins `RESERVED_SLUGS`. Add `public/body-map/index.html`. `check:dist` and `check:wording` get the §B12 rules.

Strings come only from `bodymap.text`. Read-only: `src/data/bodymap.ts`, `src/data/site.ts`, `src/layouts/Base.astro` (it already has `bare`, `noindex` and `analytics`). Known gaps: regions show as `unlabelled` until B5.

## AC covered (IDs)
- BM-2: `bodymap-view.test.ts`, plus e2e pinch and buttons at 375 px.
- BM-7: state tests and e2e reload.
- BM-11: e2e offline.
- BM-13: `check:dist` and `check:wording`.
- BM-8 (client half): a real "Test Client" send.

## Files
- src/pages/body-map.astro
- public/body-map/index.html
- src/scripts/bodymap.ts
- src/lib/bodymap.ts
- src/lib/bodymap-view.ts
- src/lib/pdf.ts
- src/lib/bodymap-pdf.ts
- src/lib/events.ts
- tests/bodymap-state.test.ts
- tests/bodymap-view.test.ts
- tests/bodymap-pdf.test.ts
- tests/bodymap-page.test.ts
- tests/page-transition.test.ts
- tests/events.test.ts
- scripts/check-wording.mjs
- tests/check-wording.test.ts
- scripts/check-dist.mjs
- tests/check-dist.test.ts
- tests/footer.test.ts
- tools/bodymap-e2e.mjs
- tools/shots-scenarios.mjs
- package.json
- docs/build/STATUS.md

Earlier tests that change (I-123), each pinning "no body map page, form or script yet":
- `tests/footer.test.ts` test 2: every page except `hello.html` and redirect pages has the site footer. `body-map.html` is `bare`, so add it to the exceptions.
- `tests/check-dist.test.ts` (about line 91): "passes when body-map.html does not exist yet". Keep it, and add the preview-page cases.
- `tests/events.test.ts` 2b: `RESERVED_SLUGS` covers every top-level entry of `src/pages/` and `public/`, so `body-map` joins.
- `tests/page-transition.test.ts`: the script count per page defaults to 0, so `body-map.html` gets its own count (closed: 0).
- `tests/check-wording.test.ts`: the `good()` page list gains the body map page.

`tools/shots-scenarios.mjs` (from MF3, I-122) gets the `/body-map` scenario: fill the test name, add a pin, send. `npm run shots -- B4 --route /body-map --stub <state>` then captures the confirmation, `network`, `busy`, `server` and `sending` states, and `--nojs` the `noscript` view. No throwaway Playwright scripts.

## Tests first (write them and see them fail before writing code)
1. View: the screen↔0–1 round trip at zoom 1, 3 and 6, with pans and DPR 1, 2 and 3, has error under 1e-6. Zoom clamps to 1–6. A pan can't push the figure off screen. Pin scale is 1/zoom.
2. State sequences:
   - add, then reload → the same pins;
   - saved at T and loaded at T+23h59m → kept; at T+24h01m → deleted;
   - an unknown `v` → deleted;
   - send ok → cleared, and a reload is empty;
   - a storage that throws → in memory, with no throw;
   - a failed send keeps the marks, and the retry reuses the same `id`, also after a reload; an edit to the name, date, figure or pins, Start over and `ok` each drop it, so the next send has a new one (§B12 Retries);
   - the `id` is a lower-case v4 UUID made with `crypto.getRandomValues`, never `randomUUID` (the LAN preview is plain http).
3. PDF: the output parses in `unpdf`. It holds the name, date, sent time and pin list, and 1 image. `é` survives and `ł` becomes `?`.
4. Page (dist): closed → no `<script>`, no form, no `script.google.com`. Preview → 1 script, the fields and the honeypot. `body-map` is in `RESERVED_SLUGS`.
5. `check-dist` and `check-wording` on synthetic trees: one failing case per new rule.
6. e2e at 375 px:
   - tap → a pin;
   - zoom 3× by buttons and by CDP pinch → the tap lands within 10 px, and after zooming out the coordinates are the same;
   - offline send → `errNetwork` with pins kept; online → sent once.

## Done when
1. `npm run check` passes, including the new tests. `npm run e2e:bodymap` passes locally.
2. `npm run shots -- B4` (closed page), plus preview screens at 375 and 1280 px, in `docs/build/screens/B4/`. The error and sent states come from `--stub` runs (see Files), not ad hoc scripts.
3. This step adds a new kind of built page (`body-map.html` and its `public/body-map/index.html` refresh stub), so every check runs on both builds (I-123):
   - after `OHM_BODYMAP_PREVIEW=1 npm run build`, run `npm run check:wording`, `check:contrast`, `check:dist`, `check:secrets` and `check:reviewer` against that preview `dist/`, and all pass;
   - then rebuild without the flag and run `npm run check`, or the page-transition and footer tests fail on the preview build.
4. Brian sends "Test Client" from his phone over LAN preview, and it lands in `_Unsorted_Intakes`.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
