# 5A: SEO, contrast check, README draft

Model: sonnet
Brief: §3, §6 (README steps), §10, §11, §12, §14
Architecture: §B7

## Pinned facts (written by Opus in 3A; use them verbatim in the README)
> _3A has not run yet. If this section is still empty, stop and escalate._

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
