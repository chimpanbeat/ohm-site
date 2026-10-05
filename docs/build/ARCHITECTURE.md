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
  - Nav: Services, About.
  - A **Book** button (CTA style) on the right.
  - On mobile, all three stay visible in one row, with no hamburger: there are only three items. If the width is too tight, the logo switches to the icon only (`icon.png`) below 360px.
  - Book is always reachable without scrolling (§9).
- **Footer** (`--green-900`):
  - Phone (`tel:`), email (`mailto:`), `site.serviceAreaSummary`, © year and legal name.
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

BOOK                                   SERVICES                ABOUT
┌────────────────────────┐            ┌───────────────────┐   ┌───────────────────┐
│ H1 Book a session      │            │ H1 Services &      │   │ <picture> portrait │
│ Where do you want your │            │ pricing            │   │ (mobile crop) /    │
│ session?               │            │ Session types (4)  │   │ landscape (desk)   │
│ (●) At my office       │            │ ┌Rates table─────┐ │   │ H1 About Brian     │
│ ( ) At your place      │            │ │Initial 75m $110│ │   │ Copy (copy deck)   │
├────────────────────────┤            │ │60 min      $90 │ │   │ [ Book ]           │
│ OFFICE: days, area     │            │ │90 min      $120│ │   └───────────────────┘
│ [ Book at the office ] │            │ │Travel fee  $25 │ │
├── mobile ──────────────┤            │ └────────────────┘ │
│ Address [__________▾]  │            │ Office vs mobile ¶ │
│ ┌ result (aria-live) ┐ │            │ Scope note (small) │
│ │You're in my Central│ │            │ [ Book ]           │
│ │& SW area. Tue, Fri.│ │            └───────────────────┘
│ │[ Book this area ]  │ │
│ └────────────────────┘ │
│ Not sure? Pick your area│
│ [Central&SW][Mid-north] │
│ [North][Outside area]   │
│ <My Maps iframe>        │
│ Near a boundary? Text me│
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
src/data/site.ts              CONTRACT  all business facts + helpers (bookingUrl, telHref, smsHref, mailHref, indexable, zoneOrder)
src/data/wording.ts           CONTRACT  w(key)
src/data/zones.geojson        generated by `npm run zones` (placeholder rectangles until step 3B)
src/lib/geo.ts                CONTRACT  signatures fixed; bodies in 2A
src/lib/url.ts                href(path): base-aware internal URLs
src/styles/tokens.css         CONTRACT  design tokens + @font-face
src/styles/global.css         reset, base type, headings, links, .container, .band-*, .btn, focus, utilities
src/layouts/Base.astro        document shell: head + Header + <main id="main"> + Footer, skip link
src/components/
  Header.astro  Footer.astro  BookCta.astro  RateTable.astro
  ZoneCard.astro  OfficeCard.astro  ZonePicker.astro  ContactButtons.astro  MapEmbed.astro
src/pages/
  index.astro  services.astro  about.astro  404.astro
  book/index.astro            booking router
  book/[zone].astro           static result pages: home | shared | north | out | office
  robots.txt.ts  sitemap.xml.ts
src/scripts/book.ts           the ONLY client script; imported only by book/index.astro
src/assets/                   images (see B6) + fonts/
public/                       favicon-32.png, apple-touch-icon.png, icon-512.png (generated by npm run icons)
scripts/
  make-icons.mjs              sharp (transitive dep of astro) → public/ icons (see B6)
  check-wording.mjs           wording guard (B5)
  kml-to-geojson.mjs          zone converter (B5)
  check-contrast.mjs          token contrast assertions (step 5A)
tests/
  geo.test.ts                 unit tests for pointInRing/pointInPolygon/zoneFor (synthetic shapes)
  zones.test.ts               fixture addresses against real zones.geojson
  fixtures/addresses.json     §12 test addresses with approximate coordinates + expected zone
.github/workflows/deploy.yml  CI + Pages deploy
docs/build/                   this playbook
README.md                     step 5A (Opus verifies in 5R)
```

### B2. Contracts
The contract files in the repo are authoritative; read them directly. Summary:
- **`site.ts`** exports:
  - `ZoneKey`, `LinkKey`, `Rate`, `Zone`
  - `site` (the brief's §4 object plus `zones`, `zonePrecedence`, `office`, `serviceAreaSummary`, `areaServed`, `mapEmbedUrl`, `deploy`)
  - `indexable`
  - `isPlaceholder(url)`
  - `bookingUrl(key) → {href, placeholder}`. Placeholder `TODO_` links fall back to `links.general`, so the preview has no dead buttons. Buttons with `placeholder: true` get a `data-placeholder` attribute.
  - `telHref`, `smsHref`, `mailHref`, `zoneOrder`
- **`wording.ts`** exports `wording`, `WordingKey` and `w(key)`.
- **`geo.ts`** exports `LngLat`, `Ring`, `ZoneFeature`, `ZoneCollection`, `pointInRing`, `pointInPolygon` and `zoneFor(lat, lng, fc)`.
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
| `RateTable` | none | `<table>` from `site.rates` + travel-fee row from `site.travelFee`; caption; `$` + price; minutes |
| `OfficeCard` | `headingLevel?: 2 \| 3` | Heading "At my office" (`id="office-h"`), office area, `I'm there {site.office.days}.`, button → `bookingUrl('office')` labelled "Book at the office" |
| `ZoneCard` | `zone: ZoneKey; headingLevel?: 2 \| 3` | Heading `You're in my {name} area.` (for `out`: `That's outside my regular service area.`), days line `I'm there {days}.`, travel fee line `Travel fee ${amount}. {note}` from `site.travelFee` (not for `out`), primary button → `bookingUrl(zone.linkKey)` labelled "Book in this area". For `out`: `I sometimes travel there by request.` + `ContactButtons`, **no booking link**. The heading has `tabindex="-1"` so JS can focus it |
| `ContactButtons` | none | Call (`telHref`), Text (`smsHref`), Email (`mailHref`) as links styled as buttons |
| `ZonePicker` | `current?: ZoneKey` | Heading "Not sure? Pick your area." + list of 4 plain links `href('/book/' + key)` labelled with `zone.name`; `aria-current="page"` on `current` |
| `MapEmbed` | none | If `site.mapEmbedUrl` is non-empty: `<iframe loading="lazy" title="Service area map" src={site.mapEmbedUrl}>` at 4:3 (mobile) / 16:9 (desktop), followed by a plain link "Open the map in Google Maps" → `site.mapViewerUrl` (`target="_blank" rel="noopener"`). If empty, renders nothing |

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
  <h2 id="mobile-h">At your place</h2>
  <div id="address-slot"></div>                 <!-- 3B injects the combobox here -->
  <div id="zone-result" aria-live="polite"></div>
  <ZonePicker/>
  <MapEmbed/>
  <p>Near a boundary or can't find your address? <a href={smsHref}>Text me</a>. Boundaries are approximate.</p>
</section>
<template data-zone="home"><ZoneCard zone="home" headingLevel={3}/></template>  … one per ZoneKey
<script> import '../../scripts/book.ts' </script>
```
- With JS off, both sections show in order (office first) and every zone link works.
- `key = import.meta.env.PUBLIC_GOOGLE_MAPS_KEY ?? ''`.

**`/book/[zone]`:** `getStaticPaths` → `home`, `shared`, `north`, `out`, `office`.
- The page has an H1 "Book a session" and the card for that zone (`OfficeCard` for `office`), at heading level 2.
- It also has `ZonePicker current=…` and links "Back to booking options" → `/book` and "At my office" → `/book/office` (the latter omitted on the office page).
- No client JS.

**`book.ts` state machine:**
```
init: un-hide #where; hide #office and #mobile; no radio checked.
choose(office) → show #office, hide #mobile.
choose(mobile) → show #mobile, hide #office; if first time and data-maps-key non-empty → loadPlaces().
loadPlaces: idle → loading → ready | unavailable
  ready: render combobox in #address-slot (step 3B).
  unavailable: leave #address-slot empty; picker and map remain. No console output.
select(zone): clone <template data-zone=zone>.content into #zone-result (replace children),
  then focus the cloned heading.
```
- **Zone-picker links with JS on:** zone links keep their default navigation to `/book/<zone>`, which is simple and robust. JS doesn't intercept them.
- **Keyboard:** native radios and links. The combobox follows the ARIA 1.2 combobox pattern (step 3B).
- **Privacy:** the address input value is never written to storage, the URL, the console, or any request other than Google's.
- **Google specifics:** the exact API is pinned in step 3A, after checking Google's current docs.
  - Working assumption: Places API (New) via Maps JS, with `google.maps.importLibrary('places')`.
  - Autocomplete: `AutocompleteSuggestion.fetchAutocompleteSuggestions` with an `AutocompleteSessionToken`, `includedRegionCodes: ['us']`, a location bias toward Colorado Springs, a minimum of 3 characters and a 300ms debounce.
  - On selection: `toPlace().fetchFields({ fields: ['location', 'formattedAddress'] })`.
  - Unavailable when any of these happens: the import rejects, a 6s timeout, `gm_authFailure`, or an error is thrown.

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
- **Parsing:** for each `<Placemark>`, it reads `<name>` and maps it case-insensitively by prefix: `home` → `home`, `shared` → `shared`, `north` → `north`. Any other name exits 1 and lists the names it found.
- **Geometry:** it collects every `<Polygon>`. The `<outerBoundaryIs>` ring comes first, then the `<innerBoundaryIs>` rings. It parses `lng,lat[,alt]` triples, drops the altitude, and rounds to 6 decimal places. Several polygons on one placemark become a `MultiPolygon`.
- **Output:** only `{type, properties:{zone}, geometry}`. It ignores and **never emits** `<description>`, `<ExtendedData>`, styles, Points and LineStrings, and logs a count of what it skipped.
- It fails if a zone key is missing or appears twice.
- It writes 2-space JSON with one feature per zone, in the order home, shared, north.

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
- **`sitemap.xml.ts`:** lists `/`, `/services`, `/about` and `/book` with absolute URLs from `Astro.site` and the base.
- **JSON-LD:** a `HealthAndBeautyBusiness` (a `LocalBusiness` subtype). Opus confirms the type in 5R.
  - Fields: `name`, `url`, `telephone`, `email`, `areaServed` (City list from `site.areaServed`), `priceRange: "$90–$120"` (derived from rates, not hardcoded), and `image` (the OG image).
  - **No street address.**
  - Licensure fields appear only when licensed.
- **OG image:** a 1200×630 `getImage` crop of the landscape photo.

---

## C. Architecture changes log
Record any change to this file here with the date and reason.
- 2026-10-05 (Opus): initial version. `--terra-700` darkened from `#A35C3E` (4.51:1) to `#9C5739` (4.89:1) for margin. Fonts moved from `public/fonts` to `src/assets/fonts` so URLs follow the base path.
- 2026-10-05 (Opus): Brian supplied the My Maps link. Added `site.mapViewerUrl` alongside `site.mapEmbedUrl`, since the viewer URL refuses framing and the `/embed` form is iframable. MapEmbed also renders an "Open the map in Google Maps" link.
- 2026-10-05 (Opus, 1R): `astro.config.mjs` `build.format` is now `'file'` (was `'directory'`). GitHub Pages 301-redirected `/services` to `/services/`, so every internal link cost an extra hop. Pages serve as `services.html` at `/services` with no redirect. `Base.astro` strips `.html` / `index.html` from the canonical. Internal links and the sitemap use clean, slash-less URLs.
- 2026-10-05 (Opus, 2R): recorded the copy Sonnet proposed in 2A and Opus approved: the OfficeCard heading, the ZoneCard travel-fee line, and the `/book/[zone]` back links (§B3, §B4).
