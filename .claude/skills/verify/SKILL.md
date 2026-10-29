---
name: verify
description: Runs this repo's check command and reports pass or fail. Use right before every commit.
allowed-tools: Bash(npm run check*), Bash(npm run shots*), Bash(git status*)
---
Run `npm run check` from the repo root.
- Pass: reply "verify: pass" and the summary line.
- Fail: reply "verify: fail", the failing checks and the last 30 lines. Don't commit; fix first.

Static-site profile only: if `package.json` has a `shots` script and `git status --porcelain` shows a changed file under `src/pages`, `src/components`, `src/layouts` or `src/styles`, also run `npm run shots` after a pass and add the folder it wrote to the reply. Shots don't change the verify result; if the script exits non-zero, add "shots: fail" and its message. Other profiles skip this.
