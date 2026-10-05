# 1R: Review Phase 1, commit, deploy

Model: opus
Brief: §3, §5, §7, §9, §13, §14

## Do
1. Run the review procedure (HANDOFF §4) on step 1A. Pay particular attention to:
   - the `global.css` token use
   - the header fitting at 320px
   - the check-wording logic matching §B5, including attribute extraction
   - the workflow permissions and versions
2. Accept: `git add` the specific paths, never `brief/` beyond `BRIEF.md`. Before staging, check `git status --ignored` and confirm the KML and `.env` are ignored. Commit `Phase 1: scaffold, layout, wording guard, deploy workflow` and push `main`.
3. Walk Brian through it:
   - Repo → Settings → Pages → Source: **GitHub Actions**.
   - Settings → Secrets and variables → Actions → **Variables** tab → New repository variable `PUBLIC_GOOGLE_MAPS_KEY`. It's a variable, not a secret, because it's public by design (§6).
   - Re-run the workflow, or push.
4. Verify with WebFetch that `https://chimpanbeat.github.io/ohm-site/` returns the home page, the 404 works, and the HTML carries `noindex`.
5. Set 1A and 1R to `done` with the hash. Send Brian the Phase 1 summary and the TODO(Brian) list. Then run the gate: 2A is Sonnet.
