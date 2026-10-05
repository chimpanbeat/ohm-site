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
3. In the built `about/index.html`, the `<picture>` has a portrait `<source media=…>` and a landscape fallback, with AVIF and WebP.
4. Visual check at 375px and 1280px, if browser tooling is available: the hero CTA is visible without scrolling on mobile, and the layout matches the wireframes. Attach the screenshots' observations to the Report.

## Report
(Sonnet)

## Review
(Opus)
