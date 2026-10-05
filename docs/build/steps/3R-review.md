# 3R: Privacy and cost review, commit

Model: opus
Brief: §2, §6, §12, §14

## Do
1. Run the review procedure (HANDOFF §4) on 3B, then do these privacy and cost checks:
   - Read all of `book.ts`. The address may flow only into the pinned Google calls.
   - Session token: created per session, passed to every autocomplete call, consumed by `fetchFields`, then renewed.
   - The fields list is exactly `location` and `formattedAddress`.
   - Debounce and minimum length are as pinned, and stale responses are discarded.
   - The loader only loads after the mobile choice, and never on other pages.
   - Fallback paths: an empty key, a bad key, and the timeout.
   - `zones.geojson` contains polygons and `zone` only. `git status --ignored` shows the KML ignored.
2. Live test on :4321 with Brian's key. In the DevTools Network tab, confirm the only Google requests are the loader, autocomplete and place details, and count the autocomplete requests for typing one address.
3. Accept: commit `Phase 3: real zones and address autocomplete` and push. Confirm the CI build has the repo variable: the address field appears on the preview.
4. Tell Brian about any polygon or description mismatches surfaced by the fixture. Update STATUS, then run the gate: 4A is Opus, so continue.
