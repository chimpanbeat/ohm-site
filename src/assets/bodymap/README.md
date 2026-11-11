# Ohm body map art set (8 figures)

Figures: female/male x front, back, left_side, right_side. All share one canvas (2048x4096 viewBox), same top/bottom and centerline, so swapping sex or view never shifts the figure.

SVG layers (ids): silhouette (fill) / landmarks (thin lines) / outline (heavy edge). Pure white background is not in the SVG (transparent); PNGs are on white.

Female front is a revised generation (symmetry 99.6%) with a hand-fixed chest band and a small xiphoid tick; female back and male back are revised generations with skull-base, shoulder-blade-spine and sit-bone lines added (they came in at 768x1536 and were scaled up before tracing, so their source PNGs are slightly soft; the SVGs are clean); the 4 side views are the original set.

Cleanup done: removed hip-bone circles (male front, female right side, male right side) and squiggle marks (female front); normalized scale and centering; left sides are exact mirrors of right sides; traced to vector.

Checks: silhouette IoU SVG vs source 0.995-0.996 on all 8; mean gray diff 0.8-2.2 of 255.

Known limits: front and back outlines differ slightly (IoU F 0.96, M 0.93) and the other front/back figures are 96-99% left/right symmetric, so author zones per view, never by mirroring. Landmarks: sit bones are only faint double curves; foot arch is not drawn on the side views.
Source: AI-generated; US copyright status uncertain (not legal advice).

Hosting: Brian decided on Nov 7, 2026 to keep this set in the public ohm-site repo, with a copy in his Workspace Drive.
