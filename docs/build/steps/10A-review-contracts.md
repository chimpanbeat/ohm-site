# 10A: Brian's review of Phase 9: contracts, design, copy

Model: opus
Source: Brian's notes after the Phase 9 preview (Oct 6, 2026). Batches 1–2 plus the line pick. Brian: "go" (Oct 6). Built in `steps/10B-hello-map-spacing.md`.

## Item map
**Batch 1 (Oct 6): `/hello` motion and text**

| # | Brian's item | Where it lands (draft) |
|---|---|---|
| 1 | The first light lap is too fast | Slower lap (proposed 4.5s, ease-in-out). |
| 2 | Start the light at the bottom-right of the hand (his screenshot: the right foot's inner corner, where the hand meets the baseline) and travel clockwise | `omega.json` `d` is rotated to start at that vertex. The trace is already clockwise on screen (positive shoelace area, y down), so from there the light goes up the thumb side, across the fingers right to left, down the left of the palm, along the left foot, up and over the arch, down the right leg, and back along the right foot to the start. The dash enters at the start point and drains out at the same point (dasharray period longer than the path, so it never wraps or shows twice). `trace-omega.mjs` does the rotation, and a test pins the start vertex and orientation, so JohnMark's SVG gets the same treatment. |
| 3 | After the first lap the whole logo glows a bit; the remaining animations are hard to see | Remove the automatic glow (`ohm-settle` at 3s and the `ohm-pulse` loop). Open: what (if anything) moves after the lap (see Questions). |
| 4 | Glow only on hover, or after a click before the page goes to `/` | Hover and focus: glow on. Click: glow, then go to `/` after a short pause (about 500ms). Needs a small inline script (see Decisions). |
| 5 | The line looks too sharp; it stands out too much | Softer treatment (see Questions: Opus will mock options). |
| 6 | Show the line when the light completes its lap | Line fades in as the lap ends (delay = lap start + duration). |
| 7 | Keep the line on screen; don't clear it | Cause found: hover sets `animation: none`; when the pointer leaves, the animation restarts from its 3s delay, so the line (and glow) vanish again. Under the new design hover never touches the line, so it can't happen. |

**Batch 2 (Oct 6): copy, map, spacing, `/hello`**

| # | Brian's item | Where it lands (draft) |
|---|---|---|
| 8 | Why "Ohm": remove "the shape in my logo" | Copy deck → Home: `Its symbol is the Greek letter omega (Ω).` |
| 9 | Home subline on two lines | Measured: 3 lines at 1024–1440 (448px wide, 40% column), 4 at 768, 3 on phones. Widen the subline only (not the H1) and `text-wrap: balance`, so it's 2 lines from ~1024 up. Phones stay at 3 lines (2 would need ~15px text). |
| 10 | Office mark a bit smaller | `markW` 125 → ~105 (about 34px on a phone, 55px on desktop). |
| 11 | Office mark too far SW for the real address | The street geocodes (OSM) about 1 km NE of the mark. `site.office.mapArea` 38.79, −104.86 → **38.80, −104.85**, the nearest 2-decimal point (about 150 m from the street). The address itself stays out of the repo. |
| 12 | "Show all areas" is hard to see on the light map | Dark button: `--bg-dark` fill, `--text-on-dark` text, a soft shadow. |
| 13 | Office map: "Show mobile service areas" instead; areas link to "At your place" for that zone | A `Show mobile service areas` link-button over the office map → `/book#mobile`. On `/book` book.ts switches to "At your place" with the full map (scroll + focus), where a click on an area already chooses it; the hash does the same on load, so `/book/office` lands there too. Without JS, `/book` shows both sections and the hash scrolls. No second interactive map mode. The office mark is not a link on the office map (already the case). |
| 14 | Hovering an area or the office mark dims the others | Mobile map: hover an area → the other areas and the office mark dim; hover the mark → all areas dim. Linked with the picker buttons as now. |
| 15 | Services footnote at body size | `.footnote` loses `--fs-small`; keeps the small top margin. |
| 16 | Too much vertical space (Services intro band → next band), tighten site-wide | Measured page heights (see "Spacing" below). |
| 17 | `/hello`: the light comes round every 10–12 s | Signature lap once (slow), then a repeat lap every ~11 s, clearly visible. No glow. |
| 18 | Does the click-pause JS ruin the JS-free status? Worth it? | See Decisions. |
| 19 | `/hello` Ω about 50% bigger | `width: min(75vmin, 42rem)` (was `min(50vmin, 28rem)`). At 1280×800 it's 600px wide and the line still fits above the fold. |
| 20 | Line: 3–4 versions | `screens/10A-line-variants.png` (A current, B soft, C quiet caps, D sage); all ≥ 6.3:1. **Brian: C, sized up to the Ω's width** (see "Line" below). |

### Spacing (measured Oct 6, before → with section padding 40/64 px, first-section top 24/40, `.gap` 40)
| Page | 375 | 1280 |
|---|---|---|
| `/` | 2276 → 2180 | 1767 → 1639 |
| `/services` | 2780 → 2644 | 2038 → 1862 |
| `/pricing` | 1510 → 1382 | 1380 → 1212 |
| `/about` | 2300 → 2268 | 1851 → 1811 |
| `/book/home` | 1812 → 1780 | 1720 → 1680 |

Bigger levers: the About photo (630px tall at 1280, 492px at 375), the mobile footer (269px), the Home hero's 96px desktop padding.

**Brian (Oct 6): approved all of it**: the section trim above, plus a capped About photo (or beside the bio on desktop), a two-column mobile footer, and Home hero padding 96 → 64 on desktop.

### Line (prototyped in the browser, Oct 6)
Option C, stretched so the line spans exactly the Ω's visible width at every size. Pure CSS from one width variable; the constants are DM Sans metrics for this exact string (33 characters, upper case, weight 500). Re-measure them if the line or font changes:
```css
.hello {
  --omega-w: min(75vmin, 42rem);                                   /* the Ω svg width (Brian: ~50% bigger) */
  --line-fs: max(0.8125rem, calc(var(--omega-w) / 26.54));         /* 13px floor on phones */
  --line-ls: calc((var(--omega-w) / 1.04 - 17.84 * var(--line-fs)) / 32); /* fills the gap to the Ω's edges */
}
.hello-omega { width: var(--omega-w); }
.hello-line {
  font-weight: 500; text-transform: uppercase; white-space: nowrap;
  font-size: var(--line-fs); letter-spacing: var(--line-ls);
  text-indent: var(--line-ls);                                      /* balances the trailing letter-space */
  color: color-mix(in srgb, var(--text-on-dark) 75%, var(--bg-dark)); /* 6.66:1 on --bg-dark */
  text-shadow: none; padding-inline: 0;
}
```
`/ 1.04` is the viewBox's 2% padding per side, so the line matches the Ω's ink, not its box. Measured: at 1280×800, 22.6px text, glyph edges within 0.1px of the Ω's at 351.5–928.5; at 390×844, 13px (floor) with 1.5px tracking, both edges within 0.1px; no horizontal scroll. Screens: `10A-line-C-wide-{1280,390}.png`. 10B's Done-when re-measures the edge match (±2px) at 320, 390, 1280 and 1920.

## Decisions (Opus, draft)
- **Click glow needs JavaScript.** A plain link navigates at once, so there's no "glow, then go" without a script. A tiny inline script on `/hello` only: on a plain left click or Enter, `preventDefault`, add `.is-entering` (glow), then `location.href = a.href` after ~500ms. Modified clicks pass through. Reduced motion: navigate at once. `pageshow` with `persisted` removes `.is-entering`, so Back from `/` doesn't show a stuck glow (bfcache). Without JS the link still works, just with no pause. `check:dist` rule 7 changes from "no `<script>`" to "only the inline enter script" (no `src=` scripts).

## Questions for Brian (answered)
- After the first lap: the light comes round every 10–12s (Brian) → 11s.
- The line: C, sized to the Ω's width (Brian).
- The click-pause script: Opus recommended it; Brian didn't object, so it's in (the page still works without JS).

## Contract edits made here
- `src/styles/tokens.css`: `--s-10: 2.5rem`.
- `src/data/site.ts`: `office.mapArea` → `38.8, -104.85` (the address is not in the repo).
- `src/pages/index.astro` and the copy deck: Why "Ohm" sentence.
- Copy deck: office map button label, `/hello` line timing.
- ARCHITECTURE §A3, §B4, §B5, §B8, §C.
