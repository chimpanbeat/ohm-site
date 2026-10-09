# Incoming handoff (planning chats → Claude Code)

Brian saves this file from the "Ohm site: master list" export, or pastes items into an Opus session, which saves them here. Rules: CLAUDE.md → "Messaging with the planning chats".

- Opus applies each item after the model gate and at every A and R step, logs it in docs/build/STATUS.md → "Architecture changes" with its H-ID and the files touched, then deletes it from this file.
- Skip and delete any H-### already logged under the change log in the status file.
- An item marked blocks:<step> is applied before that step runs.
- Sonnet never edits this file. It reads it at the start of a step and escalates if an item affects the step.
- Use the next unused ID. Never renumber or reuse an ID.
- This repo is public: no secrets, client names, health information, session notes, office street address, business-plan financials or PocketSuite admin details.

Format:

    ## H-### | date | affects: <step, file or all> | type: fact|decision|fix|req|asset|risk | urgency: normal|blocks:<step>
    One to four sentences, with the source (who decided or which chat found it).

## Items
