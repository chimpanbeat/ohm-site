# 5A: SEO, contrast check, README draft

Model: sonnet
Brief: §3, §6 (README steps), §10, §11, §12, §14
Architecture: §B7

## Pinned facts (written by Opus in 3A; use them verbatim in the README)
Checked 2026-10-05. Put the "checked on" date in the README next to the Google and DNS facts.

### P1. Google SKUs the site uses
| SKU | Triggered by | Free per month | Then (per 1,000) |
|---|---|---|---|
| Autocomplete Requests | The first 12 autocomplete requests of a session that ends in Place Details Essentials, plus every request in an abandoned session | 10,000 | $2.83 |
| Autocomplete Session Usage | The 13th and later requests in a completed session | Unlimited | free |
| Place Details Essentials | `fetchFields(['location','formattedAddress'])` when a visitor picks an address | 10,000 | $5.00 |
| Dynamic Maps | **Not used.** It bills only when a map is instantiated. The service-area map is a My Maps `<iframe>`, not Maps JS. | 10,000 | $7.00 |

Google now gives per-SKU free monthly caps rather than the old $200 credit.

Sources:
- https://developers.google.com/maps/documentation/javascript/session-pricing
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://developers.google.com/maps/billing-and-pricing/sku-details

### P2. Quota caps (Cloud Console → Google Maps Platform → Quotas → pick the API → select the quota → ⋮ / Edit → untick Unlimited → enter value → Submit)
| API | Quota name | Cap | Why |
|---|---|---|---|
| Places API (New) | `AutocompletePlacesRequest per day` | 300 | 300 × 31 = 9,300, under the 10,000 free Autocomplete Requests |
| Places API (New) | `GetPlaceRequest per day` | 100 | 3,100 a month, under the 10,000 free Place Details Essentials |
| Maps JavaScript API | `Map loads per day` | 100 | Defensive only. The site never creates a map. |

The quota names come from a Feb 2026 setup guide and match the brief. Google's docs don't list per-day names. **The README must tell Brian to confirm the exact names on the Quotas page.**

### P3. Order of operations (brief §14)
1. **Try to set the caps** in P2. While the free trial runs (ending about Jan 3, 2027; check the console), the console may refuse quota edits.
2. **Upgrade** the billing account. If step 1 was refused, set the caps **in the same sitting, immediately after upgrading**.
3. **Add a budget alert** (Billing → Budgets & alerts), for example at $1. Alerts only notify; the caps are what stop usage.
4. If the trial lapses before the upgrade, the key stops working and `/book` falls back to the map and picker (§6). Nothing breaks.

### P4. GitHub Pages custom domain (docs.github.com, checked 2026-10-05)
- **Apex A records (all four):** `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- **Apex AAAA records (all four):** `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
- **`www`:** a CNAME to `chimpanbeat.github.io` (no repo name). With both apex and `www` configured, GitHub redirects `www` → apex automatically.
- **ALIAS:** an apex ALIAS/ANAME → `chimpanbeat.github.io` is GitHub's allowed alternative to the A/AAAA records. Prefer the A/AAAA records (explicit, documented IPs).
- **No CNAME file.** The site publishes from a custom Actions workflow, so GitHub creates none and ignores any that exists. The domain is set in repo **Settings → Pages → Custom domain**.
- **Order (GitHub):**
  1. Verify the domain: profile **Settings → Pages → Add a domain**, then a TXT record `_github-pages-challenge-chimpanbeat` with the value GitHub shows. This guards against takeover.
  2. Add the custom domain in the repo's Pages settings **before** changing DNS.
  3. Change DNS.
  4. Wait for the DNS check.
  5. Tick **Enforce HTTPS**.
- **Timing:** DNS can take up to 24 hours. HTTPS can take **up to an hour** after the domain is configured. If "Certificate not yet created" persists, click **Remove** next to the domain, re-enter it and **Save**.
- **CAA:** if the domain has any CAA records, one must allow `letsencrypt.org`.
- **Never** add a wildcard (`*`) record, because of the takeover risk.

### P5. Porkbun steps
1. Log in → **Domain Management** → `ohmprecisionbodywork.com` → **Details**.
2. **Remove the URL forward.** In the URL Forwarding section, delete the current forward (the trash icon on the "Current Forwards" entry).
3. **Delete the old records.** Open **DNS Records** (the edit icon, or hover the domain → **DNS**). Delete any records the forward used:
   - the apex `ALIAS`
   - any wildcard `*` CNAME
   - old apex A/AAAA records

   Porkbun's KB doesn't document exactly which records forwarding creates, so tell Brian to delete whatever apex/`*`/`www` web records remain. **Leave MX/TXT email records alone.**
4. **Add the new records.** Either:
   - **Quick DNS Config → "Github"** → OK, then enter Host `www` and answer `chimpanbeat.github.io` in the pop-up, or
   - add them manually: four `A` and four `AAAA` records with Host blank (apex) using the P4 values, plus `CNAME` with Host `www` → `chimpanbeat.github.io`. Leave the TTL at its default.
5. Check the result against P4. Quick Config should produce exactly those records; delete any duplicates.

Sources:
- https://kb.porkbun.com/article/64-how-to-connect-your-domain-to-github-pages (updated July 16 2026)
- https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun

## Files to create or modify
- `src/layouts/Base.astro`:
  - Add the OG image: a default 1200×630 `getImage` crop of `about-landscape.jpg`, absolute URL. Add `og:title`, `og:description`, `og:url`, `og:type`, and `twitter:card=summary_large_image`.
  - Emit the JSON-LD per §B7 on every page, built from `site`. `priceRange` is computed from the rates.
- `src/pages/robots.txt.ts`, `src/pages/sitemap.xml.ts`: per §B7, driven by `indexable`.
- `scripts/check-contrast.mjs`: parses the hex tokens from `tokens.css` and asserts these pairs. It exits 1 on failure.

  | Pair | Minimum |
  |---|---|
  | cream on green-900 | 4.5 |
  | cream on green-700 | 4.5 |
  | ink on cream | 4.5 |
  | cream on terra-700 | 4.5 |
  | terra-500 on green-900 | 3.0 (large text only) |

  Add `"check:contrast"` to `package.json` scripts. This is the only `package.json` edit allowed, and it's a script, not a dependency.
- `README.md`, with these sections:
  1. What this is: one paragraph.
  2. Local dev: Node 24, `npm ci`, `.env` from `.env.example`, `npm run dev` on port 4321 and why.
  3. Scripts table.
  4. Deploy: the Actions workflow, enabling Pages, and the `PUBLIC_GOOGLE_MAPS_KEY` repo **variable**.
  5. Updating rates, days and links: everything is in `src/data/site.ts`. Explain placeholder links and `data-placeholder`.
  6. Re-exporting zones: the My Maps export → KML → `brief/Ohm Service Map.kml` → `npm run zones` → `npm test`. Placemark names must start with Home, Shared or North. Note that descriptions are never committed.
  7. Test addresses: the fixture and how to add one.
  8. Google key setup: referrers, API restrictions, SKUs, quota names and caps, and the order cap → upgrade → budget alert. Taken from Pinned facts.
  9. Licensing and wording: `licensed`, `w()`, and `check:wording`.
  10. License-day checklist (§10.3), including the DNS cutover: Porkbun steps from Pinned facts, removing the URL forward, `www` → apex, enforcing HTTPS, setting `site.deploy` to the custom domain with base `/` and `live: true`, and adding the production referrer to the key.
  11. TODO(Brian) list.

## Constraints
- README facts about Google and GitHub DNS come **only** from Pinned facts. Don't write IPs or quota names from memory.
- No new dependencies.

## Done when
1. `npm run build`, `npm test`, `npm run check:wording` and `npm run check:contrast` all pass.
2. `dist/robots.txt` disallows everything (`indexable` is false), and `dist/sitemap.xml` lists 4 absolute URLs under `/ohm-site/`.
3. The JSON-LD in `dist/index.html` parses as JSON and has no `address` key.
4. `og:image` is an absolute URL to a 1200×630 image.

## Report
(Sonnet)

## Review
(Opus)
