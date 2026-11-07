# E4: Launch-party page edits after Marea's review (I-077, I-078, I-079, I-080)

Brief §5 (`/<event>`), §7, AC-5, AC-6, AC-9 · Architecture §A1, §A6, §B2 (`wording.ts`), §B6, §B10 (Data, Guards, Page 1–6, RSVP form, Privacy)

## Goal
`/launch-party` matches the copy deck → Events → Launch party after E4: the H1 is `A Celebration of Self-Care` (the header graphic now has `alt={graphics.alt}`; meta title, preview, `.ics`, feed keep the full `title`); the four-paragraph description (links and the `{ w }` licensure clause) opens the cream band above the schedule; schedule notes render `Rich` (the linked `Day pass purchase required`); the host section is gone and "This event made possible by…" (four credit links with images) is the last section; the waiver notice is a light box on the green band; at ≥ 48rem the banner is cropped by CSS so its words read about 1.45x larger; each guest's yoga yes/no shows its question; the new privacy line renders. **Already done by the architect (read-only here):** `src/data/events.ts` (new shape and data, `rsvpText.privacy`), `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `docs/runbooks/events.md`, `src/styles/tokens.css`, `apps-script/rsvp.js`. Known gaps: none block the build (open questions are in STATUS's E4 log line).

Notes:
- **wording.ts:** add `launchStateTest: ['', ' and passed his state test to become a licensed neuromuscular massage therapist']` with the doc comment given in §B2. Nothing else changes there.
- **lib/events.ts guards (§B10 Guards, E4):** https-only links in `description` and notes, https credit `url`s, `{ w }` keys must be keys of `wording` (import `wording` from `../data/wording.ts`), non-empty credit `name`/`role`/`image`. Export a pure `plainText(rich: Rich, variant: 0 | 1): string` (strings and link text joined; `{ w }` → `wording[key][variant]`) for the tests. The feed is unchanged (timeline, description and credits are not in it).
- **Components (§B10 Page):** new `EventRich` (inline only), `EventDescription`, `EventCredits`; `EventTimeline` notes through `EventRich`; `EventHero` H1 `heading ?? title`, `alt={graphics.alt}`, the wide crop CSS and `widths: [wide.width]` for the wide sources (if `height: 100%` does not resolve inside the `aspect-ratio` box, use `position: relative` on the picture and `position: absolute; inset: 0` on the img; same crop); `EventNotice` restyle; delete `EventHost.astro`; `[event].astro` order hero → description + timeline → info → RSVP → notice → credits, `ogAlt={event.graphics.alt}`. `RsvpForm`: drop `class="visually-hidden"` from the guest session `<legend>` only. Tokens only, no hex, no copy typed in components (test 8 also bans `CityROCK`, `Wahsatch`, `launch-party` outside `events.ts`).
- **Images (§B6):** `scripts/make-event-credits.mjs` (sharp, like `make-icons.mjs`), npm script `"event-images": "node scripts/make-event-credits.mjs"`, run by hand, not in `check` or CI. A `JOBS` table; a missing input exits 1 naming the file (inputs in `brief/` are gitignored). Every output 112 px tall, no metadata (sharp's default; never `withMetadata`), each under 25 KB:
  | Output (`src/assets/events/launch-party/`) | Input | `extract` (left, top, width, height) | Then |
  |---|---|---|---|
  | `marea-thumb.jpg` | `src/assets/events/launch-party/marea-host.jpg` | 0, 250, 580, 580 (face and hat; leaves out the cars and blurred plates, x ≥ 590) | 112×112, `jpeg({ quality: 80 })` |
  | `britt-thumb.jpg` | `brief/launch_party_graphics/britt_photo.jpg` (1238×1542) | 380, 230, 460, 460 (face and hair; leaves out "ABOUT ME" (ends y ≈ 212), the sparkles, the arrow at the right edge, the account icon and dots at the bottom) | 112×112, `jpeg({ quality: 80 })` |
  | `cityrock-logo.png` | `brief/launch_party_graphics/cityrock_logo.png` (2048×1170) | 12, 277, 2034, 677 (wordmark bbox 72–1986 × 337–894 plus 60 px of black) | `resize({ height: 112 })` (336×112), `png()`, black kept, opaque |
  | `johnmark-logo.png` | `brief/launch_party_graphics/johnmark_logo.png` (599×140) | none (already padded) | `resize({ height: 112 })` (479×112), `png()`, white kept |
  Tile rule: no keying, no transparency. Verify: `metadata()` has no `exif`, the sizes above, `channels` 3 on both PNGs, pixel (0,0) is (0,0,0) on CityROCK and (255,255,255) on JohnMark; look at each output with Read and confirm the crop notes in the table.
- **check-contrast.mjs:** add `['green-700 (link on light)', hex('green-700'), 'cream', hex('cream'), 4.5]`.

## AC covered (IDs)
- AC-9: tests 1–4, 6. AC-6: test 5. AC-5: Done when 3.

## Files
- src/data/wording.ts
- src/lib/events.ts
- src/pages/[event].astro
- src/components/events/EventRich.astro
- src/components/events/EventDescription.astro
- src/components/events/EventCredits.astro
- src/components/events/EventHero.astro
- src/components/events/EventTimeline.astro
- src/components/events/EventNotice.astro
- src/components/events/EventHost.astro
- src/components/events/RsvpForm.astro
- src/assets/events/launch-party/marea-thumb.jpg
- src/assets/events/launch-party/britt-thumb.jpg
- src/assets/events/launch-party/cityrock-logo.png
- src/assets/events/launch-party/johnmark-logo.png
- scripts/make-event-credits.mjs
- scripts/check-contrast.mjs
- package.json
- tests/events.test.ts
- tests/rsvp.test.ts
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/events.test.ts` (type the copy deck strings in the test):
1. Data: `title` unchanged, `heading` `A Celebration of Self-Care`; `plainText` of each description paragraph (variant 1) equals the deck's P1–P4; the four timeline titles and notes (flattened) incl. `Restorative Yoga with Britt`, `Mats provided, or bring your own` second, `Activities and merch` last, `Day pass purchase required` linking `https://climbcityrock.com/day-passes`; wear has three items; `credits` deep-equals the deck (heading with U+2026, names, roles, URLs, images, alts); `graphics.alt`; no `host` key. `credits.items[0].name === 'Maréa'` and is NFC; `JSON.stringify(party)` has no `Marea` (capital M). Sequence: `launchParty(12)` then `launchParty(20)`: the limit note follows each, `Mats` stays second.
2. Licensure both ways: P1 with variant 0 matches none of `/\bmassage|\bLMT\b|\blicen/i` and reads `… 650 hours of studies! 🎉 …`; with variant 1 it contains `passed his state test to become a licensed neuromuscular massage therapist! 🎉`; every string in `launchParty(20)` (JSON, `w` pieces excluded) matches none of that pattern.
3. Guards: on clones, in turn: an `http://` link in a note → `/https/`; then an `http://` credit `url` → `/https/`; then `{ w: 'nope' }` in the description → `/unknown wording key "nope"/`; then an empty credit `name` → throws; the real list and the synthetic event still pass.
4. Images: every path in `graphics` and `credits` exists; `marea-host.jpg` still exists.
5. Source: test 8 as is (now covering the new components); no `visually-hidden` on the guest session legend in `RsvpForm.astro`; `EventNotice.astro` uses `--bg-light`, `--green-300`, `--link-on-light` and no `--line-dark`; `EventHero.astro` holds `aspect-ratio: 11 / 4`, `object-fit: cover`, `object-position: 50% 50%`, `scale: 1.5152`, `max-width: 60rem` inside its `48rem` media block.
6. Dist: H1 text `A Celebration of Self-Care`; `<title>` and `og:image:alt` unchanged; the header `<img>` `alt` = `graphics.alt`; text order description P1 < `Schedule` < `What to wear` < `id="rsvp"` < `Important: Waiver Required` < credits heading; the licensed P1 sentence (via `w`) is in the text; Britt and day-pass links have `target="_blank"` and `rel` with `noopener`; four credit links in order, each with `target`/`rel`, an `<img>` with `width`, `height` and the data's `alt`, and the text `Maréa, host`, `CityROCK, venue space donated`, `Britt Maddy, yoga class generously provided`, `JohnMark, graphic design`; no `Your host`; still one non-JSON-LD script.
`tests/rsvp.test.ts`: privacy-line test unchanged (reads `rsvpText`); new: each `g{n}session` fieldset's `<legend>` has no `visually-hidden` class and its text is the filled `sessionQuestion` (`Joining yoga (2–3 pm)?`).

## Done when
1. `npm run check` passes; `check:contrast` prints the new pair ok; paste `check:wording`'s WARNs (expect the three existing plus "healthy").
2. `npm run shots -- E4`: `launch-party` at 375 and 1280 px in `docs/build/screens/E4/`. 1280: banner about 960×349, Ω to PARTY all inside with margin, nothing clipped; H1 under it; description then schedule on cream; notice a cream box with a visible border on green; credits last, four across, then the footer. 375: the narrow mark as before (uncropped), credits one per row, the guest card (JS on, one guest added) shows `Joining yoga (2–3 pm)?` above Yes/No.
3. Lighthouse mobile on `astro preview` `/launch-party`: performance, accessibility, best practices ≥ 90.
4. `npm run event-images` reruns without error and prints the four outputs with the sizes in the table; `src/assets/events/launch-party/` holds exactly `header-green.png`, `launch-mark-on-dark.png`, `marea-host.jpg` and the four new files.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
