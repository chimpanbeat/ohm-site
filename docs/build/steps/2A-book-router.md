# 2A: Booking router with placeholder zones

Model: sonnet
Brief: §6 (flow, zones, accessibility), §12
Architecture: §B2 (geo, url), §B3 (ZoneCard, OfficeCard, ZonePicker, ContactButtons, MapEmbed), §B4 (all)

## Goal
Build the whole `/book` experience **except Google autocomplete**:
- office vs mobile choice
- result cards rendered from config
- static `/book/<zone>` pages that work without JS
- the zone picker, map embed, and "Text me" line
- the `aria-live` result region
- the `geo.ts` implementation with unit tests
- a placeholder `zones.geojson`

## Files to create or modify
- `src/lib/geo.ts`: implement the **bodies only** (ray casting; holes; MultiPolygon; precedence via `site.zonePrecedence`; none → `'out'`). Don't change exports or types. About 30 lines.
- `src/data/zones.geojson`: placeholder rectangles, used until 3B:
  - `home`: [[-104.93,38.74],[-104.76,38.74],[-104.76,38.89],[-104.93,38.89],[-104.93,38.74]]
  - `shared`: [[-104.89,38.885],[-104.76,38.885],[-104.76,38.94],[-104.89,38.94],[-104.89,38.885]] (it overlaps home slightly, to exercise precedence)
  - `north`: [[-104.90,38.94],[-104.70,38.94],[-104.70,39.06],[-104.90,39.06],[-104.90,38.94]]

  Properties are `{ "zone": "<key>" }` only. (This one file in `src/data/` is yours to write in 2A. 3B regenerates it.)
- `src/components/ZoneCard.astro`, `OfficeCard.astro`, `ZonePicker.astro`, `ContactButtons.astro`, `MapEmbed.astro`: per the §B3 table. The text strings in that table are approved copy. Any other visible text needs escalation.
- `src/pages/book/index.astro`: markup per §B4. Replaces the stub.
- `src/pages/book/[zone].astro`: per §B4.
- `src/scripts/book.ts`: the §B4 state machine.
  - Radio choice, show and hide, and template cloning plus focus, through a `showZone(zone: ZoneKey)` function that 3B will call.
  - `loadPlaces()` is a stub that does nothing yet. Leave it as a clearly marked hook for 3B and **don't load Google**.
  - Plain DOM APIs only, no frameworks.
- `tests/geo.test.ts`, using synthetic shapes:
  - inside and outside a square
  - a point inside a hole → false
  - a MultiPolygon
  - a point in two overlapping zones → precedence (`shared` wins over `home` and `north`)
  - a point in nothing → `'out'`
  - the closed-ring form works

## Read-only
All contract files except the geo.ts bodies.

## Constraints
- `book.ts` is imported **only** by `book/index.astro`. All other pages, including `/book/[zone]`, ship zero JS.
- No literals: names, days, fees and links come from `site`. The button href comes from `bookingUrl()`, and placeholder buttons carry `data-placeholder`.
- The `out` card must never contain a booking link.
- Keyboard: radios, buttons and links all work by keyboard. After `showZone`, focus is on the result heading. The result region has `aria-live="polite"`.
- With JS disabled, the office and mobile sections both show, and all zone links work.

## Done when
1. `npm test` passes, including `geo.test.ts`.
2. `npm run build` succeeds.
3. `npm run check:wording` exits 0.
4. `ls dist/book` shows `home.html shared.html north.html out.html office.html`, and `dist/book.html` exists (`build.format: 'file'`).
5. `grep -l '<script' dist/book/*.html` prints nothing. `dist/book.html` references one script.
6. `grep -o 'href="[^"]*"' dist/book/out.html` shows no pocketsuite link. `dist/book/home.html` shows the general PS link with `data-placeholder`.
7. In `npm run dev`, check these by hand (or with browser tooling):
   - Radios toggle the sections.
   - Calling `showZone('north')` from the console renders the North card in `#zone-result` and focuses it.
   - Tab order is logical.
   - With JS disabled (DevTools), the page is fully usable through the links.

## Report
(Sonnet)

## Review
(Opus)
