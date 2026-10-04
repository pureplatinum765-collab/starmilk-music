# STARMILK Mothership Commons — Implementation Record

Branch: `codex/starmilk-mothership-commons`  
Base: `main@84c57458061f87639c44dd7117d1cdc284355c49`  
Prompt source: STARMILK 2B2 1234567 ROLL — Mothership Mission Experience Skeleton + Master Redesign Prompt — 2026-10-04

## Current-experience map before editing

| Surface | Current role | Preserved strength | Contradiction found |
|---|---|---|---|
| Entry portal | Mothership threshold | “Welcome to the STARMILK mothership.” + “Come on in” | None. It already expressed the new mission cleanly. |
| Hero | Music identity + first route | Immediate STARMILK identity, listening CTA, story link | “childhood trauma” made the public register narrower and more clinical than the new universal mission. |
| Radio | First listening system | Music is available before the biography | Preserve. |
| Our Story | Belonging + Elijah | “We are all STARMILK,” light-left-on imagery, Elijah closing | All layers were compressed into one letter, so belonging, STARMILK DNA, anti-stigma meaning, and memorial competed for the same paragraph weight. |
| Vision / Film / Catalog / River / Lyrics / Orchard / Games | Return to living art | Strong proof that grief is not the whole universe | Preserve order and existing behavior. |
| Support | Optional contribution | Exact low-pressure sentence already correct | Preserve. |
| Patreon / VIP | Paid extras | Real supporter pathway | “You’re not just a listener — you’re part of what STARMILK is becoming” accidentally made paid support sound like a higher tier of belonging. |
| CSS architecture | Canonical Inked Relic stylesheet | One loaded external stylesheet with existing layer tokens | A second 110KB legacy stylesheet remained embedded but disabled, plus a separate active mission style block. This left three visible sources of styling intent in the document. |

## Three architecture strategies

### A — Linear mission manifesto
Put the entire belonging / stigma / Elijah story into one polished long-form essay near the top.

**Preserves:** literary continuity and founder specificity.  
**Destroys:** music-first pacing, ordinary play, and the stranger’s ability to enter without first absorbing biography.  
**Failure mode:** family members could read subtext where none is intended, while music-only visitors would feel delayed.

### B — Mission distributed across the whole site
Scatter one mission sentence into Radio, Vision, River, Orchard, Games, Support, and Connect.

**Preserves:** constant thematic reinforcement.  
**Destroys:** each creative world’s independent purpose.  
**Failure mode:** the site becomes a campaign and every surface is asked to be profound.

### C — Mothership Commons
Keep the existing portal and Radio first. Turn Our Story into a compact editorial commons with a clear internal sequence:
**BELONGING → STARMILK DNA → ROOM FOR EACH OTHER → ELIJAH**, then return immediately to Vision, film, catalog, river, lyrics, orchard, games, and present-tense life.

**Preserves:** music-first access, specificity, Elijah, play, the Inked Relic system, and the exact voluntary-support language.  
**Risk:** the mission section could still become too heavy if overdecorated.  
**Control:** three editorial panels, short copy, one music action, no new JavaScript, no new overlay, no new visual runtime.

**Selected:** C.

## Implemented changes

### Mission architecture
- Kept the portal copy and entry behavior unchanged.
- Added **Story** to the primary navigation without moving Listen from first position.
- Rebuilt `#our-story` as the Mothership Commons.
- Added a restrained **STARMILK DNA** origin artifact with a direct link to the existing acoustic track.
- Made the anti-stigma origin explicit without medicalizing it:
  - “The song began with the pain of stigma and being misunderstood.”
  - “STARMILK DNA is in us all. Not because our stories match, but because none of us can be seen whole from the outside.”
- Preserved the “little light left on” and “Sometimes a song crosses that distance” language.
- Kept accountability in the frame while leaving room for understanding, repair, forgiveness, and love.
- Preserved Elijah as the final personal root inside the mission section.
- Preserved the closing: “I can hear you now. Better than I ever could.”
- Changed the repeated public-facing “childhood trauma” line to the broader “old ache” register.

### Donation integrity
- Preserved the exact sentence:
  **“You can support the STARMILK mission here if you would like.”**
- Reframed the Patreon area from an “inner circle” hierarchy to **Supporter Extras**.
- Added the explicit statement:
  **“STARMILK belongs to everybody.”**
- Removed copy that implied paying supporters were more fully part of STARMILK.

### Design-system skeleton
- Removed the disabled 110KB legacy inline stylesheet from `index.html`.
- Moved all mission presentation into the loaded canonical `starmilk-refactor.css`.
- Removed the remaining active inline style block, leaving zero `<style>` blocks in `index.html`.
- Added semantic surface, text, accent, reading-width, spacing, radius, duration, and easing tokens.
- Folded the skip-link’s raw z-index into the existing named layer system.
- Added a two-column editorial mission composition that collapses intentionally to one column on mobile.
- Added no JavaScript, no new overlay, no new animation runtime, and no new dependency.

## Preservation check
Unchanged:
- real Radio and SoundCloud transport
- semantic music-state conductor
- Vision and deferred film loading
- Stream links
- River
- Honey Drip lyrics
- Orchard
- all three games
- support routes
- Connect routes
- guide
- Clearing
- tapestry
- reduced-motion behavior already attached to the broader site
- existing overlay coordination code

## Verification performed

### Source / structure
PASS:
- 13 section opens / 13 closes
- 2 article opens / 2 closes
- 2 aside opens / 2 closes
- 131 div opens / 131 closes
- no duplicate IDs
- CSS brace count: 400 / 400
- zero inline `<style>` blocks
- zero `starmilk-legacy-styles` references
- exactly one `#our-story`
- exactly one `#starmilk-dna-origin`
- exactly one `#vip`
- direct STARMILK DNA track route present
- exact voluntary-support sentence present
- universal-belonging supporter sentence present
- “childhood trauma” absent from homepage public copy
- semantic token scale present
- raw `z-index: 120` removed

### Static verifier
The repository verifier was extended so future CI now fails if:
- inline/legacy style systems return,
- the STARMILK DNA origin artifact disappears,
- the stigma / misunderstanding origin language disappears,
- paid support again implies greater belonging,
- the voluntary support sentence changes,
- the semantic token skeleton disappears,
- the raw skip-link layer escape returns.

GitHub Actions run **#34 / 37236227074** was triggered by the draft PR but failed before executing any workflow steps. The job record reports `steps: []` and `runner_id: 0`. Therefore this run is an **infrastructure failure, not a test result**; the Node verifier has not yet executed in hosted CI.

### Render / interaction verification
**BLOCKED in this connector-only implementation pass.**

No branch preview or executable browser runtime is available in the current environment, so the following cannot be truthfully claimed yet:
- visual before/after parity,
- 320 / 375 / 390 / 430px screenshot review,
- computed-style comparison,
- keyboard traversal in a rendered page,
- runtime interaction latency,
- third-party SoundCloud playback behavior in the changed branch.

These remain release gates, not assumed passes.

## Release standard
Do not merge solely because the source audit is clean. Merge only after branch CI runs and a rendered preview confirms:
- the portal remains calm,
- Listen remains immediate,
- Mothership Commons reads clearly on mobile,
- Elijah does not feel adjacent to a conversion prompt,
- supporter extras feel optional rather than hierarchical,
- no overlay/focus regression appears,
- no console/page error appears,
- the site still feels like music, art, play, and a living world rather than a manifesto.
