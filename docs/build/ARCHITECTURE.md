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
| `--terra-500` | `#C37A5B` | Logo, the single H1 rule, focus ring, large display text only (3.0:1 on cream, 3.5:1 on green-900) |
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
- **Terracotta** appears only in the logo, the CTA button fill, one 3px rule under each H1 (48px wide), and the focus ring.
- **Never:**
  - eyebrow labels
  - numbered markers (unless the content is a real sequence)
  - entrance animations or scroll effects
  - hover motion beyond a 150ms color or underline change

  `prefers-reduced-motion` sets `--transition: 0ms`.
- **Focus:** `:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }` on every interactive element.
- **Layout primitives:**
  - Container: max `--container` (72rem), side gutter 16px.
  - Sections use `--s-16` vertical padding on mobile and `--s-24` on desktop.
  - Breakpoint: `48rem` (tablet) only. Keep the layout simple.

### A4. Header and footer
- **Header** (sticky, `--green-900`, height `--header-h`):
  - Line logo on the left (`logo-line.png`: terracotta omega and cream lettering, made for dark backgrounds, verified). It links home.
  - Nav: Services, Pricing, About (7A).
  - A **Book** button (CTA style) on the right.
  - On mobile, all four stay visible in one row, with no hamburger. If the width is too tight, the logo switches to the icon only (`icon.png`); 7B sets that breakpoint so nothing overflows at 360px.
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
│ for climbers, athletes…│            │  athletes and desk-bound engineers.          │
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
│ H1 Book a session      │            │ H1 Services   │   │ H1 Pricing       │  │ <picture>    │
│ Where do you want your │            │ Session types │   │ intro ¶          │  │ H1 About     │
│ session?               │            │ Pricing: ¶ +  │   │       office  you│  │ Copy         │
│ (●) At my office       │            │  link →       │   │ 60-min   $90 $115│  │ [ Book ]     │
│ ( ) At your place      │            │ Office/mobile │   │ 90-min  $120 $145│  └──────────────┘
├────────────────────────┤            │ Scope note    │   │ H2 Travel fee ¶  │
│ OFFICE: days, area     │            │ [ Book ]      │   │ [ Book ]         │
│ [ Book at the office ] │            └──────────────┘   └─────────────────┘
├── mobile ──────────────┤
│ H2 Where are you       │
│ located?               │
│ [■Central&SW][■Mid-n.] │  ← swatch = map colour; chosen one filled
│ [■North][□Outside]     │
│ Not sure? Enter your   │
│ address [__________▾]  │
│ ┌ result (aria-live) ┐ │
│ │You're in my Central│ │
│ │[ Book in this area]│ │
│ └────────────────────┘ │
│ <SVG map: zones, roads,│  ← ours, built from geojson;
│  chosen zone fitted,   │    no tiles, no Google map
│  others grey, pin>     │
│ hint · OSM credit · My │
│ Maps link              │
│ Near a boundary? Chat  │
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
src/data/osm.geojson          generated by `npm run osm` (7A): simplified major roads + town labels from OpenStreetMap (ODbL)
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
  book/index.astro            booking router
  book/[zone].astro           static result pages: home | shared | north | out | office
  robots.txt.ts  sitemap.xml.ts
src/scripts/book.ts           the ONLY client script; imported only by book/index.astro (Places + SVG map interaction)
src/assets/                   images (see B6) + fonts/
public/                       favicon-32.png, apple-touch-icon.png, icon-512.png (generated by npm run icons)
scripts/
  make-icons.mjs              sharp (transitive dep of astro) → public/ icons (see B6)
  check-wording.mjs           wording guard (B5)
  kml-to-geojson.mjs          zone converter (B5)
  fetch-osm.mjs               roads/places fetcher, run by hand (B5, 7A)
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
  - `site` (the brief's §4 object plus `zones`, `zonePrecedence`, `office`, `serviceAreaSummary`, `areaServed`, `outOfRegionFeeNote`, `contact` (`lead`, `chat`: PocketSuite lead form and chat, 7A), `map`, `mapViewerUrl`, `deploy`). No `phone` (7A). `rates` is `s60` and `s90` only (7A). `mapViewerUrl` is built from `map` (`mid`, `center`, `zoom`) with `URLSearchParams`. No `mapEmbedUrl` or `headerColor` since 7A (no iframe).
  - `indexable`
  - `isPlaceholder(url)`
  - `bookingUrl(key) → {href, placeholder}`. Placeholder `TODO_` links fall back to `links.general`, so the preview has no dead buttons. Buttons with `placeholder: true` get a `data-placeholder` attribute.
  - `mailHref`, `zoneOrder`
- **`wording.ts`** exports `wording`, `WordingKey` and `w(key)`.
- **`geo.ts`** exports `LngLat`, `Ring`, `ZoneFeature`, `ZoneCollection`, `BBox`, `pointInRing`, `pointInPolygon`, `bboxOf(fc, zone?)` (7A) and `zoneFor(lat, lng, fc)`.
- **`tokens.css`** adds `--zone-home`, `--zone-shared`, `--zone-north`, `--zone-muted` (7A): zone fills on the SVG map and the matching button swatches.
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
| `Base` | `title: string; description: string; ogImage?: ImageMetadata; jsonLd?: Record<string, unknown>; noindex?: boolean` | `<html lang="en">`, meta, canonical (`new URL(Astro.url.pathname, Astro.site)`), robots `noindex` when `!indexable \|\| noindex`, OG/Twitter tags, JSON-LD script, font preloads, favicons, skip link, Header, `<main id="main">`, Footer |
| `Header` | none | §A4 |
| `Footer` | none | §A4 |
| `BookCta` | `label?: string = 'Book a session'; variant?: 'primary' \| 'quiet'` | link to `href('/book')` |
| `PriceTable` | none | (7A, replaces `RateTable`.) `<table>` with columns Session · At my office · At your place. One row per `site.rates` entry: label, `$price`, `$price + travelFee.amount`. The "At your place" header carries a small second line `includes ${travelFee.amount} travel`. No minutes column. Caption (visually hidden) `Session rates` |
| `OfficeCard` | `headingLevel?: 2 \| 3` | Heading "At my office" (`id="office-h"`), office area, `I'm there {site.office.days}.`, button → `bookingUrl('office')` labelled "Book at the office" |
| `ZoneCard` | `zone: ZoneKey; headingLevel?: 2 \| 3; via?: 'address' \| 'pick' = 'pick'` | Heading `You're in my {name} area.`, days line `I'm there {days}.`, travel fee line `Travel fee ${amount}. {note}` from `site.travelFee`, primary button → `bookingUrl(zone.linkKey)` labelled "Book in this area". **`out`** (7A): heading `That address is outside my regular service area.` when `via='address'`, else `Outside my regular service area`; then `I can sometimes travel outside my regular area by request.`, `<p>{site.outOfRegionFeeNote}</p>` (never an amount while `outOfRegionFee` is null), then `ContactButtons`, **no booking link**. The heading has `tabindex="-1"` so JS can focus it |
| `ContactButtons` | none | (7A) `Send a request` (`.btn`, → `site.contact.lead`), `Chat with me` (`.btn--quiet`, → `site.contact.chat`), then a plain line `Or email {site.email}` with the address as a `mailHref` link. Same tab, like the booking buttons |
| `ZonePicker` | `current?: ZoneKey; heading?: string` | (7A) Optional `<h3>{heading}</h3>`, then a list of 4 plain links `href('/book/' + key)` with `data-zone={key}`, each starting with a decorative swatch (`<span class="swatch swatch--{key}" aria-hidden="true">`, filled with `--zone-{key}`, 1px `--text-on-dark` border; `out` gets an empty swatch with a dashed border) then `zone.name`. `aria-current="page"` on `current`; book.ts sets `aria-current="true"` on the chosen one. Any `[aria-current]` link uses the filled (inverted) button style |
| `ServiceMap` | `focus?: ZoneKey` | (7A, replaces `MapEmbed`.) Build-time inline `<svg>` drawn from `zones.geojson` and `osm.geojson` through `src/lib/mapview.ts`. See §B4 "Map". `focus` (used by `/book/[zone]`) renders that zone's view and grey-out in the static HTML. Below the SVG: `<p class="map-hint" hidden>` (book.ts un-hides it), the credit line `Roads and places © OpenStreetMap contributors` (link → `https://www.openstreetmap.org/copyright`), and the "Open the map in Google Maps" link → `site.mapViewerUrl` (`target="_blank" rel="noopener"`) |

### B4. Booking router (`/book`)

**Static markup (works with JS off):**
```html
<h1>Book a session</h1>
<fieldset id="where" hidden>                     <!-- JS un-hides -->
  <legend>Where do you want your session?</legend>
  <label><input type="radio" name="where" value="office"> At my office</label>
  <label><input type="radio" name="where" value="mobile"> At your place</label>
</fieldset>
<section id="office" aria-labelledby="office-h"> <OfficeCard/> </section>
<section id="mobile" aria-labelledby="mobile-h" data-maps-key={key}>
  <h2 id="mobile-h">Where are you located?</h2>  <!-- 7A order: areas, then address -->
  <ZonePicker/>                                  <!-- no heading here -->
  <div id="address-slot"></div>                 <!-- 3B combobox; label "Not sure? Enter your address" -->
  <div id="zone-result" aria-live="polite"></div>
  <ServiceMap/>
  <p>Near a boundary or can't find your address? <a href={site.contact.chat}>Chat with me</a>. Boundaries are approximate.</p>
</section>
<template data-zone="home"><ZoneCard zone="home" headingLevel={3}/></template>  … one per ZoneKey (via='pick')
<template data-zone="out" data-via="address"><ZoneCard zone="out" via="address" headingLevel={3}/></template>
<script> import '../../scripts/book.ts' </script>
```
- With JS off, both sections show in order (office first) and every zone link works.
- `key = import.meta.env.PUBLIC_GOOGLE_MAPS_KEY ?? ''`.

**`/book/[zone]`:** `getStaticPaths` → `home`, `shared`, `north`, `out`, `office`.
- The page has an H1 "Book a session" and the card for that zone (`OfficeCard` for `office`), at heading level 2. The `out` card uses `via='pick'`.
- Under the card: `<ServiceMap focus={zone} />` (not on the office page), so the static page shows the zone zoomed with the others greyed.
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
address selection → select(zoneFor(...), 'address', {lat, lng}).
```
- **Zone-picker links with JS on (7A):** on `/book` they're intercepted, so the map stays on the page. Without JS they navigate to `/book/<zone>`, which shows the same map zoomed to that zone.
- **Map (7A): our own SVG, no map service.** Brian chose this over a Maps JS map (Dynamic Maps billing, a heavier page, an iframe fallback). Rollback path if he doesn't like it: the Maps JS design is kept in `steps/7A-review-contracts.md` → "Alternative: Maps JS map".
  - **Data:** `src/data/zones.geojson` (zones) and `src/data/osm.geojson` (roads + places, `npm run osm`, committed). Nothing is fetched at runtime.
  - **Projection (`mapview.ts`):** equirectangular scaled by `cos(lat0)`. At this size it's indistinguishable from Web Mercator. `x = (lng − west) · cos(lat0) · k`, `y = (north − lat) · k`, with the full view 1000 units wide. The **full view** is `bboxOf(zones)` padded 6% and widened to a **4:5** (w:h) box around its centre. That gives context east and west (Falcon, Manitou) and stops it being a tall strip. `viewFor(bbox)` returns a 4:5 box in SVG units that contains `bbox` padded 10%. The client imports the same module, so the build and the pin use the same maths.
  - **Layers, bottom to top:** panel background `--bg-light`; zone fills; roads; zone outlines; road labels; place labels; zone labels; pin. The `<svg>` is `role="img"` with `<title>` `Service area map` and `<desc>` naming the three zones and the roads shown. Interactive paths are a pointer-only extra; the buttons are the keyboard path.
  - **Styling (tokens only, classes not inline colours):** zones `fill: var(--zone-{key})`, fill-opacity 0.35, stroke the same colour, 2px. Roads `--ink` at 0.45: I-25 2.5px, others 1.5px. All strokes `vector-effect: non-scaling-stroke`. Labels: `--ink`, DM Sans, with a `--bg-light` halo (`paint-order: stroke`). Zone labels 700 weight. Road labels short names (I-25, US 24, Hwy 83, Academy, Woodmen, Powers, Garden of the Gods, Austin Bluffs, Templeton Gap, Baptist). Place labels italic at 0.7 opacity.
  - **Label placement (build time):** a zone label sits at its polygon's pole of inaccessibility (a grid search for the interior point farthest from an edge; no dependency). A road label sits at a vertex near the middle of the road's longest piece inside the full view. `ServiceMap` keeps a small `labelNudge` table (zone/road → `[dx, dy]` in SVG units) for hand fixes.
  - **Zoom:** JS swaps the `viewBox`, with no animation (§A3 restraint). `focusZone(home|shared|north)` → `viewFor(bboxOf(zones, zone))`, adds `is-focused` to that zone and `is-muted` to the others (fill `--zone-muted` at 0.06, outline opacity 0.25). `focusZone(out)` → the full view, extended to include the pin if it's outside, with no muting. To keep text and the pin the same on-screen size, JS sets `--map-scale` (full width ÷ current width) on the svg. Labels and the pin use `font-size: calc(… / var(--map-scale))` and `transform: scale(calc(1 / var(--map-scale)))`.
  - **Pin:** a `<g class="map-pin" hidden>` in the SVG (teardrop path, `--accent` fill, `--bg-light` outline). `setPin({lat,lng})` projects with `mapview.ts` and sets its translate. `null` hides it.
  - **Size:** full width of the container, `max-width: 34rem`, aspect 4:5, `--radius`, 1px `--line-dark` border. Simplify the roads so the inline SVG for `/book` stays under ~40 KB.
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
           npm run check:wording · actions/configure-pages@v6 · actions/upload-pages-artifact@v5 (path: dist)
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
- **`sitemap.xml.ts`:** lists `/`, `/services`, `/pricing`, `/about` and `/book` with absolute URLs from `Astro.site` and the base.
- **JSON-LD:** a `HealthAndBeautyBusiness` (a `LocalBusiness` subtype). Confirmed in 5R: `MedicalBusiness` subtypes would frame the work as medical, which §7 rules out while unlicensed.
  - Fields: `name`, `url`, `email` (no `telephone`, 7A), `areaServed` (City list from `site.areaServed`), `priceRange: "$90–$120"` (derived from rates, not hardcoded), and `image` (the OG image).
  - **No street address.**
  - Licensure fields appear only when licensed.
- **OG image:** a 1200×630 `getImage` crop of the landscape photo.

---

## C. Architecture changes log
Record any change to this file here with the date and reason.
- 2026-10-06 (Opus, 7B unblock): `npm run osm` box widened to `38.63,-105.09,39.17,-104.54` (Fountain and Falcon were outside it). `Security-Widefield` = mean of OSM's `Security` and `Widefield` nodes. The script joins ways into chains before clipping and simplifying. ServiceMap does no second clip (§B5).
- 2026-10-06 (Opus, 7A, revised): Brian chose a self-drawn **SVG map** over the Maps JS map in the first 7A draft, to avoid Dynamic Maps billing. New `ServiceMap`, `mapview.ts`, `osm.geojson` + `npm run osm`. The My Maps iframe, `mapEmbedUrl` and `headerColor` (with its §A1 hex exception) are gone; `mapViewerUrl` stays as the "Open the map in Google Maps" link (§A1, §B1–B5).
- 2026-10-06 (Opus, 7A): Brian's review. Phone removed site-wide; out-of-region contact is the PocketSuite lead form, chat and email (`site.contact`). Initial assessment rate removed. New `/pricing` page with `PriceTable` (office and at-your-place columns), replacing `RateTable` on Services. Glossary removed (`glossary.ts`, `Glossary`). `/book` mobile section reordered (areas first, then address). The service-area map is now a Maps JS map (zones from `zones.geojson`, fit, grey-out, pin, click to choose) with the My Maps iframe as the no-JS / no-key fallback (iframe zoom 12 → 11). Zone colour tokens and `bboxOf` added. Picker links intercepted on `/book` (§A4, §A5, §B1–B4, §B7).
- 2026-10-05 (Opus, 6A): site review fixes. Map URLs built from `site.map` parts (adds `noprof=1` and the `ehbc` header color; the one allowed hex outside `tokens.css`, §A1). `outOfRegionFeeNote` on the out card. New `glossary.ts` + `Glossary` component. The zones script now matches KML names exactly to `site.zones[key].name` and skips non-polygon placemarks (§B5).
- 2026-10-05 (Opus): initial version. `--terra-700` darkened from `#A35C3E` (4.51:1) to `#9C5739` (4.89:1) for margin. Fonts moved from `public/fonts` to `src/assets/fonts` so URLs follow the base path.
- 2026-10-05 (Opus): Brian supplied the My Maps link. Added `site.mapViewerUrl` alongside `site.mapEmbedUrl`, since the viewer URL refuses framing and the `/embed` form is iframable. MapEmbed also renders an "Open the map in Google Maps" link.
- 2026-10-05 (Opus, 1R): `astro.config.mjs` `build.format` is now `'file'` (was `'directory'`). GitHub Pages 301-redirected `/services` to `/services/`, so every internal link cost an extra hop. Pages serve as `services.html` at `/services` with no redirect. `Base.astro` strips `.html` / `index.html` from the canonical. Internal links and the sitemap use clean, slash-less URLs.
- 2026-10-05 (Opus, 2R): recorded the copy Sonnet proposed in 2A and Opus approved: the OfficeCard heading, the ZoneCard travel-fee line, and the `/book/[zone]` back links (§B3, §B4).
- 2026-10-05 (Opus, 3A): Google loader is the direct script tag, not the bootstrap snippet (it calls `console.warn`). The zones geojson is imported with `?raw` + `JSON.parse` (Vite does not treat `.geojson` as JSON). §B4 and the 3B step updated.
