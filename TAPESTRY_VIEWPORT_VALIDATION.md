# STARMILK Tapestry Viewport Validation

**Scope.** This document records the real-browser scroll validation for the approved rink tapestry after its mobile safe-state release. The probe targets the deployed art-direction system’s section scene, calculated scroll progress, plate interaction safety, and reduced-motion behavior.

| Viewport | Scroll response | Transition result | Plate safety |
|---|---|---|---|
| Desktop, 1440 × 900 | Progress moves from 0.3650 at Stream to 0.9941 at Connect | Indigo → Constellation → Rose → Moon → Constellation → Ochre → Rose → Ochre | All tested plates are visible, `pointer-events: none`, and stay within 0.17–0.25 opacity. |
| Tablet, 768 × 1024 | Progress moves from 0.3414 at Stream to 1.0000 at Connect | The same intended color sequence completes through the support and closing passages | All tested plates remain non-interactive and retain the desktop contrast envelope. |
| Phone, 375 × 812 | Progress moves from 0.1840 at Stream to 1.0000 at Connect | The same sequence completes, with mobile plate opacity reduced to 0.055–0.14 | River and Lyrics enter protected reading state: Guide opacity is 0, and both persistent utilities have `pointer-events: none`. |
| Phone, reduced motion | No progress-driven transform is applied | Scene colors remain semantically correct at Stream, Lyrics, and Connect | Plate transforms report `none`; mobile Lyric River protection remains active. |

## Correction made during the test

The initial interaction run exposed a transition edge case on wide desktop layouts: an observer-entry batch could keep the preceding constellation scene active while Support was the visible focal surface. The controller now derives the scene from the section containing the viewport focal line on each scroll or resize. When structural sections overlap that line, it selects the most recently entered one. This eliminates observer timing from the visual sequence.

## Acceptance

The final local real-browser matrix passes JavaScript syntax validation, the repository static contract, whitespace checks, scroll progress progression, non-interactive plate checks, 375px reading protection, and reduced-motion transform suppression.
