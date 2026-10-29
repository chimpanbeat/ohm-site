# Launch runbook

The pre-launch review (STATUS row PL) checks this; the `L` step runs it with Brian. Brian confirms every production change. The steps themselves live in README → "License-day checklist" (one home; not copied here).

## Before launch day
- [ ] Every acceptance criterion in BRIEF §12 (AC-1–AC-7) checked in the pre-launch review, with evidence.
- [ ] Every master-list item that blocks L is done: I-001 (tested PocketSuite links) and I-018 (domain cutover). I-035 (licensed wording) is applied.
- [ ] The Google key's referrers include the production domain (README → Google key setup); the key stays outside git (`.env` locally, a repo variable in CI).
- [ ] Rollback path below read once against the preview.

## Launch steps
1. Brian and Code: README → License-day checklist, in order. Confirm each item on the live domain.
2. Code: set `site.deploy.live` so `indexable` turns true; `npm run check` passes; Brian says push.
3. Brian: Search Console and Google Business Profile point at `/`; cards and QR codes use `/hello` (I-010).

## After launch
- [ ] Smoke test from a phone: Home, Services & Pricing, `/book` address lookup and zone buttons, each booking link, `/hello`.
- [ ] Watch the Google Cloud quota and billing alerts (I-017) for 48 hours.
- [ ] Tag the commit `v1.0` and note it in STATUS → Change log.
- [ ] Retro: Method feedback lines for the whole project, in the master list.

## Rollback
Revert the launch commit and push (`git revert <sha>`); the Pages deploy republishes the previous build in a few minutes. DNS problems: in Pages settings, remove the custom domain so the site serves from `chimpanbeat.github.io/ohm-site` again, then fix the Porkbun records.
