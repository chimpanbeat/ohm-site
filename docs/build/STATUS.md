# Build status

Tier: M · Method: v3.2 · Profile: static-site · Repo: public · Launch: none set (the license is active since Oct 12, 2026; launch waits on I-001 and I-018)

The first row that isn't `done` or `dropped` is the next step; Brian runs its Command after `/clear`. This file is the only source of progress; the master list's Build status is derived from it. Items (I-###) and Method feedback live in the master list, not here. A slip of more than a day gets a note to Brian on what it does to launch.

States: `todo` · `doing` · `blocked` · `done` · `dropped`

| Step | Scope | Effort | Command | State | Commit |
|---|---|---|---|---|---|
| 0–11R | Method v1 build (history below) | — | — | done | f13b4a3 |
| U | Upgrade to method v3.2, tier M (I-042) | medium | — | done | (this commit) |
| 12 | I-035: licensed wording (wording.ts, site.ts, footer, About, Home, BRIEF §7, check:wording). Contract change: the architect writes the step file | high | /next-high | todo | |
| 13 | I-040: rename the "home" zone to Central (keys, booking tags, wording, check:wording) | medium | /next | blocked: I-040 (Brian renames the PocketSuite tags first) | |
| 14 | I-037: /client-policies page and PDF from one source text | high | /next-high | blocked: I-037 (policy text from Brian) | |
| 15 | I-041: payment methods and the card surcharge notice (Book, Services & Pricing, /client-policies) | medium | /next | blocked: I-041 (wording vs the statute); after 14 | |
| V | Visual pass with Brian at 375 and 1280 px | medium | /next | todo | |
| PL | Pre-launch review against AC-1–AC-7, Lighthouse | high | /next-high | todo | |
| L | Launch: I-001 tested links, I-018 domain cutover, `deploy.live` on (`docs/runbooks/launch.md`) | high | /next-high | blocked: I-001, I-018 | |
| F1 | I-038: /faq page | — | — | blocked: I-038 (Brian opens it after launch) | |
| F2 | I-039: /hello breathing text | — | — | blocked: I-039 (not designed) | |

## History (method v1)
Rows from the v1 build, unchanged. The Model column is from the v1 Opus/Sonnet split.

| ID | Model | Effort | Step | State | Commit | Notes |
|---|---|---|---|---|---|---|
| 0 | opus | high | Architecture, contracts, playbook | done | (see git log) | |
| 1A | sonnet | medium | Scaffold: fonts, icons, global CSS, layout, stub pages, wording check, CI | done | 0188a05 | |
| 1R | opus | medium | Review Phase 1, commit, push, Pages setup with Brian | done | 37e4a3f | |
| 2A | sonnet | high | Booking router with placeholder zones (no Google) | done | fdb5bc0 |
| 2R | opus | high | Review Phase 2, commit | done | fdb5bc0 |
| 3A | opus | high | Research: Google Places (New) + GitHub Pages DNS; pin API spec; fixture coordinates | done | 4a1ecfc | |
| 3B | sonnet | high | Real zones (KML script), autocomplete combobox, fallback, fixture tests | done | ebdb0ae | |
| 3R | opus | high | Privacy and cost review, live test, commit | done | ebdb0ae | |
| 4A | opus | high | Copy deck | done | 30da510 | |
| 4B | sonnet | medium | Content pages from copy deck | done | 30da510 | |
| 4R | opus | medium | Wording, voice, and design review, commit | done | 30da510 | |
| 5A | sonnet | medium | SEO, OG, sitemap/robots, contrast check, README draft | done | 057f968 | |
| 5R | opus | high | Final review: Lighthouse, §12 checklist, README verification, commit, launch list | done | 057f968 | About CLS fix in follow-up commit |
| 6A | opus | high | Site review fixes (Oct 5): brief, contracts, copy, 6B step file | done | 8e896d7 | Brian asked for one commit at the end |
| 6B | sonnet | medium | Site review fixes: components, zones script, tests, README | done | 8e896d7 | |
| 6R | opus | high | Review Phase 6, live map check, commit, push | done | 8e896d7 | Map title bar #125245, white 9.06:1. Glossary spacing nits fixed. |
| 7A | opus | high | Brian's Oct 6 review: contracts, map architecture, copy, 7B step file | done | | Contract edits leave the build broken until 7B. Commit with Phase 7 |
| 7B | sonnet | high | SVG service map, booking flow, pricing page, contact swap, copy | done | e5d8eaa | Deviations accepted in 7R (step Review). Screenshots in `docs/build/screens/` (gitignored) |
| 7R | opus | high | Review Phase 7, live map check with Brian (SVG map go/no-go), commit, push | done | e5d8eaa | Brian: **go** on the SVG map (Oct 6). Review fixes: swatch colours, OSM stub filter, stale comment |
| 8A | opus | high | Brian's review of Phase 7: contracts, design (resistor divider, map-tinted buttons, deselect, office map), copy, 8B step file | done | 1d5045a | Items 1–12 (incl. Home "Who it's for", hero subline, and the About bio, Brian's text). Brian: "that's it for changes" |
| 8B | sonnet | high | Map polish (tinted buttons, deselect, linked hover, Google Maps button), office map, resistor divider + spacing, copy | done | 1d5045a | Deviations accepted in 8R (step Review) |
| 8R | opus | high | Review Phase 8, commit, push | done | 1d5045a | Opus fixed: tokens comment, office-map label nudges and clipped place label. Focus stays on the card heading |
| 9A | opus | high | Brian's review of Phase 8: office badge + zoom, terrain, minor roads, clickable outside, dimming, title spacing, About order, scrollbar shift, copy; 9B step file | done | 726290a | Batches 1–5 (items 1–11; batch 4's Home splash superseded by batch 5: `/hello` page → 9C). Brian: "go" (Oct 6) |
| 9B | sonnet | high | Office badge, terrain + minor roads, clickable outside, dimming, layout fixes, copy | done | 726290a | Deviations accepted in 9R. Terrain image was broken (3-channel blur buffer); Opus fixed `make-terrain.mjs` and regenerated |
| 9C | sonnet | high | `/hello` entrance page (no JS, noindex), traced Ω (`npm run omega`), `check:dist` in CI, trailing-slash redirect; Part 2: map office mark = bare Ω + "Ohm Office" | done | 726290a | After 9B. Step file `9C-hello.md`. Part 2 added after Brian saw 9B's badge |
| 9R | opus | high | Review Phase 9 (9B + 9C; terrain strength and the splash with Brian), delete `--zone-muted` and `radiusKm`, commit, push | done | 726290a | Opus fixed: terrain bug, `/hello` scrollbar gutter. Terrain opacity 0.6 pending Brian's look |
| 10A | opus | high | Brian's review of Phase 9: `/hello` motion and line, office mark and map buttons, hover dimming, spacing; 10B step file | done | 517a029 | Batches 1–2 + line pick (C, Ω width). Brian: "go" (Oct 6). |
| 10B | sonnet | high | `/hello` light/line/glow/click pause, Ω start rotation, office mark + map buttons, hover dimming, site-wide spacing | done | 517a029 | Step file `10B-hello-map-spacing.md` Deviations accepted in 10R |
| 10R | opus | high | Review Phase 10 (`/hello` motion with Brian), commit, push | done | 517a029 | Opus fixed: `/hello` hover glow scoped to the Ω (the page is one link) |
| 11A | opus | high | Brian's review of Phase 10: `/hello` speed (and the mobile speed bug), spacing, About photo, Why Ohm copy; 11B step file | done | f13b4a3 | Batches 1–2. Cause of the fast phone light: `non-scaling-stroke` + `pathLength`. Why Ohm copy done by Opus |
| 11B | sonnet | medium | `/hello` light fix (no non-scaling stroke) and 3s lap, tighter spacing, About photo at text width | done | f13b4a3 | Step file `11B-light-fix-spacing-about.md`. Accepted in 11R; Home +16px at 375 is the Why Ohm paragraph split |
| 11R | opus | medium | Review Phase 11, commit, push | done | f13b4a3 | No changes needed |

## §12 acceptance (5R, 2026-10-05)
| Criterion | Result | Evidence |
|---|---|---|
| Four zones + office route to the config link; out-of-region shows contact only | **Pass** (links are placeholders) | `dist/book/{home,shared,north}.html` and the `/book` office card use `bookingUrl()`. With `TODO_` links they fall back to the general PS page with `data-placeholder`. `out.html` has only tel/sms/mail. `site.test.ts` covers routing. Pending: Brian's tested PS links. |
| Test addresses committed as a fixture and documented | **Pass** | `tests/fixtures/addresses.json` (all 8 brief addresses), `zones.test.ts` against the real polygons, README "Test addresses". |
| Map and manual zone buttons work without JS or the key | **Pass** | `/book` ships the My Maps iframe and plain `<a>` links to `/book/{home,shared,north,out}` in HTML. 3R verified live that the field hides and the picker shows with a blocked key. |
| `check:wording` passes with `licensed: false` | **Pass** | Locally and in CI (deploy.yml runs it before publishing). |
| Lighthouse mobile ≥90 (all four categories) | **Pass, except SEO 66 (expected)** | Local Lighthouse 13.5 on the live preview: perf/a11y/best-practices 100/100/100 on `/`, `/services`, `/book`; `/about` was 91 perf (CLS 0.2, art-directed portrait unsized) → fixed, 100 / CLS 0. SEO's only failing audit is `is-crawlable`, the deliberate `noindex`. It lifts when `indexable` turns true on license day. (PSI API was out of keyless quota.) |
| No hardcoded rates, days, links or zone names outside `src/data/` | **Pass** | grep for rates, day names, `pocketsuite` and zone names outside `src/data/`: none. No raw hex outside `tokens.css`. |
| README covers dev, deploy, rates/links, zones, Google key, DNS cutover | **Pass** | `README.md` §§ Local dev → License-day checklist. Google/DNS facts match Pinned facts, re-checked live in 5R. |

## Change log
Every applied item and every change to ARCHITECTURE, contracts or the plan, newest first: `- <date> (<I-### or step>): what changed. Files: …`
- 2026-10-29 (I-042): upgraded from method v1.x to v3.2, tier M (UPGRADE.md notes v2.0–v3.2). Retired HANDOFF.md, incoming-handoff.md, the STATUS T-/D-sections and the model gate; items live in the master list as I-###. Added the v3.2 harness (.claude settings, hooks, agents, skills), check.yml CI, dependabot, RECOVERY.md, the step template, the runbooks, tools (check-secrets, method-metrics, shots) and `npm run check`; Playwright as a devDependency (Brian, Oct 29). Stack rules in ARCHITECTURE §D; BRIEF §12 numbered AC-1–AC-7; plan re-made for tier M (rows 12–F2). The public business email lines carry `secrets-scan: allow`. `tools/shots.mjs` gains `--base` (the site serves under `/ohm-site`) and resolves `<route>.html` before `<route>/index.html` as Pages does (the `/hello/` redirect page made `/hello` loop); worth taking into the template. No app code or deploy change. Files: CLAUDE.md, .gitignore, .nvmrc, package.json, package-lock.json, .claude/**, .github/workflows/check.yml, .github/dependabot.yml, tools/*, brief/BRIEF.md, docs/build/{ARCHITECTURE,STATUS,RECOVERY}.md, docs/build/steps/_template.md, docs/runbooks/*, src/data/site.ts (comment only); deleted docs/build/{HANDOFF,incoming-handoff}.md.
## Architecture changes
(Opus logs any mid-build change to ARCHITECTURE.md or step files here.)
- 2026-10-09 (I-033): asset: email-signature logo at `public/img/email-sig-logo.png`, from Brian's `ohm-logo-stacked@2x.png` resized to 144×174 (displayed at 72×87). Unlinked; path must stay stable; replace in place if I-009 changes the logo. Until the DNS cutover it serves at `chimpanbeat.github.io/ohm-site/img/email-sig-logo.png`; the ohmprecisionbodywork.com URL works after cutover. Files: public/img/email-sig-logo.png, docs/build/ARCHITECTURE.md, docs/build/STATUS.md, docs/build/incoming-handoff.md. <!-- secrets-scan: allow (a file name, not an address) -->
- 2026-10-09 (I-032): fact: the planning chats moved to their own Claude Project, "Ohm Site". CLAUDE.md → Messaging with the planning chats now names it; no other repo line named the old Project. The master list keeps its name and link. Files: CLAUDE.md, docs/build/STATUS.md, docs/build/incoming-handoff.md.
- 2026-10-08 (I-028): planning-chat messaging installed: `docs/build/incoming-handoff.md` (down), STATUS "Open TODO(Brian)" with T-IDs and new "Needs a decision" (I-019–I-027) (up), `CLAUDE.md` → Messaging with the planning chats, pointer lines in HANDOFF.md §2 and STATUS.md. Eight design TODOs moved to Needs a decision; I-017, I-018 and I-027 added. Stale lines fixed: BRIEF §6 key referrer; README TODO list now points to STATUS. Files: CLAUDE.md, README.md, brief/BRIEF.md, docs/build/HANDOFF.md, docs/build/STATUS.md, docs/build/incoming-handoff.md.
- 2026-10-08 (I-029): asset, blocks license-day: tested PocketSuite links for office, home, shared (keyword) and north come from Brian (I-001). Until then booking buttons fall back to the general PS page. Recorded on I-001. Files: docs/build/STATUS.md.
- 2026-10-08 (I-030): asset, blocks license-day: the license number comes from Brian on license day (I-011); `licensed` stays false until then. Recorded on I-011. Files: docs/build/STATUS.md.
- 2026-10-08 (I-031): risk, blocks license-day: the licensure fields for the JSON-LD are undecided (I-027); the code publishes the license number only. Recorded as I-027. Files: docs/build/STATUS.md.
- 2026-10-06 (final audit, Brian's go): `/book/[zone]` pages get their own `title` and `description`, built from `site.ts` (copy deck → Book). `/book` keeps its own. The audit found nothing else to fix.
- 2026-10-06 (after 11R, Brian's quick fix): no hover tooltips on the maps. The map's name moves from the svg `<title>` to a `hidden` `<span>` that `aria-labelledby` still reads; the office mark's `<title>` is gone (the link is `aria-hidden` and the visible label says "Ohm Office") (ARCHITECTURE §B4).
- 2026-10-06 (11A): Phase 11 added for Brian's review of Phase 10. `/hello` light without `non-scaling-stroke` (it broke `pathLength` dashes: 1.23× fast on desktop, 2.5× on phones), 3s lap; sections 32/48, `.section--end`, hero and footer padding; About photo at the text measure, 16:9; Why Ohm split and linked (ARCHITECTURE §C 11A).
- 2026-10-06 (10R): `/hello` hover glow is `.hello-omega:hover`, not `.hello:hover` (ARCHITECTURE §B8).
- 2026-10-06 (10A): Phase 10 added for Brian's review of Phase 9. Spacing (`--s-10`), office mark position and size, `Show mobile service areas`, hover dimming, dark map buttons, `/hello` motion and line, one inline script on `/hello` (`check:dist` rule 7 relaxed) (ARCHITECTURE §C 10A).
- 2026-10-06 (9R): `--zone-muted` and `office.mapArea.radiusKm` deleted (ARCHITECTURE §B1, §B3). `make-terrain.mjs`: take one channel back after the blur (sharp returns three), blur 1, `alphaQuality` 50. `/hello` turns the scrollbar gutter off for itself.
- 2026-10-06 (after 9B): Brian wants the map office marker as just the Ω, larger, labelled "Ohm Office" on all views. Added to 9C as Part 2 (uses the traced path; `omega.json` gains `dMap`). ARCHITECTURE §B4 "Office mark".
- 2026-10-06 (9A, batch 5): the splash moves off Home to its own page, `/hello` (noindex, unlinked, no JS), for card, QR and social traffic; reason: Google's intrusive-interstitial signal and search visitors' friction. Step 9C rewritten as `steps/9C-hello.md` (the batch-4 `9C-splash.md` was never run and is deleted). ARCHITECTURE §B8 rewritten; `check:dist` added to CI.
- 2026-10-06 (9A, batch 4): Home splash added as step 9C. 9R reviews 9B and 9C together.
- 2026-10-06 (9A): Phase 9 added for Brian's review of Phase 8. Office badge (Ω) replaces the circle and links to the office from the service maps; office map at the Central & SW zoom; terrain (`npm run terrain`, USGS 3DEP) and minor roads; `out` map area + `--zone-out-tint`; dim instead of grey; first-section padding halved; `scrollbar-gutter: stable`; About H1 first; boundary line + email; label colon (ARCHITECTURE §C 9A).
- 2026-10-06 (8R): ServiceMap office mode uses its own `officeNudge` table (full-map nudges are in full-map units), and drops places whose anchor is outside the view. 8B Done-when 6k amended: focus stays on the card heading after a pick (§B4).
- 2026-10-06 (8A): Phase 8 added for Brian's review of Phase 7. Resistor zigzag H1 divider, map-tinted area buttons (`--zone-*-tint`), deselect + linked hover, office map (`site.office.mapArea`, `ServiceMap focus="office"`, `mapview.viewAround`/`unitsPerKm`), Google Maps button, copy (`wording.notSpa`, "electrical engineer", Om) (ARCHITECTURE §C 8A).
- 2026-10-06 (7R): `fetch-osm.mjs` drops isolated road stubs (pieces of one road within 0.3 km form a cluster; clusters under 2 km are dropped). Zone swatches use `color-mix(… 35%, var(--bg-light))`, the colour each zone shows on the map.
- 2026-10-06 (7B unblock): §B5 OSM box → `38.63,-105.09,39.17,-104.54`. `Security-Widefield` = mean of OSM `Security` + `Widefield`. `fetch-osm.mjs` joins ways before clipping (3,232 → 571 vertices). ServiceMap draws everything with no second clip. Decisions in the 7B Report.
- 2026-10-06 (7A): Phase 7 added for Brian's Oct 6 review. Self-drawn SVG map (zones + OSM roads/places, `npm run osm`) replaces the My Maps iframe; the My Maps viewer stays as a link. A Maps JS map was drafted first, then dropped to avoid Dynamic Maps billing (rollback design kept in the 7A step file). `/pricing` + `PriceTable`, glossary removed, phone removed, `site.contact`, `--zone-*` tokens, `bboxOf` (ARCHITECTURE §C 2026-10-06).
- 2026-10-05 (6A): Phase 6 added for Brian's site review. Map URLs built from `site.map` (adds `noprof`, `ehbc` = green-700), `outOfRegionFeeNote`, new `glossary.ts` + `Glossary`, zones script matches KML names exactly against `site.zones[key].name` (ARCHITECTURE §A1, §B1–B3, §B5).
- 2026-10-05: added `site.mapViewerUrl`; MapEmbed adds an "Open the map in Google Maps" link (ARCHITECTURE §B3, §C).
- 2026-10-05: added an `Effort` column to STATUS. Every handoff message names model and effort (HANDOFF §1, §3, §4).
- 2026-10-05 (1R): `astro.config.mjs` `build.format` changed from `directory` to `file`. Pages answered `/services` with a 301 to `/services/`, so every nav click took an extra hop. `Base.astro` strips `.html` / `index.html` from the canonical. Updated the dist paths in the 2A and 4B checks. 5A's sitemap must use clean URLs.
- 2026-10-05 (2R): ARCHITECTURE §B3/§B4 now record the 2A copy Opus approved (OfficeCard heading, travel-fee line, `/book/[zone]` back links).
- 2026-10-05 (3A): Google loader → direct script tag; `zones.geojson` imported via `?raw` (ARCHITECTURE §B4, 3B step).
- 2026-10-05 (3R): a bad key doesn't fire `gm_authFailure` (no map on the page). The field disappears on the first query instead. Amended 3B §G4 and Done-when 7, and ARCHITECTURE §B4.
- 2026-10-05 (3R): key referrers must be origin-wide (Places sends origin-only Referer). Added 5A §P3a and corrected the 3B G1 note.
- 2026-10-05 (4A): new wording key `training` (About training sentence; the school's name contains "Massage Therapy", so it appears only in the licensed variant). `check:wording` now strips the exact scope-note sentence before the medical-word scan. Before, "treatment" in that sentence fell outside the allowlist window and warned.
- 2026-10-05 (after 6R): the glossary was removed from About at Brian's request. It stays on Services only (copy deck → About).
