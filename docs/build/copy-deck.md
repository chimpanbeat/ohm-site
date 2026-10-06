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

**Meta**
- `title`: `Ohm Precision Bodywork · Neuromuscular therapy in Colorado Springs` (ARCHITECTURE §B7. Pass it whole; no suffix.)
- `description`: `Neuromuscular therapy in Colorado Springs for climbers, athletes and desk workers. Trigger point therapy and sports recovery, at your place or my office.`

**Hero** (on `--green-900`)
- **H1:** `{w:heroLine}`
- **Subline** (`<p>` under the H1 rule): `Neuromuscular therapy in Colorado Springs for climbers, athletes and desk-bound engineers.`
- **CTA:** `<BookCta />`
- **Price hint** (`<p>`, small, beside or under the CTA): `From ${minPrice} · at your place or my office`

**Cream band: three blocks** (each an `<h2>` and one `<p>`, in this order)

1. **H2:** `Who it's for`
   **P:** `Climbers and outdoor athletes, endurance athletes, and people with chronic pain referred by their chiropractor or PT. Also engineers and other desk workers whose posture has started to cost them, and military service members and veterans. If you want to know why I'm working where I'm working, ask. I'll explain.`

2. **H2:** `What a session does`
   **P:** `Each session starts with a short assessment: where it hurts, how you move, and what you want to get back to. Then I work on the muscles and trigger points that limit that movement, using neuromuscular techniques, trigger point therapy and {w:deepTissue}. The aim is to reduce resistance in the tissue and restore movement. You leave knowing what I found, with a few things to do on your own between sessions.`

3. **H2:** `Why "Ohm"`
   **P:** `An ohm is the unit of electrical resistance. I spent 12 years as an FPGA design engineer before changing careers, and resistance is still what I work on, now in muscle and fascia. The name also echoes Om, for the yoga and breathwork that brought me here. The tagline carries both meanings.`

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
- **Intro P:** `I work on the muscles and fascia that limit how you move. Every session starts with an assessment, and I explain what I find and why I'm working where I am.`

**Cream band: session types**
- **H2:** `Session types`
- Four `<h3>` + `<p>` pairs, in this order:

1. **H3:** `Neuromuscular therapy`
   Two `<p>` (7A; replaces the technique list and the glossary):
   **P1:** `Neuromuscular therapy works with your nervous system, not against it. Your nervous system sets how tight a muscle stays and how sensitive an area feels, and after an injury or a long stretch of pain it can keep muscles guarded when they no longer need to be. I use focused pressure, stretches you take an active part in, and other targeted techniques to give it a reason to let go. The aim is less pain and more freedom to move.`
   **P2:** `A big part of this is trigger points: tight, tender spots in a muscle that can send pain somewhere else. Knots in your upper shoulders, for example, can show up as a headache. Knowing these referred pain patterns means I look for where your pain starts, not just where you feel it.`

2. **H3:** `Sports and athletic recovery`
   **P:** `Sports recovery for climbers, endurance athletes and anyone training hard. I focus on the areas that take the load, like a climber's forearms and shoulders, and fit sessions around your training.`

3. **H3:** `Myofascial and {w:deepTissue}`
   **P:** `Slow, sustained pressure on muscle and fascia where tension has built up over time. A good fit for long-standing tightness from desk work, repetitive training or old injuries.`

4. **H3:** `Chronic pain and injury support`
   **P:** `Ongoing work for chronic pain and for recovery after an injury, in collaboration with your chiropractor or PT. I work alongside their plan, not in place of it.`

**Cream band (continued): pricing** (7A: the table moved to `/pricing`)
- **H2:** `Pricing`
- **P:** `Sessions start at ${minPrice}, at my office or at your place. See [rates and the travel fee](/pricing).`
- The initial-assessment TODO comment is deleted (the rate is gone).

**Cream band (continued): office vs mobile**
- **H2:** `At my office or at your place`
- **P:** `Sessions are at my home office or at your place. The office is in {site.officeArea}, and I'm there {site.office.days}. For mobile sessions I come to you, with a ${site.travelFee.amount} travel fee, and the days depend on your part of town. The booking page works out which area you're in and sends you to the right booking link.`

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
- **Intro P:** `Same session rates at my office or at your place. Mobile sessions add a flat ${site.travelFee.amount} travel fee, already included in the "At your place" column.`

**Cream band**
- `<PriceTable />`. Its text: caption `Session rates`; column headers `Session`, `At my office`, `At your place` with the small second line `includes ${site.travelFee.amount} travel`; row labels from `{site.rates.*.label}`; prices `${price}` and `${price + site.travelFee.amount}`, computed. Today: 60-minute session $90 / $115; 90-minute session $120 / $145.
- **H2:** `Travel fee`
- **P:** `${site.travelFee.amount}. {site.travelFee.note}`
- **P:** `Where you are decides which days I can come to you. The [booking page](/book) works it out from your address.`

**CTA:** `<BookCta />`, on green after the cream band (same pattern as Services).

---

## About (`src/pages/about.astro`)

`<!-- TODO(Brian): review About draft -->` goes in the page source, directly above the first paragraph.

> **TODO(Brian): review About draft.** It is built only from the brief §8 facts. Check every sentence, especially paragraphs 1 and 4, which put those facts in your voice.

**Meta**
- `title`: `About Brian · Ohm Precision Bodywork`
- `description`: `Brian Clarke spent 12 years as an FPGA design engineer before training in neuromuscular therapy. Evidence-informed bodywork for climbers and athletes in Colorado Springs.`

**Picture:** the alt text from the table above.

**H1:** `About Brian`

**Body** (five `<p>`, in this order; no subheadings)
1. `My path into {w:practice} started with my own shoulder surgery and rehab. Yoga and breathwork came next, and with them a lasting interest in how bodies move and recover.`
2. `Before that, I spent 12 years as an FPGA design engineer. Debugging hardware is systematic: observe, form a hypothesis, test, write it down. I assess the body the same way, and I keep clear notes so each session builds on the last.`
3. `{w:training} Its core is neuromuscular therapy: trigger point release, ischemic compression and PNF.`
   No glossary on About (Brian, Oct 5 2026: the terms are defined on Services).
4. `I've been climbing for more than five years, and I volunteer with adaptive climbing groups at CityRock. I know what a hard season does to forearms, shoulders and hips.`
5. `My approach is evidence-informed and precise, and it starts from your goals. I'll explain what I find and why I'm working where I am. You should leave understanding your body a little better, with tools for your own recovery.`

**CTA:** `<BookCta />`

---

## Book (`src/pages/book/index.astro`)

**Meta**
- `title`: `Book a session · Ohm Precision Bodywork`
- `description`: `Find the right booking link for an office or mobile session in Colorado Springs and Manitou Springs.`
- The `/book/[zone]` pages use the same `title` and `description`.

**Intro P** (directly under the H1, before the `#where` fieldset):
`Tell me where you want your session and I'll point you to the right booking page. Scheduling, intake forms and payment are all handled on PocketSuite.`

**Mobile section** (7A, ARCHITECTURE §B4):
- **H2** (`#mobile-h`): `Where are you located?`
- **Address label** (built in `book.ts`): `Not sure? Enter your address`
- **Map hint** (`.map-hint`, un-hidden by book.ts): `The colors match the area buttons above. Tap an area on the map to choose it.`
- **Map `<title>`:** `Service area map`. **`<desc>`:** `Map of Colorado Springs showing my three service areas, Central & Southwest Springs, Mid-north Springs and North Springs, with the major roads that border them.` Build the zone names from `site.zones` (don't type them).
- **Map labels:** zone names from `site.zones[key].name`; road short names and place names as listed in ARCHITECTURE §B4.
- **Credit line** (small, under the map): `Roads and places © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)`
- **Link** (unchanged): `Open the map in Google Maps` → `{site.mapViewerUrl}`
- **Boundary line:** `Near a boundary or can't find your address? [Chat with me]({site.contact.chat}). Boundaries are approximate.`
- `/book/[zone]` (not office) shows the same map, focused on that zone. The hint isn't shown there (no JS).

The rest of the router text is fixed by ARCHITECTURE §B3 and §B4.

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
