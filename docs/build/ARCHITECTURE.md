# Architecture

Owner: Opus. Sonnet reads this but doesn't edit it. If something here is wrong or missing, escalate (HANDOFF §3).
Brief references (§n) point to `brief/BRIEF.md`.

---

## A. Design system (approved by Brian, Oct 5 2026)

### A1. Color tokens (`src/styles/tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--green-900` | `#0C3F35` | Default page background: header, hero, Book page, footer |
| `--green-700` | `#125245` | Secondary dark surfaces; link color on cream |
| `--green-300` | `#7FA396` | Hairlines and borders on dark. **Not text** (4.26:1) |
| `--terra-500` | `#C37A5B` | Logo, the H1 resistor divider (8A), focus ring, large display text only (3.0:1 on cream, 3.5:1 on green-900) |
| `--terra-700` | `#9C5739` | CTA button fill (cream text, 4.89:1); any small terracotta text |
| `--cream` | `#F3F2F0` | Text on dark; background of reading bands |
| `--ink` | `#0B2620` | Body text on cream (14.3:1) |
| `--line-dark` / `--line-light` | cream 15% / ink 12% | Dividers |

Use the semantic aliases (`--bg-dark`, `--text-on-light`, `--cta-bg`, …) in components. **No raw hex values outside `tokens.css`.**

Contrast (verified):
- cream on green-700 is 8.1:1
- cream on green-900 is 10.6:1
- ink on cream is 14.3:1

### A2. Typography
- **Text:** DM Sans, variable 400–700.
- **Display:** Saira Semi Condensed 700, set uppercase with `letter-spacing: 0.01em`. Used **only** for H1 and the home hero line.
- **Files:** self-hosted Latin-subset woff2 in `src/assets/fonts/`:
  - `dm-sans-latin-var.woff2`
  - `saira-semi-condensed-latin-700.woff2`

  `tokens.css` references them by relative URL, so Vite hashes them and applies the base path. Both fonts are OFL, from Google Fonts. There's no npm font package and no Google Fonts `<link>` at runtime.
- **Preload:** `Base.astro` preloads both fonts (`import url from '../assets/fonts/x.woff2?url'`).
- **Scale tokens:**
  - `--fs-small` 0.875rem
  - `--fs-body` 17→18px
  - `--fs-h3` 1.25rem
  - `--fs-h2` 1.6rem
  - `--fs-h1` clamp 2.4→4rem
- **Line height:** 1.55 for body, 1.05 for display. **Measure:** max 65ch.
- **Numerals:** rates, minutes and days use `font-variant-numeric: tabular-nums`.
- **Case:** sentence case everywhere except the display face.

### A3. Layout and restraint
- **Green-dominant.**
  - Header, home hero, Book page and footer are on `--green-900`.
  - Reading content (Services body, About text, home info blocks) sits in full-bleed **cream bands** with ink text.
  - No cards with shadows and no rounded blobs. The radius is 2px.
- **The one memorable element** is the anatomical back illustration (`src/assets/graphic-green.png`), large and bleeding off the right or bottom edge of the home hero. Everywhere else stays quiet.
- **Terracotta** appears only in the logo, the CTA button fill, the divider under each H1, the map's north zone and pin, and the focus ring.
- **H1 divider (8A): a resistor symbol**, the ANSI/IEEE zigzag (lead, six alternating strokes, lead). It replaces the 3px × 48px rule, in `global.css` `h1::after`. It's drawn as a CSS mask over `background: var(--accent)`: an inline `data:image/svg+xml` with `viewBox="0 0 72 12"` and the path `M0 6H18L21 1L27 11L33 1L39 11L45 1L51 11L54 6H72`, `fill="none"`, `stroke="black"` (the mask only reads alpha; no hex), `stroke-width="2"`, `stroke-linejoin="miter"`. Size 72×12px. Set `mask` and `-webkit-mask`. Subtle: the same terracotta as before and a 2px stroke. **Spacing:** on every page with an H1, there's ≥ `--s-8` between the bottom of the zigzag and the next element. Use one global rule, not per-page margins.
- **Never:**
  - eyebrow labels
  - numbered markers (unless the content is a real sequence)
  - entrance animations or scroll effects
  - hover motion beyond a 150ms color or underline change

  `prefers-reduced-motion` sets `--transition: 0ms`.
- **One exception (9A, revised 10A): the `/hello` entrance page** (§B8) has a light running along the Ω (one slow lap, then one every 11s) and a fade-in, at Brian's request. Nothing else on the site moves, Home included. Reduced motion turns all of it off.
- **Focus:** `:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }` on every interactive element.
- **Layout primitives:**
  - Container: max `--container` (72rem), side gutter 16px.
  - Sections use `--s-8` vertical padding on mobile and `--s-12` on desktop (11A; 10A had `--s-10` / `--s-16`, originally `--s-16` / `--s-24`). A closing section holding only the Book button is `.section--end`, `--s-8` at every width (11A). Home's hero: `--s-10` mobile, `--s-12` desktop (11A). Footer: `--s-6` mobile, `--s-8` desktop (11A).
  - **The first section on a page (9A, 10A)** has less top padding, `--s-6` on mobile and `--s-10` on desktop, so the H1 sits close under the header: `main > .section:first-child`. Every page except Home starts with a `.section`. Home's hero keeps its own padding.
  - **`html { scrollbar-gutter: stable; }` (9A).** `/book` loads short (its sections open on a click), so without a reserved gutter it had no scrollbar and the centred layout sat half a scrollbar to the right of every other page.
  - Breakpoint: `48rem` (tablet) only. Keep the layout simple.

### A4. Header and footer
- **Header** (sticky, `--green-900`, height `--header-h`):
  - Line logo on the left (`logo-line.png`: terracotta omega and cream lettering, made for dark backgrounds, verified). It links home (`/`).
  - Nav: Services, Pricing, About (7A).
  - A **Book** button (CTA style) on the right.
  - On mobile, all four stay visible in one row, with no hamburger. If the width is too tight, the logo switches to the icon only (`icon.png`); 7B sets that breakpoint so nothing overflows at 360px.
  - **Logo sizes (9A):** full logo 240px wide at ≥ 48rem, 200px below that, 130px in the compact row (≤ 33rem); icon-only 48px. Header height stays `--header-h` (64px). The compact and icon-only breakpoints are set by measurement so the row never overflows.
  - Book is always reachable without scrolling (§9).
- **Footer** (`--green-900`):
  - Email (`mailto:`), `site.serviceAreaSummary`, © year and legal name. **No phone number anywhere on the site** (Brian, Oct 6 2026).
  - The license line appears only when `site.licensed && site.licenseNumber`.
  - A Book link.

### A5. Wireframes

```
HOME (mobile)                         HOME (desktop)
┌────────────────────────┐            ┌──────────────────────────────────────────────┐
│[Ω OHM]   Svc About [Book]│ sticky   │[Ω OHM PRECISION]  Services About     [Book]  │
├────────────────────────┤            ├──────────────────────────────────────────────┤
│ ░░ anatomy art ░░░░░░░ │            │  ░░░░░░░░ anatomy art (right 60%) ░░░░░░░░░  │
│ REDUCE RESISTANCE.     │            │  REDUCE RESISTANCE.                          │
│ RESTORE MOVEMENT.      │            │  RESTORE MOVEMENT.                           │
│ ── (terra rule)        │            │  ──                                          │
│ Neuromuscular therapy  │            │  Neuromuscular therapy for climbers,         │
│ for climbers, athletes…│            │  for active people who want to move…         │
│ [ Book a session → ]   │ ← above    │  [ Book a session → ]   From $90 · mobile    │
│ From $90 · mobile/office│   the fold└──────────────────────────────────────────────┘
├────────────────────────┤            Then cream band: who it's for / what a session
│ Who it's for           │            does / why "Ohm". Last: Book CTA band on green.
│ What a session does    │
│ Why "Ohm"              │
│ [ Book a session ]     │
└────────────────────────┘

BOOK (7A)                              SERVICES            PRICING (7A)         ABOUT
┌────────────────────────┐            ┌──────────────┐   ┌─────────────────┐  ┌──────────────┐
│ H1 Book a session      │            │ H1 Services   │   │ H1 Pricing       │  │ H1 About (9A)│
│ Where do you want your │            │ Office/mobile*│   │ intro ¶          │  │ <picture>    │
│ session?               │            │ * rates link →│   │       office  you│  │ Copy         │
│ (●) At my office       │            │ Specialties   │   │ 60-min   $90 $115│  │ [ Book ]     │
│ ( ) At your place      │            │ (9A order)    │   │ 90-min  $120 $145│  └──────────────┘
├────────────────────────┤            │ Scope note    │   │ H2 Travel fee ¶  │
│ OFFICE: days, area     │            │ [ Book ]      │   │ [ Book ]         │
│ [ Book at the office ] │            └──────────────┘   └─────────────────┘
├── mobile ──────────────┤
│ H2 Where are you       │
│ located?               │
│ [▓Central&SW][▓Mid-n.] │  ← button = map tint (8A); chosen ringed, others dim
│ [■North][□Outside]     │
│ Not sure? Enter your   │
│ address [__________▾]  │
│ ┌ result (aria-live) ┐ │
│ │You're in my Central│ │
│ │[ Book in this area]│ │
│ └────────────────────┘ │
│ <SVG map: zones, roads,│  ← ours, built from geojson;
│  terrain, Ω badge,     │    no tiles, no Google map (9A: terrain,
│  chosen zone fitted,   │    minor roads, Ω office badge → office,
│  others dimmed, pin>   │    clickable "outside" area)
│ [Open in Google Maps ↗]│  ← 8A: a button; [Show all areas] sits on the map
│ hint · OSM/USGS credit │
│ (office: card + map    │  ← 9A: Central & SW zoom, Ω badge
│  with Ω badge)         │
│ Near a boundary? Chat  │
│  or email              │
└────────────────────────┘
```

### A6. Wording (§7)
- `src/data/wording.ts` defines `w(key)`, which returns `[unlicensed, licensed][site.licensed]`.
- Copy never contains "massage therapist", "LMT", "licensed" or "massage therapy" directly. Those exist only as the licensed variants in `wording.ts`.
- While unlicensed, copy also avoids the bare word "massage".
- **No medical claims, ever:** don't promise to treat, cure, diagnose, fix or heal. Use reduce, support, restore movement, work with.
- All page copy comes from `docs/build/copy-deck.md` (written by Opus in step 4A). Before 4A, stub pages use only neutral placeholder text drawn from `site.ts`.

---

## B. Code architecture

### B1. File map

```
astro.config.mjs              CONTRACT  site/base from site.deploy; static; port 4321
tsconfig.json                           extends astro/tsconfigs/strict
src/data/site.ts              CONTRACT  all business facts + helpers (bookingUrl, mailHref, indexable, zoneOrder)
src/data/wording.ts           CONTRACT  w(key)
src/data/zones.geojson        generated by `npm run zones` (placeholder rectangles until step 3B)
src/data/osm.geojson          generated by `npm run osm` (7A): simplified major roads + town labels from OpenStreetMap (ODbL); 9A adds one unlabelled `minor` roads feature
src/data/terrain.json         generated by `npm run terrain` (9A): {bbox, width, height} of terrain.webp
src/data/omega.json           generated by `npm run omega` (9A): {source, viewBox, d, points}, the Ω traced from icon.png (until JohnMark's SVG); `d` for /hello, `dMap` (coarser) for the map office mark
src/assets/terrain.webp       generated by `npm run terrain` (9A): hillshade shadow (black + alpha) from USGS 3DEP
src/lib/geo.ts                CONTRACT  signatures fixed; bodies in 2A; bboxOf added by Opus in 7A
src/lib/url.ts                href(path): base-aware internal URLs
src/lib/mapview.ts            (7A) projection + view boxes shared by ServiceMap (build) and book.ts (client)
src/styles/tokens.css         CONTRACT  design tokens + @font-face
src/styles/global.css         reset, base type, headings, links, .container, .band-*, .btn, focus, utilities
src/layouts/Base.astro        document shell: head + Header + <main id="main"> + Footer, skip link
src/components/
  Header.astro  Footer.astro  BookCta.astro  PriceTable.astro
  ZoneCard.astro  OfficeCard.astro  ZonePicker.astro  ContactButtons.astro  ServiceMap.astro
src/pages/
  index.astro  services.astro  pricing.astro  about.astro  404.astro
  hello.astro                 (9A) entrance page for cards/QR/social; noindex, unlinked, no JS (§B8)
  book/index.astro            booking router
  book/[zone].astro           static result pages: home | shared | north | out | office
  robots.txt.ts  sitemap.xml.ts
src/scripts/book.ts           the ONLY client script; imported only by book/index.astro (Places + SVG map interaction)
src/assets/                   images (see B6) + fonts/
public/                       favicon-32.png, apple-touch-icon.png, icon-512.png (generated by npm run icons)
public/hello/index.html       (9A) no-JS meta-refresh /hello/ → /hello (Pages 404s trailing slashes)
scripts/
  make-icons.mjs              sharp (transitive dep of astro) → public/ icons (see B6)
  check-wording.mjs           wording guard (B5)
  kml-to-geojson.mjs          zone converter (B5)
  fetch-osm.mjs               roads/places fetcher, run by hand (B5, 7A)
  make-terrain.mjs            hillshade builder, run by hand; sharp; tile cache in .cache/ (gitignored) (B5, 9A)
  trace-omega.mjs             traces icon.png's silhouette into omega.json; sharp + marching squares (B5, 9A)
  check-dist.mjs              post-build guard for /hello: noindex, canonical, sitemap, robots, no inbound links, no JS; no splash on Home (B5, 9A)
  check-contrast.mjs          token contrast assertions (step 5A)
tests/
  geo.test.ts                 unit tests for pointInRing/pointInPolygon/zoneFor (synthetic shapes)
  zones.test.ts               fixture addresses against real zones.geojson
  zones-script.test.ts        npm run zones against synthetic KML (6B)
  fixtures/addresses.json     §12 test addresses with approximate coordinates + expected zone
.github/workflows/deploy.yml  CI + Pages deploy
docs/build/                   this playbook
README.md                     step 5A (Opus verifies in 5R)
```

### B2. Contracts
The contract files in the repo are authoritative; read them directly. Summary:
- **`site.ts`** exports:
  - `ZoneKey`, `LinkKey`, `Rate`, `Zone`
  - `site` (the brief's §4 object plus `zones`, `zonePrecedence`, `office`, `serviceAreaSummary`, `areaServed`, `outOfRegionFeeNote`, `contact` (`lead`, `chat`: PocketSuite lead form and chat, 7A), `map`, `mapViewerUrl`, `deploy`). `office.mapArea = {lat, lng}` (8A; `radiusKm` removed in 9R): where the Ω office mark sits, 2-decimal coordinates, **not the address**. No `phone` (7A). `rates` is `s60` and `s90` only (7A). `mapViewerUrl` is built from `map` (`mid`, `center`, `zoom`) with `URLSearchParams`. No `mapEmbedUrl` or `headerColor` since 7A (no iframe).
  - `indexable`
  - `isPlaceholder(url)`
  - `bookingUrl(key) → {href, placeholder}`. Placeholder `TODO_` links fall back to `links.general`, so the preview has no dead buttons. Buttons with `placeholder: true` get a `data-placeholder` attribute.
  - `mailHref`, `zoneOrder`
- **`wording.ts`** exports `wording`, `WordingKey` and `w(key)`. Key `notSpa` added in 8A (Services intro).
- **`geo.ts`** exports `LngLat`, `Ring`, `ZoneFeature`, `ZoneCollection`, `BBox`, `pointInRing`, `pointInPolygon`, `bboxOf(fc, zone?)` (7A) and `zoneFor(lat, lng, fc)`.
- **`tokens.css`** adds `--zone-home`, `--zone-shared`, `--zone-north` (7A), and `--zone-{home|shared|north}-tint` (8A: `color-mix` of the zone colour at 40% into `--bg-light`). **The tints are what the eye sees:** the map fills them opaque, and the area buttons use them as their background. `--zone-out-tint` (9A: ink 15% into `--bg-light`) is the "outside" area's colour, shown on the map only while hovered or chosen, and on the chosen out button. (`--zone-muted` was deleted in 9R.)
- **`url.ts`:**
  ```ts
  export function href(path: string): string
  ```
  - Joins `import.meta.env.BASE_URL` and `path`, with no double slashes.
  - `href('/')` → `/ohm-site/`. `href('/book')` → `/ohm-site/book`.
  - External URLs (`http…`, `tel:`, `sms:`, `mailto:`) pass through unchanged.

  **Every internal link and `fetch` must use `href`.**

### B3. Component props

| Component | Props | Renders |
|---|---|---|
| `Base` | `title: string; description: string; ogImage?: ImageMetadata; jsonLd?: Record<string, unknown>; noindex?: boolean; bare?: boolean` (9A: `bare` drops the skip link, Header and Footer; used only by `/hello`, §B8) | `<html lang="en">`, meta, canonical (`new URL(Astro.url.pathname, Astro.site)`), robots `noindex` when `!indexable \|\| noindex`, OG/Twitter tags, JSON-LD script, font preloads, favicons, skip link, Header, `<main id="main">`, Footer |
| `Header` | none | §A4 |
| `Footer` | none | §A4 |
| `BookCta` | `label?: string = 'Book a session'; variant?: 'primary' \| 'quiet'` | link to `href('/book')` |
| `PriceTable` | none | (7A, replaces `RateTable`.) `<table>` with columns Session · At my office · At your place. One row per `site.rates` entry: label, `$price`, `$price + travelFee.amount`. The "At your place" header carries a small second line `includes ${travelFee.amount} travel`. No minutes column. Caption (visually hidden) `Session rates`. **9A:** header labels at `--fs-body`, bold, `vertical-align: top`, so all three sit on one line with the note hanging below |
| `OfficeCard` | `headingLevel?: 2 \| 3` | Heading "At my office" (`id="office-h"`), office area, `I send the exact address after you book.` (8A), `I'm there {site.office.days}.`, button → `bookingUrl('office')` labelled "Book at the office" |
| `ZoneCard` | `zone: ZoneKey; headingLevel?: 2 \| 3; via?: 'address' \| 'pick' = 'pick'` | Heading `You're in my {name} area.`, days line `I'm there {days}.`, travel fee line `Travel fee ${amount}. {note}` from `site.travelFee`, primary button → `bookingUrl(zone.linkKey)` labelled "Book in this area". **`out`** (7A): heading `That address is outside my regular service area.` when `via='address'`, else `Outside my regular service area`; then `I can sometimes travel outside my regular area by request.`, `<p>{site.outOfRegionFeeNote}</p>` (never an amount while `outOfRegionFee` is null), then `ContactButtons`, **no booking link**. The heading has `tabindex="-1"` so JS can focus it |
| `ContactButtons` | none | (7A) `Send a request` (`.btn`, → `site.contact.lead`), `Chat with me` (`.btn--quiet`, → `site.contact.chat`), then a plain line `Or email {site.email}` with the address as a `mailHref` link. Same tab, like the booking buttons |
| `ZonePicker` | `current?: ZoneKey; heading?: string` | (7A, restyled 8A) Optional `<h3>{heading}</h3>`, then a list of 4 plain links `href('/book/' + key)` with `data-zone={key}` and the text `zone.name`. **8A: the three zone buttons are coloured like their map area:** `background` and `border-color` are `var(--zone-{key}-tint)` and the text is `--ink`, so each button looks like a piece of the map. The swatch spans are removed. `out` keeps the quiet outline style with a **dashed** border. **Chosen state** (`aria-current="page"` on `current`; `"true"` set by book.ts): the chosen button gets a `box-shadow: 0 0 0 3px var(--text-on-dark)` ring (zone buttons) or the inverted cream fill (`out`), and while any link is current, the others drop to `opacity: 0.5`. That's the same grey-out as the map (`ul:has(a[aria-current]) a:not([aria-current])`). **Linked hover** (JS, `/book` only): hover/focus a zone button → its map area gets `is-hot`; hover a map area → its button gets `is-hot`. `is-hot` = a 3px `--text-on-dark` ring on the button, and a 4px outline on the map area. **9A: `out` is a full peer.** Default: dashed outline, no fill. Chosen: `--zone-out-tint` background, ink text, dashed ink border, and the same ring (replaces the inverted cream fill); the three zone buttons dim. `is-hot` applies to `out` too (its map area is everything outside the zones) |
| `ServiceMap` | `focus?: ZoneKey \| 'office'; id?: string = 'map'` | (7A, replaces `MapEmbed`; office mode 8A.) Build-time inline `<svg>` drawn from `zones.geojson` and `osm.geojson` through `src/lib/mapview.ts`. See §B4 "Map". `id` prefixes the `<title>`/`<desc>` ids (`{id}-title`, `{id}-desc`), so two maps can share a page. `focus` (used by `/book/[zone]`) renders that zone's view and grey-out in the static HTML. **`focus='office'`** draws no zones: just terrain, roads, places and the office badge (§B4 "Office map", 9A). Every zone-mode map also carries the office badge as a pointer-only link to `/book/office` (§B4 "Office badge"). `focus='out'` (9A) tints the out area and dims the zones. Maps with a `focus` are static and clip their roads to their view. Zone mode, below the SVG, in this order: the **Google Maps button** (`.btn btn--quiet` + external-link icon, `Open in Google Maps`, → `site.mapViewerUrl`, `target="_blank" rel="noopener"`), `<p class="map-hint" hidden>` (book.ts un-hides it), then the credit line `Roads and places © OpenStreetMap contributors. Terrain: USGS 3DEP.` (the OSM part → `https://www.openstreetmap.org/copyright`; 9A adds the terrain credit). Over the SVG's top-right corner, `<button type="button" class="map-reset" hidden>Show all areas</button>` (book.ts shows it while zoomed). Office mode: the credit line only |

### B4. Booking router (`/book`)

**Static markup (works with JS off):**
```html
<h1>Book a session</h1>
<fieldset id="where" hidden>                     <!-- JS un-hides -->
  <legend>Where do you want your session?</legend>
  <label><input type="radio" name="where" value="office"> At my office</label>
  <label><input type="radio" name="where" value="mobile"> At your place</label>
</fieldset>
<section id="office" aria-labelledby="office-h"> <OfficeCard/> <ServiceMap focus="office" id="office-map"/> </section>  <!-- map 8A -->
<section id="mobile" aria-labelledby="mobile-h" data-maps-key={key}>
  <h2 id="mobile-h">Where are you located?</h2>  <!-- 7A order: areas, then address -->
  <ZonePicker/>                                  <!-- no heading here -->
  <div id="address-slot"></div>                 <!-- 3B combobox; label "Not sure? Enter your address:" (9A) -->
  <div id="zone-result" aria-live="polite"></div>
  <ServiceMap/>
  <p>Near a boundary or can't find your address? <a href={site.contact.chat}>Chat with me</a> or <a href={mailHref}>send me an email</a>. Boundaries are approximate.</p>  <!-- 9A -->
</section>
<template data-zone="home"><ZoneCard zone="home" headingLevel={3}/></template>  … one per ZoneKey (via='pick')
<template data-zone="out" data-via="address"><ZoneCard zone="out" via="address" headingLevel={3}/></template>
<script> import '../../scripts/book.ts' </script>
```
- With JS off, both sections show in order (office first) and every zone link works.
- `key = import.meta.env.PUBLIC_GOOGLE_MAPS_KEY ?? ''`.

**`/book/[zone]`:** `getStaticPaths` → `home`, `shared`, `north`, `out`, `office`.
- The page has an H1 "Book a session" and the card for that zone (`OfficeCard` for `office`), at heading level 2. The `out` card uses `via='pick'`.
- Under the card: `<ServiceMap focus={zone} />`, so the static page shows the zone zoomed with the others greyed. On the office page it's `<ServiceMap focus="office" />` (8A).
- It also has `ZonePicker current=… heading="Not sure? Pick your area."` and links "Back to booking options" → `/book` and "At my office" → `/book/office` (the latter omitted on the office page).
- No client JS.

**`book.ts` state machine (7A):**
```
init: un-hide #where; hide #office and #mobile; no radio checked.
  Intercept clicks on #mobile .zone-picker links and on map zones → select(zone, 'pick').
  Un-hide .map-hint; add class "is-interactive" to the map svg.
choose(office) → show #office, hide #mobile.
choose(mobile) → show #mobile, hide #office; if first time and data-maps-key non-empty → loadPlaces().
loadPlaces: idle → loading → ready | unavailable   (unchanged from 3B; Places only)
  ready: render combobox in #address-slot.
  unavailable: empty #address-slot. The map and picker never depend on Google. No console output.
select(zone, via, loc?):
  clone <template data-zone=zone data-via=via> if it exists, else <template data-zone=zone>,
    into #zone-result, then focus the cloned heading;
  aria-current="true" on the picker link for zone (remove it from the others);
  map: focusZone(zone, loc) and setPin(loc) (no loc → hide the pin).
  via 'pick' also clears the address input.
  .map-reset visible iff zone is home|shared|north (8A).
address selection → select(zoneFor(...), 'address', {lat, lng}).
deselect() (8A): empty #zone-result; remove aria-current from every picker link; setPin(null);
  clear the address input; map back to the full view, no is-focused/is-muted, --map-scale 1;
  hide .map-reset. Focus stays where it is, except: if focus was inside #zone-result or on
  .map-reset, move it to the first picker link.
  Triggers: click a picker link that already has aria-current; click the map area that has
  is-focused; click .map-reset.
hot(zone | null) (8A): pointerenter/focusin on a zone picker link → is-hot on the map area
  (fill + outline paths) of that zone; pointerenter on a map area → is-hot on its picker link;
  pointerleave/focusout → hot(null). Never for 'out'. Purely visual; no announcements.
9A changes:
  'out' is a full peer: the map has an out area (path.zone--out, everything outside the zones).
    Clicking it selects/deselects 'out'; hot() covers 'out'; .map-reset shows for any chosen zone.
  focusZone(out): full view (widened for a pin), out area is-focused, the three zones is-muted.
  is-muted = the zone keeps its tint, dimmed (fill-opacity 0.35), no longer grey.
  office link: a plain left click on .map-office → preventDefault(); goOffice():
    check the office radio, choose(office), scroll #office into view, focus #office-h.
    Without JS the badge is a link to /book/office.
```
- **Zone-picker links with JS on (7A):** on `/book` they're intercepted, so the map stays on the page. Without JS they navigate to `/book/<zone>`, which shows the same map zoomed to that zone.
- **Map (7A): our own SVG, no map service.** Brian chose this over a Maps JS map (Dynamic Maps billing, a heavier page, an iframe fallback). Rollback path if he doesn't like it: the Maps JS design is kept in `steps/7A-review-contracts.md` → "Alternative: Maps JS map".
  - **Data:** `src/data/zones.geojson` (zones) and `src/data/osm.geojson` (roads + places, `npm run osm`, committed). Nothing is fetched at runtime.
  - **Projection (`mapview.ts`):** equirectangular scaled by `cos(lat0)`. At this size it's indistinguishable from Web Mercator. `x = (lng − west) · cos(lat0) · k`, `y = (north − lat) · k`, with the full view 1000 units wide. The **full view** is `bboxOf(zones)` padded 6% and widened to a **4:5** (w:h) box around its centre. That gives context east and west (Falcon, Manitou) and stops it being a tall strip. `viewFor(bbox)` returns a 4:5 box in SVG units that contains `bbox` padded 10%. The client imports the same module, so the build and the pin use the same maths.
  - **Layers, bottom to top:** panel background `--bg-light`; zone fills (9A: the out area first); terrain (9A); minor roads (9A); roads; zone outlines; road labels; place labels; zone labels; office badge (9A); pin. The `<svg>` is `role="img"` with `<title>` `Service area map` and `<desc>` naming the three zones and the roads shown. Interactive paths are a pointer-only extra; the buttons are the keyboard path.
  - **Styling (tokens only, classes not inline colours):** zones `fill: var(--zone-{key}-tint)`, opaque (8A; was `--zone-{key}` at 0.35), stroke `var(--zone-{key})`, 2px; `is-hot` stroke 4px. Roads `--ink` at 0.45: I-25 2.5px, others 1.5px. All strokes `vector-effect: non-scaling-stroke`. Labels: `--ink`, DM Sans, with a `--bg-light` halo (`paint-order: stroke`). Zone labels 700 weight. Road labels short names (I-25, US 24, Hwy 83, Academy, Woodmen, Powers, Garden of the Gods, Austin Bluffs, Templeton Gap, Baptist). Place labels italic at 0.7 opacity. **9A:** minor roads `--ink` at 0.22, 1px, no labels. Out area `--zone-out-tint`, `fill-opacity` 0 (still clickable), 0.6 when `is-hot`, 1 when `is-focused`; no outline. Muted zones keep their tint at `fill-opacity: 0.35`.
  - **Label placement (build time):** a zone label sits at its polygon's pole of inaccessibility (a grid search for the interior point farthest from an edge; no dependency). A road label sits at a vertex near the middle of the road's longest piece inside the full view. `ServiceMap` keeps a small `labelNudge` table (zone/road → `[dx, dy]` in SVG units) for hand fixes.
  - **Zoom:** JS swaps the `viewBox`, with no animation (§A3 restraint). `focusZone(home|shared|north)` → `viewFor(bboxOf(zones, zone))`, adds `is-focused` to that zone and `is-muted` to the others (9A: own tint at 0.35, was `--zone-muted` at 0.06; outline opacity 0.25). `focusZone(out)` → the full view, extended to include the pin if it's outside; 9A: the out area `is-focused`, the three zones `is-muted`. To keep text and the pin the same on-screen size, JS sets `--map-scale` (full width ÷ current width) on the svg. Labels and the pin use `font-size: calc(… / var(--map-scale))` and `transform: scale(calc(1 / var(--map-scale)))`.
  - **Pin:** a `<g class="map-pin" hidden>` in the SVG (teardrop path, `--accent` fill, `--bg-light` outline). `setPin({lat,lng})` projects with `mapview.ts` and sets its translate. `null` hides it.
  - **Office map (8A, revised 9A, 10A):** `ServiceMap focus="office"`. **10A:** a `Show mobile service areas` link-button over its top-right corner (the same dark style as `Show all areas`): `<a class="map-areas" href="/book#mobile">` (base-aware). On `/book`, book.ts turns a plain click into `goMobile()` ("At your place", full map, scroll and focus its heading); `/book#mobile` on load does the same, so the link from `/book/office` lands there. Without JS, `/book` shows both sections and the hash scrolls. It has no zone layers. **View (9A):** the Central & Southwest zoom, `frame.viewFor(bboxOf(zones, 'home'))`, widened with `frame.include(…, ox, oy, 120)` so the office is never at an edge (8A's 12 km `viewAround` was too close for the detail the map has; `viewAround` stays in `mapview.ts`, unused). `--map-scale` = full width ÷ view width. Terrain, minor roads, roads and places as usual, clipped to the view. The office mark at the projected `site.office.mapArea` point, not a link, labelled `Ohm Office` like every other map (9C; was `My office is in this area`). No circle (9A), no teardrop. No JS beyond that link, no zones, no reset. Shown in `#office` on `/book` and on `/book/office`. `<title>`/`<desc>` from the copy deck.
  - **Office mark (9A, revised after 9B by Brian):** just the Ω, no disc. It's an inline nested `<svg>` of the traced path `omega.json` `dMap` (a coarser simplification for map size), about 105 map units wide at scale 1 (10A; ~34px on a phone), `--accent` fill with a 3px `--bg-light` halo (`paint-order: stroke`), and the label **`Ohm Office`** under it on every map view (zone-label style). Counter-scaled with `--map-scale`, like the pin, so it's the same size at every zoom. Other labels move out of its way (nudges), never the mark. *(9B shipped a disc badge first: the `icon.png` image on a cream disc with a terracotta ring. 9C replaces it.)* It sits on `site.office.mapArea` (2 decimals, ~1 km: approximate on purpose). On zone-mode maps it's wrapped in `<a class="map-office" href="/book/office" tabindex="-1" aria-hidden="true">` with `<title>My office</title>`: a pointer-only extra, like the map areas; the keyboard path is the "At my office" radio. On `/book`, book.ts turns the click into `goOffice()`.
  - **Hover dimming (10A):** on the `/book` mobile map, hovering an area (map or button, as the linked hover) or the office mark dims everything else: the other region fills to `fill-opacity: 0.35` and the office mark to `opacity: 0.5`; the hovered area shows its full tint even if it's muted. Hovering `out` dims the three regions and the mark. Leaving restores the current state. Classes, set by `hot()`: `is-dim` on the dimmed elements.
  - **Map buttons (10A):** `Show all areas` and `Show mobile service areas` are dark (`--bg-dark` fill, `--text-on-dark` text, soft shadow) so they read on the light map.
  - **Terrain (9A):** `<image class="terrain">` of `src/assets/terrain.webp` stretched over the projected `terrain.json` bbox with `preserveAspectRatio="none"`. The image is sampled on a regular lng/lat grid, and `project` is linear in lng and lat, so it lines up exactly and is independent of the zones. It's black with alpha (shadow only), so on flat ground the zone tints are exact. CSS `opacity` (~0.6, tuned in 9B) sets the strength. `pointer-events: none`.
  - **Static maps clip (9A):** a map with a `focus` never zooms, so its road lines are clipped to its view plus 5%. Only the `/book` mobile map carries every road.
  - **Size:** full width of the container, `max-width: 34rem`, aspect 4:5, `--radius`, 1px `--line-dark` border. Inline SVG budgets (9A): the `/book` mobile map ≤ 70 KB, each static map ≤ 40 KB. Tune minor-road simplification in `npm run osm` to fit.
- **Privacy (7A):** the pin's coordinates live only in memory and in an SVG `transform`. Nothing is requested to draw them.
- **Cost (7A):** the map costs nothing. Google is used only for Places autocomplete (unchanged). The README's `Map loads per day` cap stays as a guard.
- **Keyboard:** native radios and links. The combobox follows the ARIA 1.2 combobox pattern (step 3B).
- **Privacy:** the address input value is never written to storage, the URL, the console, or any request other than Google's.
- **Google specifics:** pinned in step 3A. The spec of record is `steps/3B-zones-autocomplete.md` § "Google spec".
  - Places API (New) via Maps JS. Loaded with the **direct script tag** (`loading=async` + `callback`), not the inline bootstrap, which contains a `console.warn`. Then `google.maps.importLibrary('places')`.
  - Autocomplete: `AutocompleteSuggestion.fetchAutocompleteSuggestions` with an `AutocompleteSessionToken`, `includedRegionCodes: ['us']`, a location bias toward Colorado Springs, a minimum of 3 characters and a 300ms debounce.
  - On selection: `toPlace().fetchFields({ fields: ['location', 'formattedAddress'] })`.
  - Unavailable when any of these happens: the import rejects, a 6s timeout, `gm_authFailure`, or an error is thrown. Any Places call that rejects also counts. A bad key surfaces only this way, on the first query (3R).

### B5. Scripts and CI

**`npm run check:wording`** (`scripts/check-wording.mjs`, no dependencies):
- Reads `site.licensed` by dynamically importing `../src/data/site.ts` (Node ≥22.18/24 strips types natively).
- Walks `dist/**/*.html`. For each file it:
  - removes `<script>…</script>` and `<style>…</style>` blocks
  - collects the values of `alt`, `title`, `aria-label`, `placeholder`, and `<meta content>`
  - strips the remaining tags
  - decodes `&amp; &#39; &quot; &lt; &gt; &nbsp;`
- **When `licensed === false`:** it fails (exit 1) on `/\bmassage\s+therap(?:ist|y)\b|\bLMT\b|\blicensed\b/i`. It prints the file path and roughly 60 characters of context for each hit.
- **Always:** it warns, without failing, on `/\b(?:treat|cure|diagnos|fix|heal)\w*/i`. The allowlist covers phrases containing `substitute for medical diagnosis`. It prints the hits for review.
- It exits 2 with a clear message if `dist/` is missing.

**`npm run zones`** (`scripts/kml-to-geojson.mjs`, no dependencies):
- **Arguments:** `[kmlPath = 'brief/Ohm Service Map.kml'] [--out src/data/zones.geojson]`.
- **Parsing (6A):** placemarks without a `<Polygon>` (pins, lines) are skipped and only counted. For each polygon placemark it reads `<name>`, decodes CDATA and `&amp;`, trims and collapses whitespace, and matches it **exactly** against `site.zones[key].name` for `home`, `shared` and `north` (imported from `src/data/site.ts`). Today those names are `Central & Southwest Springs`, `Mid-north Springs` and `North Springs`. There is no `out` polygon: a point in no polygon is `out`. An unknown polygon name exits 1 and lists both the names found and the names expected.
- **Geometry:** it collects every `<Polygon>`. The `<outerBoundaryIs>` ring comes first, then the `<innerBoundaryIs>` rings. It parses `lng,lat[,alt]` triples, drops the altitude, and rounds to 6 decimal places. Several polygons on one placemark become a `MultiPolygon`.
- **Output:** only `{type, properties:{zone}, geometry}`. It ignores and **never emits** `<description>`, `<ExtendedData>`, styles, Points and LineStrings, and logs a count of what it skipped.
- It fails if a zone key is missing or appears twice.
- It writes 2-space JSON with one feature per zone, in the order home, shared, north.

**`npm run osm`** (`scripts/fetch-osm.mjs`, no dependencies, run by hand, never in CI) (7A):
- Queries the Overpass API (`https://overpass-api.de/api/interpreter`, with a `User-Agent` naming the site; retry once after 30s on a non-JSON "too busy" reply) for the box `38.63,-105.09,39.17,-104.54` (S,W,N,E). That's the full view (lng −104.996…−104.635, lat 38.724…39.076) plus ~25% each side, so a widened `out` view still has roads (7B unblock):
  - ways with `highway` ~ `motorway|trunk|primary|secondary|tertiary` (no `_link`) whose `name` matches `^(North |South |East |West )?(Academy Boulevard|Woodmen Road|Powers Boulevard|Garden of the Gods Road|Austin Bluffs Parkway|Baptist Road|Templeton Gap Road)$`
  - `motorway|trunk` ways with `ref` containing `I 25` or `US 24`, and any `highway` way with `ref` `CO 83`
  - `place` ~ `city|town|village|hamlet` nodes named `Manitou Springs|Monument|Falcon|Fountain|Black Forest|Security|Widefield|Colorado Springs`
- OSM has no `Security-Widefield` node. The output's `Security-Widefield` place is the mean of the `Security` and `Widefield` nodes (`COMBINED` in the script), so there are still 7 places.
- Groups the ways into one road per short name (the list in §B4 "Styling"), **joins ways that share an endpoint into chains**, clips the chains to the box, and simplifies each piece (Douglas–Peucker, ~0.0004°). It rounds coordinates to 5 decimals. Without the join, OSM's short ways leave ~3,200 vertices in ~1,500 two-point lines; with it, ~570 vertices (Oct 6 run).
- `ServiceMap` draws everything in `osm.geojson` with no second clip. Features outside the current `viewBox` are simply off-canvas (Falcon, Fountain and Monument sit just outside the full view and appear when a pin widens it).
- Writes `src/data/osm.geojson`: road features `{ kind: 'road', name: <short>, major: boolean }` as `MultiLineString`, and place features `{ kind: 'place', name }` as `Point`. It writes no other OSM tags and no IDs.
- Prints feature and vertex counts. Exits 1 if any expected road or place is missing.
- **Licence:** OSM data is ODbL. The map shows the credit line, and the README notes that `osm.geojson` is ODbL-licensed.
- **Minor roads (9A):** the query also takes every `primary|secondary` way in the box. Ways that aren't one of the named roads go into one pool: joined, clipped, simplified (`SIMPLIFY_MINOR_DEG` 0.0006, up to 0.001 for the size budget), pieces under `MIN_MINOR_KM` (1, up to 2) dropped. Output: one feature `{ kind: 'minor' }` (no name), written before the named roads.

**`npm run terrain`** (`scripts/make-terrain.mjs`, 9A; `sharp` like `make-icons.mjs`; run by hand, never in CI):
- Source: AWS Terrain Tiles, Terrarium PNG, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/{x}/{y}.png` (checked Oct 6 2026). `elevation_m = R × 256 + G + B / 256 − 32768`. US data is USGS 3DEP, public domain; credit `3DEP data courtesy of the U.S. Geological Survey` (README) and `Terrain: USGS 3DEP` (map credit line).
- Tiles cached in `.cache/terrain/` (gitignored); a rerun downloads nothing.
- Box = the OSM box. Output grid regular in lng/lat, 1024 px wide, height for square ground pixels. Bilinear elevation sampling, Horn hillshade (azimuth 315°, altitude 45°), shadow alpha `(1 − shade / sin 45°)^0.8`, RGB black. WebP with alpha, < 200 KB, to `src/assets/terrain.webp`; `{bbox, width, height}` to `src/data/terrain.json`.

**`npm run omega`** (`scripts/trace-omega.mjs`, 9A; `sharp`, no other dependency): alpha ≥ 128 mask of `src/assets/icon.png`, largest component, outer contour by marching squares, Douglas–Peucker at 1.5px, integer coordinates, viewBox = bbox + 2%. Writes `src/data/omega.json`. Temporary: JohnMark's SVG replaces it (TODO(Brian)). **10A:** the closed contour (for `d` and `dMap` alike) starts at the right foot's inner corner, the vertex where the hand cut-out meets the baseline on the right (the lowest-right vertex of the cut-out's right edge), and runs clockwise on screen (positive shoelace area with y down). `omega.test.ts` pins both.

**`npm run check:dist`** (`scripts/check-dist.mjs`, 9A, no dependencies; runs in CI after `check:wording`): fails if `dist/hello.html` lacks `noindex` (whatever `indexable` is), has a canonical to another page, or has a `<script src>` or more than one inline script besides JSON-LD (10A: the click-pause script is allowed); if `sitemap.xml` mentions `hello`; if `robots.txt` disallows `/hello` by name; if any other page links to `hello`; or if `index.html` carries splash markup. `--dist <dir>` for its test.

**`npm test`:** `node --test "tests/**/*.test.ts"`, using Node's built-in runner and `node:assert/strict`. Tests import from `../src/lib/geo.ts` and read `../src/data/zones.geojson` via `fs`.

**`.github/workflows/deploy.yml`:**
```yaml
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:   runs-on ubuntu-latest
    steps: actions/checkout@v7 · actions/setup-node@v7 (node-version: 24, cache: npm) · npm ci · npm test ·
           npm run build (env PUBLIC_GOOGLE_MAPS_KEY: ${{ vars.PUBLIC_GOOGLE_MAPS_KEY }}) ·
           npm run check:wording · npm run check:dist (9A) · actions/configure-pages@v6 · actions/upload-pages-artifact@v5 (path: dist)
  deploy:  needs: build; environment: { name: github-pages, url: ${{ steps.d.outputs.page_url }} }
    steps: actions/deploy-pages@v5 (id: d)
```
These action versions were checked on Oct 5 2026.

### B6. Assets
Copy into `src/assets/`, renamed to kebab-case. Only these are committed:

| Source (`brief/`) | Dest | Use |
|---|---|---|
| `ohm-about-hero-landscape.jpg` | `about-landscape.jpg` | About (desktop `<picture>` source), OG image (1200×630 crop) |
| `ohm-about-hero-portrait.jpg` | `about-portrait.jpg` | About (mobile `<picture>` source, `media="(max-width: 47.99rem)"`) |
| `ohm-portrait-square.jpg` | `portrait-square.jpg` | spare (Home "who" block if copy deck uses it) |
| `logo/Graphic_Green.png` | `graphic-green.png` | Home hero art |
| `logo/Logo_Line.png` | `logo-line.png` | Header (on dark) |
| `logo/Logo_Stack.png` | `logo-stack.png` | 404 / footer if needed |
| `logo/Icon.png` | `icon.png` | Header on very narrow screens |
| `logo/Icon.png` + `logo/Icon_Background.png` | (inputs to `npm run icons`, read from `brief/`, not copied) | `favicon-32.png` = `Icon.png` centered at 80% on a `#0C3F35` square (anatomy detail is unreadable at 32px). `apple-touch-icon.png` (180px) and `icon-512.png` = `Icon_Background.png` resized |

- Images go through `astro:assets` `<Image>` / `<Picture>` with `formats={['avif','webp']}`, explicit `widths`/`sizes`, and `alt` text.
- The logo gets `alt="Ohm Precision Bodywork"`. Decorative art gets `alt=""`.
- **Do not copy** HomeMock, Palette, Wordmark/Logo variants not listed, PocketSuite thumbs, or the KML.

### B7. SEO (step 5A)
- **Per-page meta:** `title` and `description` come from the copy deck. The title format is `{Page} · Ohm Precision Bodywork`; the home page uses `Ohm Precision Bodywork · Neuromuscular therapy in Colorado Springs`.
- **`robots.txt.ts`:** when `indexable` is false, it emits `User-agent: *\nDisallow: /`. When true, `Allow: /` plus a `Sitemap:` line.
- **`sitemap.xml.ts`:** lists `/`, `/services`, `/pricing`, `/about` and `/book` with absolute URLs from `Astro.site` and the base. Never `/hello` (9A, §B8).
- **JSON-LD:** a `HealthAndBeautyBusiness` (a `LocalBusiness` subtype). Confirmed in 5R: `MedicalBusiness` subtypes would frame the work as medical, which §7 rules out while unlicensed.
  - Fields: `name`, `url`, `email` (no `telephone`, 7A), `areaServed` (City list from `site.areaServed`), `priceRange: "$90–$120"` (derived from rates, not hardcoded), and `image` (the OG image).
  - **No street address.**
  - Licensure fields appear only when licensed.
- **OG image:** a 1200×630 `getImage` crop of the landscape photo.

### B8. `/hello` entrance page (9A, step 9C)
**Decision (Brian, Oct 6, 2026):** the splash is its own page, not an overlay on Home. A full-screen splash on arrival from search trips Google's intrusive-interstitial signal and gets between search visitors and prices and booking. `/hello` is the deliberate entrance for people who come from a business card, QR code, social bio or referral. **Printed materials, QR codes and social bios link to `/hello`; search, Maps and the Google Business Profile link to `/`.** Home has no overlay.
The spec of record is `steps/9C-hello.md`; this is the summary.
- **Page:** `src/pages/hello.astro`, `Base noindex bare` (no skip link, header or footer). The whole page is one `<a class="hello" href="/">` (base-aware) holding the body graphic (`graphic-green.png`, same image props as the Home hero), an inline SVG Ω from `src/data/omega.json` (fill, glow, idle and light paths), and the line `Take the path of least resistance`. The accessible name is a visually hidden "Enter Ohm Precision Bodywork." plus that line. Entering is plain navigation; Back returns to `/hello`.
- **JavaScript (10A):** one inline script (`is:inline`, ~10 lines), only for the click pause: a plain click or Enter adds `.is-entering` (the glow) and navigates after 500ms. Modified clicks pass through; reduced motion navigates at once; `pageshow` (`persisted`) clears the class after Back. Without JS the link navigates at once. Everything else is CSS. (9C shipped with no JS at all; Brian accepted the script in 10A.)
- **Motion (10A):** the light starts at the right foot's inner corner (where the hand meets the baseline) and runs clockwise: up the thumb side, across the fingers, down the palm, along the left foot, over the arch, down the right leg and back. One lap takes 3s (11A; was 4.5s) from 0.4s, then it repeats every 11s. The light and glow have no `non-scaling-stroke`: with it, browsers lay dashes out in screen space while `pathLength` normalises in viewBox space, so the lap ran 1/scale too fast (2.5× on phones). Their widths are viewBox units (light 5, glow 8). The line fades in when the first lap ends and stays. **No glow at rest:** the glow shows only on hovering the Ω itself (fine pointers; 10R: not the whole page, which is one link), `:focus-visible` (inset ring) and `.is-entering`. No idle loop, no pulse. Only `opacity` and `stroke-dashoffset` animate. Reduced motion: no light, line visible at once. The Ω is `min(75vmin, 42rem)` wide (10A, was `min(50vmin, 28rem)`), and the line (capitals, wide tracking, cream at 75%) is sized and tracked to span exactly the Ω's ink width (`steps/10A-review-contracts.md` → Line).
- **Indexing:** `noindex` from the page's own `noindex` prop, so it holds after `indexable` turns true. Self canonical. Not in the sitemap, never linked from any page. Not disallowed in robots.txt by name (pre-launch the whole site is disallowed; after launch it's `Allow: /`). `npm run check:dist` enforces all of this in CI.
- **Trailing slash:** `public/hello/index.html` meta-refreshes `/hello/` to `/hello`, because Pages 404s trailing slashes on `build.format: 'file'` pages.
- **Contrast:** the line (cream 75% into `--bg-dark`) is 6.66:1 on `--bg-dark`, and it must stay ≥ 4.5:1 over the art.

---

## C. Architecture changes log
Record any change to this file here with the date and reason.
- 2026-10-06 (Opus, 11A): Brian's review of Phase 10. `/hello`: the light loses `non-scaling-stroke` (the cause of the fast phone animation) and the lap is 3s (§B8). Spacing: sections 32/48, `.section--end`, hero 40/48, footer 32 on desktop (§A3). About photo at the text measure, 16:9 (§A5). Home Why Ohm: two paragraphs, "how I got here" links to About (copy deck).
- 2026-10-06 (Opus, 10A): Brian's review of Phase 9. Spacing tightened site-wide (`--s-10` token; sections 40/64px, first section 24/40px, Home hero 64px desktop), About photo cropped shorter, compact mobile footer (§A3–A5). Office mark ~105 units and moved to 38.80, −104.85; office map gets `Show mobile service areas`; hover dims everything but the hovered area or mark; dark map buttons (§B2, §B4). `/hello`: the light starts at the right foot's inner corner and runs clockwise, slower, repeating every 11s; glow only on hover, focus and the click pause (a small inline script, so `check:dist` allows one inline script); the Ω 50% bigger; the line in spaced capitals spanning the Ω (§A3, §B5, §B8). `omega.json` `d`/`dMap` start at that corner (`npm run omega`). Copy: Why Ohm drops "the shape in my logo"; Home subline on two lines from ~1024px.
- 2026-10-06 (Opus, 9A): Brian's review of Phase 8. First section top padding halved and `scrollbar-gutter: stable` (§A3). About: H1 before the picture (§A5). Office map zoomed out to the Central & SW view; the circle becomes the Ω office badge, also on zone maps as a link to the office (§B3, §B4). Terrain shading (`npm run terrain`, USGS 3DEP) and unlabelled minor roads (`npm run osm`) (§B1, §B4, §B5). Muted zones dim in their own colour instead of going grey. `out` gets a clickable map area and full button parity, `--zone-out-tint` (§B2–B4). Boundary line adds email; address label gains a colon (§B4). Static maps clip their roads; new SVG size budgets. Batch 2: PriceTable header at body size, top-aligned (§B3); Services reordered (office/mobile first, footnote link to `/pricing`, "Specialties"; the Pricing section is gone) (§A5, copy deck). Batch 3: bigger header logo (§A4); Ω sentence in Why Ohm. Batch 4 (a Home overlay splash) was superseded the same day by batch 5: the splash is its own page, `/hello` (new §B8), noindex for good, unlinked, not in the sitemap, and no JS. It exists because of Google's intrusive-interstitial signal and search visitors' need for price and booking; cards, QR codes and social bios link to it, and search, Maps and GBP link to `/`. Adds `Base bare`, `omega.json` + `npm run omega`, `npm run check:dist` (in CI), and `public/hello/index.html` for the trailing slash. §A3 motion exception for `/hello` only. Home and the header logo are unchanged. After 9B (Brian): the map office badge becomes a bare, larger Ω (the traced `dMap` path) labelled `Ohm Office` on every map view; built in 9C Part 2 (§B4).
- 2026-10-06 (Opus, 8A): Brian's review of Phase 7. H1 rule → resistor zigzag divider with ≥`--s-8` below it (§A3). Area buttons take their map tint as their background, and a chosen area dims the other buttons (`--zone-*-tint` tokens, §B2, §B3). Map fills use the same tints, opaque. Deselect (re-click, click the focused area, "Show all areas") and linked hover (§B4). Office map: `ServiceMap focus="office"` with an approximate circle from `site.office.mapArea`; `mapview` adds `viewAround` and `unitsPerKm` (§B3, §B4). The Google Maps link becomes a button above the hint. `ServiceMap` `id` prop for two maps on one page.
- 2026-10-06 (Opus, 7R): `npm run osm` drops isolated road stubs (pieces of one road within 0.3 km form a cluster; a cluster under 2 km is dropped) (§B5).
- 2026-10-06 (Opus, 7B unblock): `npm run osm` box widened to `38.63,-105.09,39.17,-104.54` (Fountain and Falcon were outside it). `Security-Widefield` = mean of OSM's `Security` and `Widefield` nodes. The script joins ways into chains before clipping and simplifying. ServiceMap does no second clip (§B5).
- 2026-10-06 (Opus, 7A, revised): Brian chose a self-drawn **SVG map** over the Maps JS map in the first 7A draft, to avoid Dynamic Maps billing. New `ServiceMap`, `mapview.ts`, `osm.geojson` + `npm run osm`. The My Maps iframe, `mapEmbedUrl` and `headerColor` (with its §A1 hex exception) are gone; `mapViewerUrl` stays as the "Open the map in Google Maps" link (§A1, §B1–B5).
- 2026-10-06 (Opus, 7A): Brian's review. Phone removed site-wide; out-of-region contact is the PocketSuite lead form, chat and email (`site.contact`). Initial assessment rate removed. New `/pricing` page with `PriceTable` (office and at-your-place columns), replacing `RateTable` on Services. Glossary removed (`glossary.ts`, `Glossary`). `/book` mobile section reordered (areas first, then address). The service-area map is now a Maps JS map (zones from `zones.geojson`, fit, grey-out, pin, click to choose) with the My Maps iframe as the no-JS / no-key fallback (iframe zoom 12 → 11). Zone colour tokens and `bboxOf` added. Picker links intercepted on `/book` (§A4, §A5, §B1–B4, §B7).
- 2026-10-05 (Opus, 6A): site review fixes. Map URLs built from `site.map` parts (adds `noprof=1` and the `ehbc` header color; the one allowed hex outside `tokens.css`, §A1). `outOfRegionFeeNote` on the out card. New `glossary.ts` + `Glossary` component. The zones script now matches KML names exactly to `site.zones[key].name` and skips non-polygon placemarks (§B5).
- 2026-10-05 (Opus): initial version. `--terra-700` darkened from `#A35C3E` (4.51:1) to `#9C5739` (4.89:1) for margin. Fonts moved from `public/fonts` to `src/assets/fonts` so URLs follow the base path.
- 2026-10-05 (Opus): Brian supplied the My Maps link. Added `site.mapViewerUrl` alongside `site.mapEmbedUrl`, since the viewer URL refuses framing and the `/embed` form is iframable. MapEmbed also renders an "Open the map in Google Maps" link.
- 2026-10-05 (Opus, 1R): `astro.config.mjs` `build.format` is now `'file'` (was `'directory'`). GitHub Pages 301-redirected `/services` to `/services/`, so every internal link cost an extra hop. Pages serve as `services.html` at `/services` with no redirect. `Base.astro` strips `.html` / `index.html` from the canonical. Internal links and the sitemap use clean, slash-less URLs.
- 2026-10-05 (Opus, 2R): recorded the copy Sonnet proposed in 2A and Opus approved: the OfficeCard heading, the ZoneCard travel-fee line, and the `/book/[zone]` back links (§B3, §B4).
- 2026-10-05 (Opus, 3A): Google loader is the direct script tag, not the bootstrap snippet (it calls `console.warn`). The zones geojson is imported with `?raw` + `JSON.parse` (Vite does not treat `.geojson` as JSON). §B4 and the 3B step updated.
