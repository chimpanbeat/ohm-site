# 11A: Brian's review of Phase 10: `/hello` speed, spacing, About photo

Model: opus
Source: Brian's notes on the live Phase 10 site (Oct 6, 2026). Batches 1–2. Brian: "that's all for now" (Oct 6) = go. Built in `steps/11B-light-fix-spacing-about.md`.

## Item map
**Batch 1 (Oct 6)**

| # | Brian's item | Where it lands (draft) |
|---|---|---|
| 1 | `/hello` lap a bit faster on desktop, ~4s | Because of item 2's bug, the desktop lap Brian sees today is ~3.2s, not 4.5s: at scale 0.81 the dash leaves the path at 81% of its travel, which ease-in-out reaches at ~72% of 4.5s. So a true 4s would be *slower* than now. To be "a bit faster" than today: **3s**. Keyframes: the lap ends at 3/11 ≈ 27.3% (was 41%). The line's reveal delay → 3.4s (0.4 + 3). Period stays 11s. Brian to confirm after he sees it. |
| 2 | On mobile the animation seems much faster (Pixel 9 Pro, Brave = Chromium) | **Cause (confirmed):** `.omega-light` uses `pathLength="1"` together with `vector-effect: non-scaling-stroke`. With a non-scaling stroke the browser lays the dashes out in screen space, but `pathLength` normalises against the path's length in viewBox units. So dash length and speed are off by 1/scale (scale = rendered width ÷ viewBox width). Desktop, scale 0.81: the light runs ~1.23 laps' worth, so the visible lap ends early. Phone, scale 0.40: ~2.5 laps' worth, so it's twice as fast with a streak twice as long. Sonnet's `10B-hello-{390,1280}-2.5s.png` show it: at 2.5s the phone's light has reached the end while the desktop's is halfway. **Fix:** no `vector-effect` on `.omega-light` and `.omega-glow`; stroke widths in viewBox units: light `5` (~4px desktop, ~2px phone), glow `8`. Verified by injecting it at 390×844: at 2.5s the light is on the fingers (offset −0.36, the same fraction at every size). `11A-light-fix-390-2.5s.png`. |
| 3 | Tighten vertical spacing on Home | Hero padding 64 → 48 desktop, 48 → 40 mobile; sections as in 4. |
| 4 | Services and Pricing: less space between the intro band and the next band, and around the closing "Book a session" band and footer | `.section` 40/64 → **32/48** (mobile/desktop). First section top unchanged (24/40). The closing button-only band: 32 both. `.scope` margin 32 → 24. Footer desktop padding 48 → 32. |
| 5 | About: the same (spacing) | Covered by 4. |
| 6 | About photo too wide: crop to the text width | Desktop photo `max-width: var(--measure)` (the paragraphs' width, 800px at 1280), `aspect-ratio: 16 / 9`, `object-position: 50% 55%`: 800×450 (was 1120×480). He stays whole. Mobile already matches the text width. |

**Batch 2 (Oct 6): Why "Ohm" (done by Opus in 11A; copy only)**

| # | Brian's item | Where it landed |
|---|---|---|
| 7 | Start "I spent…" on a new line | Two paragraphs (copy deck → Home P1/P2; `index.astro`). |
| 8 | Remove "The tagline carries both meanings." | Removed. |
| 9 | "how I got here" links to About | `<a href={href('/about')}>how I got here</a>`. Build, `check:wording` and `check:dist` pass. |

### Prototype (injected CSS on the local build, Oct 6)
| Page | 375 | 1280 |
|---|---|---|
| `/` | 2108 → 2060 | 1546 → 1418 |
| `/services` | 2576 → 2544 | 1868 → 1732 |
| `/pricing` | 1310 → 1270 | 1212 → 1068 |
| `/about` | 2016 → 2008 | 1645 → 1568 |

Screens: `11A-about-1280.png`, `11A-services-bottom-1280.png`.

## Questions for Brian (answered)
- The fast animation: Pixel 9 Pro, Brave (Chromium). Not WebKit; the cause is engine-independent (item 2).

## Contract edits made here
- Copy deck → Home "Why Ohm" and `src/pages/index.astro` (batch 2).
