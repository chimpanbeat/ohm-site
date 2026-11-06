# Launch runbook

The pre-launch review (STATUS row PL) checks this; the `L` step runs it with Brian. Brian confirms every production change. The steps themselves live in README → "License-day checklist" (one home; not copied here).

## Before launch day
- [ ] Every acceptance criterion in BRIEF §12 (AC-1–AC-8) checked in the pre-launch review, with evidence.
- [ ] Every master-list item that blocks L is done: I-001 (tested PocketSuite links) and I-018 (domain cutover). I-035 (licensed wording) is applied.
- [ ] The Google key's referrers include the production domain (README → Google key setup); the key stays outside git (`.env` locally, a repo variable in CI).
- [ ] Rollback path below read once against the preview.

## Launch steps
1. Brian and Code: README → License-day checklist, in order. Confirm each item on the live domain.
2. Code: set `site.deploy.live` so `indexable` turns true; `npm run check` passes; Brian says push.
3. Brian: Search Console and Google Business Profile point at `/`; cards and QR codes use `/hello` (I-010).

## After launch
- [ ] AC-5 closes here: Lighthouse mobile on the live domain (`/`, `/about`, `/services`, `/pricing`, `/book`, `/client-policies`), all four categories 90+. SEO was 66 before launch only because of `noindex` (`is-crawlable`, step PL); record the scores in STATUS.
- [ ] Smoke test from a phone: Home, Services & Pricing, `/book` address lookup and zone buttons, each booking link, `/hello`.
- [ ] Watch the Google Cloud quota and billing alerts (I-017) for 48 hours.
- [ ] Tag the commit `v1.0` and note it in STATUS → Change log.
- [ ] Retro: Method feedback lines for the whole project, in the master list.

## Rollback
Revert the launch commit and push (`git revert <sha>`); the Pages deploy republishes the previous build in a few minutes. DNS problems: the site now builds for the domain root (base `'/'`, I-018 commit `6c030d3`), so serving from `chimpanbeat.github.io/ohm-site` again takes two moves together: restore the files of the I-018 config commit to their state before it, `git checkout 6c030d3~1 -- src/data/site.ts tests/site.test.ts tests/client-policies.test.ts tests/payment-notice.test.ts tests/terrain-defer.test.ts` (`site` back to `https://chimpanbeat.github.io`, base `'/ohm-site'`, `live` false, which also turns `noindex` back on; not `git revert 6c030d3`, which conflicts in STATUS.md's change log), run `npm run check`, commit and push, then in Pages settings remove the custom domain. Without the revert that build loads no assets and every link 404s (README → License-day checklist, step 5.3). Then fix the Porkbun records.
