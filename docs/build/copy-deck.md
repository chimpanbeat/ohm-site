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
Header, Footer, OfficeCard, ZonePicker and RateTable keep their current text (ARCHITECTURE §B3).

**Changes in step 6A (Oct 5, site review):**
- **ZoneCard, `out` only:** a new `<p>` after `I sometimes travel there by request.` and before the contact buttons: `{site.outOfRegionFeeNote}`. No amount is shown while `site.outOfRegionFee` is `null`.
- **MapEmbed:** iframe `title` is `Ohm service area map`.
- **Travel-fee note:** `{site.travelFee.note}` now ends "No travel fee for a second session booked right after the first at the same address." It's config-only, so ZoneCard and Services pick it up with no page change.
- **Glossary:** definitions live in `src/data/glossary.ts` and render through `<Glossary keys={[…]} />` (a `<dl>`). Use the term and definition text exactly as written there.

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
- `title`: `Services and pricing · Ohm Precision Bodywork`
- `description`: `Neuromuscular therapy, sports recovery for climbers, and myofascial and {w:deepTissue} in Colorado Springs. Rates, the travel fee, and office or mobile sessions.`

**Header section** (on `--green-900`)
- **H1:** `Services and pricing`
- **Intro P:** `I work on the muscles and fascia that limit how you move. Every session starts with an assessment, and I explain what I find and why I'm working where I am.`

**Cream band: session types**
- **H2:** `Session types`
- Four `<h3>` + `<p>` pairs, in this order:

1. **H3:** `Neuromuscular therapy`
   **P:** `Trigger point release, ischemic compression and PNF stretching, aimed at the specific muscles that refer pain or limit your range. Precise, pressure-specific work, with the reasoning explained as we go.`
   **Glossary** (after the P, 6A): `<Glossary keys={['ischemicCompression', 'pnf', 'referredPain']} />`

2. **H3:** `Sports and athletic recovery`
   **P:** `Sports recovery for climbers, endurance athletes and anyone training hard. I focus on the areas that take the load, like a climber's forearms and shoulders, and fit sessions around your training.`

3. **H3:** `Myofascial and {w:deepTissue}`
   **P:** `Slow, sustained pressure on muscle and fascia where tension has built up over time. A good fit for long-standing tightness from desk work, repetitive training or old injuries.`

4. **H3:** `Chronic pain and injury support`
   **P:** `Ongoing work for chronic pain and for recovery after an injury, in collaboration with your chiropractor or PT. I work alongside their plan, not in place of it.`

**Cream band (continued): pricing**
- **H2:** `Pricing`
- `<RateTable />` (its text is unchanged)
- **Worked example P** (directly under the table, 6A): `{site.rates.s60.label} at your place: ${site.rates.s60.price} + ${site.travelFee.amount} travel = ${site.rates.s60.price + site.travelFee.amount}.` Today it renders as "60-minute session at your place: $90 + $25 travel = $115." Compute the sum in the page from config; never type it.
- **P** (under the example): `{site.travelFee.note}`
<!-- TODO(Brian): is the initial assessment + session required for first-time clients? If yes, Opus adds one line here. -->

**Cream band (continued): office vs mobile**
- **H2:** `At my office or at your place`
- **P:** `Sessions are at my home office or at your place. The office is in {site.officeArea}, and I'm there {site.office.days}. For mobile sessions I come to you, with a ${site.travelFee.amount} travel fee, and the days depend on your part of town. The booking page works out which area you're in and sends you to the right booking link.`

**Scope note** (`<p>`, small text, last in the cream band)
- `Sessions are not a substitute for medical diagnosis or treatment.`
  (Exact sentence. `check:wording` allowlists it.)

**CTA:** `<BookCta />`, after the scope note.

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

No other changes. The router text is fixed by ARCHITECTURE §B3 and §B4.

---

## 404 (`src/pages/404.astro`)

**Meta**
- `title`: `Page not found · Ohm Precision Bodywork`
- `description`: `This page doesn't exist.` (The page is `noindex`.)

**H1:** `Page not found`

**P:** `That page doesn't exist, or it has moved. [Book a session](/book) or go back to the [home page](/).`

---

## Checks Opus ran on this deck
- **6A additions:** the glossary, the worked example and `outOfRegionFeeNote` were checked against §7. They contain no licensed-only terms and no "treat/cure/diagnose/fix/heal" (or "health"). Each definition describes what happens in the session and makes no outcome claim. "Can be felt as a headache" describes referred pain, not something the work promises to change.
- **§7, unlicensed:** no "massage", "massage therapist", "massage therapy", "LMT" or "licensed" outside the licensed variants in `wording.ts`. The school name appears only in `training`'s licensed variant.
- **No medical claims:** the only "treat-", "diagnos-" words are in the scope note, which `check:wording` now strips before scanning. Also absent: cure, fix, heal, and "health" (the scan matches `heal…`).
- **Target phrases:**
  - "Neuromuscular therapy in Colorado Springs": Home title, subline and description.
  - "sports recovery for climbers": Services, and the Services description.
  - "trigger point therapy": Home "What a session does" and the Home description.
- **Facts:** every fact traces to brief §1, §5, §6 or §8, or to a `site` reference. Inferences are confined to the About draft, which is flagged for review.
