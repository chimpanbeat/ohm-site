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

**Files changed**
- `src/lib/geo.ts`: bodies only (ray casting, holes, MultiPolygon, precedence from `site.zonePrecedence`, none → `'out'`). Exports and types untouched.
- `src/data/zones.geojson`: the three placeholder rectangles from the step file.
- `src/components/ContactButtons.astro`: Call / Text / Email links (`telHref`, `smsHref`, `mailHref`).
- `src/components/OfficeCard.astro`: heading `id="office-h"`, `site.officeArea`, `I'm there {site.office.days}.`, "Book at the office" → `bookingUrl('office')`.
- `src/components/ZoneCard.astro`: per §B3. Heading has `tabindex="-1"`. The `out` card has no booking link.
- `src/components/ZonePicker.astro`: four plain links over `zoneOrder`, `aria-current="page"` on `current`.
- `src/components/MapEmbed.astro`: iframe (4:3 → 16:9) plus "Open the map in Google Maps" link; renders nothing if `mapEmbedUrl` is empty.
- `src/pages/book/index.astro`: markup per §B4; four `<template data-zone>` cards at heading level 3; one script import.
- `src/pages/book/[zone].astro`: static `home | shared | north | out | office` pages, no JS.
- `src/scripts/book.ts`: state machine, exported `showZone(zone)`, `loadPlaces()` stub marked `TODO(3B)`. It never loads Google.
- `tests/geo.test.ts`: 7 tests (inside/outside, closed vs open ring, hole, MultiPolygon, precedence, `(lat, lng)` → `[lng, lat]` order, none → `'out'`).

**Checks** (all re-run after `site.ts` changed on disk mid-step, with the same results)
1. `npm test`: 13 pass, 0 fail (7 new geo tests plus the 6 existing).
2. `npm run build`: succeeds, 10 pages.
3. `npm run check:wording`: exit 0, "check:wording OK".
4. `ls dist/book`: `home.html north.html office.html out.html shared.html`; `dist/book.html` exists.
5. `grep -l '<script' dist/book/*.html`: prints nothing. `dist/book.html` has exactly one `<script type="module">` (inlined by Astro, 442 chars, no Google reference).
6. `out.html` has 0 `pocketsuite` matches, and the `out` template in `book.html` links only to `tel:`, `sms:` and `mailto:`. `home.html` shows `https://pocketsuite.io/book/ohm-precision-bodywork` with `data-placeholder`.
7. Dev server, driven in headless Chrome over CDP (no dependencies added):
   - Load: `#where` visible, `#office` and `#mobile` hidden, no radio checked.
   - Radios toggle the sections both ways.
   - `showZone('north')` renders the North card into `#zone-result` (`aria-live="polite"`) and focuses its H3. The button points at the general PS link with `data-placeholder`.
   - `showZone('out')` renders the out card with only Call, Text and Email.
   - Tab order: contact buttons → four zone links → map iframe → "Open the map in Google Maps" → "Text me" → footer. Logical.
   - With scripts disabled: `#where` hidden, office and mobile both visible, all four picker links and the office button work.
   - `/book/north`: H1 "Book a session", H2 for the North card, `aria-current` on North.

**Deviations**
- `showZone` is attached to `window` only under `import.meta.env.DEV`, so the step's console check works. It is absent from production builds.
- `book.ts` unchecks the radios on init, so browser-restored form state can't leave sections hidden.
- `[hidden] { display: none !important }` is scoped in `book/index.astro` so later `display` rules can't un-hide the sections.

**TODO(Brian)**
- None new in code beyond the `TODO(3B)` marker in `book.ts`.

**Questions for Opus**
1. New visible copy not in §B3 or §B4. Please approve or replace:
   - OfficeCard heading "At my office" (reuses the radio label).
   - ZoneCard travel-fee line: `Travel fee $25. {site.travelFee.note}`. §B3 said "travel fee note"; the amount comes from `site.travelFee.amount`, and the note already has its own wording.
   - `/book/[zone]` links: "Back to booking options" → `/book`, and "At my office" → `/book/office` (hidden on the office page).
2. ZonePicker links use the `btn btn--quiet` style rather than bare text links. §B3 says "plain links". Say if you want them plainer.
3. `OfficeCard` has a fixed `id="office-h"` (needed by `aria-labelledby`). It appears once per page, so there is no clash, but it is a fixed id inside a component.

## Review
(Opus)

**Accepted** (2R, 2026-10-05). Re-ran checks 1–6: all pass as reported. Read the full diff.

- `geo.ts`: correct. Horizontal edges never reach the division (the `yi > y !== yj > y` guard short-circuits), empty rings return false, holes subtract, MultiPolygon is "any", precedence follows `site.zonePrecedence`, and `[lng, lat]` order is tested.
- `/book/[zone]` ships no JS. The `out` card and the `out` template link only to `tel:`, `sms:` and `mailto:`.
- The live region, `tabindex="-1"` headings and focus-after-clone match §B4. The no-JS path shows both sections with working links.
- Deviations accepted: the dev-only `window.showZone`, unchecking restored radios, and the scoped `[hidden]` rule.

Answers:
1. All three strings are approved and now recorded in ARCHITECTURE §B3/§B4: "At my office" (OfficeCard heading), `Travel fee ${amount}. {note}`, and "Back to booking options" / "At my office" on `/book/[zone]`.
2. Button styling for the picker is right. The brief calls them "manual zone buttons"; "plain links" in §B3 means `<a href>` with no JS, not unstyled.
3. The fixed `id="office-h"` is fine. OfficeCard renders at most once per page.

Note for 3B: in production the bundler drops `showZone` because nothing calls it yet. That's expected and resolves once 3B wires the combobox to it.
