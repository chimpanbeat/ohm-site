# 8A: Brian's review of Phase 7: contracts, design, copy

Model: opus
Source: Brian's notes and screenshots after the Phase 7 preview (Oct 6, 2026). Brian gave the SVG map a **go** ("I actually like the new map a lot").

## Item map
| # | Brian's item | Where it landed |
|---|---|---|
| 1 | Colour-matched buttons too subtle | The zone buttons take their map tint as their whole background (`--zone-*-tint`, also used opaque by the map, so it's an exact match). A chosen area rings its button and dims the others, mirroring the map's grey-out. Linked hover in both directions (§B3, §B4) |
| 2 | Deselect a zone → zoom back out | `deselect()`: re-click the chosen button, click the focused area, or the "Show all areas" button on the map (§B4) |
| 3 | Office: map with an approximate pin; "Cheyenne Canyon / Broadmoor area" | `site.office.mapArea` (a 1.5 km circle, 2-decimal coordinates), `ServiceMap focus="office"`; `officeArea` text; OfficeCard "I send the exact address after you book." |
| 4 | Text too close to the H1 divider | One global spacing rule, ≥ `--s-8` (§A3) |
| 5 | Divider → subtle resistor symbol (ANSI/IEEE zigzag) | `h1::after` mask, spec in §A3 |
| 6 | Services intro: not spa, not no-pain-no-gain; clinical, meets you where you are | New `wording.notSpa` (unlicensed copy avoids the bare word "massage", §A6) + copy deck |
| 7 | Pricing: drop "already included in the column" | Copy deck |
| 8 | "FPGA design engineer" → "electrical engineer"; Om = "the sacred sound of yoga and meditation" | Copy deck (Home, About), BRIEF §1 and §8 |
| 10 | Home "Who it's for" rewrite (Brian's text) | Copy deck → Home block 1, verbatim. It passes §7: no medical-claim words, and "care team" keeps the work alongside clinicians |
| 11 | Replace the About bio (Brian's text) | Copy deck → About body, verbatim; the review TODO is closed |
| 12 | Home hero "desk-bound engineers": make it more like the bio | Copy deck → Home subline and meta description |
| 9 | "Open the map in Google Maps" too hidden | A quiet button with an external-link icon, directly under the map, above the hint |

## Decisions (Opus)
- **The office location is a circle, not a pin.** A teardrop reads as "the address". The circle is 1.5 km around 38.79, −104.86 (between North Cheyenne Cañon Park and the Broadmoor; `zoneFor` puts it in the home zone). The coordinates have 2 decimals, enforced by a test, because the repo is public. TODO(Brian): confirm it's the right neighbourhood.
- **The office map has no zones.** Zones are about mobile sessions; showing them next to the office would suggest the office has an area. The view is 12 km wide, centred on the circle.
- **Button colour = map colour, exactly.** In 7R the swatches mixed 35% in the browser. Now one token per zone (40%) feeds both, and the map fill is opaque. Ink text on each tint and each tint against green-900 go into `check:contrast`.
- **Services intro:** "This isn't a generic spa session, and it isn't no-pain, no-gain deep tissue torture. I take a clinical approach that meets you where you are." Then the existing assessment sentence. When licensed, "spa session" becomes "spa massage".
- **Why Ohm:** "Say the name out loud and you also hear Om, the sacred sound of yoga and meditation. Yoga is a big part of how I got here." This keeps the fact (About ¶2: yoga after rehab) separate from the definition of Om. Breathwork is dropped to match Brian's new bio.
- **About bio (item 11):** Brian's text, verbatim. ¶3's first sentence stays `{w:training}`; it's identical to Brian's sentence while unlicensed, so the licensed swap still works. CityRock and "5+ years climbing" are gone, at Brian's choice. "fix" in ¶1 warns in `check:wording`; that's expected (engineering context).

## Contract edits made here
- `src/data/site.ts`: `officeArea`, `office.mapArea`.
- `src/data/wording.ts`: `notSpa`.
- `src/styles/tokens.css`: `--zone-{home,shared,north}-tint`.
- ARCHITECTURE §A1, §A3, §A5, §B2–B4, §C; copy deck; BRIEF §1, §4, §8.
- The build still passes with these edits. The OfficeCard loses "(address sent after booking)" until 8B adds its new line, so don't deploy between 8A and 8B.
