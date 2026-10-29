# 14: /client-policies page and PDF from one source text (I-037)

Brief §3, §4, §5, §7, AC-4, AC-6, AC-8 · Architecture §A4, §B1, §B2 (`client-policies.ts`), §B5 (`policies:pdf`, retired by I-043), §B7, §B9, §D

**I-043 (Oct 29, 2026):** the PDF is now the doc kit's branded build, saved by Brian over `public/ohm-client-policies.pdf`. `npm run policies:pdf`, `scripts/make-policies-pdf.mjs` and `src/data/client-policies.pdf.json` are retired; test 8 is a text check (ARCHITECTURE §B9) using the devDependency `unpdf`. Text below that describes printing the PDF from the page is step 14 history.

## Goal
`src/data/client-policies.ts` holds the Client Policies doc v1.4 (Oct 29, 2026) exactly as copy deck → Client Policies gives it, in the shape fixed by ARCHITECTURE §B2: 10 sections of typed blocks, every rate, fee, minute count, the domain and the email derived from `site.ts`, package prices and the 12-month expiry as constants, and `coloradoNotice` / `surchargeLine` exported for step 15. `/client-policies` renders it per §B9: one closed `<details>` per section with an `id` and a `#` anchor, the version line, the PDF link, `Expand all` / `Collapse all` shipped `hidden` and revealed by `src/scripts/policies.ts`, which also opens the section in `location.hash` and opens all for print. `npm run policies:pdf` prints the built page to `public/ohm-client-policies.pdf` and writes the hash file; a test fails when either is stale. The footer, Services, Pricing and `/book` link to it (copy deck → Client Policies → Link lines); the sitemap lists it. Read-only here (done by the architect): `brief/BRIEF.md`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md`, `src/data/site.ts`, `.claude/hooks/protected.json`. Known gaps: none (Brian's four answers are in the plan: keep "text or call me", Playwright PDF, link contact form and chat, start collapsed).

Notes:
- The Zelle address is never on the site, in the PDF or in the repo; nor a phone number. "text or call me" stays as written.
- `check:wording` will warn (not fail) on "health" twice in the policy text: accepted; list it with About's `fix` in the Report.
- Astro adds `data-astro-cid-*` attributes and escapes `'` as `&#39;`: dist tests use attribute-tolerant regexes and decode entities before comparing text.
- `deploy.yml` runs `npm test` before the build, so the dist-reading tests skip with a clear reason when `dist/client-policies.html` is missing (`npm run check` builds first, so they always run there). The data and PDF tests never skip.
- `package.json` (`"policies:pdf": "node scripts/make-policies-pdf.mjs"`) asks permission; no new dependency.
- The commit gate runs `npm run check` on any Bash call that mentions check or test, so do red-test-first runs from PowerShell, and edit with Edit, not shell redirection.
- The reviewer's hook splits commands on every `|`, even inside quotes: write greps as `grep -E` with one `-e '…'` per pattern, never `a|b` or a pipe.
- `README.md`: in "Updating rates, days and links" add `The client policies text is in src/data/client-policies.ts (a contract file; changes come from Brian). After changing it, a rate or the travel fee in site.ts, or the /client-policies page, run npm run policies:pdf and commit public/ohm-client-policies.pdf and src/data/client-policies.pdf.json. A test fails until you do.` (code-format the paths and command), and a scripts-table row for `npm run policies:pdf`: `Builds the site and prints /client-policies to public/ohm-client-policies.pdf`.
- `.gitattributes`: add `*.pdf binary` (the repo has `* text=auto eol=lf`).
- `check:secrets` skips binary files. If it flags the PDF anyway (an uncompressed `mailto:` annotation), stop and report it to the architect; don't edit `tools/check-secrets.mjs` or drop the link.

## AC covered (IDs)
- AC-8: tests 1–8 and 13–15; Done when 2–4.
- AC-6: test 6 (no `$` amount, email or domain typed in the policy file).
- AC-4: test 12 and `npm run check:wording` on the real build.

## Files
- src/data/client-policies.ts
- src/data/client-policies.pdf.json
- src/pages/client-policies.astro
- src/scripts/policies.ts
- scripts/make-policies-pdf.mjs
- public/ohm-client-policies.pdf
- src/components/Footer.astro
- src/pages/services.astro
- src/pages/pricing.astro
- src/pages/book/index.astro
- src/pages/sitemap.xml.ts
- tests/client-policies.test.ts
- tests/check-wording.test.ts
- package.json
- .gitattributes
- README.md

## Tests first (write them and see them fail before writing code)
`tests/client-policies.test.ts`. A helper `flat(x)` joins every string and `Run.text` in a block, section or `clientPolicies` into plain text.
1. Section ids equal `['booking','cancelling','late-arrival','illness','mobile-visits','packages','not-right','tips','communication','conduct']`; titles equal the copy deck's.
2. `version '1.4'`, `date '2026-10-29'`, `displayDate 'Oct 29, 2026'`, and `displayDate` equals `date` formatted `en-US` short month, UTC.
3. `lateCancelFee(site.rates.s60) === 45`, `(s90) === 60`, `lateCancelFee({label:'x',minutes:60,price:100}) === 50`, then `(site.rates.s60)` again `=== 45`. `packageSavings`: s60 office 75, mobile 100; s90 office 100, mobile 125.
4. Session table rows `[['60 minutes','$90','$90 + $25 travel'],['90 minutes','$120','$120 + $25 travel']]`; package rows `[['5 × 60 minutes','$375 (save $75)','$475 (save $100)'],['5 × 90 minutes','$500 (save $100)','$600 (save $125)']]`; `flat` of `cancelling` contains `$45 for a 60-minute session, $60 for a 90-minute session`; `booking` contains `about 75 minutes start to finish` and `about 105`.
5. Both I-037 changes: `flat` contains `Ask me for Zelle details. I don't accept Venmo, PayPal or other payment apps.` and `The fastest way to reach me is the contact form or chat at ohmprecisionbodywork.com.`; the Communication runs link `site.contact.lead`, `site.contact.chat` and `mailHref`.
6. `flat(clientPolicies)` has no `[` or `]` (the doc's placeholders), `Drafting` or `TODO`; `JSON.stringify(clientPolicies)` has no phone pattern `\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}`, `tel:`, `sms:`, or `/\bhome[\s-]+(?:visits?|office|mobile)\b/i`; its only email is `site.email`. The source file's text has no `\$\d`, no `@`, no `ohmprecisionbodywork.com`.
7. `coloradoNotice` equals the copy deck's statutory text (typed in the test); `surchargeLine === 'Ohm Precision Bodywork adds a 3% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.'`; the booking notice's columns are `Colorado notice` / `coloradoNotice` and `site.name` / surchargeLine + ` The surcharge appears as its own line on your receipt.`
8. PDF text check (I-043; replaces the step 14 hash check): the PDF starts `%PDF-` and is under 400 KB; its extracted, normalised text contains every sentence of `clientPolicies` (ARCHITECTURE §B9), both test-5 sentences, `Version 1.4` and `October 29, 2026`; no phone pattern, no email but `site.email`, no placeholder, no `tel:`/`sms:` link. Sequence: a deep copy with one bullet changed leaves exactly one sentence missing, then the real source again leaves none. Failures say to rebuild the PDF in the doc kit.

Dist tests (skip if `dist/client-policies.html` is missing):
9. 10 `<details>` with class `policy`, in order, ids as test 1, none with `open`; each `<summary>` holds an `<h2>` with its title; each body has `href="#<id>"` with `aria-label="Link to <title>"`.
10. `Version 1.4 · Oct 29, 2026`; a link to `/ohm-site/ohm-client-policies.pdf` and `dist/ohm-client-policies.pdf` exists; `.policies-controls` carries `hidden` and two `type="button"` buttons `Expand all`, `Collapse all`.
11. Decoded text contains `coloradoNotice` verbatim and both test-5 sentences; no phone pattern, `tel:` or `sms:`.
12. In `tests/check-wording.test.ts`, with the existing `both()` helper (`cleanTree` unlicensed, `licensedTree` licensed): a page whose body is `flat(clientPolicies)` exits 0 in both states and stdout warns on `health`; the same page plus `my home office` exits 1.
13. `index.html`, `services.html`, `pricing.html`, `book.html` and `about.html` link `/ohm-site/client-policies`; services and pricing contain `Cancellations, packages and payment are covered in my`; book contains `Booking means you agree to my`.
14. `sitemap.xml` has `/ohm-site/client-policies</loc>` and still no `hello`.
15. Only `book.html`, `client-policies.html` and `hello.html` carry a `<script` other than JSON-LD (§D).

## Done when
1. `npm run check` passes, including the new tests (paste the warnings: About `fix`, client-policies `health` ×2).
2. (Step 14; since I-043 the PDF comes from the doc kit and test 8 checks its text.) `npm run policies:pdf` ran; the PDF and `client-policies.pdf.json` are committed. Open the PDF: all 10 sections expanded, print-only line and version line at the top, no header, footer, buttons, anchors or PDF link, the notice and both tables whole, the page footer line on each page, text matching the page.
3. `npm run build`, then `npm run shots -- 14`: `client-policies`, `services`, `pricing`, `book` at 375 and 1280 px in `docs/build/screens/14/` (the footer link shows; controls readable on cream).
4. JS off: no controls; every summary opens and closes by click, Enter and Space. JS on: `Expand all` opens all 10, `Collapse all` closes them; `/client-policies#cancelling` loads with that section open and in view; a `#` anchor updates the URL and leaves its section open.
5. `grep -c -E -e 'tel:' -e 'sms:' dist/client-policies.html` prints 0; `git check-attr binary public/ohm-client-policies.pdf` says `set`. No hex outside `tokens.css`, no new dependency.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
