# /next procedure: one step per session

No master list (tier S): when CLAUDE.md has no master list link, STATUS.md replaces it.
Its Open items and Closed tables are the Items and Archive; Method feedback and Metrics are
its sections; there is no Build status, Plan review or Push review. Skip every master-list
read and write below, or do it in STATUS.md as the step says. Step 0 works from
brief/BRIEF.md, which is already the repo brief: skip the Brief-tab read and write and
the master-list writes in docs/build/steps/0-setup.md.

Models line (I-124). A step file may carry one line
`Models: builder <model> (<why>) · architect <model> (<why>) · reviewer <model> (<why>)`,
each model Sonnet or Opus. No Fable (Brian, Nov 13, 2026: his Fable use is spent): if an
older step file still names Fable 5.2, read it as Opus. The line counts only until Nov 16,
2026 11:59 pm PT (Nov 17, 12:59 am Denver time); run `date` when it is close, and check
again at each subagent call. After that, or in a step file with no line, ignore it: the
builder is Sonnet and subagents get no model, so the agent files decide (Opus). Nothing
needs reverting.
- Subagents (architect, reviewer): while the line counts, pass the listed model as the
  Agent call's `model`, by alias: `opus` or `sonnet`. The per-call model wins over the
  agent file's; the call takes aliases only (https://code.claude.com/docs/en/sub-agents,
  https://code.claude.com/docs/en/model-config, read 2026-11-10). Never pass an effort. If
  the call is refused because of the model, repeat it with no model and say so in the
  step 12 report.
- Builder: you are the builder, on the model your system prompt names. Wanted is the
  line's builder while it counts, otherwise Sonnet. A /next command runs its first turn
  on Sonnet whatever /model says (`model: sonnet` in its SKILL.md), and the session's
  model takes over from Brian's next message (https://code.claude.com/docs/en/skills,
  read 2026-11-10). So compare your model with the wanted one in step 2 and again at the
  start of every later turn; never build on another model.

1. Load. Run `git status --porcelain`; if the tree is dirty with changes that aren't
   this step's, stop and ask Brian. Read docs/build/STATUS.md. From the master list
   (link in CLAUDE.md) read only Build status and the Items rows with Owner Code and
   State queued, by block id. Never read the whole main tab (about 89K characters, Items
   alone about 41K), the spec or the Archive tab (the Plan review and Push review tabs
   are write-only). The Docs connector reads one block by id (`read` of the tab body node
   with payload `{"kind":"view","parentId":"<id>"}`), so: (a) outline the main tab
   (`{"projection":"outline"}`) for the ids of the Build status list and the Items table;
   (b) view the Build status list by id; (c) search `queued`: a hit whose whole paragraph
   is `queued` is a State cell, so its row is a candidate (hits in prose, or in "open …
   set queued to release" cells, are not); (d) view each candidate row by its row id and
   keep the rows with Owner Code. Measured Nov 10, 2026: about 29K characters (outline
   4K, search 8K, Build status 7K, five rows 2K each) against about 89K for the whole tab.
   Add up the characters you read and give the figure in the step 12 report. No Docs connector: ask Brian to paste the
   queued rows, and list the I-IDs you applied in your report. S: read STATUS.md's Open
   items rows with Owner Code and State queued, by section.
2. Effort and builder. If the next row's effort isn't the effort named in the skill
   message, stop: "Next is <step>, <wanted builder> <effort>: /clear, then <command>."
   (/next is medium, /next-low is low, /next-high is high.) Then the builder (Models line,
   above). Your model is the wanted one: go on. It isn't: stop before step 3 and say
   "Next is <step>, builder <wanted>, and this turn is on <yours>. Run /model <alias>
   (`sonnet` or `opus`), set the effort to <effort>, then send `go`. This
   command's first turn is always Sonnet, so if /model is already set, just send `go`."
   On `go`, check again: still not the wanted model, name the model this turn is on and
   stop; the wanted one, carry on from step 3.
3. Reviewer answers. If CLAUDE.md lists a reviewer page, read its rows changed since
   STATUS.md's reviewer-read time. Draft one Items row per event, State proposed,
   Owner Brian, Blocks — unless the card blocked a step:
   - answer, choice or usedDefault on a question card: Kind change if it alters the
     build, otherwise decision; the answer in plain words, no client material;
     Source "page I-### <date>".
   - clarify: todo "reword card I-###".
   - approvedAt with no pins: propose closing that review item.
   - pins on a review card: one change per pin, quoting its note.
   - kind "suggestion" with no outcome: one row per suggestion.
   - reopenedAt on a card with resolves: a change quoting the original note (the pin
     named in resolves) and Brian's new note, Source "page I-### <date>".
   Next ID = highest ID in Items and Archive + 1 (S: across Open items, Closed and the
   Change log). Re-read the Items section, then add
   the rows. Never apply a proposed item. Update reviewer-read in STATUS.md.
4. Queued changes. Apply each row with Owner Code and State queued, oldest first:
   one commit "I-### <summary>", then State applied <sha>. If the item came from a
   reviewer pin (Source "page I-###"), also add a review card with resolves set to the
   earlier card's id and the pin's id, after-shots at 375 and 1280 px, as in step 11.
5. Blocks. If an item that is proposed, open or queued blocks this step, mark the step
   blocked with its ID and take the next independent row. If that item has a reviewer
   card, set the card's blocks field to what it holds up, in plain words ("the contact
   form"). None left: stop and say what is waiting.
6. Build. Set the STATUS.md row to doing. Step file: follow it, writing its Tests first
   and seeing them fail before any code. No step file: present a plan in plan mode and
   wait for Brian's OK; the plan also lists the AC IDs the step covers and the tests it
   will write first, and those tests are written and seen to fail before any code.
   Before asking Brian to approve a plan, when CLAUDE.md has a master list link, write
   the plan to the master list's "Plan review" tab: create the tab if it's missing,
   otherwise replace its contents, touch no other tab, and make the first line
   "Step <id> · <date> · waiting for Brian's OK". If the write fails, say so and
   present the plan anyway. An unknown fact becomes TODO(Brian) plus an open todo
   item, Owner Brian. A contract change, or a protected file the step file doesn't
   list, goes to the architect subagent (its model: Models line, above).
7. Check. Run /verify until it passes.
8. Review when the tier asks (S: before launch; M: after auth, personal data, payments,
   contracts or migrations, and before launch; L: every build step). Delegate to the
   reviewer subagent with the step ID, base commit and acceptance criteria IDs. Don't
   pass an effort; the agent file sets it. Pass a model only while the step's Models
   line counts (above): its reviewer for the reviewer, its architect for every architect
   call below. Otherwise pass none; the agent files set it.
   - Round 1 FIX: fix every item; re-run the reviewer from the same base commit.
   - Round 2 FIX: decide one and log it in STATUS.md: fix (every item small and
     unambiguous), re-plan (architect rewrites the step file; the step restarts), or
     escalate (architect investigates).
   - A fix after round 2 still fails: escalate. No fourth round in this session.
   - Unexplained bug (two hypotheses tested and wrong): escalate with the evidence.
   - Direction question: the architect frames options; add a decision item, Owner
     Brian, Blocks this step.
9. Push review. When CLAUDE.md has a master list link, before pushing write a commit
   review to the master list's "Push review" tab: create the tab if it's missing,
   otherwise replace its contents, touch no other tab. First line: "Step <id> · <date> ·
   waiting for Brian's push". Then: the diff stat; one short paragraph per area changed;
   each plan approval answer or AC ID marked done or not done with file and line;
   deviations from the approved plan; one line per file that is beyond the plan or under
   .claude/, .github/ or profiles/. No diffs. Then stop and wait for Brian to say push.
   If the write fails, say so and give the same review in chat.
10. Commit "Step <id>: <summary>". The commit gate re-runs the check.
11. Boundary writes, each preceded by a fresh read of just that section:
    STATUS.md row (done, commit); master list Build status from STATUS.md, one write;
    Metrics row (sessions, tokens from tools/method-metrics.mjs, fix rounds,
    hook/check blocks); reviewer page progress/current and review cards (375 and
    1280 px) when something visible changed; 0-3 Method feedback lines from the review.
    After rewriting Build status, move every Items row whose State is done or
    applied <commit> to the top of the Archive tab, unchanged (newest first), then
    delete it from Items. Keep the Next ID line as it is. Report "archived N rows" in
    the step's summary. When one had a reviewer card with blocks set, clear that field.
    S (no master list link): skip the Build status write; the Metrics row goes in
    STATUS.md's Metrics table and the Method feedback lines in its Method feedback
    section; move done and applied rows from Open items to Closed, State done or
    applied <sha>, and never delete a row, so an I-ID is not reused.
    S, launch step (the L row): also print STATUS.md's Method feedback lines and a
    Metrics summary (run `node tools/method-metrics.mjs`; add the Metrics table totals)
    as one fenced block headed "Paste into the harvest chat".
12. Stop. Report the commit, the characters of master list you read (step 1) and the next row, then, before its command, the next
    session's title as a line `/rename <project> <id>: <what>` (at most about 32
    characters) and its model and effort as `Model: <builder>, <the next row's effort>`,
    the builder being the next step's Models-line builder while that line counts,
    otherwise Sonnet. Then its command and "/clear first, then /rename, then the command";
    when the builder isn't Sonnet, add "/model <alias> before the command; it will stop
    once and ask for `go`". Never start a second step in this session.
