# Ohm Precision Bodywork — Website Brief

Owner: Brian Clarke · Prepared Oct 4, 2026 · Updated Oct 5, 2026 (§6 key and quota details, new §14, repo is public) · Updated Oct 6, 2026 (no phone on the site, initial assessment removed, Pricing page, days, travel-fee waiver, interactive map) · Updated Oct 29, 2026 (licensed wording, I-035; out-of-region travel quoted, I-023; zones renamed Central, Mid-north, North and real booking links, I-040; client policies page and PDF, I-037; Central zone named "Central & Southwest" and travel-fee note shortened, Brian's decisions) · Target: deployable preview this week

## 1. What this site is for

The site's most important job is to **send each visitor to the right PocketSuite booking link** with as little friction as possible. Everything else on the site supports that.

PocketSuite (PS) handles booking, availability, intake forms, contracts, payment, and reminders. The site does none of those things. It decides which PS link a visitor should use and sends them there.

### The business

- **Ohm Precision Bodywork LLC.** Solo clinical bodywork practice in Colorado Springs, CO. Mobile-first (sessions at the client's location), plus an office.
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
- **Contact:** <brian@ohmprecisionbodywork.com> · ohmprecisionbodywork.com · PocketSuite lead form and chat (links in §4). **No phone number on the site** (decided Oct 6, 2026). <!-- secrets-scan: allow -->

## 2. Non-goals

Do not build any of the following:

- Intake, contracts, payments, or accounts. The body map (§15) is not intake: it carries no red flags, consent or session goals, which stay on the PocketSuite intake form.
- A CMS, backend, database, or serverless functions. One exception (I-049, Nov 6, 2026): event RSVPs post to a Google Apps Script web app in Brian's Google account, which writes to his private sheet and sends the RSVP emails. The site itself stays static; no guest data, sheet ID or script ID is in the repo. A second exception (I-073, Brian, Nov 7–10, 2026): the body map (§15) posts to its own write-only Apps Script, "Ohm Bodymap", which files a PDF and a JSON copy in Brian's Workspace Drive; no client data, script ID or folder ID is in the repo.
- Analytics that capture addresses. The one analytics service is Umami Cloud (I-114, Brian, Nov 8, 2026): no cookies; it counts only on the production domain (localhost and previews send nothing); it receives pageviews and the names of a few actions (book, contact, email, call, text, policies, rsvp) with the page path only, never link addresses, form contents or the visitor's address. `/body-map` never loads it (I-115). Details: ARCHITECTURE §B11.
- Storage or transmission of a visitor's address anywhere other than the Google autocomplete call.
- Any guessing of PocketSuite URLs. Use only the links Brian supplies (in config since Oct 29, 2026, I-040).

## 3. Stack and hosting

- **Framework:** Astro, static output, TypeScript. Ship zero JavaScript except on the Book page (address check) and a small script on `/client-policies` (Expand all / Collapse all, and opening the section named in the link; I-037, Oct 29, 2026), and a tiny script on Home only: a plain click on the header logo turns its Ω once, counter-clockwise, instead of reloading Home; the wordmark stays still (Brian, Oct 30, 2026, step V), and a small script on the map pages (`/book` and each `/book/<zone>`) that loads the map's terrain shading after the page has loaded (I-054, Brian, Nov 5, 2026), and on event pages with an RSVP form a script that shows spots left and sends the RSVP without leaving the page (I-049, Nov 6, 2026), and on every page except `/body-map` the Umami analytics tag, plus a small click counter on every page but `/hello` (I-114, I-115, Nov 8, 2026; see §2), and on `/body-map` the body map script (§15, I-073). Every page works without JavaScript except `/body-map`, which needs it and says so in a `<noscript>` line; the map pages then lose only the terrain shading, and the RSVP form posts to the Apps Script and shows its reply page. Page transitions and the other small motion Brian approved on Oct 30, 2026 are CSS only: the browser's native cross-document view transitions, never a client-side router, and no script (ARCHITECTURE §A3, fifth to tenth motion exceptions).
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
  licensed: true,                  // flips wording rules (§7). True from step 12 (license issued Oct 12, 2026; I-035)
  licenseNumber: "",               // never published anywhere, including page source and JSON-LD (Oct 29, 2026). Keep empty.
  licenseVerifyUrl: "https://apps2.colorado.gov/dora/licensing/lookup/licenselookup.aspx", // "Licensed in Colorado." links here: DORA's license lookup (Brian, Oct 29, 2026)
  email: "brian@ohmprecisionbodywork.com",   // no phone (Oct 6, 2026) // secrets-scan: allow
  officeArea: "Southwest Colorado Springs, in the Cheyenne Canyon / Broadmoor area", // exact address sent after booking; the /book map shows an approximate circle (Oct 6)
  rates: {                         // no initial assessment rate (removed Oct 6, 2026)
    s60:     { label: "60-minute session", minutes: 60, price: 90 },
    s90:     { label: "90-minute session", minutes: 90, price: 120 },
  },
  travelFee: { amount: 25, note: "Flat, per visit." }, // Oct 30, 2026 (step V): the group rule, with "as my schedule allows", is stated once, in Pricing's Travel fee section (from terms.groupMax)
  outOfRegionFee: null,            // stays null: no amount or range on the site; travel outside the service area is quoted before booking (Oct 29, 2026)
  contact: {
    lead: "https://pocketsuite.io/lead/ohm-precision-bodywork",
    chat: "https://pocketsuite.io/chat/ohm-precision-bodywork",
  },
  links: {                         // PS items page filtered by keyword tag (Brian, Oct 29, 2026, I-040)
    office:   "https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=office",
    central:  "https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=central",
    midnorth: "https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=midnorth",
    north:    "https://pocketsuite.io/book/ohm-precision-bodywork/items?keyword=north",
  },
  zones: { /* see §6 */ },
};
```

The friends-and-family rate is **not** shown on the site. Packages appear only on `/client-policies`, as the Client Policies doc gives them; their prices live in `src/data/client-policies.ts`, not `site.ts` (I-037, Oct 29, 2026).

## 5. Pages

| Route       | Purpose            | Notes                                                                       |
|-------------|--------------------|-----------------------------------------------------------------------------|
| `/`         | Home               | Who Ohm is for, what a session does, one clear "Book a session" CTA. Short. No splash or overlay. Search, Maps and the Google Business Profile link here. |
| `/hello`    | Entrance           | Full-screen splash for card, QR, social and referral traffic: the body graphic, a large Ω with a light running along it, and "Take the path of least resistance". Tap or click to enter Home. `noindex`, not linked, not in the sitemap. Added Oct 6, 2026: a splash on Home would trip Google's intrusive-interstitial signal and slow search visitors down. |
| `/services` | Services           | See content below.                                                          |
| `/pricing`  | Pricing            | Rates at the office and at your place (with the travel fee), and the travel-fee rule. Added Oct 6, 2026. |
| `/about`    | About Brian        | Uses the provided photos. Draft copy from §8, marked for Brian's review.    |
| `/book`     | Booking router     | The core feature (§6).                                                      |
| `/client-policies` | Client policies | The client agreement says the policies are posted on the site. The Client Policies doc, v1.4 (Oct 29, 2026), client-facing sections only, with two changes for the public page: the Zelle line asks clients to request Zelle details (no Zelle address), and the first Communication sentence points to the contact form and chat. One collapsible section per policy, closed at first; Expand all / Collapse all; a link to a section opens it. Version and date at the top, and a branded PDF of the same text (built in the doc kit, I-043). No phone number. Linked from the footer, Services, Pricing and Book; in the sitemap. Added Oct 29, 2026 (I-037). |
| `/events/<event>` | Events | One page per event, all from `src/data/events.ts`: a new event is a data entry, not new code (I-048, Nov 6, 2026). Pages live at `/events/<slug>` next to the event's `.ics` and `.json` (I-092, Nov 8, 2026, step E8); `/<slug>` is a `noindex` redirect page to it, because sent emails and shared links use `/launch-party`. First: `/events/launch-party`, the Ohm Launch Party on Sunday Nov 22, 2026 at CityROCK. Title, date and time, venue, host and photo, timeline, what to wear, parking, notices (the CityROCK waiver), graphics, an add-to-calendar file, and an RSVP form with a capped session (yoga, 20 spots, waitlist; I-049, I-050). Never shows who's going; the page shows only spots left. `noindex` and out of the sitemap unless the event says otherwise. |
| `/404`      | Not found          | Plain, with a link to `/book`.                                              |

**Services page content:**

- **Session types:** neuromuscular therapy, sports and athletic recovery, myofascial / deep tissue work, and chronic pain and injury support (in collaboration with referring chiropractors and PTs).
  - Neuromuscular therapy is described in plain terms, like the others: working with the nervous system to reduce pain and restore movement, using a range of techniques. No technique glossary. Trigger points and referred pain are explained briefly, because knowing those patterns is what sets Brian apart (Oct 6, 2026).
- **Prices:** a short line with the starting price and a link to `/pricing`.

**Pricing page content** (Oct 6, 2026):

- A table with columns Session, At my office, At your place. No minutes column (the label already says it).
- At your place = rate + travel fee, computed from config: 60 min $90 + $25 = $115, 90 min $120 + $25 = $145.
- The travel-fee rule: Pricing's Travel fee section states the group rule once (one fee covers up to `terms.groupMax` back-to-back sessions at the same address, as my schedule allows); its first paragraph shows `travelFee.note`, which does not repeat it (Oct 30, 2026, step V).
- **Office vs mobile:** one plain paragraph explaining the difference.
- **Scope note:** sessions are not a substitute for medical diagnosis or treatment.

**Global elements:**

- **Header:** logo and nav (Services, Pricing, About, Book).
- **Footer:** email and a one-line service area summary (no phone) ("Colorado Springs and Manitou Springs; other areas by request"). When `licensed` is true, the credential block: "Brian Clarke, LMT, CNMT" and "Licensed in Colorado." with a link to DORA verification (`licenseVerifyUrl`). Never the license number (Oct 29, 2026). A `Client policies` link to `/client-policies` (I-037, Oct 29, 2026).
- Every page links to `/book`.

**Payment notice** (I-041, Oct 29, 2026): near the booking buttons, the site says how to pay and shows the Colorado card-surcharge notice, in the policy's own words: cash, Zelle, and credit or debit cards through PocketSuite (Tap to Pay in person, or the booking link); ask for Zelle details; Venmo and PayPal not accepted; a 3% surcharge on credit cards only, none on cash, Zelle or debit; then the statutory notice (C.R.S. 5-2-212) verbatim. One source, `src/data/client-policies.ts`. On `/book`, the `/book` result pages that have a booking button (not the out-of-area page), and above the booking button on Services and Pricing. `/client-policies` already carries it. Never a Zelle address, ACH or bank transfer.

## 6. Booking router (`/book`)

### Flow

1.  **"Where do you want your session?"** Two choices:
    - **At my office:** show the office days and the `links.office` button. Office days are Tuesdays, Wednesday evenings, Fridays, and Saturdays. The Wednesday evening slot (8:00 PM) is at the office only (Oct 6, 2026).
    - **At your place (mobile):** go to step 2.
2.  **"Where are you located?"** The zone buttons come first, each coloured like its area on the map. Then **"Not sure? Enter your address:"**: the address field using Google Places autocomplete, restricted to US addresses and biased to Colorado Springs (order changed Oct 6, 2026).
    - On selection, get the latitude/longitude and test it against the zone polygons.
    - The matching zone button is highlighted, whether chosen by button or by address.
3.  **Result card.** Shows the zone's plain-language name, the days I'm in that area, the travel fee note, and one primary button to that zone's PS link.
    - Example: "You're in my Central & Southwest area. I'm there Tuesdays and Fridays."
    - The visitor stays on the page; the map stays visible.
4.  **Out of region:** from an address, "That address is outside my regular service area."; from the button, "Outside my regular service area". Then "I can sometimes travel outside my regular area by request." and a line saying travel outside the service area is quoted before booking, with no amount or range (Oct 29, 2026). Show a PocketSuite lead form button, a PocketSuite chat button, and an email link. No booking link, no phone.
5.  **Map** (Oct 6, 2026): the site draws its own map (an SVG built at compile time) of the zones from `zones.geojson`, plus the major roads that bound them and nearby town names from OpenStreetMap. No map service and no per-view cost. Brian is trying it; the fallback plan is a Google Maps JavaScript map.
    - Zone names are labelled on the map, and the zone colours match the zone buttons.
    - The first view fits all zones (the old My Maps view was zoomed in too far).
    - Choosing a zone zooms to fit it and dims the other zones, which keep their colours. Clicking a zone on the map chooses it; clicking it again goes back to all areas.
    - Everything outside the zones is the "outside my regular area" area: hovering or clicking it works like the zone buttons, and choosing it dims all three zones (Oct 6, 2026).
    - A pin marks the entered address.
    - Light terrain shading (USGS elevation data) and a layer of smaller roads give context (Oct 6, 2026).
    - Brian's Ω logo marks the office area on every map; on the service map, clicking it switches to "At my office". The office map uses the same zoom as the Central & Southwest view.
    - It works without JavaScript or the key: the static map shows, and `/book/<zone>` shows it focused on that zone.
    - "Open the map in Google Maps" links to Brian's My Maps viewer. The My Maps iframe is no longer embedded.
6.  A "Near a boundary or can't find your address? Chat with me or send me an email" line (PocketSuite chat and email). Boundaries are approximate.

### Zones

Keys and names since Oct 29, 2026 (I-040; were `home` "Central & Southwest Springs" and `shared` "Mid-north Springs"). `central` was named "Central" in step 13 and is "Central & Southwest" since Brian's later Oct 29 decision; the key stays `central`. Zone names never contain "Springs" or "home". The KML polygon names must equal these names exactly.

| Key        | Client-facing name   | Days          | PS link          |
|------------|----------------------|---------------|------------------|
| `central`  | Central & Southwest  | Tue, Fri      | `links.central`  |
| `midnorth` | Mid-north            | Tue, Wed, Fri | `links.midnorth` |
| `north`    | North                | Wed           | `links.north`    |
| `out`      | Outside regular area | By request    | contact only     |

Rough boundary descriptions (for copy and alt text only; the polygons decide):

- **Central & Southwest:** inside Academy Blvd to the east and south, west to Manitou Springs, north to Garden of the Gods Rd / Austin Bluffs Pkwy. Includes Broadmoor Bluffs.
- **Mid-north:** from Garden of the Gods / Austin Bluffs north to Woodmen Rd, west of Academy.
- **North:** north of Woodmen Rd up to Baptist Rd, east of Hwy 83, including Briargate, Wolf Ranch and Cordera; also east of Academy between Austin Bluffs/Templeton Gap and Woodmen, west of Powers. Monument is out of the service area (decided Oct 5, 2026).
- **Out of region:** east of Academy Blvd, Black Forest, Falcon, Fountain, Security-Widefield.

### Zone data

- Brian will provide a KML export of his Google My Map. Convert it to `src/data/zones.geojson` with a script committed to the repo (`npm run zones`), so a re-export is a one-command update. Document this in the README.
- Each polygon has a `zone` property matching the keys above.
- If a point is in more than one polygon, use this precedence: `midnorth` over `central` or `north`.
- A point in no polygon is `out`.
- The export may contain more than zone polygons (pins, placemark notes, a home location). The `npm run zones` script must keep only the polygons and their `zone` names, and nothing else may be committed to the repo from the KML.

### Google Maps / Places

- Use the **Places API (New)** through the Maps JavaScript API.
- Implement **session-based autocomplete** that ends with a Place Details call requesting only the `location` and `formattedAddress` fields. This keeps sessions in Google's free tier.
- Before implementing, check Google's current Places pricing and usage documentation and note in the README which SKUs the implementation uses.
- The API key goes in an env var (`PUBLIC_GOOGLE_MAPS_KEY`). It is public by design; its protection is the restrictions below.
- Write the README steps for Brian to:
  - Confirm the key's HTTP referrer restrictions. Brian has already set the origin-wide `https://chimpanbeat.github.io/*` (fixed by Brian, verified Oct 5, 2026; see I-006) and `http://localhost:4321/*`; the production domain is added on license day (§10).
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

Brian's Colorado massage therapist license was issued Oct 12, 2026 and is active; anyone can verify it with DORA's license lookup (Division of Professions and Occupations; `licenseVerifyUrl`). `licensed` is true from step 12 (I-035, Oct 29, 2026). The Home page text stays as it was before licensure (Brian, Oct 29, 2026): its H1 stays the tagline and its "deep tissue work" stays. The unlicensed rules below stay, so the site still builds correctly if `licensed` is ever set back to false.

**When `licensed: false`:**

- Never render "massage therapist", "LMT", "licensed", or "massage therapy".
- Use "bodywork", "neuromuscular therapy", and "practitioner".
- "Deep tissue massage" becomes "deep tissue work".

**When `licensed: true`:** "Licensed Massage Therapist", "LMT", and "massage" are allowed. Write the copy so each affected phrase has both variants in config or a small helper, not two copies of each page.
- Brian's title is "Brian Clarke, LMT, CNMT". It appears in the About bio, on the booking page (`/book`) and in the footer, each time with the line "Licensed in Colorado." and a "Verify my license" link to DORA's license verification (`licenseVerifyUrl`).
- **Never publish the license number:** not in visible text, page source, attributes or JSON-LD. `licenseNumber` stays empty and nothing renders it. Visitors verify the license by name on the DORA site.

**Build guard:** `npm run check:wording` scans the built HTML and fails CI: when `licensed` is false, on any forbidden term; when true, if a page with a footer lacks the credential block and verify link, or About or `/book` lacks its own copy; and always, if a license number or a credential identifier appears in the HTML or JSON-LD.

**Session places (Brian, Oct 29, 2026, I-040), always:** a session at the client's place is a "mobile visit"; a session at Brian's space is an "office session". Never "home visit", "home office" or "Home mobile". Zone names never contain "Springs" or "home". `check:wording` fails on the three banned phrases.

**Client policies (I-037, Oct 29, 2026):** `/client-policies` and its PDF carry Brian's approved policy text as written, so three things differ from the rest of the site. It says "massage" (allowed while `licensed` is true; if `licensed` is ever set back to false, Brian reviews that sentence). It says "text or call me" and "text me" although no phone number is published (Brian, Oct 29: keep as written). Its "health" trips the `check:wording` medical-word warning, which is accepted (warning only; nothing there is a promise). The always-on rules still apply: no phone number, no Zelle address, no "home visit", "home office" or "Home mobile".

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
  - No eyebrow labels, no numbered markers unless the content is a sequence, no motion on every card. (Brian, Oct 30, 2026: a one-time fade-up on nine named blocks, a short button settle, a scroll-linked header, one parallax layer on the Home hero art, the 404 Ω trace and page cross-fades are allowed, within the motion rules in ARCHITECTURE §A3.)
  - Respect reduced motion. Make keyboard focus visible.
- **Mobile-first:** most visitors arrive from a phone or a text link. The Book CTA must be reachable without scrolling on mobile.
- **Before writing code:** produce a short design plan (tokens, type scale, layout wireframes) and wait for approval.

## 10. Launch sequence

1.  Build and deploy to the github.io preview URL with `licensed: false`. Brian reviews the preview on his phone and desktop.
2.  Brian pastes the tested PS links into config and supplies the KML and the API key.
3.  **On launch day** (license issued Oct 12, 2026; launch waits on the tested links and the domain cutover):
    - `licensed` is already true (step 12, Oct 29, 2026). Never fill in `licenseNumber`.
    - Run the wording check.
    - Cut over DNS at Porkbun, add the production domain to the key's referrer list, and verify HTTPS.
    - Test the full booking path from a phone for each zone and for the office.
4.  Do not point the custom domain at the site before step 3. Until then it keeps redirecting to PocketSuite.

## 11. SEO basics

- Per-page title and meta description.
- Open Graph image (landscape photo crop).
- `sitemap.xml` and `robots.txt`.
- `LocalBusiness` JSON-LD with service area (no street address). No license number or credential identifier, ever (Oct 29, 2026).
- Target phrases, used naturally in copy: neuromuscular therapy Colorado Springs, sports recovery for climbers, trigger point therapy.

## 12. Acceptance criteria

Every AC is covered by a test or a named screenshot check.

- [ ] **AC-1** All four zones and the office route to the correct config link. Out-of-region shows contact options only.
- [ ] **AC-2** Test addresses:
  - Central & Southwest (`central`): Old Colorado City; Broadmoor Bluffs.
  - Mid-north (`midnorth`): near Garden of the Gods Rd & Centennial.
  - North: Briargate. Out: Monument.
  - Out of region: Falcon; Fountain; east of Academy.
  - Commit the address list as a fixture and document it in the README.
- [ ] **AC-3** Without JavaScript or the API key, the map and manual zone buttons still work.
- [ ] **AC-4** `npm run check:wording` passes with the current `licensed` value. With `false`: no licensed-only terms. With `true`: the credential block on every page with a footer and on About and `/book`. Always: no license number or credential identifier in the HTML or JSON-LD (amended Oct 29, 2026, I-035).
- [ ] **AC-5** Lighthouse mobile scores of 90+ for performance, accessibility, best practices, and SEO.
- [ ] **AC-6** No hardcoded rates, days, links, or zone names outside `src/data/`.
- [ ] **AC-7** README covers: local dev, deploy, updating rates and links, re-exporting zones, the Google key setup, and the DNS cutover.
- [ ] **AC-8** `/client-policies` and `ohm-client-policies.pdf` come from one source text (`src/data/client-policies.ts`, the Client Policies doc v1.4): the PDF is the doc kit's branded build of that text (I-043), and a test extracts its text and fails while any sentence of the source is missing from it. Both show the version and date (page: Version 1.4 · Oct 29, 2026; PDF: Effective: October 29, 2026, Version 1.4). Both I-037 changes are in place (the Zelle line and the first Communication sentence). Neither has a phone number or a Zelle address (added Oct 29, 2026, I-037).
- [ ] **AC-9** Events (I-048–I-050, Nov 6, 2026): `/events/launch-party` (was `/launch-party`, which redirects there since E8, I-092) renders only from `src/data/events.ts` and the shared event components, and a test adds a second event in data and gets a second page with no code change. The RSVP form works with and without JavaScript. The yoga cap holds under the script lock: the 21st yes-answer joins the waitlist, and while anyone is waitlisted new yes-answers queue. No reply carries an email address, a name or the guest list, and the repo holds no guest data, sheet ID or script ID.

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

## 15. Body map (I-073, I-074; spec 2026-11-07, Brian's answers Nov 8, started Nov 10, 2026)

A client-facing page, `https://ohmprecisionbodywork.com/body-map`, where a client marks pain, discomfort, injury, numbness or tingling, and areas to avoid on a front and back body figure before a session. Sending files a PDF report and a JSON copy in Brian's Google Workspace Drive. It is standalone from the PocketSuite intake form: no red flags, no appointment confirmation tie-in, no session goal. Design and contracts: ARCHITECTURE §B12; data and strings: `src/data/bodymap.ts`; copy: copy deck → Body map.

**Access.** Noindex, never in the sitemap, linked from no page; Brian shares the link himself (the PocketSuite link waits for launch, I-112). The page is `bare`: no header or footer, so it has no credential block; it never uses "massage therapist", "LMT" or "licensed". It loads no analytics (§2, I-115). It needs JavaScript (§3).

**Requirements (v1).**
- R1 Front and back figures, female or male. The 4 side views (left and right, both sexes) stay in the assets for a later release and are not shown.
- R2 Zoom and pan (pinch, wheel, buttons); pins stay on the body at any zoom.
- R3 Pin types: pain, discomfort, injury, numbness or tingling, avoid. Each has its own shape as well as colour.
- R4 Optional details in a few taps: intensity 1–10 and a one-line note; behind "Add details", what it feels like (sharp, dull or achy, burning, spreading), acute or chronic, when it started, and what makes it worse or better (Brian, Nov 13, 2026; I-153, I-155, I-158). None is required.
- R5 Star up to 3 priority pins. Avoid pins can't be starred (Brian, Nov 8, 2026).
- R6 A region list (checkboxes by area name, per view) gives the same report data without tapping.
- R7 Autosave on the device for 24 hours, cleared on send; the page works without storage.
- R8 Sending builds the PDF in the browser and posts it with the JSON to the filing script.
- R9 The report names body regions from hidden zones, never drawn for the client. Two levels (Brian, Nov 13, 2026; I-156, I-157): coarse regions the client sees by name (28 front, 31 back; the back gained left and right "back of shoulder", I-160, Nov 13, 2026), and finer zones inside them that appear only in the PDF and the JSON. Each mark in the JSON carries its zone ID, the zone-set version, its side (left, right or midline; the client's own left and right) and the region name, and the JSON has a format version.
- R10 Spam protection: a honeypot, size caps and rate limits (6 per 10 minutes, 30 per day, 3 per client name and appointment date per day; Brian, Nov 8, 2026). Turnstile can be added later without a redesign.
- R11 A confirmation after sending; a clear error and retry if filing fails, with the marks kept.

**Non-goals (v1).** Red-flag screening, appointment tie-in, session goals, before/after overlays, side views, circled areas (v1.1), any technique or origin brief (Brian, Nov 13, 2026), 3D, accounts, a history the client can read, muscle-layer diagrams, email notices of new maps (Brian, Nov 8, 2026), automatic deletion (Brian keeps maps under his own records policy).

**Data and privacy.** No health information in the repo, the built site, analytics, logs, URLs or file names beyond the client's name and dates. Google receives the map as Brian's Workspace processor (Brian treats the BAA as settled, Nov 7, 2026). The filing script only creates files: no code path lists, reads or shares them. Google can't enforce that for a script that runs as Brian, so it is a promise the code keeps, checked by tests, static checks and review. Files go to the client's folder when exactly one folder named `First_Last` matches the typed name (case, accents and punctuation ignored), otherwise to `_Unsorted_Intakes` in the same parent folder; Brian re-files by hand. The public repo holds only code, the art and geometry-only zone files.

**Acceptance criteria** (the spec's AC-1 to AC-14, renamed so they don't clash with §12):
- [ ] **BM-1** On a phone, a client can choose female or male, place 3 pins on the front and 2 on the back, and send in under 3 minutes without help.
- [ ] **BM-2** Pinching to zoom 3x and placing a pin lands it within about 10 px of the tap at that zoom, and it stays on that spot after zooming out.
- [ ] **BM-3** Each of the 5 pin types is distinguishable in greyscale.
- [ ] **BM-4** An avoid pin appears in the PDF under its own "Avoid" heading.
- [ ] **BM-5** Starring a 4th pin is refused with a visible message; starred pins are listed first in the PDF.
- [ ] **BM-6** With no pins tapped, the region list alone produces a sendable report listing the same region names.
- [ ] **BM-7** Reloading mid-entry restores the pins; after sending, a reload shows an empty form; with storage blocked the page still works.
- [ ] **BM-8** Sending as "Test Client" with a date creates one PDF and one JSON in `_Unsorted_Intakes` (or the matching client folder); the endpoint cannot list or read files (checked with read-style requests).
- [ ] **BM-9** The PDF shows both figures with pins, the pin list with region names, the typed name and the appointment date; no zone outline is visible on the page or in the PDF.
- [ ] **BM-10** A send with the honeypot filled, or over the size cap, creates nothing and shows a generic error.
- [ ] **BM-11** If filing fails (offline or script error), the client sees a retry message and the pins are still there.
- [ ] **BM-12** No client data, secrets or health information in the repo, the page source, third-party network calls or console logs.
- [ ] **BM-13** The page is noindex and linked from nowhere on the site; `check:wording` passes and the page has no "massage therapist", "LMT" or "licensed".
- [ ] **BM-14** Swapping the art for another set with the same viewBox and file names needs no code change (only the files and the zone JSON).
