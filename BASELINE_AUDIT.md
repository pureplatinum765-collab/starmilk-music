# STARMILK Mothership — Baseline Audit (Phase 0)
**Date:** October 10, 2026  
**Governing Standard:** 2B2 Empirical Verification & Dialectical Synthesis  
**Target:** [starmilk.org](https://starmilk.org/) | [pureplatinum765-collab/starmilk-music](https://github.com/pureplatinum765-collab/starmilk-music)  
**Active Development Branch:** `evolution/earth-starlight-canon-20261010`  
**Base Commit:** `a5f58ce3162b202102f5c3da030eefcaa394002f` (`origin/main`)  

---

## 1. Confirmed Facts (Empirically Verified)

### 1.1 Repository & Git Status (`GIT_VERIFIED`)
- **Production Branch (`main`):** Synchronized at `a5f58ce` (*"Add fish-and-ocean reflection to Human Maps"*).
- **Draft PR #42 (`design/earth-starlight-20261009`, commit `e4e533b`):** Confirmed open and unmerged. Contains 172-line delta on `starmilk-refactor.css` replacing purple/magenta ink tokens (`#141426`, `#232345`) with earthy pine, moss, walnut, and warm vellum (`#181f19`, `#28352c`, `#f2e7d0`).
- **Draft PR #43 (`feature/trauma-aware-field-notes-20261010`, commit `0c3e6a0`):** Confirmed open and unmerged. Expands Brick Breaker Field Notes from 14 to 44 items, adding sourced references (SAMHSA, VA, WHO, Lerner & Simmons 1966) and secure DOM instantiation (`replaceChildren`, `createElement`).
- **Branch `editorial/fish-tree-ocean-20261009`:** Verified identical to `origin/main` (already merged via `a5f58ce`).

### 1.2 Runtime & Static Contracts (`RUNTIME_VERIFIED`, `CODE_VERIFIED`)
- **Static Verification Script (`scripts/verify-static.mjs`):** Executed locally on Node v22.23.3: **PASSED** (all canonical URLs, CNAME, required mission texts, CSS scales, and JSON structures verified).
- **Syntax Check (`node --check`):** Executed across `the-river.js`, `human-maps.js`, `brick-breaker-game.js`, `cosmic-game.js`, `tetris-game.js`, `starmilk-radio.js`, `starmilk-guide.js`, `starmilk-ui.js`, `starmilk-tapestry.js`, `starmilk-conductor.js`, and `orchard.js`: **100% PASSED**.
- **Live Production Probe (`https://starmilk.org`):**
  - HTTP 200 via Cloudflare CDN / GitHub Pages.
  - Sentry DSN active (`4511087284977664`).
  - 302 tracks catalogued in `starmilk-tracks.json`.
  - Entrance overlay (`#parking-lot-overlay`) active with Star Wizard aperture, rings, and "Come on in" trigger.
  - Console inspection reveals 1 runtime exception in `mood-ring.js:2:110332` (`Error`), plus warning regarding deprecated `<meta name="apple-mobile-web-app-capable">`.

---

## 2. Unknowns & Epistemic Limitations

1. **Notion 2B2 Manifest Access:** Remote Notion pages (`3baa78d1-dba7-81cd-8ca5-c76617ef8391`, `3efa78d1-dba7-81c2-8df6-e61f441df257`, `3f2a78d1-dba7-8154-9c41-e88ebef237c0`, `3f4a78d1-dba7-81c2-a1f8-d704b98da8f6`) returned HTTP 404 (pages not shared with the "antigravity" internal Notion integration). Per Part 3 instructions, the comprehensive Master Evolution Prompt serves as the authoritative provisional specification.
2. **SoundCloud API Rate Limiting / Embed Restrictions:** In high-concurrency environments or restricted mobile networks, external SoundCloud widget embeds may display "Verification Required" or stall. The catalog's direct fallback playback links must be preserved.
3. **Patreon / Funding Backend Status:** Tier 2 ("The Orchard After Hours") is currently purely conceptual prose; no backend authorization mechanism is active or expected.

---

## 3. Observed Defects & Friction Points

### 3.1 Visual Cohesion & Color Contradictions
- **Palette Disconnect:** The current production CSS still uses plum/purple ink (`--ink: #141426`, `--plum: #232345`), clashing with the user's explicit preference for warm pine, walnut, moss, honey, and vellum paper.
- **Section Transitions:** Abrupt background changes between `#hero` (`#18121a`), `#our-story`, `#human-maps`, `#river`, and `#the-poem` (`#171426`), creating visual fragmentation rather than a continuous dusk-to-evening landscape.

### 3.2 The River-to-Ocean Bounded Canvas Defect
- **Width Ceiling:** In `the-river.js` (line 51–55), the river calculation caps at `w * 0.92`, drawing a bounded polygon inside the canvas. The river edges never truly flow past the viewport borders.
- **Color Mismatch:** Line 38 of `the-river.js` samples to `[114, 245, 255]` (bright neon cyan/turquoise), conflicting with the restrained mineral river-teal palette and causing an abrupt visual stop at `#the-poem`.

### 3.3 Human Maps Educational & Experiential Depth
- **Superficial Diagramming:** The current 3 Human Maps panels rely on basic text labels and disconnected node boxes without relational depth, clear distinction between observation vs interpretation, or trauma-informed citations.
- **Lack of Deepening Layer:** No structured, accessible citation ledger or optional deeper reading paths exist for visitors seeking grounded scientific clarity.

### 3.4 GitHub Actions Automation Gap
- **Manual Dispatch Only:** `.github/workflows/static-checks.yml` triggers only on `workflow_dispatch`, failing to guard pull requests and push events automatically against static regression.

---

## 4. Improvement Opportunities (Phase Roadmap)

| Phase | Core Objective | Primary Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | Visual Unification | Integrate validated tokens from PR #42: walnut, deep pine, moss, honey, vellum; soften panels & section seams; fix deprecated meta tag. |
| **Phase 2** | River-to-Ocean Expansiveness | Redesign `the-river.js` geometry so banks exit the viewport at `progress > 0.85`; transition colors to river-teal and ocean-horizon rather than neon cyan; blend seamlessly into `#the-poem`. |
| **Phase 3** | Human Maps & Scientific Canon | Embed the Herman / Van der Kolk / Porges / Doka / Boss / Lerner citation ledger (`citations.json`); refine the 3 Map figures; provide accessible source links and ethical safeguards. |
| **Phase 4** | Healing Arts & Poetry Bridge | Harmonize `#the-poem` (Gibran, Machado, Angelou), the Elijah Star tribute, and reflective creative invitations without medicalizing art. |
| **Phase 5** | Game Evolution & Field Notes | Merge PR #43's 44 sourced Field Notes into `brick-breaker-game.js`; ensure gentle pacing, XSS-safe rendering, and responsive mobile touch zones. |
| **Phase 6** | Automated Gates & Verification | Update `static-checks.yml` for automatic PR triggers; run full regression test suite in browser and Node. |

---

## 5. Working Features That Must NOT Regress
1. **Universal Welcome Copy:** *"Welcome to the STARMILK mothership"*, *"Come on in"*, *"We are all STARMILK"*, *"STARMILK belongs to everybody"*, *"You can support the STARMILK mission here if you would like."*
2. **Elijah Star Tribute:** Lines: *"I can hear you now. Better than I ever could."*
3. **Fish-and-Ocean Reflection:** Exact unedited preservation after Human Maps.
4. **Music-First Core:** 302-track audio playback, STARMILK Radio floating panel, Orchard canvas song dropping.
5. **No Static Regressions:** Adherence to all rules in `scripts/verify-static.mjs`.
