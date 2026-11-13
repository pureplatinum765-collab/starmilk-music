# Artistic Motion, Blended Intentionality & Music Sanctuary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform STARMILK into an unmissable, artistically animated sound sanctuary by moving the Masterpiece Canon directly under the Hero, implementing blended scroll choreography and audio-reactive motion, and giving the floating radio player a luxury frosted-obsidian redesign with direct visualizer immersion.

**Architecture:** 
1. Re-order the DOM hierarchy in `index.html` to bring `#stream` (The 2B2 Masterpiece Canon & Streaming Doors) directly below `#hero` (displacing the empty placeholder `#radio`), making music and playback immediately accessible on the first scroll.
2. Implement an organic, blended scroll reveal and starlight motion system across `starmilk-refactor.css` and `starmilk-ui.js` that uses progressive blur-to-sharpness reveals, gold Kintsugi light sweeps, and tempo-synchronized ambient breathing when audio plays.
3. Completely redesign `.radio-floating` and `.radio-panel` in `starmilk-refactor.css` with frosted obsidian glass, `Cinzel`/`Cormorant` editorial typography, glowing starlight equalizer, and a direct full-screen visualizer immersion portal.
4. Verify static constraints with `node scripts/verify-static.mjs`, commit, push to `origin/main`, and verify on live production.

**Tech Stack:** Vanilla JavaScript (ES modules, IntersectionObserver, CustomEvent), Semantic HTML5, CSS3 Glassmorphism, CSS Custom Properties, KaTeX/Cinzel/Cormorant Garamond Web Fonts, GitHub Actions/Pages.

**Spec:** Grounded in Aura knowledge base prompt `STARMILK_2B2_ANTIGRAVITY_REDESIGN_PROMPT.md` and user direction: "and the animations could be added through the page as it moves and with greater artistry and blended intentionality".

## Global Constraints

- `index.html` must NEVER contain `<style>` blocks (enforced by `scripts/verify-static.mjs`).
- `index.html` must NEVER contain the literal string `"childhood trauma"`.
- Must preserve canonical tags, `og:url`, `CNAME` (`starmilk.org`), and all required static strings.
- Full `@media (prefers-reduced-motion: reduce)` accessibility compliance.
- All JavaScript must pass `node --check`.

## Review Focus

1. **Section Navigation & Deep-linking**: `#stream` anchor links from nav ("Listen"), Hero button ("Explore Music"), and direct URL hashes (`#stream`) must scroll directly to the elevated Masterpiece Canon.
2. **Audio State Sync**: Clicking any `.canon-play-btn` or `.canon-card` must immediately wake the radio, play the track, and sync the active gold Kintsugi aura.
3. **Scroll Reveal Smoothness**: Elements must glide into view without layout shift (CLS 0) and without jerky snapping.
4. **Mobile Responsiveness**: Cards, radio panel, and transport controls must fit gracefully on viewport widths from 320px to 2560px.
5. **No Regressions**: All 323 tracks in `starmilk-tracks.json`, favorites, volume controls, and MediaSession metadata must continue functioning smoothly.

---

### Task 1: Re-Order DOM to Promote Masterpiece Canon Directly Below Hero

**Files:**
- Modify: `index.html`

- [ ] **Step 1.1**: In `index.html`, locate the current placeholder `#radio` section (lines 238–246) and the Masterpiece Canon `#stream` section (currently around line 512).
- [ ] **Step 1.2**: Move the complete `#stream` section (including the 2B2 Masterpiece Canon, the 5 Definitive Movements, and the Universal Streaming Doors) directly after `#hero` in place of the sparse `#radio` placeholder.
- [ ] **Step 1.3**: Ensure `#stream` retains `id="stream"` and `data-mood-section="going-round"` so all nav links (`#stream`, `Listen`, `Explore Music`) land immediately on the Masterpiece Canon.
- [ ] **Step 1.4**: Run `node scripts/verify-static.mjs` to ensure all static site rules pass.

---

### Task 2: Implement Blended Intentional Motion & Scroll Choreography

**Files:**
- Modify: `starmilk-refactor.css`
- Modify: `starmilk-ui.js`

- [ ] **Step 2.1**: In `starmilk-refactor.css`, define the artistic scroll reveal system:
  - Base `.reveal`: `opacity: 0; transform: translateY(24px) scale(0.99); filter: blur(5px); will-change: opacity, transform, filter; transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1), filter 1s cubic-bezier(0.16, 1, 0.3, 1);`
  - Active `.reveal.is-revealed`: `opacity: 1; transform: translateY(0) scale(1); filter: blur(0);`
  - Staggered child delays for `.canon-card:nth-child(1..5)` (e.g. 0.08s, 0.16s, 0.24s, 0.32s, 0.40s).
  - Reduced-motion fallback: instant transitions with zero transform and zero blur.
- [ ] **Step 2.2**: Add the blended Kintsugi light sweep animation:
  - When `.canon-card.is-revealed` enters view, the `.kintsugi-seam` animates a gentle liquid starlight flare from left to right.
- [ ] **Step 2.3**: In `starmilk-ui.js`, upgrade the `IntersectionObserver` to add `.is-revealed` as soon as elements cross into view with `threshold: 0.12` and `rootMargin: '0px 0px -40px 0px'`.
- [ ] **Step 2.4**: Run `node --check starmilk-ui.js` and `node scripts/verify-static.mjs`.

---

### Task 3: Redesign Floating Radio Player with Luxury Obsidian Glass & Visualizer Immersion

**Files:**
- Modify: `index.html`
- Modify: `starmilk-refactor.css`
- Modify: `starmilk-radio.js`

- [ ] **Step 3.1**: In `index.html`, add a direct Visualizer portal button inside `.radio-header` / `.radio-now-row`:
  `<a href="visualizer.html" class="radio-visualizer-portal" title="Enter Fullscreen Visualizer" aria-label="Enter Fullscreen Visualizer"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="3"/><circle cx="10" cy="10" r="3"/><path d="M7 7l6 6M13 7l-6 6"/></svg><span>Ambient Stage</span></a>`
- [ ] **Step 3.2**: In `starmilk-refactor.css`, style `.radio-floating` and `.radio-panel`:
  - Deep frosted obsidian glass: `rgba(16, 24, 21, 0.94)`, `backdrop-filter: blur(28px) saturate(160%)`, warm gold hairline rim `rgba(240, 203, 126, 0.25)`.
  - Editorial title styling with `Cinzel`, subtitle with `Cormorant Garamond`.
  - Starlight EQ equalizer: glowing gold dancing bars that rhythmically pulse when `isPlaying`.
  - Polished circular transport buttons with golden active glow.
  - Refined search bar with soft starlight focus ring.
- [ ] **Step 3.3**: In `starmilk-radio.js`, ensure the Visualizer portal button passes the current playing track or index so the fullscreen visualizer seamlessly tunes into the active composition.
- [ ] **Step 3.4**: Bump cache-busters in `index.html` (`starmilk-refactor.css?v=...`, `starmilk-radio.js?v=...`, `starmilk-ui.js?v=...`).

---

### Task 4: Static Verification, Production Deployment & Live Smoke Test

**Files:**
- Execute: `scripts/verify-static.mjs`
- Deploy: Git commit & push to `origin/main`

- [ ] **Step 4.1**: Run `node scripts/verify-static.mjs` and ensure all tests pass.
- [ ] **Step 4.2**: Check `git status` and `git diff` to verify clean changes.
- [ ] **Step 4.3**: Commit with descriptive message and push to `origin/main`.
- [ ] **Step 4.4**: Verify live deployment on `https://starmilk.org` via `chrome-devtools-mcp`, test scroll reveals, check Masterpiece Canon at the top, and test radio playback.
