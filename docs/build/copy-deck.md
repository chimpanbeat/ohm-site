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
- **No phone number anywhere.** No `tel:` or `sms:` links, no "Call", "Text" or "Text me".
- **ContactButtons** (out-of-region card): `Send a request` (primary, → `{site.contact.lead}`), `Chat with me` (quiet, → `{site.contact.chat}`), then a `<p>`: `Or email ` + a `mailHref` link showing `{site.email}` + `.`
- **ZoneCard, `out`:**
  - Heading, `via='address'`: `That address is outside my regular service area.`
  - Heading, `via='pick'` (picker button and `/book/out`): `Outside my regular service area`
  - Then `I can sometimes travel outside my regular area by request.` (replaces "I sometimes travel there by request."), then `{site.outOfRegionFeeNote}`, then ContactButtons.
- **ZonePicker:** no built-in heading. `/book/[zone]` passes `heading="Not sure? Pick your area."`; `/book` passes none (its H2 introduces the list).
- **Travel-fee note:** `{site.travelFee.note}` is now "Flat, per mobile session. Book two sessions back to back at the same place, like you and your partner, and neither one has a travel fee." Config-only.
- **Glossary:** removed from the site (`glossary.ts` and `Glossary` are deleted). Trigger points are explained in the Services prose instead.

- **Map:** the My Maps iframe (`MapEmbed`) is replaced by our own SVG map (`ServiceMap`); its text is under Book → Mobile section.

**Earlier (6A):** `{site.outOfRegionFeeNote}` on the out card.

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
- **H1:** `{w:heroLine}`
- **Subline** (`<p>` under the H1 divider) (8A): `Neuromuscular therapy in Colorado Springs, for active people who want to move, perform and feel their best.` (Brian's text)
- **CTA:** `<BookCta />`
- **Price hint** (`<p>`, small, beside or under the CTA): `From ${minPrice} · at your place or my office`

**Cream band: three blocks** (each an `<h2>` and one `<p>`, in this order)

1. **H2:** `Who it's for`
   **P** (8A, Brian's text): `Ohm is for people who use their bodies and want to keep doing it: climbers, runners, cyclists, lifters, weekend hikers, and anyone active who wouldn't call themselves an athlete. I also work with people managing persistent pain or recovering from an injury or surgery, alongside their care team.`

2. **H2:** `What a session does`
   **P:** `Each session starts with a short assessment: where it hurts, how you move, and what you want to get back to. Then I work on the muscles and trigger points that limit that movement, using neuromuscular techniques, trigger point therapy and {w:deepTissue}. The aim is to reduce resistance in the tissue and restore movement. You leave knowing what I found, with a few things to do on your own between sessions.`

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
- **P:** `Sessions are at my home office or at your place. The office is in {site.officeArea}, and I'm there {site.office.days}. For mobile sessions I come to you, with a ${site.travelFee.amount} travel fee*, and the days depend on your part of town. The booking page works out which area you're in and sends you to the right booking link.` (The `*` is `<span aria-hidden="true">*</span>`.)
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

**CTA:** `<BookCta />`, after the scope note.

---

## Pricing (`src/pages/pricing.astro`, new in 7A)

**Meta**
- `title`: `Pricing · Ohm Precision Bodywork`
- `description`: `Rates for 60- and 90-minute neuromuscular therapy sessions in Colorado Springs, at my office or at your place, and how the mobile travel fee works.`

**Header section** (on `--green-900`)
- **H1:** `Pricing`
- **Intro P** (8A): `Same session rates at my office or at your place. Mobile sessions add a flat ${site.travelFee.amount} travel fee.`

**Cream band**
- `<PriceTable />` (9A: header labels at body size, top-aligned on one line). Its text: caption `Session rates`; column headers `Session`, `At my office`, `At your place` with the small second line `includes ${site.travelFee.amount} travel`; row labels from `{site.rates.*.label}`; prices `${price}` and `${price + site.travelFee.amount}`, computed. Today: 60-minute session $90 / $115; 90-minute session $120 / $145.
- **H2:** `Travel fee`
- **P:** `${site.travelFee.amount}. {site.travelFee.note}`
- **P:** `Where you are decides which days I can come to you. The [booking page](/book) works it out from your address.`

**CTA:** `<BookCta />`, on green after the cream band (same pattern as Services).

---

## About (`src/pages/about.astro`)

**8A: Brian wrote this bio himself (Oct 6 2026).** The review TODO is resolved: remove the `<!-- TODO(Brian): review About draft -->` comment from the page source.

**Meta**
- `title`: `About Brian · Ohm Precision Bodywork`
- `description` (8A): `Brian Clarke spent 12 years as an electrical engineer before training in neuromuscular therapy. Evidence-informed bodywork for climbers and athletes in Colorado Springs.`

**Picture:** the alt text from the table above.

**H1:** `About Brian`

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
  - home, shared, north: `Book in {zone.name}` / `Book a mobile session at your place in {zone.name}. I'm there {zone.days}.`
  - office: `Book at my office` / `Book a session at my office in {officeArea}. I'm there {office.days}.`
  - out: `{zones.out.name}` / `I can sometimes travel outside my regular area by request. Get in touch, or book a session at my office.`

**Intro P** (directly under the H1, before the `#where` fieldset):
`Tell me where you want your session and I'll point you to the right booking page. Scheduling, intake forms and payment are all handled on PocketSuite.`

**Mobile section** (7A, ARCHITECTURE §B4):
- **H2** (`#mobile-h`): `Where are you located?`
- **Address label** (built in `book.ts`) (9A: colon added): `Not sure? Enter your address:`
- **Map hint** (`.map-hint`, un-hidden by book.ts) (9A): `Tap an area on the map or a button above to choose it. Tap it again to see all areas. The Ohm symbol marks my office; tap it for office sessions.`
- **Reset button** (8A, over the map's top-right corner, shown while any area is chosen, including outside (9A)): `Show all areas`
- **Office map button** (10A, over the office map's top-right corner, always shown; on `/book` and `/book/office`): `Show mobile service areas`
- **Google Maps button** (8A, replaces the small link; directly under the map): `Open in Google Maps`, with an external-link icon and visually hidden ` (opens in a new tab)`.
- **Map `<title>`:** `Service area map`. **`<desc>`:** `Map of Colorado Springs showing my three service areas, Central & Southwest Springs, Mid-north Springs and North Springs, with the major roads that border them.` Build the zone names from `site.zones` (don't type them).
- **Map labels:** zone names from `site.zones[key].name`; road short names and place names as listed in ARCHITECTURE §B4.
- **Credit line** (small, under the map) (9A): `Roads and places © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Terrain: USGS 3DEP.`
- ~~**Link:** `Open the map in Google Maps`~~ → replaced by the Google Maps button above (8A), still → `{site.mapViewerUrl}`
- **Boundary line** (9A): `Near a boundary or can't find your address? [Chat with me]({site.contact.chat}) or [send me an email]({mailHref}). Boundaries are approximate.`
- `/book/[zone]` (not office) shows the same map, focused on that zone. The hint isn't shown there (no JS).

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

## Checks Opus ran on this deck
- **7A additions:** the neuromuscular paragraphs, Pricing page, out card, contact and map text. No licensed-only terms and no "massage". No "treat/cure/diagnose/fix/heal/health": the outcome line is phrased as an aim ("The aim is less pain and more freedom to move"), and "can show up as a headache" describes referred pain, not a promised result. No phone number. Prices are all computed from `site`. The map text (title, desc, hint, credit) is descriptive only, with no outcome language.
- **6A additions:** the glossary, the worked example and `outOfRegionFeeNote` were checked against §7. They contain no licensed-only terms and no "treat/cure/diagnose/fix/heal" (or "health"). Each definition describes what happens in the session and makes no outcome claim. "Can be felt as a headache" describes referred pain, not something the work promises to change.
- **§7, unlicensed:** no "massage", "massage therapist", "massage therapy", "LMT" or "licensed" outside the licensed variants in `wording.ts`. The school name appears only in `training`'s licensed variant.
- **No medical claims:** the only "treat-", "diagnos-" words are in the scope note, which `check:wording` now strips before scanning. Also absent: cure, fix, heal, and "health" (the scan matches `heal…`).
- **Target phrases:**
  - "Neuromuscular therapy in Colorado Springs": Home title, subline and description.
  - "sports recovery for climbers": Services, and the Services description.
  - "trigger point therapy": Home "What a session does" and the Home description.
- **Facts:** every fact traces to brief §1, §5, §6 or §8, or to a `site` reference. Inferences are confined to the About draft, which is flagged for review.
