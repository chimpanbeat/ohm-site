# Build handoff playbook

**Opus** owns architecture, contracts, research, copy, and review. **Sonnet** owns implementation. **Brian** switches the session model with `/model sonnet` / `/model opus` and sets the effort level. Each STATUS row has an `Effort` column (`low` · `medium` · `high` · `xhigh` · `max`), and **every handoff message names both the model and the effort**. Files in `docs/build/` are the shared memory, so a model switch in the same session and a brand-new session both work.

## 1. Model gate

Run this at the start of every session, every step, and every "continue".

1. Open `docs/build/STATUS.md` and take the **first row whose state is not `done`**.
   - `changes-requested` rows count; they go back to Sonnet.
   - `blocked` rows go to Opus, whatever the step's model.
2. Work out the required model:
   - `blocked` → Opus.
   - Otherwise, the row's `Model` column.
3. Find your own model in your system prompt ("The exact model ID is claude-opus-…" / "claude-sonnet-…"), and compare the family.
4. **Mismatch: stop.** Don't edit any file, including STATUS.md. Reply with exactly this shape:

   > Next step **<ID> – <title>** is a **<Model>** step (effort **<Effort>**), but this session is running **<your model>**.
   > Run `/model <sonnet|opus>`, set effort to **<Effort>**, then say **continue**.

5. **Match:**
   - Set the row to `in-progress`.
   - Tell Brian in one line, e.g. "Starting step 2A (Sonnet): booking router."
   - Open `docs/build/steps/<ID>-*.md` and do it.
6. **When the step ends:**
   - Update the row as described in §3 or §4.
   - Run the gate again for the next row.
   - If the next row needs the other model, give the mismatch message and stop.
   - **Never cross a model boundary in one turn.**

## 2. Roles

| | Opus | Sonnet |
|---|---|---|
| Does | Architecture, contracts, step files, copy deck, Google/GitHub doc research, reviews, **all commits and pushes**, all fact questions to Brian | Implements one step file exactly. Runs its "Done when" checks. Writes the step's Report |
| Never | Skips a review | Commits or pushes; adds or upgrades dependencies; edits contract files (`src/data/site.ts`, `src/data/wording.ts`, `src/lib/geo.ts` signatures, `src/styles/tokens.css`, `astro.config.mjs`); changes business facts; invents facts, copy claims, testimonials or credentials; edits `ARCHITECTURE.md`, `HANDOFF.md`, or other steps' files |

Sonnet may implement the *bodies* in `geo.ts` (step 2A) but must not change its exported names or types.

## 3. Sonnet: doing a step

1. Read the step file fully, then the `ARCHITECTURE.md` sections it cites. Read the brief sections it cites.
2. Implement only the files listed. If you need to touch an unlisted file, it must be trivial (an import or a type re-export). Otherwise escalate.
3. Run every command in **Done when**. Paste the real pass/fail result into the Report.
4. Write the **Report** section of the step file:
   - **Files changed:** one line each.
   - **Checks:** each command and its result.
   - **Deviations:** what differs from the step file, and why.
   - **TODO(Brian):** new items (also left as `TODO(Brian):` comments in code).
   - **Questions for Opus.**
5. Set the STATUS row to `review`. The next row is the matching Opus `R` step.
6. Tell Brian: "Step <ID> is ready for review. Run `/model opus`, set effort to **<R row's Effort>**, then say **continue**."

### Escalate (stop early)
Set the row to `blocked`, write *why* under Report → Questions for Opus, and ask Brian to switch to Opus, when any of these happens:
- You need a contract, interface, or prop change, or a new dependency.
- The brief or step file is ambiguous, or two sources conflict.
- The work touches §7 wording or licensure decisions, or would add new copy not in the copy deck.
- The same check still fails after **2** fix attempts.
- Google, GitHub, or Astro behaves differently from what the step file says.
- Anything touches address handling, logging, or the API key beyond what the step specifies.

Don't work around a blocker by guessing.

## 4. Opus: review steps (`R`)

1. Read the Sonnet step's Report, then the full `git status` and `git diff`. Don't rely on the report alone.
2. Re-run the step's Done-when commands plus `npm run build`, `npm test` (once tests exist) and `npm run check:wording`.
3. Check the work against:
   - the cited brief sections and §12 acceptance criteria
   - ARCHITECTURE.md contracts
   - the design tokens: no raw hex values outside `tokens.css`, and no rate, day, link or zone literals outside `src/data/`
   - privacy rules
4. Then one of:
   - **Accept.** Fix any trivial nits yourself. Commit with the message `Phase N: <summary>` and the co-author trailer, then push `main`. Set both rows to `done` with the commit hash. Send Brian a phase summary: what was built, the checks, and new TODO(Brian) items.
   - **Changes.** Write a numbered fix list under the Sonnet step's **Review** section. Set that row to `changes-requested`, and set the `R` row back to `todo`. Ask Brian to run `/model sonnet` and set effort to the Sonnet row's Effort. After **2** change rounds, Opus makes the remaining fixes itself.
5. Opus may revise later step files during a review when the architecture needs it. Note any such change under "Architecture changes" in `STATUS.md`.

## 5. Opus: research/architecture steps (`A` steps with Model opus)
Write the findings into the step files they feed, then mark the step `done`. Commit only at phase ends unless Brian asks otherwise, but research-only doc changes may be committed right away.

## 6. Privacy and repo hygiene (both models)
- The repo is public. Never commit `.env`, the KML, client data, or anything under `brief/` except `BRIEF.md`.
- The visitor's address never leaves the browser except in the Google request. No logging, no storage, no URL params, no analytics.
- Unknown facts become `TODO(Brian):` comments and are listed in the Report.
