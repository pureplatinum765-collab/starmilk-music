# STARMILK menu recovery design QA

- Source visual truth: https://starmilk.org at deployed commit `91aa01240a76ac2771ccb7c326d483401b49e6af`
- Source captures: Firecrawl desktop `1440 x 1000` and mobile `390 x 844`, captured 2026-08-24
- Implementation: pull request 35 at commit `8490dcf5a2d78278cb8e0eedbe8c50065324aa24`
- Implementation screenshot: unavailable
- Intended viewports: `1440 x 1000`, `320 x 844`, `375 x 844`, `390 x 844`, `430 x 932`, and mobile landscape
- Density normalization: not applicable until a rendered implementation capture is available
- State: post-intro mobile menu open, plus Menu to Radio and Menu to Guide transitions

## Full-view comparison evidence

The deployed source visibly expands the Visualizer SVG to roughly 359 pixels on a 390-pixel mobile viewport and leaves Radio and Guide controls exposed above the open drawer. The implementation constrains the active glyph rule to 8 pixels and adds a menu scrim, surface exclusion, scroll lock, inert background, and contained keyboard focus. Static verification passes, but these code-level facts are not a rendered visual comparison.

## Focused-region comparison evidence

Focused comparison is required for the navigation header, Visualizer glyph, bottom fixed controls, drawer focus order, and Cosmos reward dialog. It is blocked because the implementation cannot yet be rendered at a public URL and no local browser was selected for this run.

## Required fidelity surfaces

- Fonts and typography: unchanged by the repair; rendered wrapping and optical balance remain unverified.
- Spacing and layout rhythm: target header is 64 to 72 pixels with an 8-pixel glyph; rendered measurements remain unverified.
- Colors and visual tokens: existing STARMILK variables and surfaces are preserved; rendered contrast remains unverified.
- Image quality and asset fidelity: no source image or icon assets were replaced.
- Copy and content: navigation and guide copy are unchanged.
- Interaction and accessibility: static contracts cover ARIA disclosure, focus containment, inert background, Escape handling, and surface coordination; live keyboard and touch behavior remain unverified.

## Comparison history

1. Source audit found P1 oversized navigation glyph, competing menu surfaces, background scrolling, and focus escape.
2. Commit `8490dcf5a2d78278cb8e0eedbe8c50065324aa24` applied the bounded repair and passed `node scripts/verify-static.mjs` plus `git diff --check`.
3. GitHub Actions run `32710607989` did not start because the account is locked for a billing issue, so the commit has not been deployed for post-fix capture.

## Remaining implementation checklist

- Resolve the GitHub Actions billing lock and rerun pull request 35.
- Deploy the exact reviewed commit only after the check passes.
- Capture the same desktop/mobile states, compare source and implementation together, and verify keyboard, touch, reduced motion, scroll lock, anchor offsets, and console errors.

final result: blocked
