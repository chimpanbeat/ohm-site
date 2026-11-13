# B5 zone list, draft for Brian (I-159, I-157)

Architect, Nov 13, 2026. Text only: no polygon is drawn until Brian approves this list. B5 then copies it into `src/data/bodymap.ts` and the copy deck as written here. "AC-2" in the items is the spec's number; in BRIEF §15 it is **BM-2**.

## How the two levels work
- **Coarse regions** are what the client sees: the region list (`Prefer a list?`) and the name beside each mark. They are the 28 front and 29 back regions Brian approved on Nov 8, unchanged.
- **Fine zones** sit inside one coarse region each. They appear only in the PDF and the JSON, never on the page. 51 front, 55 back. A coarse region with no useful split has no fine zones, and its own key is the zone ID.
- **Zone ID** = the key. Keys are unique across both views and both levels. **Side** comes from the key: `left-…`, `right-…`, otherwise midline. Left and right are the client's own (on a front view `left-*` is on the viewer's right).
- **Where they exist.** Front keys on `female_front` and `male_front`; back keys on `female_back` and `male_back`; the same keys for both sexes. Nothing on the four side views (not in v1). Polygons are authored per figure, never mirrored (art README: the figures are 96 to 99% symmetric, and front and back outlines differ).
- **Zone-set version** 1. It goes up when a key is added, removed or renamed, or a border moves enough to change what a name means.

## Sizes against BM-2
Measured on the art (`png/`, body from y 0.03 to 0.955 of the canvas). On the smallest phone we test (375×667) the figure is at most 70% of the screen height: 233×467 px at 1× zoom, so 1 px is about 9 canvas units. BM-2 allows a tap to land about 10 px off.

| Level | Smallest side at 1× | In canvas units | Why |
|---|---|---|---|
| Coarse | 24 px | 210 | Twice the tap error plus a little, so a tap aimed at the middle gets the right name without zooming |
| Fine | 12 px | 105 | 36 px at 3× zoom, where BM-2 is measured. At 1× a fine name can be one neighbour off, inside the right coarse region; the dot in the PDF and the x, y in the JSON are the true spot |
| Margin | 5 px | 40 | Limb and edge zones reach this far past the outline, so a near miss on a wrist still gets a name |

The 44 px rule is for controls (the list rows, the buttons), not for zones: the figure is one target. `npm run bodymap:zones` will print each zone's smallest side per figure, and a test fails under these minimums. Three coarse regions are at or under the limit by the body's own shape: side of ribs (about 20 px wide), top of shoulder (about 23 px tall) and elbow (about 23 px wide before the margin). They stay in the list, so nobody depends on tapping them.

## Art gaps and what the list does about them
- **Sit bones are only faint double curves.** No sit-bone zone is drawn from them. The whole lower band of each glute is one fine zone, "lower glute and sit bone".
- **No view shows the sole of the foot** (choice 4).
- **Hip-bone circles were removed from the male front**, so the hip zones are placed from the brief line, the same way on both sexes.
- Female back and male back came from soft sources; the SVGs are clean, and zones use the SVG.

## Front (28 coarse, 51 fine)
Sizes are width × height in px at 1× on the 375×667 phone, margin included, from the female figure (the male is within about 10%). L/R means a `left-` and a `right-` twin.

| Coarse key | Name | Side | Size | Fine zones (key: name), with the smaller side |
|---|---|---|---|---|
| `head-face` | Head and face | midline | 48×44 | `forehead`: Forehead and temples (16) · `left-jaw`, `right-jaw`: Left/Right cheek and jaw (24) |
| `neck-front` | Front of neck | midline | 28×28 | `left-neck-front`, `right-neck-front`: Left/Right side of the front of the neck (14) |
| `shoulder` | L/R shoulder | L/R | 40×28 | `-collarbone`: Left collarbone (14) · `-shoulder-front`: Left front of shoulder (23) |
| `chest` | L/R chest | L/R | 33×35 | `-chest-inner`: Left chest, by the breastbone (16) · `-chest-outer`: Left chest, by the armpit (17) |
| `upper-arm` | L/R upper arm | L/R | 33×47 | none |
| `elbow` | L/R elbow | L/R | 33×26 | `-elbow-inner`: Left inner elbow (16) · `-elbow-outer`: Left outer elbow (16) |
| `forearm` | L/R forearm | L/R | 31×37 | none |
| `wrist-hand` | L/R wrist and hand | L/R | 40×47 | `-wrist-front`: Left wrist, palm side (12) · `-palm`: Left palm and base of thumb (16) · `-fingers`: Left fingers and thumb (19) |
| `ribs-side` | L/R side of ribs | L/R | 20×35 | none |
| `belly-upper` | Upper belly | midline | 35×35 | `left-belly-upper`, `right-belly-upper`: Left/Right upper belly (17) |
| `belly-lower` | Lower belly | midline | 79×28 | `left-belly-lower`, `right-belly-lower`: Left/Right lower belly (28) |
| `hip-front` | L/R front of hip | L/R | 40×42 | `-hip-bone-front`: Left front of hip bone (21) · `-hip-crease`: Left hip crease and groin (19) |
| `thigh-front` | L/R front of thigh | L/R | 30–44×65 | `-thigh-front-upper-inner`, `-upper-outer`, `-lower-inner`, `-lower-outer`: Left front of thigh, upper inner (and so on) (15) |
| `knee` | L/R knee | L/R | 30×28 | `-knee-inner`: Left knee, inner side (15) · `-knee-outer`: Left knee, outer side (15) |
| `shin` | L/R shin | L/R | 24–33×65 | `-shin-upper`: Left upper shin (24) · `-shin-lower`: Left lower shin (24) |
| `ankle-foot` | L/R ankle and foot | L/R | 28×37 | `-ankle-front`: Left front of ankle (14) · `-foot-top`: Left top of foot and toes (23) |

## Back (29 coarse, 55 fine)

| Coarse key | Name | Side | Size | Fine zones (key: name), with the smaller side |
|---|---|---|---|---|
| `head-back` | Back of head | midline | 48×44 | `head-back-upper`: Back and top of head (30) · `left-skull-base`, `right-skull-base`: Left/Right base of skull (14) |
| `neck-back` | Back of neck | midline | 28×26 | `left-neck-back`, `right-neck-back`: Left/Right side of the back of the neck (14) |
| `shoulder-top` | L/R top of shoulder | L/R | 47×23 | `-shoulder-top-inner`: Left top of shoulder, by the neck (23) · `-shoulder-top-outer`: Left top of shoulder, by the arm (23) |
| `shoulder-blade` | L/R shoulder blade | L/R | 54×28 | `-shoulder-blade-inner`: Left shoulder blade, inner edge by the spine (16) · `-shoulder-blade-mid`: Left shoulder blade, middle (23) · `-shoulder-blade-outer`: Left shoulder blade, outer edge and back of shoulder (19) |
| `mid-back` | L/R mid back | L/R | 33×28 | `-mid-back-inner`: Left mid back, beside the spine (14) · `-mid-back-outer`: Left mid back, over the ribs (19) |
| `low-back` | L/R low back | L/R | 40×33 | `-low-back-inner`: Left low back, beside the spine (14) · `-low-back-outer`: Left low back, side of the waist (26) |
| `spine-base` | Base of spine | midline | 28×26 | `left-spine-base`, `right-spine-base`: Left/Right side of the base of the spine (14) |
| `glute` | L/R glute | L/R | 49×56 | `-glute-upper`: Left upper glute (16) · `-glute-outer`: Left outer hip (16) · `-glute-mid`: Left middle of glute (23) · `-glute-lower`: Left lower glute and sit bone (16) |
| `upper-arm-back` | L/R back of upper arm | L/R | 33×47 | none |
| `elbow-back` | L/R back of elbow | L/R | 33×26 | none |
| `forearm-back` | L/R back of forearm | L/R | 31×37 | none |
| `hand-back` | L/R back of hand | L/R | 40×47 | `-wrist-back`: Left back of wrist (12) · `-knuckles`: Left back of hand and knuckles (16) · `-fingers-back`: Left back of fingers and thumb (19) |
| `hamstring` | L/R hamstring | L/R | 30–44×68 | `-hamstring-upper-inner`, `-upper-outer`, `-lower-inner`, `-lower-outer`: Left hamstring, upper inner (and so on) (15) |
| `knee-back` | L/R back of knee | L/R | 30×26 | none |
| `calf` | L/R calf | L/R | 24–35×68 | `-calf-upper`: Left upper calf (24) · `-calf-lower`: Left lower calf (24) |
| `ankle-heel` | L/R ankle and heel | L/R | 28×40 | `-achilles`: Left Achilles and back of ankle (21) · `-heel`: Left heel (16) |

Fine keys written `-x` take the side prefix: `left-collarbone`, `right-collarbone`. Their names swap "Left" for "Right".

Polygons to draw: 57 front and 63 back per sex (the fine zones plus the coarse regions with no split), 240 in all. Coarse regions are never drawn on their own: each is the union of its fine zones, so the two levels can't disagree.

## Choices Brian might change
1. **Coarse list unchanged** from Nov 8 (28 and 29). Say if any region should be added, merged or renamed now, before polygons exist.
2. **Side of ribs** is the narrowest coarse region (about 20 px). Default: keep it, as an exception to the 24 px rule. Other option: drop it from the coarse list and let chest and upper belly meet.
3. **Fine names are surface places**, not muscles ("top of shoulder, by the neck", not "upper trapezius"). A tap on a flat figure can't tell one muscle layer from another. Say if you want muscle names in the PDF anyway.
4. **Sole of the foot.** Default: `heel` stays "heel", and a client uses the note. Other option: name it "heel and sole".
5. **No midline spine zone.** A tap on the spine is named left or right "beside the spine", by which side of the centreline it falls on; the same for the base of the spine. Other option: a midline strip about 14 px wide in the mid back and low back.
6. **Thigh and hamstring have four fine zones each** (upper and lower, inner and outer). If that is more than you would use, upper and lower alone cuts 16 polygons per sex.
7. **Hands have three fine zones**; the thumb is in with the fingers because it is under 12 px on its own.
8. **Hip crease and groin, and the chest**, use the same zones and names on both figures.
