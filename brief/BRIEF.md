# Ohm Precision Bodywork — Website Brief

Owner: Brian Clarke · Prepared Oct 4, 2026 · Updated Oct 5, 2026 (§6 key and quota details, new §14, repo is public) · Updated Oct 6, 2026 (no phone on the site, initial assessment removed, Pricing page, days, travel-fee waiver, interactive map) · Target: deployable preview this week

## 1. What this site is for

The site's most important job is to **send each visitor to the right PocketSuite booking link** with as little friction as possible. Everything else on the site supports that.

PocketSuite (PS) handles booking, availability, intake forms, contracts, payment, and reminders. The site does none of those things. It decides which PS link a visitor should use and sends them there.

### The business

- **Ohm Precision Bodywork LLC.** Solo clinical bodywork practice in Colorado Springs, CO. Mobile-first (sessions at the client's location), plus a home office.
- **Tagline:** "Reduce resistance. Restore movement."
- **Name meaning (usable in copy):** Ohm is the electrical unit of resistance, a nod to Brian's 12 years as an electrical engineer (say "electrical engineer", not "FPGA design engineer": Brian, Oct 6 2026) and to the tissue resistance he works on. It also sounds like *Om*, the sacred sound of yoga and meditation; yoga and breathwork are part of how he got here. The tagline carries both meanings.
- **Positioning:** clinical and results-oriented, not spa. Precise but human. Analytical clients (athletes, engineers, active people) respond to clear, evidence-based explanations rather than generic wellness language.
- **Audience, in priority order:**
  1.  Climbers and outdoor athletes (CityRock climbing gym is the anchor community).
  2.  Endurance athletes.
  3.  Chronic pain clients referred by chiropractors and PTs.
  4.  Technical professionals with desk-posture issues.
  5.  Military and veterans (secondary).

  Site copy (Brian, Oct 6 2026): Home "Who it's for" names active people broadly (climbers, runners, cyclists, lifters, hikers, non-athletes) plus persistent pain and injury/surgery recovery. It deliberately doesn't name desk workers or veterans, and neither does the home hero line or meta description (8A).
- **Contact:** <brian@ohmprecisionbodywork.com> · ohmprecisionbodywork.com · PocketSuite lead form and chat (links in §4). **No phone number on the site** (decided Oct 6, 2026).

## 2. Non-goals

Do not build any of the following:

- Intake, contracts, payments, or accounts.
- A CMS, backend, database, or serverless functions.
- Analytics that capture addresses.
- Storage or transmission of a visitor's address anywhere other than the Google autocomplete call.
- Any guessing of PocketSuite URLs. Use the placeholders in config until Brian supplies tested links.

## 3. Stack and hosting

- **Framework:** Astro, static output, TypeScript. Ship zero JavaScript except on the Book page (address check).
- **Hosting:** GitHub Pages, deployed with the official Astro GitHub Action.
  - Build to the default `*.github.io` URL first.
  - The custom domain `ohmprecisionbodywork.com` (DNS at Porkbun) is cut over later; see §10.
- **DNS cutover:**
  - Write step-by-step Porkbun instructions in the README.
  - Get the current GitHub Pages IPs and record types from GitHub's documentation at build time. Do not hardcode them from memory.
  - Remove the existing Porkbun URL forward (currently a 302 to the PS booking page).
  - Point `www` to the apex domain and enforce HTTPS.
- **Dependencies:** keep them minimal. A small point-in-polygon library (e.g., `@turf/boolean-point-in-polygon`) or a ~20-line ray-cast implementation is fine.
- **Images:** use Astro's built-in image processing (responsive `srcset`, AVIF/WebP). Do not commit original full-size camera files.

## 4. Single source of truth: one config file

Put all business facts in `src/data/site.ts`, a typed object that pages read from. No rate, day, link, or zone label is hardcoded in a page.

``` ts
export const site = {
  licensed: false,                 // flips wording rules (§7). Default false.
  licenseNumber: "",               // shown in footer only when licensed && non-empty
  email: "brian@ohmprecisionbodywork.com",   // no phone (Oct 6, 2026)
  officeArea: "Southwest Colorado Springs, in the Cheyenne Canyon / Broadmoor area", // exact address sent after booking; the /book map shows an approximate circle (Oct 6)
  rates: {                         // no initial assessment rate (removed Oct 6, 2026)
    s60:     { label: "60-minute session", minutes: 60, price: 90 },
    s90:     { label: "90-minute session", minutes: 90, price: 120 },
  },
  travelFee: { amount: 25, note: "Flat, per mobile session. Book two sessions back to back at the same place, like you and your partner, and neither one has a travel fee." },
  outOfRegionFee: null,            // TBD. Do not display an amount while null.
  contact: {
    lead: "https://pocketsuite.io/lead/ohm-precision-bodywork",
    chat: "https://pocketsuite.io/chat/ohm-precision-bodywork",
  },
  links: {                         // PLACEHOLDERS. Brian replaces these with tested PS links.
    office:  "TODO_PS_OFFICE",
    home:    "TODO_PS_HOME_REGION",
    shared:  "TODO_PS_SHARED_KEYWORD",
    north:   "TODO_PS_NORTH",
    general: "https://pocketsuite.io/book/ohm-precision-bodywork",
  },
  zones: { /* see §6 */ },
};
```

Packages and the friends-and-family rate are **not** shown on the site.

## 5. Pages

| Route       | Purpose            | Notes                                                                       |
|-------------|--------------------|-----------------------------------------------------------------------------|
| `/`         | Home               | Who Ohm is for, what a session does, one clear "Book a session" CTA. Short. |
| `/services` | Services           | See content below.                                                          |
| `/pricing`  | Pricing            | Rates at the office and at your place (with the travel fee), and the travel-fee rule. Added Oct 6, 2026. |
| `/about`    | About Brian        | Uses the provided photos. Draft copy from §8, marked for Brian's review.    |
| `/book`     | Booking router     | The core feature (§6).                                                      |
| `/404`      | Not found          | Plain, with a link to `/book`.                                              |

**Services page content:**

- **Session types:** neuromuscular therapy, sports and athletic recovery, myofascial / deep tissue work, and chronic pain and injury support (in collaboration with referring chiropractors and PTs).
  - Neuromuscular therapy is described in plain terms, like the others: working with the nervous system to reduce pain and restore movement, using a range of techniques. No technique glossary. Trigger points and referred pain are explained briefly, because knowing those patterns is what sets Brian apart (Oct 6, 2026).
- **Prices:** a short line with the starting price and a link to `/pricing`.

**Pricing page content** (Oct 6, 2026):

- A table with columns Session, At my office, At your place. No minutes column (the label already says it).
- At your place = rate + travel fee, computed from config: 60 min $90 + $25 = $115, 90 min $120 + $25 = $145.
- The travel-fee rule (`travelFee.note`).
- **Office vs mobile:** one plain paragraph explaining the difference.
- **Scope note:** sessions are not a substitute for medical diagnosis or treatment.

**Global elements:**

- **Header:** logo and nav (Services, Pricing, About, Book).
- **Footer:** email and a one-line service area summary (no phone) ("Colorado Springs and Manitou Springs; other areas by request"). Show the license line only when `licensed` is true and `licenseNumber` is set.
- Every page links to `/book`.

## 6. Booking router (`/book`)

### Flow

1.  **"Where do you want your session?"** Two choices:
    - **At my office:** show the office days and the `links.office` button. Office days are Tuesdays, Wednesday evenings, Fridays, and Saturdays. The Wednesday evening slot (8:00 PM) is at the office only (Oct 6, 2026).
    - **At your place (mobile):** go to step 2.
2.  **"Where are you located?"** The zone buttons come first, each with a colour swatch that matches the map. Then **"Not sure? Enter your address"**: the address field using Google Places autocomplete, restricted to US addresses and biased to Colorado Springs (order changed Oct 6, 2026).
    - On selection, get the latitude/longitude and test it against the zone polygons.
    - The matching zone button is highlighted, whether chosen by button or by address.
3.  **Result card.** Shows the zone's plain-language name, the days I'm in that area, the travel fee note, and one primary button to that zone's PS link.
    - Example: "You're in my Central & Southwest area. I'm there Tuesdays and Fridays."
    - The visitor stays on the page; the map stays visible.
4.  **Out of region:** from an address, "That address is outside my regular service area."; from the button, "Outside my regular service area". Then "I can sometimes travel outside my regular area by request." Show a PocketSuite lead form button, a PocketSuite chat button, and an email link. No booking link, no phone.
5.  **Map** (Oct 6, 2026): the site draws its own map (an SVG built at compile time) of the zones from `zones.geojson`, plus the major roads that bound them and nearby town names from OpenStreetMap. No map service and no per-view cost. Brian is trying it; the fallback plan is a Google Maps JavaScript map.
    - Zone names are labelled on the map, and the zone colours match swatches on the zone buttons.
    - The first view fits all zones (the old My Maps view was zoomed in too far).
    - Choosing a zone zooms to fit it and greys out the other zones. Clicking a zone on the map chooses it.
    - A pin marks the entered address.
    - It works without JavaScript or the key: the static map shows, and `/book/<zone>` shows it focused on that zone.
    - "Open the map in Google Maps" links to Brian's My Maps viewer. The My Maps iframe is no longer embedded.
6.  A "Near a boundary or can't find your address? Chat with me" line (PocketSuite chat). Boundaries are approximate.

### Zones

| Key      | Client-facing name (draft)  | Days                         | PS link                                                             |
|----------|-----------------------------|------------------------------|---------------------------------------------------------------------|
| `home`   | Central & Southwest Springs | Tue, Fri                     | `links.home`                                                        |
| `shared` | Mid-north Springs           | Tue, Wed, Fri                | `links.shared`, a keyword link showing both home and north services |
| `north`  | North Springs               | Wed                          | `links.north`                                                       |
| `out`    | Outside regular area        | By request                   | contact only                                                        |

Rough boundary descriptions (for copy and alt text only; the polygons decide):

- **Home:** inside Academy Blvd to the east and south, west to Manitou Springs, north to Garden of the Gods Rd / Austin Bluffs Pkwy. Includes Broadmoor Bluffs.
- **Shared:** from Garden of the Gods / Austin Bluffs north to Woodmen Rd, west of Academy.
- **North:** north of Woodmen Rd up to Baptist Rd, east of Hwy 83, including Briargate, Wolf Ranch and Cordera; also east of Academy between Austin Bluffs/Templeton Gap and Woodmen, west of Powers. Monument is out of the service area (decided Oct 5, 2026).
- **Out of region:** east of Academy Blvd, Black Forest, Falcon, Fountain, Security-Widefield.

### Zone data

- Brian will provide a KML export of his Google My Map. Convert it to `src/data/zones.geojson` with a script committed to the repo (`npm run zones`), so a re-export is a one-command update. Document this in the README.
- Each polygon has a `zone` property matching the keys above.
- If a point is in more than one polygon, use this precedence: `shared` over `home` or `north`.
- A point in no polygon is `out`.
- The export may contain more than zone polygons (pins, placemark notes, a home location). The `npm run zones` script must keep only the polygons and their `zone` names, and nothing else may be committed to the repo from the KML.

### Google Maps / Places

- Use the **Places API (New)** through the Maps JavaScript API.
- Implement **session-based autocomplete** that ends with a Place Details call requesting only the `location` and `formattedAddress` fields. This keeps sessions in Google's free tier.
- Before implementing, check Google's current Places pricing and usage documentation and note in the README which SKUs the implementation uses.
- The API key goes in an env var (`PUBLIC_GOOGLE_MAPS_KEY`). It is public by design; its protection is the restrictions below.
- Write the README steps for Brian to:
  - Confirm the key's HTTP referrer restrictions. Brian has already set `https://chimpanbeat.github.io/ohm-site/*` and `http://localhost:4321/*`; the production domain is added on license day (§10).
  - Confirm the key is restricted to the Maps JavaScript API and Places API (New) only (already set).
  - Set daily quota caps after the Google Cloud account is upgraded from the free trial (the console blocks quota edits during the trial; see §14). Suggested: `AutocompletePlacesRequest` per day 300, `GetPlaceRequest` per day 100, Maps JavaScript API map loads per day 100. Verify the quota names and numbers against the console and Google's current docs.
- Load the Maps script only on `/book`, and only after the visitor chooses mobile.
- If the script fails to load or the key is missing, hide the address field. The map and the manual zone buttons still work.
- The address never leaves the browser except in the Google request. Do not log it.

### Accessibility

- The router must work by keyboard.
- Announce the result card with `aria-live`.
- The manual zone buttons must work without JavaScript (plain links).

## 7. Wording rules (licensure compliance)

Brian's Colorado massage therapy license is expected around the week of Oct 12, 2026. Until it is issued, public-facing text must not imply licensure.

**When `licensed: false`:**

- Never render "massage therapist", "LMT", "licensed", or "massage therapy".
- Use "bodywork", "neuromuscular therapy", and "practitioner".
- "Deep tissue massage" becomes "deep tissue work".

**When `licensed: true`:** "Licensed Massage Therapist", "LMT", and "massage" are allowed. Write the copy so each affected phrase has both variants in config or a small helper, not two copies of each page.

**Build guard:** add a test (`npm run check:wording`) that scans the built HTML for the forbidden terms when `licensed` is false and fails CI if it finds any.

**Always, regardless of license status:** no medical claims. Never say "treat", "cure", "diagnose", "fix", or "heal" as promises. Prefer "reduce", "support", "restore movement", and "work with". This is a scope-of-practice issue, not just style.

## 8. Content and voice

- **Voice:** plain, direct, sentence case, active voice, no filler, no spa or wellness clichés. Explain *why* briefly where it helps. Brian's clients like knowing the rationale.
- **About copy:** Brian wrote the bio himself (Oct 6 2026); it's in `docs/build/copy-deck.md` → About and is authoritative. New facts in it: labrum tear in his right shoulder in 2019, surgery and rehab, PT, then yoga; he climbs, mountaineers, does the Manitou Incline, paddleboards. The original fact list, kept for reference:
  - Graduate of the 650-hour Advanced Neuromuscular Massage Therapy program at the Colorado Institute of Massage Therapy (Sept 2026). Under the §7 rules, say "advanced neuromuscular program" until `licensed` is true.
  - 12 years as an electrical engineer (FPGA design; site copy says only "electrical engineer") before switching careers. This gives him a systematic, analytical approach to assessment and documentation.
  - Rock climber for 5+ years; volunteers with adaptive climbing groups at CityRock.
  - His path into bodywork came from his own shoulder surgery and rehab, then yoga and breathwork.
  - Philosophy: evidence-informed, precise, built on client autonomy. Clients leave understanding their bodies and with tools for their own recovery.
- **Do not invent** testimonials, credentials, certifications, statistics, partner names, or social media handles. Leave clearly marked TODOs instead.

## 9. Design direction

Follow the brand exactly. Use your own judgment within it.

- **Palette (brand):** green `#125245`, terracotta `#C37A5B`, off-white/cream `#F3F2F0`. Derive neutrals and dark/light variants as needed.
  - Lean **green-dominant**, with terracotta as an accent.
  - Avoid the generic "cream background + big serif + clay accent" look. The brand colors overlap with that default, so the layout and type must make it feel specific.
  - Check WCAG AA contrast, especially terracotta on cream.
- **Logo:** a terracotta omega with a hand cut out in negative space. It works on green or cream.
- **Imagery:**
  - Brian's outdoor portrait, supplied in three crops: `ohm-about-hero-landscape.jpg` (desktop), `ohm-about-hero-portrait.jpg` (mobile), and `ohm-portrait-square.jpg`. The green shirt and sandstone tones match the brand.
  - The anatomical back-muscle illustration with the omega overlay, used on his PocketSuite page.
  - Use art direction (`<picture>`) so phones get the portrait crop.
- **Typography:** choose deliberately. One or two families. A clinical-precise feel, not spa.
- **Restraint:** one memorable element (likely the photo or the omega/anatomy art). Everything else stays quiet.
  - No eyebrow labels, no numbered markers unless the content is a sequence, no motion on every card.
  - Respect reduced motion. Make keyboard focus visible.
- **Mobile-first:** most visitors arrive from a phone or a text link. The Book CTA must be reachable without scrolling on mobile.
- **Before writing code:** produce a short design plan (tokens, type scale, layout wireframes) and wait for approval.

## 10. Launch sequence

1.  Build and deploy to the github.io preview URL with `licensed: false`. Brian reviews the preview on his phone and desktop.
2.  Brian pastes the tested PS links into config and supplies the KML and the API key.
3.  **On license day:**
    - Set `licensed: true` and fill in `licenseNumber`.
    - Run the wording check.
    - Cut over DNS at Porkbun, add the production domain to the key's referrer list, and verify HTTPS.
    - Test the full booking path from a phone for each zone and for the office.
4.  Do not point the custom domain at the site before step 3. Until then it keeps redirecting to PocketSuite.

## 11. SEO basics

- Per-page title and meta description.
- Open Graph image (landscape photo crop).
- `sitemap.xml` and `robots.txt`.
- `LocalBusiness` JSON-LD with service area (no street address). Include licensure-dependent fields only when `licensed` is true.
- Target phrases, used naturally in copy: neuromuscular therapy Colorado Springs, sports recovery for climbers, trigger point therapy.

## 12. Acceptance criteria

- [ ] All four zones and the office route to the correct config link. Out-of-region shows contact options only.
- [ ] Test addresses:
  - Home: Old Colorado City; Broadmoor Bluffs.
  - Shared: near Garden of the Gods Rd & Centennial.
  - North: Briargate. Out: Monument.
  - Out of region: Falcon; Fountain; east of Academy.
  - Commit the address list as a fixture and document it in the README.
- [ ] Without JavaScript or the API key, the map and manual zone buttons still work.
- [ ] `npm run check:wording` passes with `licensed: false`.
- [ ] Lighthouse mobile scores of 90+ for performance, accessibility, best practices, and SEO.
- [ ] No hardcoded rates, days, links, or zone names outside `src/data/`.
- [ ] README covers: local dev, deploy, updating rates and links, re-exporting zones, the Google key setup, and the DNS cutover.

## 13. Working agreement

- Work in phases and commit at the end of each one:
  1.  Scaffold, config, layout, deploy.
  2.  Booking router with placeholder zones.
  3.  Real zones and autocomplete.
  4.  Content pages.
  5.  SEO and polish.
- Ask before adding dependencies beyond Astro and one geometry helper.
- When you need a fact that isn't in this brief, leave a `TODO(Brian):` comment and list it in your phase summary. Do not invent it.

## 14. Setup notes (as of Oct 5, 2026)

- **Repo and preview URL:** the repo is `ohm-site` under the `chimpanbeat` GitHub account. The preview URL is `https://chimpanbeat.github.io/ohm-site/`. Set Astro's `site` and `base` (`/ohm-site`) from config so both change at the custom-domain cutover (§10).
- **The repo is public** (decided Oct 5, 2026), because GitHub Free serves Pages only from public repos. Commit nothing sensitive: no `.env`, no client data, and only zone polygons from the KML. This brief is also public once committed, so keep business notes out of it.
- **Google key:** Brian created `ohm-site-browser` in Google Cloud and restricted it as described in §6. It goes in `.env` as `PUBLIC_GOOGLE_MAPS_KEY` (gitignored). The GitHub Actions build also needs it as a repo variable; document that in the README. If the local dev server uses a port other than 4321, tell Brian so he can add the referrer.
- **Quota caps are not set yet.** The account is on Google's free trial (ends about Jan 3, 2027; confirm in the console), and the console blocks quota edits during the trial. The README must give the order Brian follows: set the caps, upgrade, then add a budget alert (alerts only notify; they don't stop usage). If the trial lapses before he upgrades, the key stops working and `/book` must fall back gracefully (§6).
- **Autocomplete volume:** requests bill per request, not per address. Use a minimum character count and a short debounce so a daily cap of about 300 lasts.
- **Test the fallback:** simulate a missing or failing key and confirm the address field hides and the map and manual zone buttons show.
- **The preview is public.** Anyone with the URL can load it before license day, so apply the §7 wording rules and `npm run check:wording` from the first deploy. In your plan, say whether the preview should be `noindex` until `licensed` is true.
- **North boundary decided (Oct 5, 2026):** the KML polygon is authoritative, and Monument is out of the service area (decided Oct 5, 2026). Revisit if the zone cuts out an area Brian meant to serve.
- *(Superseded)* **North boundary is not final.** Brian exported the KML with the current boundaries and is still deciding whether the area east of Academy, north of Austin Bluffs/Templeton Gap, and west of Powers joins the North zone. The polygons in his exported KML decide (§6). If they disagree with the boundary descriptions in §6, list the differences as `TODO(Brian)` and do not edit the descriptions yourself.
