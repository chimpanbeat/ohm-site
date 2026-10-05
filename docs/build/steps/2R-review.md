# 2R: Review Phase 2, commit

Model: opus
Brief: §6, §12

## Do
1. Run the review procedure (HANDOFF §4) on 2A. Focus on:
   - `geo.ts` correctness: edge handling, holes, MultiPolygon, precedence
   - no JS on `/book/[zone]`
   - the `out` card has no booking link
   - aria-live and focus management
   - the no-JS path
   - placeholder links carry `data-placeholder`
2. Accept: commit `Phase 2: booking router with placeholder zones` and push. Check that the preview deploys.
3. Update STATUS, then run the gate: 3A is Opus, so continue directly in this session.
