# STARMILK Production Regression Incident Evidence

**Incident started:** 2026-08-21  
**Target:** `https://starmilk.org/`  
**Method:** Passive HTTP, browser performance, DOM, console, and source-history inspection. No transactions, account actions, or destructive production changes performed.

## Initial response and cache evidence

The public root returned HTTP 200 over HTTP/2 from the GitHub Pages/Fastly/Cloudflare path. At the captured time it had `cache-control: max-age=600`, `access-control-allow-origin: *`, and no visible `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or `X-Frame-Options` header.

The same test recorded approximately 1.79 seconds time-to-first-byte and 3.68 seconds total for 181,375 bytes of HTML from this audit environment. This is a single probe, not a percentile performance measurement.

## Initial browser resource evidence

The live document contained 2,496 DOM nodes and loaded 33 visible resource entries. The browser recorded approximately 12.19 MB of transferred resources, overwhelmingly from `starmilk-vision.mp4` at approximately 12.16 MB. `DOMContentLoaded` occurred at roughly 241 ms, while the load event completed around 6.33 seconds.

> **Initial high-confidence performance finding:** a single autoplay/visual MP4 dominates initial transferred bytes and aligns with the reported perceived slowdown. The audit must validate whether it is needed above the fold and compare it against the prior production implementation before changing it.

## Initial live state evidence

The post-merge secure Guide loaded from `starmilk-guide.js`; the removed `starmilk-chat.js` legacy runtime was absent from both script inventory and browser resource entries. The public page’s initial displayed identity included the entry animation and a large media-forward visual section; no claim is made yet about visual intent or regression source until history comparison is complete.

## Controlled pre-refactor comparison

A frozen local snapshot of commit `523d7ae`—the main-branch state before the Synapse-conduction merge—was loaded in the same browser environment. Its entry presentation was materially the same as current production, apart from minor copy: the same portal image, typography, nav geometry, and large `starmilk-vision.mp4` visual appeared.

The frozen snapshot contained 2,481 DOM nodes, 23 resource entries, approximately 13.10 MB transferred, and approximately 12.38 MB of video transfer. Its DOM-content-loaded timing was about 284 ms and its load event about 6.15 seconds. Therefore the 12 MB video, complex page structure, and initial entry aesthetic **predate** the final Synapse and audit merges. Current production added about 15 DOM nodes and 10 resource entries in this browser run, but did not introduce the dominant media payload.

This comparison does not yet establish whether the visitor-preferred baseline is earlier than commit `523d7ae`; a pre-PR #22 comparison is required before assigning visual-regression causality.

## Pre-PR #22 visual baseline and confirmed composition regression

A second frozen snapshot at commit `c0aa4a1`—the production state immediately before PR #22’s full refactor—was loaded and its entry state was dismissed through the real control. Its settled hero used a spacious full-bleed celestial field with an entirely readable STARMILK wordmark, centered copy, a calm navigation rhythm, and clear primary actions.

By contrast, current production’s entry presentation uses the large framed wizard image over the wordmark. At the captured desktop viewport, the image obscures the wordmark so the left portion of `STARMILK` is visually interrupted. This is a **confirmed visual-composition regression** relative to the pre-PR #22 baseline, not an inferred aesthetic preference.

The full refactor also replaced the prior atmospheric hero with a more enclosed, editorially heavy treatment. Whether that aesthetic direction is preferred is subjective; the compromised brand-wordmark legibility is objective and must be remediated.

## Live third-party and client-security findings

The live browser loaded resources from `starmilk.org`, Google Fonts, SoundCloud, Cloudflare Insights, and the Sentry CDN. The BotPenguin integration is only dormant source scaffolding: its placeholder guard prevented both widget script loading and widget injection.

Sentry’s public browser SDK loaded but `window.Sentry` was not active in this captured session. Its configured DSN is a public client-ingestion identifier, not an authentication secret. The more material security findings are deployment-level: the response lacks a content-security policy and the common browser hardening headers recorded in the initial response test. GitHub Pages static hosting does not expose a native per-site response-header configuration in this repository, so those controls require a fronting proxy/CDN or migration rather than an HTML-only patch.

The source has one YouTube embed constructed through `innerHTML`; its video identifier is a local fixed value in the inspected code path. No untrusted visitor value was observed flowing into that sink during this audit.

## Original performance baseline and confirmed regression

The frozen pre-PR #22 build at `c0aa4a1` contained 2,362 DOM nodes and 26 resource entries in the same browser environment. It transferred approximately 13.15 MB in total, including the same approximately 12.38 MB video transfer. Its DOM-content-loaded measurement was about 1.24 seconds and load event about 13.14 seconds.

The video payload is therefore an inherited, high-cost performance debt. However, the full refactor increased the DOM by 119 nodes over this original baseline (to 2,481), and current production increased it to 2,496. The refactor improved the local snapshot’s load-event time in this test, but the user-visible performance risk remains: the initial experience still pulls a 12 MB video before a listening or support action is requested. A recovery should change the video’s loading strategy without discarding the asset.

## Recovery-build validation

The review build now places the portal image to the right of a fully readable STARMILK wordmark, with an explicit stacking order and contrast treatment. The captured desktop view no longer allows the art aperture to obscure brand letters.

On a fresh recovery-build load, the browser reported no fetched `starmilk-vision.mp4`, zero video transfer, and approximately 736 KB of initial transferred resources. This replaces the prior approximately 12 MB initial video transfer with the existing poster/fallback until the Vision section is reached.

## Deferred-video activation defect and correction

The initial deferral change exposed a functional defect during review: after navigating to the visible Vision section, the video element had no attached source and no network activity. The original observer was not reliably activating from the target’s scroll transition.

The recovery now observes the Vision section, records its visibility explicitly, attaches the source exactly once when intersecting, and starts playback only after `canplay` while the section remains visible. A direct initial-viewport fallback keeps the same behavior reliable when the section is already on screen at initialization. Revalidation follows this source change.

The corrected build was retested from a fresh load. After navigation into the Vision section, the source attached, the local video reported `readyState: 4`, playback was active, and the expected 12,381,120-byte video transfer appeared only at that point. The initial-load saving and the cinematic section behavior are both preserved.

## Post-recovery interaction safety check

The recovery build passed the established core handoff matrix: Guide opened with focus in its input; Guide closed before Radio opened; Radio closed before Cosmic Tetris opened; and Escape closed Tetris while restoring focus to its launch control. The console showed only audit expressions and their returned assertions, with no application errors after the recovery changes.
