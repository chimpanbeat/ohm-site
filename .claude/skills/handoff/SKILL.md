---
name: handoff
description: Write the handoff block so a fresh session can resume this step after /clear. Use when circling (RECOVERY.md rung c) or when Brian asks.
---
Reply with one fenced code block and nothing else. It starts with two lines, then the fields, each 1-4 lines:
Title: `<project> <step>: <what>`, at most about 32 characters (project from CLAUDE.md's heading, step from STATUS.md).
Model: Sonnet, and the step's effort from its STATUS.md row.
Task: step ID and what it must achieve.
State: last commit, uncommitted changes (git status), last check result.
Decided here: choices made in this session that are written nowhere else, with the reason.
Ruled out: approaches tried or rejected, and why.
Open: questions, with the I-IDs they wait on.
Next: the first concrete action for the fresh session.
Then tell Brian: copy the block, /clear, /rename <title>, run the step's command and paste the block.
