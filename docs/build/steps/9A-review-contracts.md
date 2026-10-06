# 9A: Brian's review of Phase 8: contracts, map design, layout, copy

Model: opus
Source: Brian's notes after the Phase 8 preview (Oct 6, 2026).

## Item map
| # | Brian's item | Where it landed |
|---|---|---|
| 1a | Office map too zoomed in for its level of detail | The office map uses the same view as the Central & Southwest zoom (`viewFor(bboxOf(zones,'home'))`, widened to include the office) (§B4 "Office map") |
| 1b | Put the omega logo over the office area | The circle is replaced by an **office badge**: the Ω icon (`icon.png`) on a cream disc with a terracotta ring, counter-scaled like the pin. Label `My office is in this area` stays under it on the office map (§B4 "Office badge") |
| 1c | The omega on the mobile maps too, linking to the office | The same badge on every zone-mode map. It's an SVG `<a>` → `/book/office`; on `/book`, book.ts intercepts it and switches to "At my office" (§B4 state machine `office link`) |
| 1d | An extra layer of road detail | `npm run osm` adds unlabelled **minor roads** (every `primary`/`secondary` way in the box that isn't one of the named roads), drawn thin and faint under the named roads. Static maps clip roads to their view, so the extra data mostly lands on the one zoomable map (§B4 "Layers", §B5) |
| 1e | A little terrain shading, like Google's default | New `npm run terrain`: a hillshade of USGS 3DEP elevation (AWS Terrain Tiles), baked into `src/assets/terrain.webp` as black-with-alpha shadow, drawn over the zone fills and under the roads. Credit line gains "Terrain: USGS 3DEP" (§B4, §B5) |
| 2 | Too much space between the header and the page title | The first section on every page has half the top padding: `--s-8` mobile, `--s-12` desktop (was `--s-16` / `--s-24`). Home's hero is unchanged (§A3) |
| 3 | About: title at the top like other pages, then picture, then bio | `about.astro` order: H1, `<picture>`, bio (§A5) |
| 4 | Book page shifts right compared with other pages | Cause: `/book` loads short (both sections stay hidden until a radio is picked), so it has no scrollbar while the other pages do, and the centred layout moves by half a scrollbar. Fix: `html { scrollbar-gutter: stable; }` (§A3) |
| 5 | Boundary line: "chat with me or send me an email" | Copy deck → Book; two links (chat, `mailHref`) |
| 6 | Punctuation after "Enter your address" | `Not sure? Enter your address:` (a colon, not a semicolon: it introduces the field) |
| 7 | Dim instead of grey; "outside" as a clickable map area with the same highlight and linking | Muted zones keep their tint at reduced opacity. New `out` map area (everything outside the zones) with `--zone-out-tint`: shown on hover/hot and when chosen; clicking it chooses `out`; chosen `out` dims all three zones. The `out` button follows the same ring/dim/hot rules (§B3, §B4) |

**Batch 2 (Oct 6):**

| # | Brian's item | Where it landed |
|---|---|---|
| 8 | Pricing table: header text too small; align Session / At my office / At your place | `PriceTable` header cells at `--fs-body` (was `--fs-small`), `vertical-align: top`, so the three labels share one line and the "includes $25 travel" note hangs under "At your place" (§B3) |
| 9 | Services: office/mobile block first, asterisk on the travel fee, then the "See rates and the travel fee" link; "Session types" → "Specialties" with Brian's intro; "plays a big role"; Pricing section removed | Copy deck → Services (cream band order: office/mobile → footnote link → Specialties → scope note) |

**Batch 3 (Oct 6):**

| # | Brian's item | Where it landed |
|---|---|---|
| 10 | Header logo bigger | Full logo 240px wide on desktop (was 180), 200px on tablet, 130px compact (was 110); the icon-only logo 48px (was 40). Header height unchanged (64px; a 240px logo is ~43px tall). Sonnet re-measures the breakpoints so nothing overflows (§A4) |
| 11 | Why "Ohm": say the omega is the ohm's symbol | Copy deck → Home "Why Ohm": `Its symbol is the Greek letter omega (Ω), the shape in my logo.` after the first sentence |

**After 9B (Oct 6): office mark.** Brian saw the 9B badge and wants just the Ω, larger, labelled "Ohm Office" on all views. Opus put it in **9C Part 2**, since 9C runs next on Sonnet and makes the traced path it needs: a bare traced Ω (`omega.json` `dMap`, simplified for map size) with a cream halo, ~110 map units wide (~38px on a phone, up from a 23px disc), and the "Ohm Office" label on every map, the office map included. Other labels yield to it. This answers 9B's "badge too small" question.

**Batch 5 (Oct 6): the splash moves to `/hello`. This supersedes batch 4's overlay.** Brian's decision: Home has no overlay and stays a normal page; the splash becomes its own page, `/hello`, an entrance for card, QR, social and referral traffic. Rationale: Google's intrusive-interstitial signal (a full-screen splash on arrival from search, mobile and desktop) and the friction it adds for search visitors who want prices and booking. Search, Maps and the Google Business Profile link to `/`; printed materials, QR codes and social bios link to `/hello`. The batch-4 overlay was never built, so nothing needs undoing in code. The old `9C-splash.md` is deleted and replaced by **`9C-hello.md`**.

What carries over from batch 4: the traced Ω (`npm run omega`), the motion design, reduced motion, hover only for fine pointers, the inset focus ring, the visually hidden name prefix (WCAG 2.5.3; Brian's spec asks for an `aria-label`, which would fail it), and the graphic and Ω defaults. What's dropped: `:target`, the scroll lock, `#home`, `/#home` links, `splash.ts`, the head script, `sessionStorage` and `inert`. `/hello` has no JavaScript at all.

Opus's decisions for batch 5:
- **`noindex` that survives launch:** `Base`'s existing `noindex` prop already emits the robots meta regardless of `indexable`. `/hello` sets it in the page, and a new `npm run check:dist` (run in CI before deploy, with its own test) fails the build if `/hello` ever lacks it, gets a foreign canonical, appears in the sitemap or robots.txt, or is linked from another page.
- **Canonical:** `Base`'s self-referencing canonical stays (Brian: omit or self-reference).
- **robots.txt:** pre-launch it disallows the whole site, `/hello` included. That's expected and allowed: the whole site is blocked anyway. After launch it's `Allow: /`, and the check makes sure `/hello` is never singled out.
- **Trailing slash:** GitHub Pages serves `/services` but 404s `/services/` (checked live Oct 6). A card printed with `/hello/` would break, so `public/hello/index.html` is a no-JS meta-refresh to `../hello` (noindex).
- **No header or footer on `/hello`:** `Base` gets a `bare` prop rather than a second layout, so the head (meta, fonts, OG) stays in one place.
- **Title and description:** `/hello` is noindex, but it's what a social bio link previews, so it carries real OG text (copy deck → Hello). TODO(Brian) to confirm.
- **Home hero proposal:** written in `9C-hello.md` as a TODO(Brian), not built.

**Batch 4 (Oct 6): home splash. *Superseded by batch 5; kept for the record.*** Brian pasted a full spec (CSS-first overlay on Home: dark green, body graphic, a large Ω, a slow pulse, a light that runs once along the Ω's outline, "Take the path of least resistance" at 3s, enter by click/tap/Enter via `#home` and `:target`, deep links skip it, reduced motion, optional JS for once-per-session, Escape and `inert`). Step **9C**, after 9B. Brian's answers: **trace `icon.png` into an SVG for now**; TODO to get updated graphics and SVGs from JohnMark. The other two questions went unanswered, so Opus took the recommended options: the body graphic is `graphic-green.png` (the hero art, so it's already cached), and the Ω is **filled terracotta** with a cream light running around its edge. Both are TODO(Brian) to confirm.

Opus's changes to the pasted spec (each is a bug or conflict in it, not a taste call):
| Spec said | Changed to | Why |
|---|---|---|
| `html:not(:has(:target)) { overflow: hidden }` | `html:has(> body > .splash):not(.splash-seen):not(:has(:target))` | As written it locks scrolling on every page without a hash |
| (nothing about old browsers) | All splash CSS inside `@supports selector(:has(*))`; default `.splash { display: none }` | Without `:has()` the splash could never be dismissed |
| `aria-label="Enter Ohm Precision Bodywork"` | No aria-label; visually hidden "Enter Ohm Precision Bodywork." plus the visible line | The visible text must be part of the accessible name (WCAG 2.5.3) |
| Hover **and** focus-visible scoped to `(hover: hover) and (pointer: fine)` | Hover scoped; `:focus-visible` everywhere | A keyboard on a touch tablet still needs the focus state |
| "Main content wrapper gets `id="home"`" | `<div id="home" tabindex="-1">` inside `<main id="main">` on Home | `main` is shared by every page and the skip link targets `#main` |
| `inert` on the main content wrapper | `inert` on every `body` child except the splash | The header and skip link sit outside `main` and would stay reachable |
| A strengthening glow | A static blurred stroke whose opacity animates | Animating `filter` repaints every frame; the spec itself asks for transform/opacity/dashoffset only |
| "Home" links in the header | The header has no Home link; the logo and the 404's "home page" link go to `/#home` | |
| With JS, "Back returns to the splash" (a JS-off check) | With JS, after entering, the splash stays gone for the session, Back included | That's what "once per session" means; JS off, Back does bring it back |

## Decisions (Opus)
- **Office map shows no zones (unchanged from 8A).** Only the zoom changes. The zones are about mobile sessions; next to the office they'd suggest the office has an area. With the minor roads and terrain, the wider view has enough context.
- **Badge, not a teardrop.** A pin reads as "the exact address". The badge is the logo, sits on 2-decimal coordinates (~1 km), and the office map labels it "My office is in this area". `site.office.mapArea.radiusKm` loses its only use; Opus removes it in 9R (contract), with its test line.
- **The badge link is pointer-only**, like the map areas: `tabindex="-1"`, inside the `role="img"` svg. The keyboard and screen-reader path to the office is the "At my office" radio. Without JS it's a real link to `/book/office`.
- **Terrain is a raster, built once, committed.** A vector hillshade would be far heavier than the image. The DEM is sampled on a regular lng/lat grid over the OSM box; because `mapview` projects lng and lat linearly, the image lines up exactly when stretched over the projected box (`preserveAspectRatio="none"`), and it never needs regenerating when zones change. It uses `sharp`, already used by `npm run icons` (a dependency of Astro): no new dependency.
- **Shadow as black-with-alpha, not `mix-blend-mode`.** Black at alpha `a` over any colour gives `colour × (1 − a)`, which is exactly a multiply by grey. It needs no blend support, and the zone tints stay exact on flat ground. Shadows only; sunlit slopes stay untouched.
- **Data source:** AWS Terrain Tiles (Terrarium PNG, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, checked live Oct 6: 200, `image/png`). Decode: `elevation_m = R × 256 + G + B / 256 − 32768`. US coverage is USGS 3DEP (public domain). Tilezen asks for the credit "3DEP data courtesy of the U.S. Geological Survey"; the map credit line says `Terrain: USGS 3DEP` and the README carries the full sentence.
- **Out tint is shown only on hover or when chosen.** A permanently grey outside would change the whole map's look. The out button keeps its dashed outline; chosen, it takes `--zone-out-tint` as background with ink text and the ring, like the zone buttons. This replaces the 7A inverted cream fill.
- **"Show all areas" also shows for `out`.** Chosen `out` dims all three zones, so there's a state to leave. The label still fits: it brings the areas back.
- **Static maps clip their roads.** `/book/[zone]` and the office map never zoom, so they only carry roads near their view. The zoomable `/book` map carries everything.
- **The scrollbar fix is global.** `scrollbar-gutter: stable` reserves the gutter on every page, so no page shifts when content grows (the `/book` sections open after a click too). On overlay-scrollbar systems (macOS, phones) it does nothing.
- **Title spacing.** Halving the first section's top padding brings the H1 from 96px to 48px below the header on desktop, and from 64px to 32px on phones. The bottom padding stays. Home's hero is a composed block with its art centred, so it keeps its own padding.

- **The asterisk is a footnote marker.** `travel fee*` in the paragraph, then a separate line `* See rates and the travel fee.`, linked to `/pricing`. The `*` in the paragraph is `aria-hidden` so screen readers don't read "star"; the footnote line reads fine on its own.
- **"Plays a big role":** the full sentence becomes "Your nervous system plays a big role in how tight a muscle stays and how sensitive an area feels, …". The rest is unchanged.
- **Brian's Specialties intro** passes §7: no claims, no "massage". "Every session is the same price" is true (`site.rates` has no per-specialty pricing).

- **Ω in the copy.** The DM Sans file is a Latin subset, so "Ω" renders in the system fallback font. That's fine for one glyph in body text; seeing the symbol beats describing it.

- **`/hello` is the one exception to §A3's "no entrance animations".** Brian asked for it explicitly. Everything else, Home included, stays still.
- **The `/hello` line uses DM Sans, not the display face.** §A2 keeps Saira for the H1 and the hero line, and on `/hello` the Ω is the hero.
- **The traced Ω is temporary.** `npm run omega` traces the outer silhouette of `icon.png` (the hand cut-out opens to the bottom, so it's one closed path). When JohnMark's SVGs arrive, his path replaces `omega.json`, and the header and map badge can switch to SVG too.
- ~~SEO risk of an overlay on Home~~: resolved by batch 5 (the splash is on `/hello`, noindex).

## Contract edits made here
- `src/styles/tokens.css`: `--zone-out-tint` (ink 15% into `--bg-light`). `--zone-muted` stays until 9R: ServiceMap still uses it until 9B lands, then Opus deletes it.
- `.gitignore`: `.cache/` (terrain tile cache).
- ARCHITECTURE §A3, §A5, §B1–B5, §C; copy deck; BRIEF §6.

## Left for 9R (Opus)
- Delete `--zone-muted` from tokens.css and `office.mapArea.radiusKm` from site.ts (and the `radiusKm ≥ 1` test line) once nothing uses them.
- Look at the terrain strength with Brian (screenshots at 375 and 1280, full view and Central & SW zoom).
