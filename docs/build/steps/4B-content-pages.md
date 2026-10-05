# 4B: Content pages

Model: sonnet
Brief: §5, §8, §9 (imagery, art direction, restraint), §11
Architecture: §A3, §A5 (wireframes), §B3, §B6
Copy: `docs/build/copy-deck.md` (**the only source of visible text**)

## Goal
Replace the Home, Services, About and 404 stubs with the real pages, following the wireframes and the copy deck. Add the Book page intro.

## Files to modify
- `src/pages/index.astro`:
  - **Hero** on `--green-900`: `graphic-green.png` via `<Image>`, positioned to bleed off the right edge on desktop and sit behind or above the text on mobile.
    - Mark the image decorative (`alt=""`) unless the deck gives alt text.
    - `loading="eager"` and `fetchpriority="high"`.
    - Responsive `widths` [480, 800, 1200] and AVIF/WebP.
  - **H1:** `{w('heroLine')}`, then the subline and BookCta.
  - **Price hint:** "From $X" computed from `Math.min(...rates)`.
  - **Cream band** with the three blocks, then a green CTA band.
  - **Above the fold at 375×667:** the H1, the CTA and the header Book button.
- `src/pages/services.astro`: the session types, `RateTable`, the office-vs-mobile paragraph, the scope note, and BookCta.
- `src/pages/about.astro`:
  - `<Picture>`: portrait crop below 48rem, landscape at and above it, formats AVIF/WebP, sensible `widths`/`sizes`, alt text from the deck.
  - The draft copy, and the `<!-- TODO(Brian): review About draft -->` comment.
  - BookCta.
- `src/pages/404.astro`, `src/pages/book/index.astro` (intro text only): copy from the deck.
- Per-page `title` and `description` from the deck.

## Constraints
- **Copy:** text only from the deck, and `{w:key}` uses `w()`. If the deck is missing something you need, escalate. Don't write copy.
- **Restraint (§9):** no eyebrows, no animations, no card shadows, no extra imagery beyond §B6.
- **Literals and JS:** no rate, day or zone literals, and zero JS outside `/book`.

## Done when
1. `npm run build`, `npm test` and `npm run check:wording` all pass, with no failures. Paste any warnings into the Report.
2. `grep -rnE '\$[0-9]|Tue|Wed|Fri|Sat|Central|Mid-north|North Springs' src/pages src/components` prints nothing.
3. In the built `about.html`, the `<picture>` has a portrait `<source media=…>` and a landscape fallback, with AVIF and WebP.
4. Visual check at 375px and 1280px, if browser tooling is available: the hero CTA is visible without scrolling on mobile, and the layout matches the wireframes. Attach the screenshots' observations to the Report.

## Report
(Sonnet)

**Files changed**
- `src/pages/index.astro`: hero (`<Image>` eager, high priority, AVIF/WebP, widths 480/800/1200, decorative), H1, subline, CTA, price hint from `Math.min` of rates, three cream blocks, green CTA band.
- `src/pages/services.astro`: header, four session types, `RateTable`, travel note, office-vs-mobile, scope note, `BookCta`.
- `src/pages/about.astro`: art-directed `<picture>` built with `getImage` (portrait AVIF/WebP sources under 47.99rem, landscape AVIF/WebP sources, JPEG fallback `<img>`), five paragraphs, TODO comment, `BookCta`.
- `src/pages/404.astro`, `src/pages/book/index.astro`: deck meta and copy; Book intro paragraph added. Removed the now-unused `site` import in `book/index.astro`.
- `src/pages/book/[zone].astro`: title/description only, per the deck ("zone pages use the same title and description").

**Checks**
- `npm run build`: pass, 10 pages, no warnings.
- `npm test`: 23 pass, 0 fail.
- `npm run check:wording`: OK.
- Literal grep (`$[0-9]|Tue|Wed|Fri|Sat|Central|Mid-north|North Springs` in `src/pages src/components`): prints nothing.
- Built `about.html`: portrait `<source media="(max-width: 47.99rem)">` for AVIF and WebP, landscape AVIF and WebP sources, JPEG fallback `<img>`. Pass.
- Visual check at 375 and 1280: **not done**. Playwright isn't installed in the project, so there was no browser tooling. Opus should check the hero in 4R: on mobile the art sits behind the text at 30% opacity; on desktop it is 60% wide and bleeds off the right edge, with H1 and subline capped at 40% width.

**Deviations**
- `[zone].astro` is not in the file list; edited for meta only, as the deck requires.
- About fallback `<img>` is JPEG (landscape); the step only said AVIF/WebP sources.

**TODO(Brian):** About draft review and first-time-assessment question; both are already in the page source and STATUS.

**Questions for Opus:** none. Hero opacity and art position are my design call within the wireframe; adjust in 4R if it reads wrong.

## Review
(Opus)

**Accepted (4R, 2026-10-05).**
- Copy: every page matches the deck word for word, including meta. `check:wording` is OK with no warnings. No invented facts.
- Checks re-run: build (10 pages), tests 23/23, wording OK, the literal grep prints nothing, no raw hex outside `tokens.css`, zero `<script>` on Home, Services and About.
- Visual check (Playwright, 375×667 and 1280×800): the hero H1, CTA and header Book are above the fold at 375, with no horizontal overflow. The About `<picture>` serves the portrait AVIF on mobile. Design: green-dominant; the anatomy art is the one memorable element; terracotta only on the CTAs and the H1 rule; focus ring and reduced-motion rules come from `global.css`.
- Opus fixes: (1) on desktop the hero art's left edge showed as a hard rectangle against `--green-900`, so a `mask-image` gradient now fades it in; (2) `.gitignore` now ignores `.playwright-mcp/` and `lighthouse/`.
- For 5R: headless Chromium logs "preloaded but not used" for both fonts. The preload tags are correct (`as="font"`, `crossorigin`) and fonts render, so confirm under Lighthouse.
