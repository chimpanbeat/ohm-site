# ohm-site

Static [Astro](https://astro.build) site for Ohm Precision Bodywork. It explains the work and routes each visitor to the right PocketSuite booking link, by office or by the zone their address falls in. The spec is `brief/BRIEF.md`; the build docs are in `docs/build/`.

The repo is **public**. Never commit `.env`, the KML, client data, or anything under `brief/` except `BRIEF.md`.

## Local dev

- Node 24 (22.12+ works).
- `npm ci`
- `cp .env.example .env`, then set `PUBLIC_GOOGLE_MAPS_KEY` (see [Google key setup](#google-key-setup)). Without a key the site still works: `/book` falls back to the zone picker and the map.
- `npm run dev` serves http://localhost:4321/ohm-site/.

The port is fixed at **4321** because the Google key allows the referrer `http://localhost:4321/*`. If the dev server picks another port, the address field stops working until that referrer is added to the key.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 4321 |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Zone logic and address fixtures |
| `npm run check:wording` | Scans `dist/` for licensure wording that isn't allowed yet (run after `build`) |
| `npm run check:contrast` | Checks the brand colour pairs against WCAG contrast minimums |
| `npm run zones` | Converts the My Maps KML into `src/data/zones.geojson` |
| `npm run osm` | Fetches the roads and towns for the service-area map from OpenStreetMap into `src/data/osm.geojson` (by hand, rarely) |
| `npm run terrain` | Builds the hillshade for the service-area map from USGS elevation into `src/assets/terrain.webp` (by hand, rarely) |
| `npm run omega` | Traces the Ω from `src/assets/icon.png` into `src/data/omega.json` (by hand, rarely) |
| `npm run check:dist` | Checks `dist/` keeps `/hello` noindex, unlinked, out of the sitemap and limited to one inline script (run after `build`) |
| `npm run icons` | Regenerates the favicon and touch icons |

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci`, `npm test`, `npm run build`, `npm run check:wording`, `npm run check:dist`, then publishes `dist/` to GitHub Pages.

One-time setup:
1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables** → add `PUBLIC_GOOGLE_MAPS_KEY`. It's a **variable**, not a secret: the key ends up in the page's JavaScript by design, and the referrer and API restrictions protect it.

The preview is https://chimpanbeat.github.io/ohm-site/. It is `noindex` until the site is licensed and live.

## Updating rates, days and links

Everything a visitor sees about the business is in **`src/data/site.ts`**: rates, travel fee, office and zone days, zone names, email, `contact` (the PocketSuite lead form and chat, used when someone is outside the service area), PocketSuite booking links, the My Maps viewer URL and the deploy settings. There is no phone number on the site. Pages read from it; don't type a rate, day or link into a page.

The office badge (the Ω) on the maps sits on `site.office.mapArea` (`lat`, `lng`). It is approximate on purpose: keep the coordinates to 2 decimals (a test enforces it), and never put the real address there.

PocketSuite links that still start with `TODO_` are placeholders. Buttons using one fall back to the general PocketSuite page and carry a `data-placeholder` attribute, so you can find them in the page source. Replace the value with the tested link and the attribute goes away.

## Re-exporting zones

1. In Google My Maps, open **Ohm Service Map** → ⋮ → **Export to KML/KMZ** → whole map → KML.
2. Save it as `brief/Ohm Service Map.kml` (gitignored).
3. `npm run zones`
4. `npm test`
5. Commit `src/data/zones.geojson`.

- Polygon placemark names must equal the zone names in `site.ts` exactly: `Central & Southwest Springs`, `Mid-north Springs`, `North Springs`.
- There is no "out" polygon. Anywhere outside the three is out.
- Pins and other non-polygon placemarks are skipped.
- An unknown polygon name stops the script and prints the expected names.
- To rename a zone, rename it in both My Maps and `site.ts`.
- Only polygon geometry and the zone name are written to the geojson. Descriptions, notes and styles are never committed.
- The KML is gitignored (`brief/*`, `*.kml`, `*.kmz`, `*.kml.xml`). Never commit it; commit only `src/data/zones.geojson`.

## Service-area map

`/book` and `/book/<zone>` show a map the site draws itself, as inline SVG at build time. There are no map tiles, no map library and no Google map.

- It is built from `src/data/zones.geojson` (the three zones) and `src/data/osm.geojson` (major roads and towns). Re-exporting the zones (see above) updates it on the next build.
- Zone colours are the `--zone-*` tokens in `tokens.css`; the area buttons use the same ones for their swatches.
- `npm run osm` refreshes `osm.geojson` from OpenStreetMap. Run it by hand, rarely (the roads don't change), and commit the result. It exits 1 if a road or town is missing. It also writes the unlabelled minor roads (every other primary and secondary road in the box) as one feature, drawn thin and faint under the named roads.
- `osm.geojson` is © OpenStreetMap contributors, under the [ODbL](https://www.openstreetmap.org/copyright). The map shows the credit line.
- `npm run terrain` builds the shaded relief under the roads: it downloads AWS Terrain Tiles (USGS 3DEP elevation, about 60 tiles on the first run), caches them in `.cache/terrain/` (gitignored, reused on later runs) and writes `src/assets/terrain.webp` and `src/data/terrain.json`. Run it by hand, rarely, and commit both. The image covers the same box as `npm run osm`, so it doesn't change when the zones do. Credit: 3DEP data courtesy of the U.S. Geological Survey.
- Label positions are worked out at build time; `labelNudge` at the top of `src/components/ServiceMap.astro` holds the hand fixes.
- The office is marked with the bare Ω (`omega.json`'s `dMap`, a simplified outline) and the label "Ohm Office", at the point in `site.office.mapArea`. It is the same size at every zoom, and on the zone maps it links to the office.
- "Open the map in Google Maps" opens the My Maps viewer. The URL is built from `site.map` in `site.ts` (`mid`, `center`, `zoom`, now 11 so all three zones show). If the My Maps map is recreated (new ID), change `mid`.

## `/hello` entrance page

`/hello` is a full-screen welcome page: the Ω lit by a slow light, the body graphic, and the line "Take the path of least resistance". It is one big link to Home.

- **The light** is one dash that runs once clockwise round the Ω's outline from the right foot's inner corner (a 3 s lap, starting 0.4 s in), then repeats every 11 s. It's pure CSS (`ohm-lap`). Its stroke widths are in viewBox units, not pixels: `vector-effect: non-scaling-stroke` breaks `pathLength` dashes, so the light ran too fast on desktop and far too fast on phones.
- **The line** fades in at 3.4 s, as the first lap ends, and stays. It is upper case, sized so it spans exactly the Ω's width (`--omega-w`, `--line-fs`, `--line-ls` on `.hello`; the constants are DM Sans metrics for this exact string, so re-measure them if the line or the font changes).
- **The glow** is off at rest. Hover (fine pointers), keyboard focus and a click turn it on.
- **The click pause:** one small inline script holds a plain click or Enter for 0.5 s so the glow shows before the page goes to Home. Modified clicks (Ctrl, Cmd, Shift, Alt, middle button) and reduced motion skip it. Without JavaScript the link simply navigates at once, and the light and the line still work.

- **Where to use it:** print (business cards), QR codes, social bios and referrals link to `/hello`. Search, Google Maps and the Google Business Profile link to `/`, so those visitors go straight to prices and booking.
- **Use the exact lowercase URL with no trailing slash.** `/hello/` works (it redirects through `public/hello/index.html`), but the slash form costs a hop and a flash. Generate QR codes after the custom domain is live, not from the `github.io` address.
- **Why it's `noindex`, unlinked and out of the sitemap:** a full-screen splash for people arriving from search can count against the site in Google's ranking, and search visitors don't want one. `/hello` is only for people who chose to come. It can't be blocked in `robots.txt`, because Google has to crawl it to see the `noindex`.
- `npm run check:dist` enforces all of this after the build (CI runs it before publishing): the `noindex` meta, a self canonical, at most one inline `<script>` and never a `<script src>` (the JSON-LD data block aside), no mention in the sitemap or `robots.txt`, no link to it from any other page, and no splash on Home.
- `npm run omega` traces the Ω from `src/assets/icon.png` into `src/data/omega.json`, until JohnMark's SVG replaces it. To switch, put the SVG's outline path (one closed `d`) and `viewBox` in `omega.json`, with a simplified `dMap` for the maps. The path must run clockwise on screen and start at the right foot's inner corner (the script rotates the contour there: the baseline vertex where the hand cut-out meets the right foot), because the light starts and ends at the first vertex; `tests/omega.test.ts` checks it.

## Test addresses

`tests/fixtures/addresses.json` lists known addresses with their coordinates and the zone each must land in (Old Colorado City, Broadmoor Bluffs, Garden of the Gods Rd & Centennial, Briargate, Cordera, Wolf Ranch, Monument, Falcon, Fountain, east of Academy). `npm test` checks every one against the real polygons. Monument is out of the service area.

Cordera and Wolf Ranch are `todo` checks: they report as TODO, not failures, until Brian replaces the rough coordinates with geocoded addresses and removes the `todo` field.

To add one, append an entry with `label`, `query`, `lat`, `lng` and `expect` (`home`, `shared`, `north` or `out`), then run `npm test`. Coordinates marked `approximate` are interior points, not exact rooftops.

## Google key setup

Checked **2026-10-05**. Google changes pricing and console wording, so verify against the sources before relying on it.

**Key** (`ohm-site-browser`, Google Cloud Console → APIs & Services → Credentials):
- API restrictions: Maps JavaScript API and Places API (New) only.
- HTTP referrers must be **origin-wide**. Places calls send only the origin as the referrer, so a path-scoped pattern like `https://chimpanbeat.github.io/ohm-site/*` is blocked (`403 API_KEY_HTTP_REFERRER_BLOCKED`) and the site falls back to the picker.
  - `http://localhost:4321/*` (dev)
  - `https://chimpanbeat.github.io/*` (preview)
  - License day: `https://ohmprecisionbodywork.com/*`. `www` redirects to the apex, so it needs no entry.

**SKUs the site uses** (free monthly caps per SKU; there's no longer a $200 credit):

| SKU | Triggered by | Free per month | Then (per 1,000) |
|---|---|---|---|
| Autocomplete Requests | The first 12 autocomplete requests of a session that ends in Place Details Essentials, plus every request in an abandoned session | 10,000 | $2.83 |
| Autocomplete Session Usage | The 13th and later requests in a completed session | Unlimited | free |
| Place Details Essentials | Fetching the location when a visitor picks an address | 10,000 | $5.00 |
| Dynamic Maps | **Not used.** It bills only when a map is instantiated. The site draws its own SVG map; no Google map is created. | 10,000 | $7.00 |

Sources:
- https://developers.google.com/maps/documentation/javascript/session-pricing
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://developers.google.com/maps/billing-and-pricing/sku-details

**Quota caps** (Cloud Console → Google Maps Platform → Quotas → pick the API → select the quota → ⋮ / Edit → untick Unlimited → enter value → Submit):

| API | Quota name | Cap | Why |
|---|---|---|---|
| Places API (New) | `AutocompletePlacesRequest per day` | 300 | 300 × 31 = 9,300, under the 10,000 free Autocomplete Requests |
| Places API (New) | `GetPlaceRequest per day` | 100 | 3,100 a month, under the 10,000 free Place Details Essentials |
| Maps JavaScript API | `Map loads per day` | 100 | Defensive only. The site never creates a map. |

These names come from a Feb 2026 setup guide and match the brief, but Google's docs don't list per-day names. **Confirm the exact names on the Quotas page.**

**Order of operations:**
1. Try to set the caps. While the free trial runs (ending about Jan 3, 2027; check the console), the console may refuse quota edits.
2. Upgrade the billing account. If step 1 was refused, set the caps in the same sitting, straight after upgrading.
3. Add a budget alert (Billing → Budgets & alerts), for example at $1. Alerts only notify; the caps are what stop usage.
4. If the trial lapses before the upgrade, the key stops working and `/book` falls back to the map and picker. Nothing breaks.

## Licensing and wording

`licensed` in `src/data/site.ts` is `false` until Brian holds the license. Licensed-only terms ("massage therapy", "LMT", "Licensed Massage Therapist") must not appear before then.

Pages never write those terms. They call `w('key')` from `src/data/wording.ts`, which returns the unlicensed or licensed variant depending on `licensed`. Add new keys to that file when copy needs a variant.

`npm run check:wording` scans the built HTML for forbidden terms and fails the build if any appear. Run it after `npm run build`; CI does.

## License-day checklist

1. Brian has the tested PocketSuite links in `site.links` (office, home, shared, north).
2. In `src/data/site.ts`: set `licensed: true` and fill in `licenseNumber`.
3. `npm run build && npm run check:wording && npm test`.
4. Add `https://ohmprecisionbodywork.com/*` to the key's referrers (harmless to do early).
5. **DNS cutover.** Do not do this before step 2; until then the domain keeps redirecting to PocketSuite.
   1. Verify the domain with GitHub: profile **Settings → Pages → Add a domain**, then add the TXT record `_github-pages-challenge-chimpanbeat` with the value GitHub shows.
   2. In the repo's **Settings → Pages → Custom domain**, enter `ohmprecisionbodywork.com`. Do this **before** changing DNS. There is no `CNAME` file; the Actions workflow publishes the site, so GitHub ignores one.
   3. **Straight after**, in `site.ts` → `deploy`: set `site` to `https://ohmprecisionbodywork.com`, `base` to `'/'` and `live` to `true` (this also makes the site indexable). Build, run the checks, commit and push. Once the custom domain is set, Pages serves the site at the domain root and redirects `chimpanbeat.github.io/ohm-site/` there, so a build that still uses base `/ohm-site` loads no assets and every link 404s. Until DNS changes, the domain still forwards to PocketSuite, so nobody sees the gap.
   4. At Porkbun: **Domain Management → `ohmprecisionbodywork.com` → Details**.
   5. **Remove the URL forward** (trash icon on the "Current Forwards" entry in URL Forwarding).
   6. Open **DNS Records** and delete the records forwarding used: the apex `ALIAS`, any wildcard `*` CNAME, and any old apex A/AAAA records. Porkbun doesn't document exactly which records forwarding creates, so delete whatever apex, `*` and `www` web records remain. **Leave MX and TXT email records alone.**
   7. Add the new records, either with **Quick DNS Config → "Github"** (then Host `www`, answer `chimpanbeat.github.io`), or by hand with the TTL at default:
      - Apex (Host blank), four `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
      - Apex (Host blank), four `AAAA` records: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
      - `CNAME`, Host `www` → `chimpanbeat.github.io` (no repo name)
   8. Compare the result with the list above and delete duplicates. Never add a wildcard (`*`) record; it's a takeover risk. If the domain has CAA records, one must allow `letsencrypt.org`.
   9. Wait for GitHub's DNS check (up to 24 hours), then tick **Enforce HTTPS** (the certificate can take up to an hour; if "Certificate not yet created" persists, click **Remove** next to the domain, re-enter it and **Save**). With the apex and `www` both set, GitHub redirects `www` to the apex.

   DNS facts checked 2026-10-05. Sources: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site, https://kb.porkbun.com/article/64-how-to-connect-your-domain-to-github-pages, https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun
6. Verify HTTPS, then test the full booking path from a phone for each zone and for the office.

## TODO(Brian)

- Tested PocketSuite links: office, home, shared (keyword), north.
- Review the About draft in `docs/build/copy-deck.md`.
- Cordera and Wolf Ranch fixtures: replace the rough coordinates with geocoded addresses, then remove their `todo` field in `tests/fixtures/addresses.json`.
- Six differences between the brief §6 boundary descriptions and the KML polygons are listed in `docs/build/steps/6A-review-fixes-contracts.md`.
- SVG logo, if one exists.
- License number (license day).
- Set the Google quota caps, upgrade billing, add a budget alert (see above).
- Confirm which licensure fields belong in the JSON-LD on license day (`Base.astro`).
