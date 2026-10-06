# 6R: Review Phase 6 (site review fixes)

Model: opus
Reviews: `6B-review-fixes.md` (and the 6A contract changes, uncommitted)

## Checklist
1. HANDOFF §4: read the 6B Report, then the full `git status` and `git diff`. This covers 6A's changes too: brief, `site.ts`, `glossary.ts`, ARCHITECTURE, copy deck, `.gitignore`, step files.
2. Re-run every 6B Done-when, plus `npm run build`, `npm test` and `npm run check:wording`.
3. Live check with `npm run dev` and Playwright, on `/ohm-site/book`, choosing "At your place":
   - `document.querySelector('iframe').src` contains `&noprof=1` and `&ehbc=125245`, and no `&amp;`.
   - Screenshot the embed. Confirm the title bar is green and the title text is light, then measure its contrast. If My Maps renders dark text, re-decide the color (ARCHITECTURE §A1) before committing.
   - The out card shows the fee note and no amount. Services shows the worked example and glossary at 375px and desktop.
4. Brian's items:
   - Rates and "From $90" unchanged (`git diff src/data/site.ts` touches no `rates` line).
   - No Monument in `dist`, JSON-LD `areaServed` or fixtures as served.
   - The only zone artefact staged is `src/data/zones.geojson` (expected unchanged). No KML staged.
5. Accept: commit `Phase 6: site review fixes` with the co-author trailer and push `main`. Set 6A/6B/6R to `done` with the hash. Send the summary with **every** new TODO(Brian): 6A §6-vs-polygon items 1–6, the Cordera/Wolf Ranch fixtures, the out-of-region fee amount, and the brief §4 travel-note example.
