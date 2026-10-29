# Maintenance: monthly checklist

Once a month after launch (`/maintain` runs it). It reports; it changes nothing. Every finding becomes an Items row in the master list (Kind change or todo, State proposed, Owner Brian), and Brian decides.

1. **Dependencies.** Run `npm outdated` and `npm audit`. Report only: package, current, latest, severity. Upgrades need Brian's OK. Dependabot's monthly pull requests (`.github/dependabot.yml`) are never merged without it.
2. **Pinned facts.** Re-check every pinned fact dated more than six months ago against its URL (ARCHITECTURE → "Integrations and pinned facts"; tier S: the brief's Stack section). Report what changed, with the URL and today's date.
3. **Backups.** Confirm one exists and is recent. Apps Script: a dated copy of the prod sheet or a scheduled export; ask Brian for its date. Anything else the build stores: where its backup is.
4. **Phone check.** Load the live site or app on a phone and walk the main flow from the brief's §1. Brian does this one; Claude asks and records the answer.

Log the run in STATUS.md → Change log: `- <date> (maintenance): items I-###…, or "nothing found".`
