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
