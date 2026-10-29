# 12: Licensed wording (I-035)

Brief §4, §5, §7, §10, §11, AC-4 · Architecture §A4, §A6, §B2, §B3 (`Credentials`), §B5 (`check:wording`), §B7

## Goal
`site.licensed` is `true`, so every `w()` key renders its licensed variant. Home's text is unchanged (Brian, Oct 29: `heroLine` and `deepTissueHome` have equal variants; H1 stays the tagline). A new `Credentials` component shows `Brian Clarke, LMT, CNMT` and `Licensed in Colorado. Verify my license.` (link to `site.licenseVerifyUrl`) under the About H1, after the `/book` intro, and first in the footer's left column (`compact`). The license number is never published: the footer's `licenseNumber` line and the JSON-LD `hasCredential` block (and its TODO comment) are deleted, and nothing outside `site.ts` reads `licenseNumber`. `check:wording` gains `--dist`/`--licensed` flags and the licensed and always-on rules in ARCHITECTURE §B5. `deploy.live` stays `false`, so `indexable` stays false and every page keeps `noindex`. All copy is in copy deck → Global "step 12", About, Book; the markup and CSS are in ARCHITECTURE §B3 `Credentials`. Read-only here (the architect already changed them): `src/data/wording.ts`, `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`. `licenseVerifyUrl` is DORA's license lookup, `https://apps2.colorado.gov/dora/licensing/lookup/licenselookup.aspx` (Brian, Oct 29).

Exact edits outside the component:
- `src/data/site.ts`: only `licensed: false, // flips…` → `licensed: true, // flips wording rules (brief §7). Licensed since Oct 12, 2026 (I-035).` Nothing else.
- `src/layouts/Base.astro`: delete the `// TODO(Brian): licensure fields…` comment and the `if (site.licensed && site.licenseNumber) {…}` block; add `// No licensure fields and never the license number (I-035, I-027).` on the line above `const jsonLd`.
- `src/components/Footer.astro`: delete the `licenseNumber` line; add `<Credentials compact />` as the first child of the left column `<div>`.
- `README.md`: the `check:wording` row → `Checks dist/ against the licensure wording rules (brief §7)`. "Licensing and wording": first paragraph → `` `licensed` in `src/data/site.ts` is `true` (license issued Oct 12, 2026; I-035). `` plus the existing sentence on `w('key')`, plus `Setting licensed back to false restores the pre-licensure wording.`; the `check:wording` paragraph → `` `npm run check:wording` scans the built HTML. With `licensed: false` it fails on licensed-only terms; with `true` it fails if a page lacks the credential block. It always fails on a license number or a JSON-LD credential identifier: the license number is never published. ``. License-day checklist step 2 → `` `licensed` is already `true` (step 12). Leave `licenseNumber` empty: the license number is never published. `` Keep the heading name (launch.md links to it).

## AC covered (IDs)
- AC-4 (amended): `tests/check-wording.test.ts` cases 1–10, and `npm run check:wording` on the real build.
- AC-6: the credential text and URL come from `wording.ts`/`site.ts` (site test 4; review).

## Files
- src/data/site.ts
- src/components/Credentials.astro
- src/components/Footer.astro
- src/pages/about.astro
- src/pages/index.astro
- src/pages/book/index.astro
- src/layouts/Base.astro
- scripts/check-wording.mjs
- tests/check-wording.test.ts
- tests/site.test.ts
- README.md

## Tests first (write them and see them fail before writing code)
`tests/site.test.ts` (replace "w() returns the unlicensed variant while unlicensed"):
1. `site.licensed === true`; `w('role') === 'Licensed Massage Therapist'`; `w('deepTissue') === 'deep tissue massage'`; `w('credential') === 'Brian Clarke, LMT, CNMT'`.
   Home unchanged (Brian, Oct 29): `heroLine` and `deepTissueHome` have equal variants; `w('heroLine') === site.tagline === 'Reduce resistance. Restore movement.'`; `w('deepTissueHome') === 'deep tissue work'`. `index.astro` uses `w('deepTissueHome')` (was `deepTissue`).
2. Still not indexable: `site.deploy.live === false` and `indexable === false` (keep the existing test, add the `deploy.live` assert).
3. `site.licenseNumber === ''`, and no `.ts`/`.astro`/`.mjs` file under `src/` or `scripts/` except `src/data/site.ts` contains `licenseNumber` (`scripts/check-wording.mjs` is allowed: it enforces the rule).
4. `new URL(site.licenseVerifyUrl)` is `https:` with hostname `apps2.colorado.gov`; `wording.credential[0]`, `licensedIn[0]`, `verifyLicense[0]` are all `''`.

`tests/check-wording.test.ts` (spawn the script with `--dist <tmp> --licensed …`, as `check-dist.test.ts` does; build pages from `wording.*[1]` and `site.licenseVerifyUrl`, never typed). A "good licensed tree" = `index.html`, `404.html`, `about.html`, `book.html`, `book/out.html` each with the block once (about and book twice), plus `hello.html` with no block:
1. Good licensed tree, `--licensed true` → exit 0, even though pages contain "LMT" and "massage therapy".
2. Sequence: a page with "LMT" and no block → exit 1 with `--licensed false`; the same tree plus blocks → exit 0 with `--licensed true`.
3. Licensed, `book/out.html` without the credential → exit 1, message names `book/out.html`.
4. Licensed, `index.html` without the `href` to `licenseVerifyUrl` → exit 1.
5. Licensed, `about.html` with the credential once → exit 1; `book.html` missing → exit 1.
6. Licensed, `hello.html` and `hello/index.html` without the block → exit 0.
7. Either state: JSON-LD containing `"hasCredential"` → exit 1; containing `"identifier"` → exit 1.
8. Either state: visible `License #` or `license number` → exit 1; `Verify my license.` alone → exit 0.
9. Unlicensed clean tree with "heal" in text → exit 0 and stderr has `WARN`.
10. `--dist` to a missing dir → exit 2.

## Done when
1. `npm run check` passes, including the new tests (one existing `fix` warning on About is expected; paste warnings).
2. `npm run shots -- 12`: `about`, `book`, `index` and `book/out` at 375 and 1280 in `docs/build/screens/12/`; the block sits under the About H1 (gap unchanged), after the `/book` intro with a `--s-4` gap above it (§B3 `Credentials`), and first in the footer; nothing overflows at 375.
3. `grep -o "Brian Clarke, LMT, CNMT" <file> | wc -l` (Astro writes one-line HTML, so `grep -c` counts lines) → `dist/about.html` 2, `dist/book.html` 2, `dist/index.html` 1; `grep -L 'content="noindex"' dist/*.html dist/book/*.html` prints nothing.
4. `grep -rn "hasCredential\|licenseNumber" --include="*.html" dist` and `grep -rn "hasCredential\|licenseNumber" src/layouts src/components src/pages` print nothing (the bundled client JS under `dist/_astro/` carries the empty `licenseNumber:` key of `site` by design; check:wording covers a non-empty value). No hex outside `tokens.css`, no new dependency.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
