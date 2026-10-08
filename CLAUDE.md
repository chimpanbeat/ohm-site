# ohm-site

Static Astro site for Ohm Precision Bodywork. It routes visitors to the right PocketSuite booking link. The spec is `brief/BRIEF.md`.

## Before doing anything: run the model gate

This build is split between models: **Opus** architects and reviews, **Sonnet** codes. Brian switches models with `/model`.

1. Read `docs/build/HANDOFF.md` (rules) and `docs/build/STATUS.md` (what's next).
2. Find the first step that isn't `done`, and read its `Model:` line.
3. Compare it with your own model ID from your system prompt (`claude-opus-…` or `claude-sonnet-…`).
4. **If they don't match, stop.** Make no edits. Tell Brian which step is next and which `/model` to switch to.
5. If they match, follow `docs/build/HANDOFF.md`.

This applies to every new session and to every step boundary, including when Brian just says "continue".

Exception: if Brian explicitly asks for something outside the step plan (a question, a quick fix), answer it. But don't advance a build step on the wrong model.

## Key docs
- `docs/build/ARCHITECTURE.md`: design tokens, file map, contracts, behaviour. The source of truth for structure.
- `docs/build/steps/`: one file per step, with goal, files, "done when" and report.
- `brief/BRIEF.md`: business requirements. The repo is **public**, so commit nothing sensitive (no `.env`, no KML, no client data).

## Commands
- `npm run dev`: dev server on http://localhost:4321/ohm-site/ (port 4321 is required by the Google key referrer).
- `npm run build`, `npm test`, `npm run check:wording`, `npm run zones`.

## Messaging with the planning chats

Brian plans the site in claude.ai chats (Project "Massage Business Plan 2026"). **Chats read this repo but never write to it.** They keep a master list ("Ohm site: master list") with IDs T-### (Brian's to-dos), D-### (decisions) and H-### (changes for Code). Opus is the only committer. Use the next unused ID; never renumber or reuse one.

Two channels, nothing else (no outbox, no processed folders):

- **Down: `docs/build/incoming-handoff.md`.** Brian saves the chats' export over it, or pastes items into an Opus session, which saves them there verbatim.
  - **Opus** processes it first in every session (after the model gate) and at every `A` and `R` step. For each H-### it applies the item to the brief, `ARCHITECTURE.md`, `site.ts`, the copy deck or step files; logs it under STATUS.md → "Architecture changes" with the H-ID and the files touched; deletes it from the file; and commits.
  - **If an H-### is already logged in the change log, skip it and delete it from the file.** The export always carries every item not yet flowed, so repeats are normal.
  - An item marked `blocks:<step>` must be applied before that step runs; `blocks:license-day` before the license-day cutover.
  - If every STATUS row is `done` and items are waiting, the next step is Opus: open a new phase (`NA: apply H-…`, then `NB` and `NR` if code is needed). A pure config or copy value can go in as a quick fix (the exception above), still logged and committed.
  - **Sonnet** never edits the file. It reads it at the start of every step. If an item affects or blocks the step, it sets the row to `blocked`, names the H-ID under Report → Questions for Opus, and stops.
- **Up: `docs/build/STATUS.md`.** Keep these sections current. **Commit STATUS.md with each phase** so the chats read the current version.
  1. "Open TODO(Brian)": `- [ ] T-### | needed by <date> | blocks <step, license-day, D-### or —> | what`. Tick when done; never delete.
  2. "Needs a decision": table with ID, Type, What, Needed by, Where it shows / proposed text or link, State (`open` · `needs-review` · `approved` · `changed` · `done`), Answer.
  3. "Architecture changes": the change log, newest first.

  Sonnet lists new TODOs and decisions in its step Report. Opus moves them into STATUS.md with the next unused T- or D-ID at review, and whenever it stops to ask Brian something.

**Public repo:** neither file ever holds secrets, client names, health information, session notes, the office street address, business-plan financials or PocketSuite admin details.
