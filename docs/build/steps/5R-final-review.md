# 5R: Final review and launch list

Model: opus
Brief: §10, §12 (all), §14

## Do
1. Run the review procedure (HANDOFF §4) on 5A.
2. Verify the README's Google and DNS sections against Pinned facts, and spot-check the live docs again.
3. Commit `Phase 5: SEO, contrast check, README` and push. Wait for the deploy.
4. Run Lighthouse mobile on the preview for `/`, `/services`, `/about` and `/book`. Use the PageSpeed Insights API via WebFetch, or local `npx lighthouse` (ask before installing). The target is ≥90 for performance, accessibility, best practices and SEO. SEO will be capped by `noindex`; note that this is expected until launch. Fix or file regressions.
5. Walk through every §12 checkbox and record pass/fail with evidence in STATUS.md.
6. Give Brian the launch list:
   - TODO(Brian) items
   - the PS links to paste
   - My Maps URL
   - quota caps and upgrade
   - license-day steps (README §10)
7. Set everything to `done`.
