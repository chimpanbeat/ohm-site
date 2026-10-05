# 4A: Copy deck

Model: opus
Brief: §1, §5 (services content), §7, §8, §11 (target phrases)

## Do
Write `docs/build/copy-deck.md`. This is **all** visible copy for Home, Services, About, 404 and the Book page intro, plus per-page `title` and `description`, and alt text for every image. Rules:
- **§8 voice:** plain, direct, sentence case, active voice, no filler, no spa clichés. Give a short *why* where it helps.
- **§7:** unlicensed wording only, with variants written as `{w:key}` placeholders that map to `wording.ts` keys. If new keys are needed, add them to `src/data/wording.ts` in this step and log it under STATUS "Architecture changes".
- **No medical claims.** Use reduce, support, restore movement, work with.
- **Facts only from the brief.** Anything else is a visible-in-source `TODO(Brian)`. Rates, days and zone names are written as `{site.path}` references, never literals.
- **Target phrases** used naturally: "neuromuscular therapy Colorado Springs", "sports recovery for climbers", "trigger point therapy".
- **About:** draft it from the §8 facts. Mark it in the deck, and in the page as an HTML comment, `TODO(Brian): review About draft`.
- **Home:** short. Who it's for (audience in §1 order), what a session does, and why "Ohm" (§1 name meaning), each 2–4 sentences, plus a CTA.
- **Services:** the four session types (§5), the office vs mobile paragraph, and the scope note: "Sessions are not a substitute for medical diagnosis or treatment." (That sentence is on the check-wording allowlist.)

Structure the deck by page, then by section, with an exact component or slot name per block, so Sonnet can place the copy mechanically.

Set 4A to `done`, then run the gate: 4B is Sonnet.
