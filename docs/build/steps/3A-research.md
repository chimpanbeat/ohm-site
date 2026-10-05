# 3A: Research and pin the Google and DNS specs

Model: opus
Brief: §3 (DNS), §6 (Google Maps / Places, zone data), §12 (test addresses), §14

## Do
1. **Google Places (New) via the Maps JS API.** Read Google's current docs and pricing (WebFetch / WebSearch) and confirm each of these:
   - the current recommended loader: the inline bootstrap `importLibrary` snippet, and whether it takes `v=weekly` and `loading=async`
   - the exact names and signatures of `AutocompleteSuggestion.fetchAutocompleteSuggestions`, the request fields (`input`, `sessionToken`, `includedRegionCodes`, `locationBias`/`locationRestriction`, `region`), and the response shape (`suggestions[].placePrediction.text`, `.toPlace()`)
   - `Place.fetchFields({fields:['location','formattedAddress']})`, and which SKU it bills under (Place Details Essentials?) when it ends a session
   - how session pricing works today (does autocomplete become free when the session ends with Details?) and the current free monthly caps
   - auth failure signalling (`gm_authFailure`) and what `importLibrary` does with a bad or missing key
   - the exact **quota names** in Cloud Console for `AutocompletePlacesRequest`, `GetPlaceRequest`, and Maps JS loads (§6 suggests 300/100/100)
   - whether loading Maps JS without a map counts as a "map load" (we never instantiate a map)
2. Write the pinned spec into `3B-zones-autocomplete.md`'s "Google spec" section: the loader snippet, the calls, the fields, the error paths, and the debounce and minimum-length values.
3. Write the README facts for 5A into `5A-seo-readme.md`'s "Pinned facts" section: the SKUs used, the quota names and suggested caps, and the cap → upgrade → budget-alert order (§14).
4. **GitHub Pages custom domain.** From GitHub's docs, get the current apex A and AAAA IPs, the `www` CNAME target, verification steps, the "Enforce HTTPS" timing, and whether the Pages *Actions* workflow needs a CNAME file. Write these into 5A's "Pinned facts". Porkbun specifics: how to delete a URL forward and add A/AAAA/CNAME. Note any Porkbun ALIAS option.
5. **Fixture coordinates.** Build `tests/fixtures/addresses.json` as an array of `{ label, query, lat, lng, expect, approximate: true, note? }` for the §12 addresses:
   - Old Colorado City → home
   - Broadmoor Bluffs → home
   - Garden of the Gods Rd & Centennial Blvd → shared
   - Briargate → north
   - Monument → out (note: "TODO(Brian): North polygon stops at Baptist Rd")
   - Falcon → out
   - Fountain → out
   - Academy Blvd & Platte Ave → out (decided Oct 5: east of Academy, south of Templeton Gap)

   Pick coordinates from public knowledge and check each against the real polygons by running a quick point-in-polygon on the KML. If a point lands near a boundary, move it to an unambiguous spot in the same neighbourhood and say so in `note`. Write the file directly; it's test data, not a contract.
6. Set 3A to `done`, then run the gate: 3B is Sonnet.
