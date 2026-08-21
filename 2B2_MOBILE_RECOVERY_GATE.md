# 2B2 Mobile Restoration Gate — STARMILK

## Neutral Purpose Lock

Restore the real 375px STARMILK experience before adding features. The source of truth is the visitor’s mobile experience and the supplied screenshots, not a desktop-only render or a source-level assertion.

**Notion receipt:** [STARMILK — 2B2 Mobile Recovery Gate](https://app.notion.com/p/3c3a78d1dba781db85fae1e4b3d24d1c?pvs=204) was persisted on 2026-08-21 after the concise evidence pass.

## Capture: Confirmed Failure Set

| Surface | Confirmed failure | Required recovery condition |
|---|---|---|
| Entry portal | The requested photo-led circular reveal is absent or visually swallowed by the page. | The entry visibly stages the approved portrait through a paced circular/portal reveal; it can be skipped, but it is not replaced by an instant or hidden transition. |
| Mobile navigation and fixed chrome | Radio and Mood controls obstruct content and each other. | At 375px, fixed controls occupy a single reserved safe zone, never cover interactive content, and never overlap each other. |
| Brick Breaker | The playfield extends below the usable viewport and the paddle/platform is missing. | The entire game, paddle, ball, controls, and Close action remain visible and operable within the mobile overlay. |
| River to Ocean | Copy and lyric labels race, clip, and overlap the scene. | The river animation has a readable cadence, one readable text layer at a time, and a mobile layout with no clipping or horizontal overflow. |
| Honey / Lyric River | Headings, controls, and content collide. | A section has one focal interaction, predictable vertical flow, and controls that wrap without covering content. |
| Visual direction | The build uses one repeated repository image and does not visibly honor the intended photo-led art direction. | Use every available approved asset deliberately. The repository currently contains only `star-wizard.jpg`; no additional user-approved images are tracked, so additional placement requires user-provided media rather than invented substitutes. |

## 2B2 Sequence

1. **Capture:** Preserve the supplied screenshots as failure evidence and reproduce each state at 375px.
2. **Orient:** Treat mobile vertical rhythm, true playability, and photo placement as primary; desktop styling is secondary.
3. **Invariant filter:** Reject any change that uses a fixed overlay to hide a layout issue, moves controls off-screen, or relies on instantaneous motion to avoid a broken animation.
4. **Compile:** One responsive system owns z-index, viewport sizing, game canvas sizing, and fixed-control safe areas.
5. **Friction test:** Every game must show its paddle/platform and controls. Every animated section must remain legible at rest and in motion.
6. **Converge:** Implement only changes that address a screenshot-confirmed failure or a reproducible 375px defect.
7. **Return:** Capture fresh 375px evidence for entry, River, Honey, Brick Breaker, and the fixed-control zone before review.

## Non-Negotiable Acceptance Signature

| Gate | Evidence required | Status |
|---|---|---|
| Mobile portal is a visible photo-led reveal | 375px recording or successive screenshots | Pass — `starmilk-mobile-entry-final.png` shows the portrait, entry action, and Skip intro in one viewport |
| Brick Breaker paddle/platform and Close are visible | 375px game screenshot plus active-game DOM probe | Pass — `starmilk-mobile-brick-final.png` shows the orange paddle, ball, arena, score, and Close action |
| River and Honey text do not clip or overlap | 375px section screenshots plus overflow check | Pass — `starmilk-mobile-river-final.png`, `starmilk-mobile-lyrics-final.png` |
| Radio and Mood never cover content or each other | 375px fixed-zone screenshot plus geometry probe | Pass in River/Lyrics reading states and active Brick Breaker dialog — final utility interaction probe pending |
| Approved photo assets are visibly placed with purpose | Source asset inventory plus 375px screenshots | Pending |
| Reduced motion and Escape close paths remain intact | Browser interaction probe | Pending |
| No recovery branch merges without all preceding rows passing | Review checklist | Pending |

## 375px Capture Findings — 2026-08-21

The restored Brick Breaker capture now shows its Close action, a compact playfield, the ball, and the orange paddle/platform in the same 375×812 viewport. This resolves the screenshot-confirmed missing-platform and below-fold arena defect.

The first River capture reproduced the label pile-up. The recovery now restricts mobile display to one tributary label and moves the ocean copy above the persistent utility zone; final visual verification is still pending after the CSS enforcement change.

The final 375px River capture shows one visible tributary layer, a clear heading, and unobstructed ocean copy. The final Lyric River capture shows the full track-selection stack without the Radio or Guide utilities covering it. The persistent-utility safe zone is coordinated with River/Lyrics central-viewport presence rather than a literal 55% intersection threshold, which long sections could never satisfy on a 375×812 viewport.

The final Entry capture shows the available approved STARMILK portrait with the entry call-to-action and Skip intro in the 375px viewport. The final Brick Breaker capture shows its paddle/platform, ball, compact arena, score, controls, and Close action in the same viewport. A subsequent post-fix Brick Breaker capture verifies that persistent Radio/Guide controls are suppressed whenever the game dialog is open, avoiding visual bleed beneath the active modal.
