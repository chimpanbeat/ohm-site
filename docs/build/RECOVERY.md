# Recovery ladder

Take the lowest rung that fixes it. Each rung assumes the ones above it didn't.

## a. Drift inside a turn
Press `Esc` to stop, then `/rewind` to a checkpoint before the drift. `/rewind` does not undo changes made by Bash commands or subagents: check `git status` and `git diff` afterwards and undo those by hand.

## b. A bad committed step
`git revert <step commit>` (never rewrite history), then set the step's STATUS row back to `todo`, clear its commit, and log it in the Change log. Re-run the step from its plan or step file.

## c. Circling
Two rounds of the same fix, or the same question re-asked: stop. Run `/handoff` to write the handoff block, run `/clear`, and restart from that block alone.

## d. Blocked
A fact, contract, dependency or access change is needed, or the specs disagree: set the row `blocked`, add an open decision item (Owner Brian, Blocks this step) to the master list's Items that lists the options with a recommendation, and keep building what doesn't depend on it.

## e. Abandon
The step or approach is no longer wanted: set the row `dropped`, keep its commit hash if any, and log why in STATUS → Change log (`- <date> (<step>): dropped, <reason>. Files: …`). A `dropped` row is skipped when finding the next step. Reverting any committed work is rung b.
