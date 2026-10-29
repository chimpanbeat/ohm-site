# Copy deck

Written by Opus in step 4A (2026-10-05). **This is the only source of visible text** for Home, Services, About, 404 and the Book intro (step 4B). Place each block in the slot named. Don't reword it. If a block is missing, escalate.

## Notation
- `{w:key}`: call `w('key')` from `src/data/wording.ts`.
- `{site.path}`: read the value from `site` in `src/data/site.ts`, e.g. `{site.travelFee.amount}`. Never type the value.
- `{minPrice}`: `Math.min(...Object.values(site.rates).map((r) => r.price))`.
- `$` before a reference is a literal dollar sign: `${minPrice}` renders as `$90`.
- `[text](/path)`: a link. Use `href('/path')`.
- `<BookCta />` etc.: the component, with the props shown. No props means the default label ("Book a session").
- **Bold** inside a block is plain text in the page. The deck uses bold only for slot names.
- Apostrophes and quotes are straight (`'` and `"`), as in the existing components.

## Global
Header, Footer, OfficeCard, ZonePicker and ZoneCard keep their current text (ARCHITECTURE §B3) except for the changes below.

**Changes in step 13 (I-040, Oct 29: zones renamed):**
- Zone names come from `site.zones[key].name`: `Central`, `Mid-north`, `North` (no "Springs"); keys `central`, `midnorth`, `north`, `out`. The ZoneCard heading, `/book/[zone]` meta, map labels and map `<desc>` change only through those names. No other text changes.
- Services → office vs mobile P: `my home office` becomes `my office`.
- Wording rule (BRIEF §7, Brian): a session at the client's place is a "mobile visit", at Brian's space an "office session". Never "home visit", "home office" or "Home mobile" (`check:wording` fails on them). Existing "mobile session" text stays as written.

**Changes in step 12 (I-035, Oct 29: licensed wording):**
- `licensed` turns true, so every `{w:key}` on the site renders its licensed variant from `wording.ts` (`{w:deepTissue}` on Services, `{w:notSpa}` and `{w:training}` change). **Home is unchanged** (Brian, Oct 29: "leave the home page alone"): `{w:heroLine}` stays `Reduce resistance. Restore movement.` and Home's `{w:deepTissueHome}` stays `deep tissue work` (both keys have equal variants). Home still shows the footer credential block. No page text changes by hand for this.
- **Credential block** (`<Credentials />`, ARCHITECTURE §B3), two lines:
  1. `{w:credential}` → `Brian Clarke, LMT, CNMT`
  2. `{w:licensedIn} [{w:verifyLicense}]({site.licenseVerifyUrl}).` → `Licensed in Colorado. Verify my license.` (the link is "Verify my license"; the full stop after it is plain text)
- **Footer:** the credential block (`<Credentials compact />`) first in the left column, above the email. The old license-number line is removed: **the license number is never published**.
- **About** and **Book**: see their sections.

**Changes in step 9A (Oct 6, Brian's review of Phase 8):**
- **Office map:** the circle is gone; the Ω marks the area. **Label (after 9B, Brian): `Ohm Office`**, the same on every map view (was `My office is in this area`). `<title>`: `Office area map`. `<desc>`: `Map of southwest Colorado Springs with my logo marking the area my office is in, near Cheyenne Canyon and the Broadmoor. The exact address is sent after you book.`
- **Office mark on the service maps:** visible label `Ohm Office`; `<title>Ohm Office</title>` (tooltip; the link is hidden from assistive tech, the radio is the accessible path).
- **Credit line** (both maps): `Roads and places © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Terrain: USGS 3DEP.`
- **Book:** address label, map hint and boundary line: see Book → Mobile section.

**Changes in step 8A (Oct 6, Brian's review of Phase 7):**
- **"FPGA design engineer" → "electrical engineer"** everywhere (Home "Why Ohm", About meta description and paragraph 2). Brian: too specific.
- **OfficeCard:** `{site.officeArea}` now reads "Southwest Colorado Springs, in the Cheyenne Canyon / Broadmoor area". The address note moves to its own line, directly after the area: `I send the exact address after you book.`
- **Office map** (`/book` office section and `/book/office`), labels and text:
  - Circle label: `My office is in this area`
  - `<title>`: `Office area map`. `<desc>`: `Map of southwest Colorado Springs with a circle around the area my office is in, near Cheyenne Canyon and the Broadmoor. The exact address is sent after you book.`
  - No hint, no Google Maps button. Credit line as on the service map.
- **Service map** (mobile section): see Book → Mobile section.

**Changes in step 7A (Oct 6, Brian's review):**
- **Header nav:** `Services`, `Pricing` (→ `/pricing`), `About`, then the `Book` button.
- **Footer:** the phone line is removed. Nothing replaces it.
- **No phone number anywhere.** No `tel:` or `sms:` links, no "Call", "Text" or "Text me". One exception (step 14, I-037, Brian, Oct 29): the Client Policies text keeps its "text or call me", "text me" and "text and email" as written; still no number and no `tel:`/`sms:` link.
- **ContactButtons** (out-of-region card): `Send a request` (primary, → `{site.contact.lead}`), `Chat with me` (quiet, → `{site.contact.chat}`), then a `<p>`: `Or email ` + a `mailHref` link showing `{site.email}` + `.`
- **ZoneCard, `out`:**
  - Heading, `via='address'`: `That address is outside my regular service area.`
  - Heading, `via='pick'` (picker button and `/book/out`): `Outside my regular service area`
  - Then `I can sometimes travel outside my regular area by request.` (replaces "I sometimes travel there by request."), then `{site.outOfRegionFeeNote}`, then ContactButtons.
  - `{site.outOfRegionFeeNote}` (I-023, Oct 29): `I'll quote travel outside my service area before you book.` No amount or range; `outOfRegionFee` stays null. (Was "An out-of-region fee applies; I'll quote it when you get in touch.")
- **ZonePicker:** no built-in heading. `/book/[zone]` passes `heading="Not sure? Pick your area."`; `/book` passes none (its H2 introduces the list).
- **Travel-fee note:** `{site.travelFee.note}` (I-044, Oct 29) is "Flat, per visit. One travel fee covers up to four back-to-back sessions at the same address, as my schedule allows, such as a household or a small group taking turns." It matches the Client Policies group rule; "four" is `terms.groupMax` spelled out. Config-only. (Was "Flat, per mobile session. Book two sessions back to back at the same place, like you and your partner, and neither one has a travel fee.")
- **Glossary:** removed from the site (`glossary.ts` and `Glossary` are deleted). Trigger points are explained in the Services prose instead.

- **Map:** the My Maps iframe (`MapEmbed`) is replaced by our own SVG map (`ServiceMap`); its text is under Book → Mobile section.

**Earlier (6A):** `{site.outOfRegionFeeNote}` on the out card (text since I-023: see ZoneCard, `out` above).

## Alt text
| Image | Where | Alt |
|---|---|---|
| `graphic-green.png` | Home hero | `""` (decorative) |
| `about-portrait.jpg` / `about-landscape.jpg` | About `<Picture>` (both sources share the one `alt`) | `Brian Clarke standing on a sandstone ledge above a forested canyon.` |
| `logo-line.png`, `icon.png` | Header | `Ohm Precision Bodywork` (unchanged) |
| `portrait-square.jpg` | Not used in 4B | — |

The OG image (5A) reuses the About alt text for `og:image:alt`.

---

## Home (`src/pages/index.astro`)

No splash on Home (9A batch 5: it's on `/hello`, below).

**Meta**
- `title`: `Ohm Precision Bodywork · Neuromuscular therapy in Colorado Springs` (ARCHITECTURE §B7. Pass it whole; no suffix.)
- `description` (8A): `Neuromuscular therapy in Colorado Springs for climbers, runners and active people. Trigger point therapy and sports recovery, at your place or my office.`

**Hero** (on `--green-900`)
- **H1:** `{w:heroLine}` (`Reduce resistance. Restore movement.` in both states; Brian, Oct 29)
- **Subline** (`<p>` under the H1 divider) (8A): `Neuromuscular therapy in Colorado Springs, for active people who want to move, perform and feel their best.` (Brian's text)
- **CTA:** `<BookCta />`
- **Price hint** (`<p>`, small, beside or under the CTA): `From ${minPrice} · at your place or my office`

**Cream band: three blocks** (each an `<h2>` and one `<p>`, in this order)

1. **H2:** `Who it's for`
   **P** (8A, Brian's text): `Ohm is for people who use their bodies and want to keep doing it: climbers, runners, cyclists, lifters, weekend hikers, and anyone active who wouldn't call themselves an athlete. I also work with people managing persistent pain or recovering from an injury or surgery, alongside their care team.`

2. **H2:** `What a session does`
   **P:** `Each session starts with a short assessment: where it hurts, how you move, and what you want to get back to. Then I work on the muscles and trigger points that limit that movement, using neuromuscular techniques, trigger point therapy and {w:deepTissueHome}. The aim is to reduce resistance in the tissue and restore movement. You leave knowing what I found, with a few things to do on your own between sessions.`

3. **H2:** `Why "Ohm"`
   **P1** (8A; 9A adds the second sentence; 10A drops "the shape in my logo"; 11A splits the paragraph): `An ohm is the unit of electrical resistance. Its symbol is the Greek letter omega (Ω).`
   **P2** (11A: drops "The tagline carries both meanings."; "how I got here" links to `/about`): `I spent 12 years as an electrical engineer before changing careers, and resistance is still what I work on, now in muscle and fascia. Say the name out loud and you also hear Om, the sacred sound of yoga and meditation. Yoga is a big part of [how I got here](/about).`

**Green CTA band**
- **H2:** `Book a session`
- **P:** `Choose my office or your place, and the next page sends you to the right booking link.`
- **CTA:** `<BookCta />`

---

## Services (`src/pages/services.astro`)

**Meta**
- `title`: `Services · Ohm Precision Bodywork` (7A; was "Services and pricing")
- `description`: `Neuromuscular therapy, sports recovery for climbers, and myofascial and {w:deepTissue} in Colorado Springs, at my office or at your place.` (7A)

**Header section** (on `--green-900`)
- **H1:** `Services` (7A)
- **Intro P** (8A): `{w:notSpa} I take a clinical approach that meets you where you are. Every session starts with an assessment, and I explain what I find and why I'm working where I am.`
  (Unlicensed, `notSpa` reads "This isn't a generic spa session, and it isn't no-pain, no-gain deep tissue torture." Licensed, "spa session" becomes "spa massage".)

**Cream band order (9A):** office vs mobile → footnote link → Specialties → scope note. The Pricing H2 and its paragraph are removed.

**Cream band: office vs mobile** (9A: now first)
- **H2:** `At my office or at your place`
- **P:** `Sessions are at my office or at your place. The office is in {site.officeArea}, and I'm there {site.office.days}. For mobile sessions I come to you, with a ${site.travelFee.amount} travel fee*, and the days depend on your part of town. The booking page works out which area you're in and sends you to the right booking link.` (The `*` is `<span aria-hidden="true">*</span>`.)
- **Footnote P** (small text, directly after): `* See [rates and the travel fee](/pricing).`

**Cream band: specialties** (9A: was "Session types")
- **H2:** `Specialties`
- **Intro P** (9A, Brian's text): `Every session is the same price, and you don't have to pick just one. I blend these specialties based on your goals and what I find, and we plan each appointment together.`
- Four `<h3>` + `<p>` pairs, in this order:

1. **H3:** `Neuromuscular therapy`
   Two `<p>` (7A; replaces the technique list and the glossary):
   **P1** (9A: "sets" → "plays a big role in"): `Neuromuscular therapy works with your nervous system, not against it. Your nervous system plays a big role in how tight a muscle stays and how sensitive an area feels, and after an injury or a long stretch of pain it can keep muscles guarded when they no longer need to be. I use focused pressure, stretches you take an active part in, and other targeted techniques to give it a reason to let go. The aim is less pain and more freedom to move.`
   **P2:** `A big part of this is trigger points: tight, tender spots in a muscle that can send pain somewhere else. Knots in your upper shoulders, for example, can show up as a headache. Knowing these referred pain patterns means I look for where your pain starts, not just where you feel it.`

2. **H3:** `Sports and athletic recovery`
   **P:** `Sports recovery for climbers, endurance athletes and anyone training hard. I focus on the areas that take the load, like a climber's forearms and shoulders, and fit sessions around your training.`

3. **H3:** `Myofascial and {w:deepTissue}`
   **P:** `Slow, sustained pressure on muscle and fascia where tension has built up over time. A good fit for long-standing tightness from desk work, repetitive training or old injuries.`

4. **H3:** `Chronic pain and injury support`
   **P:** `Ongoing work for chronic pain and for recovery after an injury, in collaboration with your chiropractor or PT. I work alongside their plan, not in place of it.`

~~**Pricing** H2 + `Sessions start at ${minPrice}…`~~ removed in 9A (the footnote link above replaces it).

**Scope note** (`<p>`, small text, last in the cream band)
- `Sessions are not a substitute for medical diagnosis or treatment.`
  (Exact sentence. `check:wording` allowlists it.)

**Payment notice** (step 15, I-041): `<PaymentNotice />` in the CTA section, directly above `<BookCta />` (→ Payment notice).

**CTA:** `<BookCta />`, after the scope note.

---

## Pricing (`src/pages/pricing.astro`, new in 7A)

**Meta**
- `title`: `Pricing · Ohm Precision Bodywork`
- `description`: `Rates for 60- and 90-minute neuromuscular therapy sessions in Colorado Springs, at my office or at your place, and how the mobile travel fee works.`

**Header section** (on `--green-900`)
- **H1:** `Pricing`
- **Intro P** (8A; I-046, Oct 29): `Same session rates at my office or at your place. Mobile sessions add a flat ${site.travelFee.amount} travel fee, and one fee covers up to {terms.groupMax:word} back-to-back sessions at the same address.`
  - `{terms.groupMax:word}` = `terms.groupMax` (import `terms` from `src/data/client-policies.ts`) rendered as a lowercase English word: 4 → `four`. Never type `four` or `4`; map the number to its word (same lookup as the `words` map in `tests/site.test.ts`). Today it renders: `Same session rates at my office or at your place. Mobile sessions add a flat $25 travel fee, and one fee covers up to four back-to-back sessions at the same address.`

**Cream band**
- `<PriceTable />` (9A: header labels at body size, top-aligned on one line). Its text: caption `Session rates`; column headers `Session`, `At my office`, `At your place` with the small second line `includes ${site.travelFee.amount} travel`; row labels from `{site.rates.*.label}`; prices `${price}` and `${price + site.travelFee.amount}`, computed. Today: 60-minute session $90 / $115; 90-minute session $120 / $145.
- **H2:** `Travel fee`
- **P:** `${site.travelFee.amount}. {site.travelFee.note}`
- **P:** `Where you are decides which days I can come to you. The [booking page](/book) works it out from your address.`

**Payment notice** (step 15, I-041): `<PaymentNotice />` in the CTA section, directly above `<BookCta />` (→ Payment notice).

**CTA:** `<BookCta />`, on green after the cream band (same pattern as Services).

---

## About (`src/pages/about.astro`)

**8A: Brian wrote this bio himself (Oct 6 2026).** The review TODO is resolved: remove the `<!-- TODO(Brian): review About draft -->` comment from the page source.

**Meta**
- `title`: `About Brian · Ohm Precision Bodywork`
- `description` (8A): `Brian Clarke spent 12 years as an electrical engineer before training in neuromuscular therapy. Evidence-informed bodywork for climbers and athletes in Colorado Springs.`

**Picture:** the alt text from the table above.

**H1:** `About Brian`

**Credential block** (step 12): `<Credentials />` directly after the H1, before the picture. Text in Global → step 12.

**Body** (8A, Brian's text; five `<p>`, in this order; no subheadings)
1. `I started my career as an electrical engineer. For 12 years I worked mostly at a desk or in a lab, designing systems, tracing problems to their source rather than where they showed up, and testing each fix until it held.`
2. `In 2019, partway through that career, I tore the labrum in my right shoulder. Surgery and a long rehab followed. Physical therapy carried me through the hardest stretch and made me curious about how clinical work helps people recover. Yoga came next. It helped me rebuild strength and range of motion, and it showed me how closely body and mind are connected. Those experiences led me to bodywork.`
3. `{w:training} My work focuses on how the nervous system influences muscle tension. I use focused pressure and active stretching, and I trace pain back to its likely source, not just where you feel it. I bring the same systematic approach to every session and keep clear notes so each one builds on the last.`
   (`{w:training}` renders Brian's sentence "In September 2026 I completed a 650-hour advanced neuromuscular program." while unlicensed, and names the school once licensed. Keep the `w()` call; don't type the sentence.)
   "bodywork" in ¶2 is literal text, not `{w:practice}`: it's Brian's story ("led me to bodywork"), and it's true in either licence state.
4. `Outside of work, I climb, mountaineer, take on the Manitou Incline, paddleboard, and spend time on the yoga mat. For active people, doing those things at full capacity is a big part of who we are. I also know the toll they take: soreness, stiffness, compensation patterns, and nagging injuries, especially when recovery gets skipped.`
5. `My approach is evidence-informed, precise, and built around your goals. I'll explain what I find and why I'm working where I am, so you leave understanding your body a little better and with tools for your own recovery.`

`check:wording` will warn (not fail) on "fix" in ¶1. The warning is expected: it's engineering, not a medical promise. List it in the Report.

**CTA:** `<BookCta />`

---

## Book (`src/pages/book/index.astro`)

**Meta**
- `title`: `Book a session · Ohm Precision Bodywork`
- `description`: `Find the right booking link for an office or mobile session in Colorado Springs and Manitou Springs.`
- The `/book/[zone]` pages have their own (Oct 6, after the final audit), built from `site.ts`; `title` ends ` · Ohm Precision Bodywork`:
  - central, midnorth, north: `Book in {zone.name}` / `Book a mobile session at your place in {zone.name}. I'm there {zone.days}.`
  - office: `Book at my office` / `My office in {officeArea}. I'm there {office.days}.` (kept under ~155 characters for search snippets)
  - out: `{zones.out.name}` / `I can sometimes travel outside my regular area by request. Get in touch, or book a session at my office.`

**Intro P** (directly under the H1, before the `#where` fieldset) (I-045, Oct 29):
`Tell me where you want your session and I'll point you to the right booking page. Scheduling and intake forms are handled on PocketSuite. You'll put a card on file when you book, and after the session you can pay by card, cash or Zelle.`

**Credential block** (step 12, `/book` only, not `/book/[zone]`): `<Credentials />` directly after the intro P, before the `#where` fieldset. Text in Global → step 12.

**Mobile section** (7A, ARCHITECTURE §B4):
- **H2** (`#mobile-h`): `Where are you located?`
- **Address label** (built in `book.ts`) (9A: colon added): `Not sure? Enter your address:`
- **Map hint** (`.map-hint`, un-hidden by book.ts) (9A): `Tap an area on the map or a button above to choose it. Tap it again to see all areas. The Ohm symbol marks my office; tap it for office sessions.`
- **Reset button** (8A, over the map's top-right corner, shown while any area is chosen, including outside (9A)): `Show all areas`
- **Office map button** (10A, over the office map's top-right corner, always shown; on `/book` and `/book/office`): `Show mobile service areas`
- **Google Maps button** (8A, replaces the small link; directly under the map): `Open in Google Maps`, with an external-link icon and visually hidden ` (opens in a new tab)`.
- **Map `<title>`:** `Service area map`. **`<desc>`:** `Map of Colorado Springs showing my three service areas, Central, Mid-north and North, with the major roads that border them.` Build the zone names from `site.zones` (don't type them).
- **Map labels:** zone names from `site.zones[key].name`; road short names and place names as listed in ARCHITECTURE §B4.
- **Credit line** (small, under the map) (9A): `Roads and places © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Terrain: USGS 3DEP.`
- ~~**Link:** `Open the map in Google Maps`~~ → replaced by the Google Maps button above (8A), still → `{site.mapViewerUrl}`
- **Boundary line** (9A): `Near a boundary or can't find your address? [Chat with me]({site.contact.chat}) or [send me an email]({mailHref}). Boundaries are approximate.`
- `/book/[zone]` (not office) shows the same map, focused on that zone. The hint isn't shown there (no JS).

**Payment notice** (step 15, I-041): `<PaymentNotice at="book" />` once on `/book`, after the `#mobile` section; on `/book/central`, `/book/midnorth`, `/book/north` and `/book/office` directly after the card; not on `/book/out` (→ Payment notice).

The rest of the router text is fixed by ARCHITECTURE §B3 and §B4.

---

## Hello (`src/pages/hello.astro`, 9A)

The entrance page for cards, QR codes and social bios (ARCHITECTURE §B8). `noindex`, but it's what a shared link previews, so the meta is real.

**Meta**
- `title`: `Ohm Precision Bodywork · Take the path of least resistance`
- `description`: same as Home: `Neuromuscular therapy in Colorado Springs for climbers, runners and active people. Trigger point therapy and sports recovery, at your place or my office.`

**Page**
- Visible line (fades in when the light finishes its first lap, 10A; shown in capitals by CSS): `Take the path of least resistance` (Brian). It's the same in both licensure states, so there's no `wording.ts` key.
- Visually hidden, before it (part of the link's accessible name): `Enter Ohm Precision Bodywork. `
- The images are decorative (`alt=""`, and the SVG is `aria-hidden`).
- Trailing-slash redirect page (`public/hello/index.html`): `<title>Ohm Precision Bodywork</title>`, link text `Continue`.

---

## 404 (`src/pages/404.astro`)

**Meta**
- `title`: `Page not found · Ohm Precision Bodywork`
- `description`: `This page doesn't exist.` (The page is `noindex`.)

**H1:** `Page not found`

**P:** `That page doesn't exist, or it has moved. [Book a session](/book) or go back to the [home page](/).`

---

## Client Policies (`src/pages/client-policies.astro`, `src/data/client-policies.ts`, step 14, I-037)

The policy text is the Client Policies doc v1.4 (Oct 29, 2026, Brian, final), client-facing sections only (nothing from "Drafting notes"), with the two I-037 changes marked below; nothing else differs from the doc. It lives in `client-policies.ts` as blocks (ARCHITECTURE §B2); the page and the PDF render it. Don't reword it.

**References used below** (all from `site.ts` or `client-policies.ts`; never type the value; today's value in brackets):
`{host}` = `new URL(site.deploy.customDomain).host` [ohmprecisionbodywork.com], plain text, not a link · `{travel}` = `site.travelFee.amount` [25] · `{p60}`/`{p90}` = `site.rates.s60.price`/`s90.price` [90/120] · `{m60}`/`{m90}` = their `minutes` [60/90] · `{late60}`/`{late90}` = `lateCancelFee(site.rates.s60)`/`(s90)` [45/60] · `{t60}`/`{t90}` = minutes + `terms.checkInMinutes` [75/105] · `{terms.*}`, `{packages.*}` = the constants in `client-policies.ts` · `{save:s60:office}` etc. = `packageSavings('s60', 'office')` [s60: 75 office, 100 mobile; s90: 100 office, 125 mobile] · `lead:` = the bullet's bold lead.

**Page (not in the doc)**
- `title`: `Client policies · Ohm Precision Bodywork`
- `description`: `Booking, payment, cancellation, late arrival, package and conduct policies for sessions with Ohm Precision Bodywork in Colorado Springs.`
- **Print-only line** (above the H1, shown only when the page is printed): `{site.name} · {host}`
- **H1:** `Client policies`
- **Version line** (directly under the H1 divider): `Version {clientPolicies.version} · {clientPolicies.displayDate}` → `Version 1.4 · Oct 29, 2026`
- **Intro P:** `{clientPolicies.intro}` (doc text, below)
- **PDF link** (its own `<p>`): `Download the policies (PDF)` → `href(policiesPdfPath)`
- **Buttons** (shipped `hidden`, shown by `policies.ts`): `Expand all`, `Collapse all`
- **Section link** (first in each open section's body): visible `#`, `aria-label` `Link to {section.title}` (e.g. `Link to Cancelling and rescheduling`)
- **Table captions** (visually hidden): `Session prices`; `Package prices`
- **PDF footer**: set by the doc kit since I-043 (not site copy); the PDF's words must match the policy text above.
- **CTA:** `<BookCta />`

**Link lines elsewhere**
- **Footer** (right column, after `Book a session`): `<p>[Client policies](/client-policies)</p>`
- **Services** (small `<p>`, directly after the `* See rates and the travel fee.` footnote, same style): `Cancellations, packages and payment are covered in my [client policies](/client-policies).`
- **Pricing** (`<p>`, after `Where you are decides…`): `Cancellations, packages and payment are covered in my [client policies](/client-policies).`
- **Book** (`/book` only, `<p>` directly after `<Credentials />`, before `#where`): `Booking means you agree to my [client policies](/client-policies).`

**Doc text: intro** (`clientPolicies.intro`)
`These policies keep scheduling fair for every client and let me give my full attention to your session. Booking an appointment means you agree to them. If anything is unclear, ask me before your appointment.`

**`booking` · Booking and payment**
- Bullets:
  1. `Book online at {host}, or text or call me to request a time. A text or call is a request, not a booking: your appointment is booked once I send you a booking confirmation.`
  2. `A card on file is required to book, added through the booking link. It holds your appointment and covers any fees below. I charge it after your session, not before, except for packages, which are paid when you buy them (see Packages).`
  3. `I accept cash, Zelle, and credit or debit cards through PocketSuite (Tap to Pay in person, or the booking link).`
  4. `Ask me for Zelle details. I don't accept Venmo, PayPal or other payment apps.` (**I-037 change 1.** The doc's Zelle address is never on the site or in the PDF.)
  5. `Credit card payments carry a {terms.surchargePercent}% processing surcharge. There is no surcharge on cash, Zelle or debit cards.`
  6. `Your appointment time is when we begin: when I arrive at your door for a mobile visit, or when you arrive at my office. The first {terms.checkInMinutes} minutes are for setup and check-in, so a {m60}-minute session takes about {t60} minutes start to finish, and a {m90}-minute session about {t90}.`
- Notice (two columns):
  - head `Colorado notice`, text `coloradoNotice`, verbatim: `To cover the cost of processing a credit or charge card transaction, and pursuant to section 5-2-212, Colorado Revised Statutes, a seller or lessor may impose a processing surcharge in an amount not to exceed the merchant discount fee that the seller or lessor incurs in processing the sales or lease transaction. A seller or lessor shall not impose a processing surcharge on payments made by use of cash, a check, or a debit card or redemption of a gift card.`
  - head `{site.name}`, text `{surchargeLine} The surcharge appears as its own line on your receipt.`, where `surchargeLine` = `{site.name} adds a {terms.surchargePercent}% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.`
- Table `Session prices`: head `Session` · `Office` · `Mobile (I come to you)`; rows `{m60} minutes` · `${p60}` · `${p60} + ${travel} travel`, and `{m90} minutes` · `${p90}` · `${p90} + ${travel} travel`.

**`cancelling` · Cancelling and rescheduling** (bullets)
1. `Cancel or reschedule at least {terms.noticeHours} hours before your appointment time and there's no charge.`
2. `Inside {terms.noticeHours} hours, the late-cancel fee is {terms.lateCancelPercent}% of the session price: ${late60} for a {m60}-minute session, ${late90} for a {m90}-minute session. No travel fee is added, since I haven't driven to you.`
3. `Moving an appointment to a new time inside the {terms.noticeHours} hours counts as a late cancel.`
4. `The quickest way to cancel or reschedule is the link in your booking confirmation. Your cancellation counts from when you send it, not when I answer.`

**`late-arrival` · Late arrival and no-shows** (bullets)
1. `If you're running late, text me. Your session still ends at its scheduled time and is charged in full, so the next client starts on time.`
2. lead: `Mobile visits:` text: `if you don't answer the door or your phone when I arrive, I'll call or text and wait {terms.graceMinutes} minutes. After that, I'll leave and it counts as a no-show.`
3. lead: `Office visits:` text: `if you're more than {terms.graceMinutes} minutes late and I haven't heard from you, it counts as a no-show.`
4. `A no-show is charged 100% of the session price, plus the travel fee for a mobile visit.`

**`illness` · Illness and skin conditions**
- P: `Please don't come to a session sick. If you have a fever, cough, cold or flu symptoms, or a stomach bug, or a rash, open wound or possible skin infection (such as athlete's foot or ringworm) where I'd be working, reschedule with me.`
- Bullets:
  1. `There's no session fee for an illness reschedule, however close to the appointment it is.`
  2. `If I've already left for a mobile visit, only the travel fee applies.`
  3. `If a skin issue is small and in an area we can safely skip, we may still go ahead. Tell me before we start and we'll decide together.`
  4. `Not sure? Text me. I'd rather hear early.`
  5. `If I'm sick, I'll reschedule you, and you won't be charged anything.`

**`mobile-visits` · Mobile visits and travel** (bullets)
1. `The travel fee is ${travel} per visit inside my service area (see the map at {host}).`
2. `One travel fee covers up to {terms.groupMax} back-to-back sessions at the same address, as my schedule allows, such as a household or a small group taking turns.`
3. `Outside my service area, mobile visits are by request. Travel is quoted before I confirm the appointment, based on drive time and distance. It replaces the ${travel} fee, and one quote covers a back-to-back group the same way.`
4. `Space, pets and access for mobile visits are covered in the Mobile visits section of the Client Service Agreement you sign.`

**`packages` · Packages**
- Table `Package prices`: head `{packages.sessions}-session package` · `Office` · `Mobile (travel included)`; rows `{packages.sessions} × {m60} minutes` · `${packages.prices.s60.office} (save ${save:s60:office})` · `${packages.prices.s60.mobile} (save ${save:s60:mobile})`, and the same for `s90`. Today: `5 × 60 minutes` · `$375 (save $75)` · `$475 (save $100)`; `5 × 90 minutes` · `$500 (save $100)` · `$600 (save $125)`.
- Bullets:
  1. `A package is paid in full when you buy it. Its sessions are not charged again.`
  2. `Packages are for your own sessions. They can't be shared or transferred.`
  3. `Use an office package for office visits and a mobile package for mobile visits. A mobile package includes travel inside my service area; outside it, any quoted travel above ${travel} is charged to your card after each visit it applies to.`
  4. `Use your sessions within {packages.expiryMonths} months of purchase; unused sessions expire after that.`
  5. `A package keeps the price you paid, even if my rates go up.`
  6. `A late cancel on a package session charges the late-cancel fee (${late60} or ${late90}) to your card, and the session stays in your package. A no-show uses one session.`
  7. `Packages aren't refunded if you change your mind. If I can't provide your remaining sessions (for example, if I stop practicing or move away), or a change in your health makes massage unsafe for you, I'll refund the unused sessions at the per-session price you paid.`

**`not-right` · If a session wasn't right**
- P: `If something about a session wasn't right, tell me within {terms.reportDays} days. I'll make it right with a follow-up session or a partial or full refund, my choice. I can't guarantee results; bodies don't work that way. Billing mistakes are always corrected and refunded once you make me aware of them.`

**`tips` · Tips**
- P: `Tips aren't expected. If you'd like to leave one, it's gladly accepted, and there's an optional tip at checkout.`

**`communication` · Communication** (bullets)
1. `The fastest way to reach me is the [contact form]({site.contact.lead}) or [chat]({site.contact.chat}) at {host}. Email works too: [{site.email}]({mailHref}). I usually reply within two business days, and I don't answer during sessions.` (**I-037 change 2:** the first sentence. The email sentence stays; the phone number is never published.)
2. `Use text and email for scheduling and quick questions. Please don't send detailed health information that way; your intake form and our check-in are the place for it.`
3. `For new or worsening symptoms, contact your doctor. In an emergency, call 911.`

**`conduct` · Conduct and safety** (bullets)
1. `Every session is clinical and nonsexual. Any sexual behavior, comment or request, or harassment of any kind, ends the session immediately. You'll be charged the full session price, plus travel for a mobile visit, and you won't be able to book again.`
2. `I won't start or continue a session if you appear impaired by alcohol or drugs, or if the setting feels unsafe to me. That's charged as a no-show, and rebooking is at my discretion.`
3. `You're in charge of your session. Tell me to change the pressure, skip an area, or stop at any time.`

## Payment notice (`src/components/PaymentNotice.astro`, step 15, I-041)

Payment methods and the Colorado card-surcharge notice, shown near the booking buttons (Brian approved the plan, Oct 29, 2026). Every line is policy text from Client Policies v1.4 (→ Client Policies, `booking`), imported from `src/data/client-policies.ts`, never typed in a page or the component. Don't reword it. Component markup and spacing: ARCHITECTURE §B3.

**Text, in this order**
1. **Methods line** (`<p>`, `paymentMethodsLine` = `acceptedPayments` + space + `zelleDetails`, the policy's bullets 3 and 4):
   `I accept cash, Zelle, and credit or debit cards through PocketSuite (Tap to Pay in person, or the booking link). Ask me for Zelle details. I don't accept Venmo, PayPal or other payment apps.`
2. **Surcharge line** (`<p>`, `surchargeLine`):
   `{site.name} adds a {terms.surchargePercent}% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.` → `Ohm Precision Bodywork adds a 3% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.`
3. **Notice box** (bordered): head `Colorado notice` (the policies page's notice head), then `coloradoNotice`, the statutory text verbatim (→ Client Policies, `booking` notice).

**Never in it:** a Zelle address, handle, phone number or email; ACH, bank transfer, wire or checks as a way to pay; Venmo or PayPal as accepted; an amount typed in place of `{terms.surchargePercent}`.

**Placement** (once per page)
| Page | Where | Prop |
|---|---|---|
| `/book` (`book/index.astro`) | After the `#mobile` section (the boundary line), before the zone `<template>`s: under the office and mobile cards whichever the visitor uses | `at="book"` |
| `/book/central`, `/book/midnorth`, `/book/north`, `/book/office` (`book/[zone].astro`) | Directly after the card (`.result`), before the map | `at="book"` |
| `/book/out` | Not shown (no booking button) | |
| `/services` | CTA section, directly above `<BookCta />` | default |
| `/pricing` | CTA section, directly above `<BookCta />` | default |
| `/client-policies` | Not shown (unchanged; its `booking` section already has the text) | |

The Pricing intro (→ Pricing, I-046) and the Book intro (→ Book, I-045) were reworded after step 15; the notice itself is unchanged.

---

## Checks Opus ran on this deck
- **I-045, I-046 (Oct 29):** both sentences are Brian's exact text. They restate Client Policies `booking` bullets 2 and 3 (card on file at booking, charged after the session; cash, Zelle, cards) and `mobile-visits` bullet 2 (one fee, up to `terms.groupMax` back-to-back sessions, same address); no new fact. The fee and the count are references. No Zelle address, no surcharge figure, no licensed-only term, no "treat/cure/diagnose/fix/heal/health".
- **Step 15 prep (I-041, Oct 29):** the payment notice adds no new sentence: the methods line is Client Policies `booking` bullets 3 and 4, the surcharge line and the statutory notice are the policy's notice texts, and `Colorado notice` is its existing head. No Zelle address, phone, ACH or bank transfer; Venmo and PayPal appear only as not accepted. No licensed-only term, no "treat/cure/diagnose/fix/heal/health". `/book/office` gets the notice too (it shows a booking button); flagged to Brian.
- **Step 14 (I-037, Oct 29):** the Client Policies text is Brian's approved doc, so it is not reworded for voice. No phone number, no `tel:`/`sms:`, no Zelle address, no bracketed placeholder, no drafting notes. "text or call me" / "text me" kept (Brian's decision). No "home visit", "home office", "Home mobile"; no zone names. "massage" appears once (packages refund), allowed while licensed (BRIEF §7). "health" appears twice and trips the medical-word warning (accepted). No "treat/cure/diagnose/fix"; "I can't guarantee results" is the opposite of a promise. Every rate, fee, minute count, the domain and the email are references. New page copy (meta, H1, labels, link lines) restates the doc and adds no fact.
- **Step 13 (I-040, Oct 29):** no page text in the deck says "home visit", "home office" or "Home mobile" (they appear only in the rule above); no zone name with "Springs". The only literal zone names were in the map `<desc>`, now `Central, Mid-north and North` (built from `site.zones`).
- **Step 12 (I-035, Oct 29):** the credential block's licensed-only words ("LMT", "Licensed") live only in `wording.ts`. No license number anywhere in the deck. "CNMT" and the Oct 12, 2026 license are from I-035 (Brian). No "treat/cure/diagnose/fix/heal".
- **I-023 (Oct 29):** the new `outOfRegionFeeNote` has no digit, `$`, range, licensed-only term or "treat/cure/diagnose/fix/heal".
- **7A additions:** the neuromuscular paragraphs, Pricing page, out card, contact and map text. No licensed-only terms and no "massage". No "treat/cure/diagnose/fix/heal/health": the outcome line is phrased as an aim ("The aim is less pain and more freedom to move"), and "can show up as a headache" describes referred pain, not a promised result. No phone number. Prices are all computed from `site`. The map text (title, desc, hint, credit) is descriptive only, with no outcome language.
- **6A additions:** the glossary, the worked example and `outOfRegionFeeNote` were checked against §7. They contain no licensed-only terms and no "treat/cure/diagnose/fix/heal" (or "health"). Each definition describes what happens in the session and makes no outcome claim. "Can be felt as a headache" describes referred pain, not something the work promises to change.
- **§7, unlicensed:** no "massage", "massage therapist", "massage therapy", "LMT" or "licensed" outside the licensed variants in `wording.ts`. The school name appears only in `training`'s licensed variant.
- **No medical claims:** the only "treat-", "diagnos-" words are in the scope note, which `check:wording` now strips before scanning. Also absent: cure, fix, heal, and "health" (the scan matches `heal…`).
- **Target phrases:**
  - "Neuromuscular therapy in Colorado Springs": Home title, subline and description.
  - "sports recovery for climbers": Services, and the Services description.
  - "trigger point therapy": Home "What a session does" and the Home description.
- **Facts:** every fact traces to brief §1, §5, §6 or §8, or to a `site` reference. Inferences are confined to the About draft, which is flagged for review.
