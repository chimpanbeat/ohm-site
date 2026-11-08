# E5: Launch-party edits, round 2: Brian's five requests and Marea's second review (I-085, I-086)

Brief §5 (`/<event>`), AC-5, AC-6, AC-9 · Architecture §B6 (credit images), §B10 (Data, Page 1–3 and 6, RSVP form → Guest card spacing)

## Goal
`/launch-party` matches the copy deck → Events after E5: the CityROCK and JohnMark logos are transparent RGBA PNGs drawn with no frame on the cream band (photos keep theirs); each credit shows the name in bold with its role on its own line below, smaller, capitalised, no comma (`Host`, `Venue`, `Yoga instruction`, `Graphic design`); at ≥ 48rem the banner fills the container column, left edge on the H1's, `aspect-ratio: 31 / 10`, `scale: 1.6129`; the page has H2s Description, Schedule, Details and RSVP, with the info blocks as H3s under Details; the guest card has space between the name and the yoga question; the schedule shows `Optional Tai Chi by John Marshall` after `Activities and merch` and `Harness and shoe rentals available`. Runs **after E6** (keep E6's tip card and its tests). **Already done by the architect (read-only here):** `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, and in `src/data/events.ts` the shape (`Credit.logo`, `eventHeadings`). Known gaps: none block the build (open questions are in STATUS's E5/E6 architect log line).

Notes:
- **`src/data/events.ts`: data values only** (listed below so the guard lets you; change nothing else):
  - `credits.items`: `role` → `'Host'`, `'Venue'`, `'Yoga instruction'`, `'Graphic design'`; add `logo: true` to CityROCK and JohnMark.
  - timeline item 2 `notes`: `['Open house style, come and go as you please', 'Refreshments provided', 'Activities and merch', 'Optional Tai Chi by John Marshall']` (comment `// I-086 (Marea)`).
  - timeline item 3 `notes[1]`: `'Harness and shoe rentals available'` (comment: rentals cost extra, I-086).
- **Images (§B6; `scripts/make-event-credits.mjs`, then `npm run event-images`):** **CityROCK: Brian supplied a transparent original (Nov 7), so no keying.** Its job becomes `input: 'brief/launch_party_graphics/cityrock_logo.avif'` (7559×4571 RGBA, already transparent; sharp reads it) with `extract: { left: 19, top: 1320, width: 7478, height: 2174 }` (the ink's bounding box, measured at alpha > 8), `resize({ height: 112 })` → **385×112**, `.png({ compressionLevel: 9 })`, no `key`. The architect's test run gave 385×112, 4 channels, 19,046 bytes. **JohnMark (white background, keyed):** add `key: 'white'` to its job and key at full resolution after `extract`, before `resize`: `.removeAlpha().raw()`, a per-pixel loop into a 4-channel buffer, then `sharp(buf, { raw: { width, height, channels: 4 } }).resize({ height: 112 }).png()`. White: `n = min(r,g,b)`, `a = min(1, (255 − n) / 215)`, rgb `= round((c − 255(1 − a)) / a)` clamped (all 0 when `a = 0`). New JohnMark extract (left, top, width, height): `17, 0, 570, 140` → 456×112 (its ink starts at x 0, lined up with the text below). Photo jobs unchanged. Update the header comment (E4's tile rule is reversed; the CityROCK source is a transparent avif). **Verify** (a one-off `node -e` with sharp; nothing committed): no `exif`; `channels` 4; the sizes above; each under 25 KB; CityROCK pixel (0,0) alpha 0 and a pixel inside a blue letter within ±6 of (25,111,162,255) (find one by scanning for the first alpha-255 pixel of that hue; the C's left stem is near x 20, y 55 in the output); JohnMark (0,0) alpha 0 and (1,56) alpha ≥ 250 with r, g, b ≤ 45. **Fringe look:** composite each onto `--cream` (read the value from `src/styles/tokens.css`) in your scratch folder, enlarge 2x and 4x with `kernel: 'nearest'`, and Read them: no dark ring or white halo around CityROCK's letters or carabiner, and for JohnMark no light halo or grey haze around the strokes. If JohnMark shows a halo, add a white point (`a = clamp((240 − n) / 200)`). Re-run, re-look, and report any change. Expected and fine: CityROCK's grey gate reads on cream (the carabiner gate is grey in the original; Brian accepted this, Nov 7). The architect's check of the avif on cream and on magenta showed clean edges and a transparent hole in the carabiner.
- **Components (§B10 Page):** `EventCredits` markup and CSS per Page 6 (`credit__img`, `credit__img--photo` only when `!credit.logo`, `credit__name`, `{' '}`, `credit__role` at `--fs-small`). `EventHero`: the wide block per Page 1 (drop `max-width: 60rem` and `margin-inline: auto` from `picture`; `aspect-ratio: 31 / 10`; img adds `margin-inline: 0`, `scale: 1.6129`), `wideSizes = '(min-width: 72rem) 70rem, calc(100vw - 2rem)'`, update its comment. `EventDescription`: `<h2>{eventHeadings.description}</h2>` first, `--s-6` to the first paragraph. `EventTimeline`: `<h2>{eventHeadings.schedule}</h2>`. `EventInfo`: `<h3>`, CSS per Page 3. `[event].astro`: the info section only when `event.info.length > 0`, `<h2>{eventHeadings.details}</h2>` before the blocks. `RsvpForm`: replace `.guest .group + .group` with `.guest .field + .group { margin-top: var(--s-4); }`. Tokens only, no hex, no copy typed in components.

## AC covered (IDs)
- AC-9: tests 1–5. AC-6: test 3 (no copy or hex in components). AC-5: Done when 3.

## Files
- src/data/events.ts
- scripts/make-event-credits.mjs
- src/assets/events/launch-party/cityrock-logo.png
- src/assets/events/launch-party/johnmark-logo.png
- src/components/events/EventCredits.astro
- src/components/events/EventHero.astro
- src/components/events/EventDescription.astro
- src/components/events/EventTimeline.astro
- src/components/events/EventInfo.astro
- src/components/events/RsvpForm.astro
- src/pages/[event].astro
- tests/events.test.ts
- tests/rsvp.test.ts
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/events.test.ts` (type the deck's strings):
1. Data (1a, 1b): `credits` deep-equals the deck (roles above, `logo: true` on CityROCK and JohnMark only); item 2's notes end `Activities and merch`, `Optional Tai Chi by John Marshall`; item 3's notes are the day-pass link then `Harness and shoe rentals available`; `eventHeadings` deep-equals `{ description: 'Description', schedule: 'Schedule', details: 'Details' }`. Sequence: `launchParty(12)` then `launchParty(20)`: `Mats` still second, the limit note follows each, the Tai Chi note is last in item 2 both times.
2. Images (no new dependency; read the PNG header: width bytes 16–19, height 20–23, colour type byte 25): both logos have colour type 6 (RGBA) and width × height 385×112 (CityROCK) and 456×112 (JohnMark); every credit path still exists.
3. Source (8b): `EventHero`'s 48rem block has `aspect-ratio: 31 / 10`, `object-fit: cover`, `object-position: 50% 50%`, `scale: 1.6129`, and none of `11 / 4`, `1.5152`, `max-width: 60rem`; `EventCredits` has `credit__role`, `var(--fs-small)`, `credit__img--photo` and no `</strong>,`; no `>Schedule<`, `>Description<` or `>Details<` literal in `EventTimeline`, `EventDescription` or `[event].astro`; `EventInfo` has `<h3>` and no `<h2>`; test 8 unchanged.
4. Dist outline (9c): every `<h1|h2|h3>` in `<main>` in order: H2 texts exactly `Description`, `Schedule`, `Details`, `RSVP`, `Important: Waiver Required`, `This event made possible by…`; the H3s between Schedule and Details are the timeline titles, between Details and RSVP `What to wear`, `Parking`, `Raffle`; no heading is more than one level below the previous one. Order: `<h2>Description` < P1 < `<h2>Schedule` < `<h2>Details` < `<h3>What to wear` < `id="rsvp"` < notice < credits. `Optional Tai Chi by John Marshall` directly follows `Activities and merch` in the same `<ul>`; `Harness and shoes provided` is gone.
5. Dist credits (9d): link texts `Maréa Host`, `CityROCK Venue`, `Britt Maddy Yoga instruction`, `JohnMark Graphic design`, no comma in any credit; each holds `<strong class="credit__name">` = name and `class="credit__role"` = role; the Maréa and Britt images have `credit__img--photo`, CityROCK and JohnMark do not; `target`, `rel`, `width`, `height`, `alt` as in E4.

`tests/rsvp.test.ts`: in every `.guest` the `span.field` is followed directly by the session `fieldset`; `RsvpForm.astro` holds `.guest .field + .group` with `margin-top: var(--s-4)` and no `.guest .group + .group`; E6's tip-card tests still pass.

## Done when
1. `npm run check` passes; `check:wording` WARNs unchanged (the three existing plus "healthy").
2. `npm run shots -- E5` plus a 768 px capture of `launch-party`: at 1280 the banner's left edge is the H1's (±1 px), it is 1120×361 (the container's content width), Ω to PARTY inside with about 43 px of margin left and 33 px top and bottom, nothing clipped; at 768 about 736×237; Description, Schedule and Details headings show; credits four across, logos transparent on cream with no box, photos framed, name bold with the role smaller underneath. At 375: the narrow mark as before; with JS on and one guest added, a clear gap between the guest's Name input and `Joining yoga (2–3 pm)?`. (Take the credits shots scrolled into view; the full-page shots leave lazy images blank.)
3. Lighthouse mobile on `astro preview` `/launch-party`: performance, accessibility, best practices ≥ 90; `heading-order` passes.
4. `npm run event-images` reruns without error, prints `cityrock-logo.png: 385x112` and `johnmark-logo.png: 456x112`; the Verify list holds; paste what the fringe look showed (and any knob changed).

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
