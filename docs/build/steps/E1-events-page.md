# E1: Events framework and the /launch-party page (I-048)

Brief §2, §3, §5 (`/<event>`), AC-5, AC-6, AC-9 · Architecture §B10 (all but the RSVP form), §B3 `Base` (`ogImage`), §B6, §B7

## Goal
`src/data/events.ts` holds the launch party exactly as the copy deck → Events → Launch party gives it (plus `rsvpText`, transcribed now so E2 and E3 only read it), with the §B10 types and guards. `src/pages/[event].astro` renders `/launch-party` from it through the five shared components (hero without the RSVP button, host, timeline, info blocks, notice), `/events/launch-party.ics` and `/events/launch-party.json` are built, `Base` gains `ogImage`/`ogAlt`, and the sitemap adds only `index: true` events. No form yet (E2), no script. Read-only here: `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `src/data/site.ts`, `src/styles/tokens.css`. Known gaps: the host photo `marea_host.jpg` was not in Brian's synced Drive (`G:\My Drive\Ohm_PrecisionBodywork\launch party\` holds only the four graphics). If it is still missing, ship `host` without `photo` (name only) and a `TODO(Brian): marea_host.jpg` comment, and say so in the report. `maxGuests` 3 and the 10:00 am reminder carry `TODO(Brian)` comments.

Notes:
- Graphics: copy `Header_Green.png` → `header-green.png` and `Launch_OnDarkBackgrounds.png` → `launch-mark-on-dark.png` from that folder as-is. Host photo: one `node -e` with `sharp` (already a transitive dependency): 1200px long edge, `jpeg({ quality: 80 })`, no `withMetadata`. No new dependency, no npm script.
- `events.ts` has no imports (Node type stripping); `event-assets.ts` uses `import.meta.glob('../assets/events/**/*.{png,jpg}', { eager: true })` and throws `missing event asset: <path>` at build.
- `getStaticPaths` goes through an exported pure `eventPaths(events)` in `src/lib/events.ts`, so a test can feed it two events.
- Astro escapes `'` as `&#39;` and adds `data-astro-cid-*`: decode and strip tags before comparing text. Dist tests skip with a reason when `dist/launch-party.html` is missing.

## AC covered (IDs)
- AC-9 (data only): tests 1, 6, 8. AC-6: test 8. AC-5: Done when 3.

## Files
- src/data/events.ts
- src/lib/events.ts
- src/lib/event-assets.ts
- src/pages/[event].astro
- src/pages/events/[slug].ics.ts
- src/pages/events/[slug].json.ts
- src/components/events/EventHero.astro
- src/components/events/EventHost.astro
- src/components/events/EventTimeline.astro
- src/components/events/EventInfo.astro
- src/components/events/EventNotice.astro
- src/layouts/Base.astro
- src/pages/sitemap.xml.ts
- src/assets/events/launch-party/header-green.png
- src/assets/events/launch-party/launch-mark-on-dark.png
- src/assets/events/launch-party/marea-host.jpg
- tests/events.test.ts

## Tests first (write them and see them fail before writing code)
`tests/events.test.ts`:
1. Data equals the copy deck: title, venue, the four timeline titles and notes, the wear items, parking, raffle, waiver title, text and URL, typed in the test; `start`/`end`, session `{ key: 'yoga', label: 'Yoga', item: 1, limit: 20, waitlist: true }`, `showGoing: false`, `index: false`; the note `Limited to first 20 sign-ups` changes when `limit` does (build the entry with 12: note says 12). `rsvpText` equals the copy deck's RSVP text table, parsed from `docs/build/copy-deck.md` (one-key rows; split the `·` rows), so a changed line fails.
2. Guards (`assertEvent`): each throws with a clear message: slug `Launch_Party`, a duplicate slug, slug `book` and every other name in `RESERVED_SLUGS`; `RESERVED_SLUGS` covers every top-level entry of `src/pages/` and `public/`; `end` before `start`; `2026-11-22T14:00:00-06:00` (wrong offset for that date); `session.item` 9; `showGoing: true` → `showGoing has no design yet (I-049): decide what it shows first`.
3. Labels: `dateLabel` → `Sunday, Nov 22, 2026`; `timeLabel` always `2:00–6:00 pm`; auto `1:45 pm`, `2–3 pm`, `3–6 pm`, `6–8 pm`, and `11:30 am–1 pm` for a synthetic item; no U+202F anywhere.
4. ICS: every line ends CRLF and is ≤ 75 octets; `DTSTART:20261122T210000Z`, `DTEND:20261123T010000Z`, `UID:` + slug + `@` + the site host (build the string in the test, or `check:secrets` flags it as an email), `LOCATION:CityROCK\, 21 N Nevada Ave\, Colorado Springs\, CO 80903`; sequence: a 200-character title folds, then unfolding gives the title back.
5. `mapsUrl` → `https://www.google.com/maps/search/?api=1&query=CityROCK%2C+21+N+Nevada+Ave%2C+Colorado+Springs%2C+CO+80903`.
6. `eventPaths`: the real list gives one path `launch-party`; the list plus a synthetic event (no `rsvp`, no `host`) gives two, and `feedFor` on the synthetic one throws (no feed without `rsvp`).
7. Feed: keys exactly as §B10; `session.time` `2–3 pm`; `reminderInfo` = wear then parking; `notices` = the waiver; `sender.replyTo === site.email`; no `showGoing` key; no other `@`.
8. Source: no file under `src/` except `events.ts` contains `CityROCK`, `Wahsatch` or `launch-party` (asset paths inside `events.ts` are fine); no hex in the new components.
9. Dist: `launch-party.html` has the H1, `<meta name="robots" content="noindex">`, canonical `https://ohmprecisionbodywork.com/launch-party`, an absolute `.jpg` `og:image` with width 857, height 450 and the `og:image:alt`; four timeline `<li>` in order, each with `<time datetime="2026-11-22T…-07:00">`; the maps link with `target="_blank"`; the calendar link `/events/launch-party.ics` with `download`; the waiver link; no `<form`, no `<script>` except JSON-LD; the host `<img>` has `alt`, `width` and `height` (skipped with a reason when there's no photo). Other pages keep the 1200×630 default. `sitemap.xml` has no `launch-party`; `dist/events/launch-party.json` deep-equals `feedFor`; the `.ics` exists.

## Done when
1. `npm run check` passes (paste any `check:wording` warnings; expect only the existing three).
2. `npm run shots -- E1`: `launch-party` at 375 and 1280 px in `docs/build/screens/E1/`: the narrow mark on phones, the wide banner from 48rem, the timeline readable with times beside (1280) or above (375), the hollow last marker, the notice box last.
3. Lighthouse mobile on `astro preview` `/launch-party`: performance, accessibility, best practices ≥ 90 (SEO is held down only by the deliberate `noindex`, like `/hello`).
4. `marea-host.jpg` under 250 KB with no EXIF (`sharp(...).metadata()` has no `exif`), or the report says the photo is missing.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
