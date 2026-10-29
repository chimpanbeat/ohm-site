# /next procedure: one step per session

No master list (tier S): when CLAUDE.md has no master list link, STATUS.md replaces it.
Its Open items and Closed tables are the Items and Archive; Method feedback and Metrics are
its sections; there is no Build status, Plan review or Push review. Skip every master-list
read and write below, or do it in STATUS.md as the step says. Step 0 works from
brief/BRIEF.md, which is already the repo brief: skip the Brief-tab read and write and
the master-list writes in docs/build/steps/0-setup.md.

1. Load. Run `git status --porcelain`; if the tree is dirty with changes that aren't
   this step's, stop and ask Brian. Read docs/build/STATUS.md. From the master list
   (link in CLAUDE.md) read only Build status and the Items rows with Owner Code and
   State queued, by section or search. Never read a whole doc, the spec or the Archive
   tab (the Plan review and Push review tabs are write-only). No Docs connector: ask Brian to paste the
   queued rows, and list the I-IDs you applied in your report. S: read STATUS.md's Open
   items rows with Owner Code and State queued, by section.
2. Effort. If the next row's effort isn't the effort named in the skill message, stop:
   "Next is <step>, Sonnet <effort>: /clear, then <command>." (/next is medium,
   /next-low is low, /next-high is high.)
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
   list, goes to the architect subagent.
7. Check. Run /verify until it passes.
8. Review when the tier asks (S: before launch; M: after auth, personal data, payments,
   contracts or migrations, and before launch; L: every build step). Delegate to the
   reviewer subagent with the step ID, base commit and acceptance criteria IDs. Don't
   pass a model or effort; the agent files set them.
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
    Move done and applied Items rows to the Archive tab unchanged; when one had a
    reviewer card with blocks set, clear that field.
    S (no master list link): skip the Build status write; the Metrics row goes in
    STATUS.md's Metrics table and the Method feedback lines in its Method feedback
    section; move done and applied rows from Open items to Closed, State done or
    applied <sha>, and never delete a row, so an I-ID is not reused.
    S, launch step (the L row): also print STATUS.md's Method feedback lines and a
    Metrics summary (run `node tools/method-metrics.mjs`; add the Metrics table totals)
    as one fenced block headed "Paste into the harvest chat".
12. Stop. Report the commit and the next row, then, before its command, the next
    session's title as a line `/rename <project> <id>: <what>` (at most about 32
    characters) and its model and effort as `Model: Sonnet, <the next row's effort>`.
    Then its command and "/clear first, then /rename, then the command". Never start
    a second step in this session.
