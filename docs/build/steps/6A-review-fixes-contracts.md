# 6A: Site review fixes: brief, contracts, copy

Model: opus
Source: Brian's site review, Oct 5 2026 (10 items). The code half is step 6B.

## Done in this step
- **Brief §6 / §14:** Monument → "out of the service area (decided Oct 5, 2026)". The east-of-Academy text is unchanged.
- **`site.ts`:**
  - `travelFee.note` gets the new waiver wording.
  - New `outOfRegionFeeNote`.
  - New `map` parts (`mid`, `center`, `zoom`, `headerColor: '125245'`), with `mapEmbedUrl` / `mapViewerUrl` built from them. The embed URL equals Brian's string with `ehbc=125245`; the viewer URL is unchanged. Both were checked by running the code.
  - Rates and "From $90" untouched.
- **Map header color: green `125245`.** My Maps renders the title bar text in white. White on `#125245` is about 9:1. White on `#C37A5B` is about 3.4:1, which fails AA for normal text. Green also continues the page's green surfaces, while terracotta is reserved for the CTA, logo and H1 rule (ARCHITECTURE §A3). 6R confirms the text color on the live embed.
- **New `src/data/glossary.ts`:** ischemic compression, PNF stretching, referred pain. Each describes what happens, with no outcome claim.
- **Copy deck:** ZoneCard out note, MapEmbed title, the Services worked example and glossary, the About glossary.
- **ARCHITECTURE:** §A1 hex exception, §B1 file map, §B2, §B3 (ZoneCard, Glossary, MapEmbed), §B5 zones script, §C log.
- **`.gitignore`:** `*.kml`, `*.kmz`, `*.kml.xml` added (`brief/*` was already ignored).
- **Local, not committed:** Brian's cleaned KML copied to `brief/Ohm Service Map.kml`. The old export is kept as `brief/Ohm Service Map.old.kml`.
- **KML check:** the new polygons are identical to the committed `zones.geojson`. Only the placemark names changed: they were Home Region / Shared Zone / North Region, and now equal the client-facing zone names.
- **Monument on the site:** it doesn't appear on any page today. `zone.area` isn't rendered, `areaServed` is Colorado Springs + Manitou Springs, and the footer summary has no Monument.

## §6 descriptions vs KML polygons (brief §14): TODO(Brian)
These come from probe points against `zones.geojson`. Road positions are approximate, so confirm each one on the map. The descriptions were **not** edited.

1. **North, "east of Hwy 83":** north of roughly Interquest Pkwy, the North polygon's east edge runs along about −104.78, which looks like Hwy 83. The zone there is **west** of Hwy 83 (39.02, −104.80 is North; 39.02, −104.76 is out).
2. **North, west edge:** the polygon reaches west to about −104.89, past I-25. It includes the east side of the Air Force Academy (38.998, −104.861 is North). §6 gives no west limit.
3. **North, "up to Baptist Rd":** the north edge is at 39.0567. Check that this follows Baptist Rd and doesn't overshoot it.
4. **North, Cordera:** the NE edge cuts diagonally from about (38.974, −104.701) to (38.995, −104.777). The northern part of Cordera may fall outside (38.986, −104.73 is out). §6 lists Cordera in North.
5. **North, east of Powers:** north of Woodmen, the polygon reaches −104.70, east of Powers (38.955, −104.705 is North). §6 is silent on this. It probably covers Wolf Ranch; confirm it's intended.
6. **Home, "includes Broadmoor Bluffs":** the west edge runs near −104.86, so the west side of Broadmoor Bluffs is out (38.77, −104.87 is out). This was already noted in the fixture.

The Shared east edge follows Academy Blvd as it curves northwest to Woodmen, which matches "west of Academy". No difference there.

## Report
- **Checks:** `npm test` passes 23/23 after the `site.ts` changes. Embed and viewer URLs were checked against Brian's strings.
- **TODO(Brian):** items 1–6 above. Also the out-of-region fee amount, and whether brief §4's `travelFee.note` example should get the new waiver wording.
