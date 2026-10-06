# 7A: Brian's Oct 6 review: contracts, map architecture, copy

Model: opus
Source: Brian's screenshots and notes (Oct 6, 2026), plus four confirmed fact changes.

## Decisions (Brian, Oct 6 2026)
- Map: zoom to fit the chosen zone **and** grey out the others. Pin on the entered address.
- Map technology: **our own SVG map** (zones + OSM major roads + town labels), not a Google map. Brian is sceptical but wants to see it. The rollback design is at the end of this file. The My Maps viewer stays as the "Open the map in Google Maps" link; the iframe is gone.
- The phone number is a business line, so the git history stays as it is.
- No phone number anywhere on the site, including the footer and JSON-LD. Out-of-region contact is the PocketSuite lead form (primary), chat, and email. The boundary line uses chat.
- Pricing moves to its own page and shows the mobile totals.
- Travel fee: two sessions back to back at the same place → **neither** pays the fee.
- Initial assessment rate removed. Home zone days: Tuesdays and Fridays. Office days: Tuesdays, Wednesday evenings, Fridays, and Saturdays (the Wed 8:00 PM slot is office only).

## Item map
| # | Brian's item | Where it landed |
|---|---|---|
| 1 | Initial map zoom too far in | SVG full view fits all zones (§B4); My Maps viewer link `map.zoom` 12 → 11 (`site.ts`) |
| 2 | Keep the map after choosing; zoom to the zone, grey the others | Picker intercepted on `/book`; `focusZone` swaps the viewBox (§B4). `/book/[zone]` renders the same state statically |
| 3 | Pin on the entered address | SVG pin projected with `mapview.ts` (§B4) |
| 4 | "Where are you located?" → areas → "Not sure? Enter your address" | `/book` markup order + copy deck → Book |
| 5 | Map unlabeled; hard to match to the buttons | Zone names and road names drawn on the map; `--zone-*` tokens make the fills match the button swatches; map hint; click a zone to choose it |
| 6 | Highlight the matching button after an address match | `aria-current="true"` + filled style (§B3 ZonePicker) |
| 7 | Out card awkward when picked by button; Call/Text on desktop | `via` prop with two headings; ContactButtons → lead/chat/email; phone removed |
| 8 | Desktop behaviour of the "Text me" link | Chat link instead |
| 9 | Neuromuscular section in plain terms; drop the definitions | Copy deck → Services; glossary deleted |
| 10 | Pricing table unappealing; minutes redundant; own page | `/pricing` + `PriceTable` (office / at your place) |
| 11 | Travel-fee waiver wording, everywhere | `site.travelFee.note` |
| 12 | Remove the initial assessment | `site.rates.initial` deleted; BRIEF §4 |
| 13 | Show both mobile totals | `PriceTable` "At your place" column, computed |
| 14 | `zones.home.days` | `site.ts`; BRIEF §6 table |
| 15 | `office.days` | `site.ts`; BRIEF §6. "I'm there Tuesdays, Wednesday evenings, Fridays, and Saturdays." reads fine on OfficeCard and Services |

## Research (Oct 6 2026)
- OSM via Overpass: all the roads exist. Names: `North/South Academy Boulevard`, `East/West Woodmen Road` (trunk/secondary), `North/South Powers Boulevard`, `East/West Garden of the Gods Road`, `Austin Bluffs Parkway`, `Baptist Road`, `Templeton Gap Road` (tertiary). Route numbers: `I 25`, `US 24`, `CO 83` (not "SH 83"). About 1,000 ways and 6,600 points before simplifying. `overpass-api.de` answered "too busy" once, then worked; `overpass.kumi.systems` failed. Hence the retry in `npm run osm`.
- Google deprecations page: `google.maps.Marker` deprecated Feb 2024 (no sunset date yet). KML Layer deprecated Apr 30 2026. Drawing and Heatmap gone May 2026. **The Data layer and OverlayView are not deprecated.** So: Data layer from our own geojson, and an OverlayView pin. No Map ID needed.
- Pricing page: creating a `google.maps.Map` bills **Dynamic Maps**: 10,000 free a month, then $7.00 per 1,000. A Map ID doesn't change that.
- `https://pocketsuite.io/lead/ohm-precision-bodywork` and `/chat/ohm-precision-bodywork` both return 200.

## Contract edits made here
- `src/data/site.ts`: removed `phone`, `telHref`, `smsHref`, `rates.initial`, `mapEmbedUrl`, `map.headerColor`; added `contact`; `office.days`, `zones.home.days`, `travelFee.note`, `map.zoom`.
- `src/styles/tokens.css`: `--zone-home|shared|north|muted`.
- `src/lib/geo.ts`: `BBox`, `bboxOf` (checked against the real zones: all `[-104.93, 38.7427, -104.7009, 39.0567]`).
- ARCHITECTURE, copy deck, BRIEF (§1, §4, §5, §6) updated.

## Notes
- The build is broken until 7B, because components still import the removed exports.

## Alternative: Maps JS map (rollback design, not built)
The first 7A draft. Use it if Brian rejects the SVG map.
- `google.maps.Map` with no `mapId` (raster), loaded with Places (`importLibrary('maps')` alongside `'places'`). Options: `gestureHandling: 'cooperative'`, `clickableIcons: false`, `mapTypeControl`, `streetViewControl` and `fullscreenControl` off.
- Zones through the Data layer (`map.data.addGeoJson(zones)`; not deprecated as of Oct 2026), styled from `--zone-*` read with `getComputedStyle`. `fitBounds(bboxOf(...), 24)` for the initial view and per zone; the other zones are muted with `--zone-muted` at low opacity. Polygon click → select.
- Pin: a `google.maps.OverlayView` subclass drawing an inline SVG. `google.maps.Marker` is deprecated (Feb 2024), and `AdvancedMarkerElement` needs a Map ID.
- Fallback: keep the My Maps iframe (zoom 11) for no JS or no key. Detach it at init when a key exists, and re-attach it on failure. `gm_authFailure` fires once a map exists, so it must trigger the fallback.
- Cost: Dynamic Maps, one load per visitor choosing "At your place". 10,000 free a month, then $7.00 per 1,000. Cap `Map loads per day` at 300.
