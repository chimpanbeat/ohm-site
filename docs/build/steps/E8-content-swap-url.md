# E8: Launch-party content, the event-day chai swap and /events/<slug> (I-088, I-089, I-091, I-092, I-093)

Brief §5 (`/events/<event>`), AC-9 · Architecture §B10 → E8–E11 (Data values, Parking link, Event-day swap, Routes), §B7 sitemap

**Deadline:** the swap is a scheduled deploy at 23:07 UTC on Sun Nov 22 (4:07 pm MST), so E8 must be on `main` well before; aim to push by Thu Nov 19. The Nov 21, 10:00 am reminder links whatever `pageUrl` the feed holds then.

## Goal
`/events/launch-party` is the event page and `/launch-party` a `noindex` meta-refresh page to it. The yoga title reads `Restorative Yoga with Britt 🧘 🪷`, the Tai Chi note `Tai Chi led by John Marshall ☯️ 🥋`, John Marshall is the fifth credit (`Tai Chi instruction`, his photo from Maréa's reviewer page or a placeholder), and in Parking only `free parking along Wahsatch` links (new tab) to Brian's pin while the feed and reminder text stay byte-identical. The chai swap is built, armed (`CHAI_NOTE = 'Chai tea led by John Marshall 🍵🫖'`) and scheduled; scheduled runs do nothing outside 2026. **Already done by the architect (read-only here):** `InfoBlock.text: Rich` in `events.ts`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md` (every string, verbatim, with code points), `brief/BRIEF.md`, `.claude/hooks/protected.json` (adds `deploy.yml`). Known gaps: John Marshall's photo if Maréa hasn't uploaded it yet (I-090; the placeholder stays).

Notes:
- **`events.ts`:** the values above (copy them from the deck, emoji included); `CHAI_AT`, `CHAI_NOTE` (Brian's string from the deck), `launchParty(limit, chaiNote = null)`, `eventsAt`, `buildNow` and `events = eventsAt(buildNow())` exactly as §B10 E8–E11 says; keep the file import-free; comment `// I-091` on each.
- **`src/lib/events.ts`:** `pageUrl` → `/events/<slug>`; `checkRich` also over `event.info[].text`; `feedFor` uses `plainText(b.text, site.licensed ? 1 : 0)`. **`EventInfo`:** `<p><EventRich text={block.text} /></p>`. Nothing else.
- **Route:** `git mv src/pages/[event].astro src/pages/events/[event].astro`, fix its relative imports; `astro.config.mjs` adds `redirects` from `events` (§B10 Routes); `sitemap.xml.ts` maps `index: true` events to `/events/<slug>`.
- **`deploy.yml`:** add the three `schedule` crons with an I-091 comment, and the `gate` job (year guard) with `build` depending on it, per §B10; leave `push`, `workflow_dispatch` and the existing steps as they are.
- **John Marshall's photo (I-090), per §B10 Data values:** read doc `photo-john` in db collection `checks` of Maréa's reviewer page (https://claude.ai/artifact/NKGLuNPVBXftpsfyFFZ6RB) with the ArtifactData tool. **An `asset` id there:** fetch the file with the Artifact tool (`action: read`, `path` = the id), save it as `brief/launch_party_graphics/john_photo.<ext>` (gitignored; never commit it, like Britt's source), add a photo job with a square face crop (look at the source, then at the 112×112 result), run `npm run event-images`, and commit only `john-thumb.jpg`. **No id:** the placeholder job (read `--green-300` from `tokens.css`; skip the `existsSync` input check for it; `TODO(I-090)`), and say so in the report. `npm run event-images` needs the other gitignored inputs in `brief/`.
- **Runbook** (`docs/runbooks/events.md`): `/launch-party` → `/events/launch-party` in the test steps; a new section **Event-day swap (Nov 22)**: what changes and when (the bullet becomes `Chai tea led by John Marshall 🍵🫖` and the role `Chai Tea ceremony`; three runs at 4:07, 4:22 and 4:45 pm MST), how Brian checks at about 4:15 pm, the fallback (Actions → Deploy → Run workflow), how to cancel (set `CHAI_NOTE` to `null` and push before 4 pm), that scheduled runs do nothing in any year but 2026 (the year guard), and that Brian deletes the schedule after the party (his master-list reminder).
- **Reviewer page:** at the step boundary, add E8's review cards to `CARDS3` and republish (CLAUDE.md).

## AC covered (IDs)
- AC-9: tests 1–6 (the page still renders only from data; the second-event test gets `/events/summer-yoga`).

## Files
- src/data/events.ts
- src/lib/events.ts
- src/components/events/EventInfo.astro
- src/pages/[event].astro
- src/pages/events/[event].astro
- src/pages/sitemap.xml.ts
- astro.config.mjs
- .github/workflows/deploy.yml
- scripts/make-event-credits.mjs
- src/assets/events/launch-party/john-thumb.jpg
- tests/events.test.ts
- tests/rsvp.test.ts
- tests/rsvp-script.test.ts
- tests/page-transition.test.ts
- tests/client-policies.test.ts
- docs/runbooks/events.md
- docs/build/STATUS.md

## Tests first (write them and see them fail before writing code)
`tests/events.test.ts` (type the deck's strings; dist path `events/launch-party.html`):
1. Data: item 1 title; `launchParty(20)` item 2's notes end `Activities and merch`, `Tai Chi led by John Marshall ☯️ 🥋` (assert the code points 262F FE0F and 1F94B); its `credits.items` deep-equals the deck's five entries; `john-thumb.jpg` exists, starts `FF D8` and is 112×112.
2. Swap: `CHAI_NOTE` is `Chai tea led by John Marshall 🍵🫖` (code points 1F375 1FAD6, no space between). `launchParty(20, CHAI_NOTE)` differs from `launchParty(20, null)` only in item 2's last note (`CHAI_NOTE`) and John Marshall's role (`Chai Tea ceremony`); both pass `assertEvent`. `new Date(CHAI_AT).toISOString()` is `2026-11-22T23:00:00.000Z`. Sequence: `eventsAt(at − 1)` deep-equals `launchParty(20, null)` in a one-item list, `eventsAt(at)` deep-equals the chai version, then `eventsAt(at − 1)` again equals the first (no shared mutation). A child `node` run importing `events.ts` with `OHM_EVENTS_NOW=nonsense` exits non-zero; with `OHM_EVENTS_NOW=2026-11-22T23:30:00Z` its `events` holds the chai note.
3. Parking: `plainText(info[1].text, 0)` and `(…, 1)` equal `Metered street parking, or free parking along Wahsatch if you don't mind walking 2 blocks.`; the feed's parking `reminderInfo` deep-equals `{ title: 'Parking', text: <that string> }`; an info text with an `http://` run throws `must be https`, one with `{ w: 'nope' }` throws `unknown wording key`.
4. URLs: `feed.pageUrl` and the `.ics` `URL:` line are `${origin}${base}/events/launch-party`; `eventPaths` still yields `launch-party` and the second event.
5. Dist: `events/launch-party.html` has the canonical `/events/launch-party` and robots `noindex`; in `#parking` exactly one link, `href` the pin, `target="_blank"`, `rel="noopener"`, text `free parking along Wahsatch`, and the paragraph's text equals test 3's string. `launch-party.html` has `content="0;url=/events/launch-party"`, robots `noindex`, canonical `https://ohmprecisionbodywork.com/events/launch-party`, no `<script` and no `<main`. Sitemap lacks `launch-party`. **Either version, never mixed:** the page holds the Tai Chi note and `John Marshall Tai Chi instruction`, or the chai note and `John Marshall Chai Tea ceremony` (the deploy job tests a build that may straddle 23:00 UTC).
6. `deploy.yml` (read as text): `schedule:` with the three crons; a `gate` job whose step compares `date -u +%Y` with `2026` only when `github.event_name` is `schedule` and writes `go=` to `$GITHUB_OUTPUT`; `build` has `needs: gate` and `if: needs.gate.outputs.go == 'true'`; `deploy` still `needs: build`; `workflow_dispatch` and `push` to `main` still present.

`page-transition` inventory: `events/launch-party.html: 1`, no entry for the redirect page (0). `client-policies` test: `events/launch-party.html` replaces `launch-party.html`. `rsvp.test.ts` and any `rsvp-script.test.ts` literal follow the new path.

## Done when
1. `npm run check` passes (paste the test count).
2. `npm run shots -- E8`: at 375 and 1280 the schedule shows both new strings with their emoji, Parking shows the link, credits show five entries (the fifth John Marshall's framed photo, or the green tile). `astro preview`: `/launch-party` lands on `/events/launch-party`.
3. `OHM_EVENTS_NOW=2026-11-22T23:30:00Z npm run build`, then shots of the schedule and credits: `Chai tea led by John Marshall 🍵🫖` and `Chai Tea ceremony`, nothing else different; then a normal build again before committing.
4. The year guard, checked by reading the workflow's logic in the report: a schedule run in 2027 skips `build` and `deploy`; a push or Run workflow in any year runs both. (It can't be triggered locally; the first real proof is the Nov 22, 2026 run.)

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
