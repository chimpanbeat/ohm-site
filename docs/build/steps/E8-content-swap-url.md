# E8: Launch-party content, the event-day chai swap and /events/<slug> (I-088, I-089, I-091, I-092, I-093)

Brief §5 (`/events/<event>`), AC-9 · Architecture §B10 → E8–E11 (Data values, Parking link, Event-day swap, Routes), §B7 sitemap

**Deadline:** the swap is a scheduled deploy at 23:07 UTC on Sun Nov 22 (4:07 pm MST), so E8 must be on `main` well before; aim to push by Thu Nov 19. The Nov 21, 10:00 am reminder links whatever `pageUrl` the feed holds then.

## Goal
`/events/launch-party` is the event page and `/launch-party` a `noindex` meta-refresh page to it. The yoga title reads `Restorative Yoga with Britt 🧘 🪷`, the Tai Chi note `Tai Chi led by John Marshall ☯️ 🥋`, John Marshall is the fifth credit (`Tai Chi instruction`, placeholder photo), and in Parking only `free parking along Wahsatch` links (new tab) to Brian's pin while the feed and reminder text stay byte-identical. The chai swap is built and scheduled but stays **off** while `CHAI_NOTE` is `null` (`TODO(Brian)`). **Already done by the architect (read-only here):** `InfoBlock.text: Rich` in `events.ts`, `docs/build/ARCHITECTURE.md`, `docs/build/copy-deck.md` (every string, verbatim, with code points), `brief/BRIEF.md`, `.claude/hooks/protected.json` (adds `deploy.yml`). Known gaps: the chai bullet's words (`TODO(Brian)`); John Marshall's photo (I-090, placeholder meanwhile).

Notes:
- **`events.ts`:** the values above (copy them from the deck, emoji included); `CHAI_AT`, `CHAI_NOTE`, `launchParty(limit, chaiNote = null)`, `eventsAt`, `buildNow` and `events = eventsAt(buildNow())` exactly as §B10 E8–E11 says; keep the file import-free; comment `// I-091` on each. If the deck's chai line holds Brian's words when you start, stop and ask the architect (the deck must change first).
- **`src/lib/events.ts`:** `pageUrl` → `/events/<slug>`; `checkRich` also over `event.info[].text`; `feedFor` uses `plainText(b.text, site.licensed ? 1 : 0)`. **`EventInfo`:** `<p><EventRich text={block.text} /></p>`. Nothing else.
- **Route:** `git mv src/pages/[event].astro src/pages/events/[event].astro`, fix its relative imports; `astro.config.mjs` adds `redirects` from `events` (§B10 Routes); `sitemap.xml.ts` maps `index: true` events to `/events/<slug>`.
- **`deploy.yml`:** add the three `schedule` crons with an I-091 comment; leave `push`, `workflow_dispatch` and the jobs as they are.
- **Placeholder photo:** the `john-thumb.jpg` job in `make-event-credits.mjs` per §B10 Data values (read `--green-300` from `tokens.css`; skip the `existsSync` input check for a placeholder job; `TODO(Brian): I-090`); run `npm run event-images` (it needs the gitignored inputs in `brief/`); commit only the new file.
- **Runbook** (`docs/runbooks/events.md`): `/launch-party` → `/events/launch-party` in the test steps; a new section **Event-day swap (Nov 22)**: what changes and when (the three runs), how Brian checks at about 4:15 pm (the schedule note and John Marshall's role), the fallback (Actions → Deploy → Run workflow), that nothing swaps until Brian's chai words are in (he sends them; the architect adds them), and that the crons are removed after the party.

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
1. Data: item 1 title; item 2's notes end `Activities and merch`, `Tai Chi led by John Marshall ☯️ 🥋` (assert the code points 262F FE0F and 1F94B); `credits.items` deep-equals the deck's five entries; `john-thumb.jpg` exists and starts `FF D8`.
2. Swap: `launchParty(20, 'TEST note')` differs from `launchParty(20, null)` only in item 2's last note (`TEST note`) and John Marshall's role (`Chai Tea ceremony`); both pass `assertEvent`. `new Date(CHAI_AT).toISOString()` is `2026-11-22T23:00:00.000Z`. With `CHAI_NOTE === null`: `eventsAt(at − 1)`, `eventsAt(at)`, `eventsAt(at − 1)` deep-equal (no shared mutation). A child `node` run importing `events.ts` with `OHM_EVENTS_NOW=nonsense` exits non-zero.
3. Parking: `plainText(info[1].text, 0)` and `(…, 1)` equal `Metered street parking, or free parking along Wahsatch if you don't mind walking 2 blocks.`; the feed's parking `reminderInfo` deep-equals `{ title: 'Parking', text: <that string> }`; an info text with an `http://` run throws `must be https`, one with `{ w: 'nope' }` throws `unknown wording key`.
4. URLs: `feed.pageUrl` and the `.ics` `URL:` line are `${origin}${base}/events/launch-party`; `eventPaths` still yields `launch-party` and the second event.
5. Dist: `events/launch-party.html` has the canonical `/events/launch-party` and robots `noindex`; in `#parking` exactly one link, `href` the pin, `target="_blank"`, `rel="noopener"`, text `free parking along Wahsatch`, and the paragraph's text equals test 3's string. `launch-party.html` has `content="0;url=/events/launch-party"`, robots `noindex`, canonical `https://ohmprecisionbodywork.com/events/launch-party`, no `<script` and no `<main`. Sitemap lacks `launch-party`. **Either version, never mixed:** the page holds the Tai Chi note and `John Marshall Tai Chi instruction`, or `CHAI_NOTE` and `John Marshall Chai Tea ceremony` (the deploy job tests a build that may straddle 23:00 UTC).
6. `deploy.yml` (read as text): `schedule:` with the three crons, `workflow_dispatch` and `push` to `main` still present.

`page-transition` inventory: `events/launch-party.html: 1`, no entry for the redirect page (0). `client-policies` test: `events/launch-party.html` replaces `launch-party.html`. `rsvp.test.ts` and any `rsvp-script.test.ts` literal follow the new path.

## Done when
1. `npm run check` passes (paste the test count).
2. `npm run shots -- E8`: at 375 and 1280 the schedule shows both new strings with their emoji, Parking shows the link, credits show five entries (the fifth a framed green tile). `astro preview`: `/launch-party` lands on `/events/launch-party`.
3. `OHM_EVENTS_NOW=2026-11-22T23:30:00Z npm run build` gives the same page as a normal build (swap off), and the build log shows no error.

## Report
Files changed · Checks (command and result) · Deviations · New items (I-###) · Questions for the architect.
