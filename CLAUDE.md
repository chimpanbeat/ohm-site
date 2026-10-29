# ohm-site

Static Astro site for Ohm Precision Bodywork, on GitHub Pages. It routes visitors to the right PocketSuite booking link. The spec is `brief/BRIEF.md`.

## Facts
- Method: Brian's build method v3.2 · Tier: M
- Minimum Claude Code version: v2.1.295
- Master list: https://claude.ai/artifact/XPbTteP3rZmMcVaUswE63N ("Ohm site: master list") · Brief tab: its "Brief" tab
- Check command: `npm run check` (build, test, check:wording, check:contrast, check:dist, check:secrets)
- Repo: **public**. Never commit `.env`, the KML, client data, anything under `brief/` except `BRIEF.md`, the office street address, business-plan financials or PocketSuite admin details. The public business email carries `secrets-scan: allow`.
- Planning chats live in the claude.ai Project "Ohm Site". They read this repo and never write to it; changes reach Code as master-list Items (I-###).

Rules live in .claude/ (settings, hooks, agents, skills); the spec's Guardrails table says where each one is.

## File map
| Path | What |
|---|---|
| `brief/BRIEF.md` | Facts, requirements, acceptance criteria (§12, AC-1–AC-7) |
| `docs/build/STATUS.md` | Step table (effort, command, state, commit), change log; the only source of progress |
| `docs/build/ARCHITECTURE.md` | Design system (§A), code architecture and contracts (§B), stack rules (§D) |
| `docs/build/copy-deck.md` | All site copy; builders never write new copy |
| `docs/build/steps/` | Step files; `## Files` lists the paths a step may change. v1 step files are history |
| `docs/build/RECOVERY.md` | The recovery ladder |
| `docs/runbooks/` | Launch, rollback and monthly upkeep (`maintenance.md`) |
| `.claude/` | Settings, hooks, `architect` and `reviewer` agents, `/next`, `/next-low`, `/next-high`, `verify`, `handoff`, `maintain` |
| `.github/workflows/` | `check.yml` runs the check command on every push; `deploy.yml` builds and deploys Pages on push to `main` |
| `src/data/` | `site.ts` (business facts), `wording.ts` (licensure wording), `zones.geojson` |
| `scripts/` | Zones, OSM, terrain, icons, Ω tracing, and the wording, contrast and dist checks |
| `tools/` | Method metrics, secrets scan, screenshots (`npm run shots`) |

## Commands
- `npm run dev`: dev server on http://localhost:4321/ohm-site/ (port 4321 is required by the Google key referrer).
- `npm run check`, `npm run build`, `npm test`, `npm run shots [-- <step>]`, `npm run metrics`.
- Data: `npm run zones` (KML → geojson), `npm run osm`, `npm run terrain`, `npm run icons`, `npm run omega`.

## Conventions (checked at review)
- Single sources: facts in `src/data/site.ts`, wording in `src/data/wording.ts`, tokens in `src/styles/tokens.css`, copy in the copy deck. No rate, day, link or zone name outside `src/data/`; no raw hex outside `tokens.css`.
- Contract files are listed in `.claude/hooks/protected.json`; the architect changes them.
- The visitor's address never leaves the browser except in the Google request: no logging, storage, URL params or analytics.
- Unknown facts become `TODO(Brian):` plus an open todo in the master list. Never invent facts, copy claims, testimonials or credentials.
- `noindex` until launch (`indexable` = `licensed && deploy.live` in `site.ts`).
- Stack rules, each marked check or convention: ARCHITECTURE §D.
