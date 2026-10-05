# 1A: Scaffold, layout, wording check, CI

Model: sonnet
Brief: §3, §5 (global elements), §7 (build guard), §9, §14
Architecture: §A1–A4, §B1–B3, §B5 (check:wording, workflow), §B6

## Goal
Get a deployable site shell. It should have:
- self-hosted fonts and favicons
- global CSS on top of the tokens
- the Base layout with Header and Footer
- stub pages for every route
- the `check:wording` guard
- a smoke test
- the GitHub Pages workflow

The stub pages carry **no marketing copy**. That arrives in Phase 4 from the copy deck.

## Files to create
- `src/assets/fonts/dm-sans-latin-var.woff2` and `src/assets/fonts/saira-semi-condensed-latin-700.woff2`. Download them from the Google Fonts CSS2 API: request
  - `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..700&display=swap`
  - `https://fonts.googleapis.com/css2?family=Saira+Semi+Condensed:wght@700&display=swap`

  with a modern desktop Chrome `User-Agent` so you get woff2. Take the **`/* latin */`** block's `src` URL, then download it with curl. (Reading from Google Fonts is allowed for this step.)
- `src/assets/`: copy and rename exactly the images in ARCHITECTURE §B6. Use `cp`; don't edit the originals.
- `scripts/make-icons.mjs` and its outputs `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/icon-512.png` (spec in §B6). Import `sharp` directly, since it's installed as Astro's dependency. Don't add it to `package.json`. Run `npm run icons` and commit the outputs.
- `src/styles/global.css`:
  - a modern minimal reset
  - `body` (font-text, fs-body, lh-body, `background: var(--bg-dark); color: var(--text-on-dark)`)
  - headings: h1 uses font-display, uppercase, lh-display, and a 3px × 48px `--accent` rule via `::after`
  - links
  - `.container`
  - `.band-light` (cream bg, ink text, `--link-on-light` links) and `.band-dark`
  - `.btn` (CTA: `--cta-bg` / `--cta-text`, min-height 44px, radius) and `.btn--quiet` (cream outline)
  - `:focus-visible` ring
  - `.visually-hidden` and `.skip-link`
  - `tabular-nums` utility `.num`
  - reduced-motion handling (tokens already zero the transition)

  **No hex values.** Use tokens only.
- `src/lib/url.ts`: `href()` per §B2.
- `src/layouts/Base.astro`: per §B3. Imports `tokens.css` and `global.css`. Font preloads use `?url` imports. Favicons are linked via `href()`. Robots meta follows `indexable`. Canonical, and OG tags (`og:image` optional for now).
- `src/components/Header.astro`, `Footer.astro`, `BookCta.astro`: per §A4 and §B3. The logo is an `astro:assets` `<Image>`; width it about 180px and request at least 2× density.
- `src/pages/index.astro`, `services.astro`, `about.astro`, `book/index.astro`, `404.astro`: **stubs**. Each one is `<Base title=… description=…>` with an H1 and one neutral sentence:
  - Home: H1 `{w('heroLine')}`, the sentence `site.name`, and a BookCta.
  - Services: H1 "Services and pricing", plus `<RateTable/>` (build `RateTable.astro` now, per §B3).
  - About: H1 "About".
  - Book: H1 "Book a session". Phase 2 replaces this.
  - 404: H1 "Page not found", a sentence, and a link to `href('/book')` (§5).

  Use the description `site.tagline` for now.
- `scripts/check-wording.mjs`: exactly per §B5.
- `tests/site.test.ts`: tests for the contract helpers:
  - `bookingUrl` returns `links.general` with `placeholder: true` for each `TODO_` link
  - `w()` returns the unlicensed variant when `site.licensed` is false
  - `indexable` is false
  - every `site.zones[k].key === k`
  - `zones.out.linkKey === null`
- `.github/workflows/deploy.yml`: exactly per §B5.

## Read-only (contract) files
`src/data/site.ts`, `src/data/wording.ts`, `src/lib/geo.ts`, `src/styles/tokens.css`, `astro.config.mjs`, `package.json` (scripts are already set; don't add dependencies).

## Constraints
- Zero client JS on these pages. Don't use `<script>` in any page or component in this step.
- No rate, day, link or zone literals outside `src/data/`. Prices come from `site.rates`.
- §7 rules. While unlicensed, the output must not contain "massage" at all.
- Every internal link goes through `href()`.

## Done when
Paste the results into the Report.
1. `npm run icons` writes the 3 PNGs.
2. `npm run build` succeeds.
3. `npm test` passes.
4. `npm run check:wording` exits 0.
5. **Guard self-test:** temporarily add `<p>LMT</p>` to `404.astro`, build, and confirm `check:wording` exits 1 and names the file. Revert, rebuild, and confirm it exits 0 again.
6. `grep -rhoE 'href="/[^"]*"' dist --include=*.html | sort -u`: every internal href starts with `/ohm-site/`.
7. `grep -rnE '#[0-9a-fA-F]{3,6}\b' src --include=*.astro --include=*.css | grep -v tokens.css` prints nothing.
8. `ls dist/_astro` contains `.woff2` files, and the built HTML has 2 `rel="preload"` font links.
9. `npm run dev`, then load `http://localhost:4321/ohm-site/`. Check that every route returns 200 and that `/ohm-site/nope` shows the 404 page. If browser tooling is available, screenshot the home page at 375px and 1280px wide and confirm Book is visible in the header without scrolling. Otherwise, note "not visually checked".

## Report
**Files changed:**
- `src/assets/fonts/*.woff2` (2), `src/assets/*` (7 images per §B6): downloaded and copied.
- `scripts/make-icons.mjs` and `public/favicon-32.png`, `apple-touch-icon.png`, `icon-512.png`.
- `src/styles/global.css`, `src/lib/url.ts`, `src/layouts/Base.astro`.
- `src/components/Header.astro`, `Footer.astro`, `BookCta.astro`, `RateTable.astro`.
- `src/pages/index.astro` (replaced the smoke test), `services.astro`, `about.astro`, `book/index.astro`, `404.astro`.
- `scripts/check-wording.mjs`, `tests/site.test.ts`, `.github/workflows/deploy.yml`.
- `docs/build/STATUS.md`: row set to in-progress, then review.

**Checks:**
1. `npm run icons`: wrote the 3 PNGs.
2. `npm run build`: pass (5 pages).
3. `npm test`: 6 pass, 0 fail.
4. `npm run check:wording`: exit 0. One WARN: "treatment" in the rate label (already a TODO(Brian)).
5. Guard self-test: with `<p>LMT</p>` in 404.astro, `check:wording` exited 1 and printed `FAIL dist\404.html: "LMT"`. After reverting and rebuilding it exited 0.
6. Internal hrefs: all start with `/ohm-site/` (`/`, `/about`, `/book`, `/services`, `_astro/*`, favicon, apple-touch-icon).
7. Raw-hex grep over `src` (excluding tokens.css): empty.
8. `dist/_astro` has 2 `.woff2` files, and `index.html` has 2 `rel="preload"` links. No `<script>` in `index.html`.
9. Dev server: `/`, `/services`, `/about`, `/book` return 200, and `/nope` returns 404 and shows the "Page not found" H1. Screenshots were taken with headless Edge. At 1280px Book is visible in the header. For 375px I used a 375px-wide iframe wrapper, because headless Edge's minimum window width is about 500px. Book is visible there too, after I narrowed the mobile logo to 110px and the nav font. The icon-only logo below 360px was **not** visually checked.

**Deviations:**
- Dropped `<meta name="theme-color">`. It needs a raw hex, which the no-hex rule forbids.
- The logo is two `<Image>` elements (full and icon), swapped by CSS media queries at 360px. Both are eager. The Image component has `densities={[2,3]}`.
- `Base.astro` renders the JSON-LD `<script type="application/ld+json">` only when `jsonLd` is passed. It is data, not client JS, and no page passes it yet.
- 404 uses `noindex`. Its link text is "Book a session" plus a home link.
- Added an unrequested `.section` padding class to global.css (§A3 section padding).
- The test file also covers `bookingUrl('general')` not being a placeholder.

**TODO(Brian):** none new.

**Questions for Opus:**
- `check:wording` WARNs on "treatment" in the rate label (existing TODO).
- The `?url` font preloads and the CSS `@font-face` URLs hash to the same files. Confirmed in dist.

## Review
Accepted by Opus (1R, 2026-10-05). Every Done-when check was re-run and passes. The guard was also verified on a crafted page: it fails on forbidden words in `alt` and `aria-label`.
- Opus nit fix: `.skip-link` now uses semantic tokens (`--bg-light` / `--text-on-light`).
- Accepted deviations: dropping `theme-color`, the two-image logo swap, and the conditional JSON-LD. The raw hex in `scripts/make-icons.mjs` is per §B6 (a build script, not shipped CSS).
- Header at 320px fits by arithmetic (about 234px of content in a 288px container), but it hasn't been checked visually. Recheck in 5R with real browser tooling.
- Treatment WARN: still open with Brian (see STATUS).
