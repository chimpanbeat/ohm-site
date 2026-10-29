---
name: maintain
description: Run the monthly maintenance checklist (docs/runbooks/maintenance.md) and record findings as master-list items. Brian runs it by name.
disable-model-invocation: true
allowed-tools: Bash(npm outdated*), Bash(npm audit*), Bash(git status*)
---
Follow `docs/runbooks/maintenance.md`, in order. Report only: install, upgrade and edit nothing.

1. No `package.json`: say so and skip step 1 of the checklist. Otherwise run `npm outdated` and `npm audit` (both can exit non-zero when they find something; that is the result, not a failure).
2. Read the pinned facts (ARCHITECTURE → "Integrations and pinned facts"; tier S: the brief's Stack section). For each dated more than six months ago, fetch its URL and compare. No fetch tool: list the facts and URLs for Brian to check.
3. Ask Brian for the date of the latest backup (Apps Script: the dated copy of the prod sheet or the scheduled export), and to load the live site or app on a phone and walk the main flow. Wait for his answer; don't guess.
4. Record each finding as an Items row in the master list (link in CLAUDE.md): Kind `change` or `todo`, State proposed, Owner Brian, Blocks none, Source "maintain <date>", the finding in plain words. Next ID = highest ID in Items and Archive + 1; re-read the Items section just before adding. No master list link or no Docs connector: print the rows for Brian to paste.
5. Add the Change log line from the runbook to STATUS.md, then reply with the findings and the I-IDs, or "nothing found". Commit only the STATUS.md line, as "Maintenance <date>".
