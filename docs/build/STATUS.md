# Build status

Run the model gate (`HANDOFF.md` §1) before doing anything. The **first row that isn't `done`** is the next step. Every handoff names both the model and the effort level from its row. A `blocked` row always goes to Opus.

States: `todo` · `in-progress` · `review` · `changes-requested` · `blocked` · `done`

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
| 5A | sonnet | medium | SEO, OG, sitemap/robots, contrast check, README draft | review | | |
| 5R | opus | high | Final review: Lighthouse, §12 checklist, README verification, commit, launch list | in-progress | | |

## Open TODO(Brian)
- [ ] Tested PocketSuite links: office, home, shared (keyword), north. Until then, buttons fall back to the general PS page.
- [x] Google My Maps URL (supplied Oct 5; embed and viewer forms in `site.ts`).
- [x] Monument: out for now, as possible future expansion. Removed from the zone name, footer and `areaServed` (Oct 5).
- [x] North zone: the polygon is authoritative. The descriptions in `site.ts` and the brief were rewritten to match (Oct 5).
- [x] Rate label is now "Initial assessment + session" (Oct 5).
- [x] Google key referrer (fixed by Brian, verified live Oct 5): change `https://chimpanbeat.github.io/ohm-site/*` to `https://chimpanbeat.github.io/*`. Places calls send only the origin, so on the live preview the field is blocked and falls back to the picker (found in 3R; 5A §P3a).
- [ ] Review the About draft (`docs/build/copy-deck.md` → About). It's built only from brief §8; paragraphs 1 and 4 put those facts in your voice.
- [ ] Is the "Initial assessment + session" required for first-time clients? If yes, Services gets one line saying so.
- [ ] SVG logo, if one exists (PNGs work, but an SVG would be crisper).
- [ ] License number (license day).

## Architecture changes
(Opus logs any mid-build change to ARCHITECTURE.md or step files here.)
- 2026-10-05: added `site.mapViewerUrl`; MapEmbed adds an "Open the map in Google Maps" link (ARCHITECTURE §B3, §C).
- 2026-10-05: added an `Effort` column to STATUS. Every handoff message names model and effort (HANDOFF §1, §3, §4).
- 2026-10-05 (1R): `astro.config.mjs` `build.format` changed from `directory` to `file`. Pages answered `/services` with a 301 to `/services/`, so every nav click took an extra hop. `Base.astro` strips `.html` / `index.html` from the canonical. Updated the dist paths in the 2A and 4B checks. 5A's sitemap must use clean URLs.
- 2026-10-05 (2R): ARCHITECTURE §B3/§B4 now record the 2A copy Opus approved (OfficeCard heading, travel-fee line, `/book/[zone]` back links).
- 2026-10-05 (3A): Google loader → direct script tag; `zones.geojson` imported via `?raw` (ARCHITECTURE §B4, 3B step).
- 2026-10-05 (3R): a bad key doesn't fire `gm_authFailure` (no map on the page). The field disappears on the first query instead. Amended 3B §G4 and Done-when 7, and ARCHITECTURE §B4.
- 2026-10-05 (3R): key referrers must be origin-wide (Places sends origin-only Referer). Added 5A §P3a and corrected the 3B G1 note.
- 2026-10-05 (4A): new wording key `training` (About training sentence; the school's name contains "Massage Therapy", so it appears only in the licensed variant). `check:wording` now strips the exact scope-note sentence before the medical-word scan. Before, "treatment" in that sentence fell outside the allowlist window and warned.
