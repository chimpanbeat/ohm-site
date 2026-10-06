# 6B: Site review fixes: components, zones script, tests, README

Model: sonnet
Brief: §6 (zones, map, out of region), §7, §12, §14
Architecture: §A1 (hex exception), §B1, §B3 (ZoneCard, Glossary, MapEmbed), §B5 (`npm run zones`)
Copy: `docs/build/copy-deck.md`: "Changes in step 6A" under Global, Services (worked example, glossary), About (glossary)
Context: `steps/6A-review-fixes-contracts.md`

Opus already changed the contract files in 6A: `site.ts`, the new `glossary.ts`, ARCHITECTURE and the copy deck. **Don't edit `src/data/site.ts`, `src/data/glossary.ts`, `src/data/wording.ts` or `src/styles/tokens.css`.** If you need something there, escalate. Don't change any rate or the Home "From $90" line.

## Files
| File | Change |
|---|---|
| `src/components/Glossary.astro` | **New.** Props `keys: GlossaryKey[]`. Renders `<dl class="glossary">`, with one `<dt>{term}</dt><dd>{def}</dd>` per key in the given order, from `glossary` in `src/data/glossary.ts`. Styling: `--fs-small`; `dt` weight 700; `dd` margin 0 with `--s-1` below the term and `--s-3` between pairs; top margin `--s-3`. No borders, no background, tokens only. |
| `src/components/ZoneCard.astro` | `out` branch only: add `<p>{site.outOfRegionFeeNote}</p>` after the "by request" `<p>` and before `<ContactButtons />`. Nothing else changes. |
| `src/components/MapEmbed.astro` | iframe `title="Ohm service area map"`. Keep `loading="lazy"` and the CSS `width: 100%`. Don't add a `width="100%"` attribute (invalid on iframe; ARCHITECTURE §B3). |
| `src/pages/services.astro` | (a) `<Glossary keys={['ischemicCompression', 'pnf', 'referredPain']} />` directly after the Neuromuscular therapy `<p>`, inside the same `<div>`. (b) Directly after `<RateTable />`, the worked example `<p>`, built from config: `{site.rates.s60.label} at your place: ${site.rates.s60.price} + ${site.travelFee.amount} travel = ${site.rates.s60.price + site.travelFee.amount}.` (compute the sum in the frontmatter if that's cleaner). Then the existing `{site.travelFee.note}` `<p>`. Keep the existing TODO(Brian) comment. |
| `src/pages/about.astro` | `<Glossary keys={['ischemicCompression', 'pnf']} />` directly after paragraph 3 (the `{w('training')}` one). |
| `scripts/kml-to-geojson.mjs` | Name mapping per ARCHITECTURE §B5. Details below. |
| `tests/fixtures/addresses.json` | Monument `note` → `"Out of the service area (Brian, Oct 5 2026)."` Add Cordera and Wolf Ranch (below). |
| `tests/zones.test.ts` | Pass `{ todo: f.todo }` to `test()` when a fixture has a `todo` field, so those report as TODO and don't fail CI. Others unchanged. |
| `tests/zones-script.test.ts` | **New.** See below. |
| `tests/site.test.ts` | Add the tests below. |
| `README.md` | See below. |

### `scripts/kml-to-geojson.mjs`
- `import { site } from '../src/data/site.ts';` (Node 24 strips types; `check-wording.mjs` already relies on this). Build the expected map from `['home', 'shared', 'north']` → `site.zones[key].name`. Keep that order for the output.
- Name normalisation: decode CDATA and `&amp;` (the existing `decode`), then `.replace(/\s+/g, ' ').trim()`. Match **exactly** (case-sensitive).
- A placemark with no `<Polygon>` is skipped and counted in the "Skipped" log line, as `N non-polygon placemark(s)`. Don't print its name.
- A polygon placemark whose name isn't one of the three: exit 1 and print the names found and the names expected, e.g. `Expected: "Central & Southwest Springs", "Mid-north Springs", "North Springs"`.
- Keep the existing duplicate-zone, missing-zone, bad-coordinate and empty-polygon failures. The output format is unchanged.
- Update the header comment.

### Fixtures to add (after Briargate)
```json
{
  "label": "Cordera",
  "query": "Cordera, Colorado Springs, CO",
  "lat": 38.9805,
  "lng": -104.7405,
  "expect": "north",
  "approximate": true,
  "todo": "TODO(Brian): brief §6 lists Cordera in North, but the polygon's NE edge may cut off its northern part. Replace lat/lng with a geocoded Cordera address, run npm test, then remove this field.",
  "note": "Rough interior point (Opus, 6A), not geocoded."
},
{
  "label": "Wolf Ranch",
  "query": "Wolf Ranch, Colorado Springs, CO",
  "lat": 38.962,
  "lng": -104.727,
  "expect": "north",
  "approximate": true,
  "todo": "TODO(Brian): brief §6 lists Wolf Ranch in North. Replace lat/lng with a geocoded Wolf Ranch address, run npm test, then remove this field.",
  "note": "Rough interior point (Opus, 6A), not geocoded."
}
```

### `tests/zones-script.test.ts`
Run the script with `spawnSync(process.execPath, ['scripts/kml-to-geojson.mjs', kmlPath, '--out', outPath])` on **synthetic** KML written to `os.tmpdir()` (`mkdtempSync`). Never read the real KML.
1. **Valid:** three polygon placemarks named `<![CDATA[Central & Southwest Springs]]>`, `Mid-north Springs` and `North Springs` (one with an extra space or newline, to test normalisation). Add one `<Point>` placemark named `Home base` with a `<description>secret note</description>` and `<ExtendedData>`. Expect:
   - exit 0
   - three features in order home, shared, north
   - each feature's `properties` is exactly `{ zone }`
   - the output file contains neither `secret note` nor `Home base`
2. **Unknown name:** a polygon placemark named `North Region` (the old export name). Expect exit 1, and stderr containing `North Region` and `Mid-north Springs`.
3. **Missing zone:** only two of the three polygons. Expect exit 1.

Use small squares for geometry. Clean up the temp dir.

### `tests/site.test.ts` additions
- `site.mapEmbedUrl` equals exactly `https://www.google.com/maps/d/embed?mid=1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc&noprof=1&ll=38.89985450733466%2C-104.8154571&z=12&ehbc=125245`.
- `site.mapViewerUrl` equals exactly `https://www.google.com/maps/d/viewer?mid=1kjLh6P3y-W-_wvvBdjYpT_CcSEnqSWc&ll=38.89985450733466%2C-104.8154571&z=12`.
- `site.map.headerColor` matches `/^[0-9a-f]{6}$/i` and equals the `--green-700` value read from `src/styles/tokens.css`. Compare without `#`, case-insensitively.
- No "Monument" (case-insensitive) in `site.areaServed`, `site.serviceAreaSummary`, or the `name`, `days` and `area` of the `home`, `shared` and `north` zones. (`out.area` may name it.)
- While `site.outOfRegionFee === null`, `site.outOfRegionFeeNote` contains no `$` and no digit.

### README
- **Re-exporting zones:**
  - Placemark names must equal the zone names in `site.ts` exactly. List them: `Central & Southwest Springs`, `Mid-north Springs`, `North Springs`.
  - There's no "out" polygon; anywhere outside the three is out.
  - Pins and other non-polygon placemarks are skipped.
  - An unknown polygon name stops the script with the expected list.
  - To rename a zone, rename it in both My Maps and `site.ts`.
  - The KML is gitignored (`brief/*`, `*.kml`, `*.kmz`, `*.kml.xml`). Never commit it; commit only `src/data/zones.geojson`.
- **Service-area map** (new short section, after "Updating rates, days and links"):
  - The embed and viewer URLs are built from `site.map` (`mid`, `center`, `zoom`, `headerColor`).
  - `noprof=1` hides the owner's profile.
  - `ehbc` is the title-bar color: a 6-digit hex with no `#`, kept equal to `--green-700` (a test enforces this). It's green because My Maps sets the title in white, and white on terracotta fails AA contrast.
  - If the map is recreated (new ID), change `mid`. Edits in place keep the same ID.
- **Test addresses:**
  - Monument is out of the service area.
  - Add Cordera and Wolf Ranch to the list. They're `todo` checks: they report as TODO, not failures, until Brian replaces the rough coordinates and removes the `todo` field.
- **TODO(Brian) section:** add the Cordera/Wolf Ranch fixture check, and point to `docs/build/steps/6A-review-fixes-contracts.md` for the six §6-vs-polygon differences.

## Done when
1. `npm run zones` (on Brian's local KML, already in `brief/`) prints `Wrote 3 zones`, and `git diff --exit-code src/data/zones.geojson` shows **no change** (6A confirmed the geometry is identical).
2. `npm test` passes. Expected: 0 fail, 2 todo (Cordera, Wolf Ranch).
3. `npm run build` succeeds.
4. `npm run check:wording` passes. Paste any warnings.
5. `dist/book.html`:
   - `grep -c '&amp;amp;'` → 0.
   - The iframe `src` reads `…embed?mid=…&amp;noprof=1&amp;ll=38.89985450733466%2C-104.8154571&amp;z=12&amp;ehbc=125245`. Single-encoded `&amp;` in HTML is correct.
   - The iframe has `title="Ohm service area map"`.
6. `dist/services.html` contains `60-minute session at your place: $90 + $25 travel = $115.` and the three glossary terms. `dist/about.html` contains the two About glossary terms.
7. `dist/book/out.html`'s card contains the out-of-region note and no `$` inside the card markup. (JSON-LD `priceRange` elsewhere on the page is fine.)
8. `grep -ril monument dist` → nothing.
9. `git status --porcelain` lists no `.kml`, `.kmz` or `.kml.xml` file, and `git diff --stat` shows no change to `src/data/site.ts`, `src/data/glossary.ts`, `src/data/wording.ts`, `src/styles/tokens.css` or any rate.

## Report
**Files changed**
- `src/components/Glossary.astro` (new): `<dl class="glossary">` from `glossary.ts`, tokens only.
- `src/components/ZoneCard.astro`: `out` branch shows `site.outOfRegionFeeNote`.
- `src/components/MapEmbed.astro`: iframe title `Ohm service area map`.
- `src/pages/services.astro`: Glossary under Neuromuscular therapy; worked example after `RateTable`.
- `src/pages/about.astro`: Glossary after the training paragraph.
- `scripts/kml-to-geojson.mjs`: exact-name matching against `site.zones[...].name`; non-polygon placemarks skipped and counted; unknown polygon name exits 1 with Found/Expected lists; header comment updated.
- `tests/fixtures/addresses.json`: Monument note; Cordera and Wolf Ranch (`todo`).
- `tests/zones.test.ts`: `todo` fixtures report as TODO.
- `tests/zones-script.test.ts` (new): valid, unknown-name and missing-zone cases on synthetic KML in a temp dir.
- `tests/site.test.ts`: map URLs, header colour vs `--green-700`, no Monument, no fee amount in the note.
- `README.md`: re-export rules, Service-area map section, test addresses, TODO(Brian).
- `docs/build/STATUS.md`: row set to in-progress, then review.

**Checks**
1. `npm run zones`: `Wrote 3 zones`; `git diff --exit-code src/data/zones.geojson` clean. **Pass**
2. `npm test`: 32 tests, 30 pass, 0 fail, 2 todo (Cordera, Wolf Ranch). **Pass**
3. `npm run build`: 10 pages. **Pass**
4. `npm run check:wording`: OK, no warnings. **Pass**
5. `dist/book.html`: `&amp;amp;` count 0; iframe src is `…?mid=…&amp;noprof=1&amp;ll=38.89985450733466%2C-104.8154571&amp;z=12&amp;ehbc=125245`; title `Ohm service area map`. **Pass**
6. `dist/services.html` has `60-minute session at your place: $90 + $25 travel = $115.` and all three terms; `dist/about.html` has both. **Pass**
7. `dist/book/out.html` card has the note and no `$`. **Pass**
8. `grep -ril monument dist`: one hit, `dist/_astro/index.astro_astro_type_script_index_0_lang.*.js`. See Deviations.
9. `git status --porcelain`: no KML files. `git diff --stat` on `glossary.ts`, `wording.ts`, `tokens.css`: no change. `site.ts` shows the 6A edits that were already uncommitted; I made none. **Pass**

**Deviations**
- Check 8 isn't empty. The hit is `site.zones.out.area` ("East of Academy Blvd outside North Springs, Monument, …"), bundled into the booking script. The step says `out.area` may name Monument, so I left it. Opus may want to drop it from the check or from the string.

**TODO(Brian)**
- Cordera and Wolf Ranch fixtures need geocoded coordinates (`todo` field). Added to README.

**Questions for Opus**
- Check 8's wording vs `out.area` (above).

## Review
(Opus, 6R, Oct 5 2026.) **Accepted.**
- Re-ran Done-when 1–9, `npm run build`, `npm test` (32: 30 pass, 0 fail, 2 todo) and `check:wording` (OK). All match the Report.
- Check 8: accepted. The only `monument` in `dist` is `zones.out.area` in the booking script bundle, which lists Monument as *outside* the area. That's correct, and the string isn't rendered.
- Live (`astro preview` of the fresh build): the iframe `src` has `&noprof=1&ehbc=125245` and no `&amp;`. The title bar renders as exactly `#125245` with white text, which measures **9.06:1**. Google's "Create your own" link measures 5.38:1. The green stands. The out card shows the note with no amount. Services and About show the glossary and the worked example at 375px and 1280px with no horizontal overflow.
- Opus nits fixed in `Glossary.astro`: `margin-bottom: var(--s-4)`, so About's next paragraph no longer sits flush, and `max-width: var(--measure)`, so the definitions don't run wider than the paragraph above on desktop.
