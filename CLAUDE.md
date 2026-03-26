# STARMILK Design System & Revision Guide

## Identity
STARMILK is a cosmic electronic music artist site. The aesthetic is **matte, organic, earthy** — inspired by Van Gogh's Starry Night palette but rendered with the restraint of fine art printing. Think stone, paper grain, aged metal — never chrome, neon, or glass.

## Core Principles

1. **Matte over glossy** — No shiny gradients, no neon glows, no pulsing glow animations. Shadows are soft and deep, not colorful or luminous.
2. **Restraint over spectacle** — Animations should breathe, not flash. Prefer slow (5s+) opacity fades over fast transforms. Prefer static elegance over animated complexity.
3. **Unified surface** — Every section should feel like it belongs to the same document. Avoid per-section styling gimmicks. Use the shared shadow, border, and spacing tokens.
4. **Organic over geometric** — When choosing between sharp lines and soft curves, lean organic. Border-radius stays at 14px. Dividers are neutral and subtle.
5. **Texture over flatness** — The subtle SVG noise overlay (fractalNoise at 2.5% opacity) gives everything a paper/canvas quality. Preserve this.

## Color Palette (do not change without discussion)

```css
--bg:          #080b16    /* Deep space navy — primary background */
--bg-mid:      #0e1325    /* Slightly lighter bg for layering */
--card:        #10162a    /* Card/panel background */
--purple:      #6b5b8a    /* Mid-tone purple — accents, icons */
--indigo:      #3d5080    /* Deep blue — secondary accent */
--violet:      #7b6998    /* Light purple — hover states */
--teal:        #3a7068    /* Earth teal — secondary palette */
--teal-light:  #6aad96    /* Light teal — hover states */
--gold:        #c9944a    /* Primary accent — labels, borders, CTAs */
--gold-light:  #dbb87a    /* Light gold — hover states, highlights */
--blue-night:  #1b3058    /* Night blue — subtle backgrounds */
--blue-deep:   #162040    /* Deep blue — button backgrounds */
--text:        #d5cfc2    /* Warm off-white — body text */
--muted:       #8c8578    /* Muted brown-gray — secondary text */
```

## Shadow System

```css
/* Card shadows — soft, deep, no color glow */
--card-shadow: 0 0 0 1px rgba(30,50,90,.25), 0 4px 24px rgba(8,11,22,.45);
--card-hover:  0 0 0 1px rgba(60,80,130,.4), 0 6px 32px rgba(30,50,90,.3);

/* General depth */
--glow-sm:     0 2px 12px rgba(40,60,100,.3);
--glow-lg:     0 4px 24px rgba(40,60,100,.35), 0 8px 48px rgba(8,11,22,.3);
--gold-glow:   0 2px 14px rgba(201,148,74,.15);  /* very subtle */
```

**Rules:**
- Never use colored box-shadows for hover effects (no `rgba(purple, .5)`)
- Card hover: `translateY(-4px)` max. No `scale()`. No color-tinted shadows.
- Use `rgba(8,11,22, .x)` for depth shadows (site bg color)

## Typography

- **Body**: `'Segoe UI', system-ui, -apple-system, sans-serif`
- **Poetic/quotes**: `Georgia, 'Times New Roman', serif`
- **Labels**: `.7rem`, `letter-spacing: .32em`, `text-transform: uppercase`, `color: var(--gold)`
- **Section titles**: `clamp(1.9rem, 5vw, 3rem)`, `font-weight: 900`, gradient text
- **Body text**: `line-height: 1.65`, `color: var(--text)` or `var(--muted)` for secondary
- **No text-shadow** on any element except river section (and even there, keep it very subtle)

## Animation Rules

- **No shimmer/pulse/glow animations** on text or logos
- **Entrance animations**: `fadeUp` (translateY + opacity), max 0.5s, ease timing
- **Hover transitions**: `0.35s cubic-bezier(.4,0,.2,1)` — the shared `--t` variable
- **Background animations**: slow (9s+ cycle), subtle opacity changes only (e.g. nebula: 0.5 to 0.7)
- **Reduced motion**: Always respect `prefers-reduced-motion: reduce`
- **Frame rate**: Background WebGL capped at 30fps. No 60fps animations for decorative elements.

## Borders

- Standard radius: `14px` (`--radius`)
- Card borders: `1px solid rgba(27,48,88,.2)` — barely visible
- Dividers: neutral gray gradient (`rgba(140,133,120,.1)` to `.15`), not multi-colored
- Button borders: `2px solid rgba(201,148,74,.35)` — slightly visible gold

## Spacing

- Section inner: `max-width: 1100px`, `padding: 6.5rem 1.5rem`
- Card grid: `gap: 1.4rem`
- Card padding: `1.75rem`

## Button Style

```css
/* Primary (gold) */
background: linear-gradient(145deg, #1e2c4a, #162040, #1a2848);
border: 2px solid rgba(201,148,74,.35);
color: #dbb87a;
/* Include SVG noise texture overlay at 4% opacity */

/* Hover: brighten slightly, strengthen border */
border-color: rgba(201,148,74,.6);
transform: translateY(-2px);
```

## Breakpoints

```
800px  — tablets
720px  — mobile
680px  — narrow mobile (hamburger triggers)
550px  — small phones
480px  — extra small
```

## File Architecture

- `index.html` — Main site (all CSS inline in `<style>`, all core JS inline)
- `visualizer.html` — Standalone visual listening room (WebGL shaders + music player)
- `*.js` files — Feature modules (radio, chat, games, orchard, river, lyrics, etc.)
- `starmilk-tracks.json` — 302-track catalog
- No build tools, no bundler, no framework — pure vanilla

## What NOT to Do

- Do not add `text-shadow` with colored glow to any element
- Do not add `animation` properties that pulse, shimmer, or flash
- Do not use `scale()` in hover transforms (except buttons at `.97` for press feedback)
- Do not add colored border glows on hover (teal, purple, gold ring effects)
- Do not add new color variables without referencing the palette above
- Do not add external fonts or font imports
- Do not add new JS libraries or frameworks
- Do not increase SVG noise opacity above 3%
