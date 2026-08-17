# STARMILK Synapsis Map

## Raw Intent Packet

The user requested that the 2B2 `1234567` process shape an evolving design prompt through mapping, neutrality, evolution, conduction, and synapse. The resulting website should have full creative license, feel deeply artistically refined, and gain powerful animation that becomes more alive when music is playing. This request remains the governing intent for the pass.

## Current Experience Map

| Surface | Current role | Existing strength | Synapsis opportunity |
|---|---|---|---|
| Entry portal | Portrait-led threshold into the site | A cinematic circular reveal and strong hero image | Let the portal leave a persistent, low-motion afterimage in the page rather than ending as an isolated moment. |
| Hero | Brand declaration and primary route into listening | Monumental editorial type and the Star Wizard artwork | Transform it into the first instrument in a site-wide score: atmospheric at rest, resonant while music is active. |
| STARMILK Radio | Listening engine and recurrent utility panel | A real SoundCloud queue, playback state, and explicit play/pause events | Publish a safe semantic playback signal that allows visual response without trying to read cross-origin audio samples. |
| River, orchard, lyrics | Mythic navigation through the catalog | Existing custom canvases and narrative copy | Use a common cadence so these worlds feel like different movements of one composition. |
| Games and Clearing | High-intensity ritual surfaces | Coordinated overlay lifecycle | Preserve their isolation, but let the page’s conductor return the listener to a coherent ambient state afterward. |
| Guide and navigation | Orientation and access | Unified close behavior and focused interactions | Add a clear, non-intrusive status vocabulary that explains whether the site is in rest, listening, or performance state. |

## Baseline Evidence

The merged production source already has a canonical matte editorial stylesheet, a unified surface coordinator, a SoundCloud Radio player with `PLAY`, `PAUSE`, `FINISH`, and `ERROR` events, and several custom visual runtimes. The active scripts do not currently share a page-wide music-state contract. This is the highest-value gap: it permits a visible new experience without adding another competing overlay or a fragile attempt to analyse a cross-origin SoundCloud iframe.

## Design Constraint

The evolved experience must not become a generic neon visualizer, a constant spectacle, or a fourth competing visual language. It should use music state as **conduction**, not decoration: the page gains breath, tactility, and low-frequency shifts when playback is active, then returns to an observant matte stillness when paused. Users who request reduced motion must receive the same hierarchy and meaning without continuous decorative movement.

## Initial Render Check

The first local render of the conductor completed without a visible structural regression. The page exposes an accessible hero status message, **“The field is at rest — Press play to awaken it,”** before any listening interaction. The portal remains above the new artwork as intended, and the synapse canvas is not visible until the listening state has been explicitly activated.

Opening the actual STARMILK Radio changed the hero cue to **“Tuning the river — STARMILK DNA (acoustic)”** before a listener pressed play. This confirms that track selection and loading propagate through the new semantic contract without attempting cross-origin waveform access. The real SoundCloud iframe then entered its own loading path; playback confirmation remains a separate verification step.

The subsequent real SoundCloud `PLAY` event completed the check. The radio reported **“Playing from STARMILK Radio,”** the hero cue changed to **“The field is awake — STARMILK DNA (acoustic),”** and the right side of the hero showed the warm, low-contrast synapse constellation with the intended amber frame response. The semantic event is therefore connected to an actual listening session rather than only a synthetic test.

Pausing the same real track returned the hero to **“The field is at rest — Press play to awaken it.”** The constellation ceased active drawing and the page preserved the intended quiet matte composition. The existing radio panel remained usable throughout the state change.

After a focused refinement, a full fresh-load pass verified that the initial at-rest state no longer enters the afterglow pathway. The portal clears to a visually still hero with the status cue intact; continuous synapse drawing starts only when a real listening state is received.

A direct canvas probe confirmed this contract quantitatively: the rest canvas had zero alpha, while a controlled listening event produced non-zero drawing across the conductor field and set the active status. A subsequent pause lets the canvas settle; the afterglow modifier now has its own bounded cleanup timer so its styling does not remain indefinitely after the draw loop stops. A 375px automated viewport check could not be run because the configured Playwright Firefox executable is not installed; the source retains the existing mobile rules and adds explicit mobile sizing for the new conductor and status cue.

The bounded cleanup was re-tested in the refreshed browser runtime: `starmilk-afterglow` was present immediately after a pause and absent after 1.55 seconds, with the hero returning to the at-rest message. The final console inspection contained only the deliberate validation expressions and no application error.

## Rhythm and Surface Refinement

The next refinement treats **SoundCloud transport time** as a distinct creative signal. The official Widget API emits `PLAY_PROGRESS` with `currentPosition` and `relativePosition`; the radio now publishes those values through the existing semantic contract. The conductor uses an artist-owned BPM value when SoundCloud exposes one, otherwise a deterministic per-track cadence. This produces travelling activation and varied downbeat pressure while remaining explicit that it is a transport-led score rather than a claimed waveform or beat analysis. [4]

The Radio, Guide, and Mood selector now share a short exit-and-enter language. Radio eases out before collapsing; Guide rises from a compact lower-right origin; Mood resolves from a modest card lift. The coordinator emits one brief hero handoff pulse as focus changes, without reintroducing overlapping panels. All motion is neutralized by the existing reduced-motion query.

Live browser testing identified one active-cascade regression: after the legacy CSS was retired, the SoundCloud transport iframe reverted to static geometry and could visibly leak into the Radio panel if its external document failed. The canonical stylesheet now restores the original hidden off-screen transport shell. A fresh rendered pass confirmed the Radio panel is clean while its live iframe remains fixed off-canvas at `-9999px` with full `300px × 166px` transport dimensions.

The fully rendered ritual was opened from a fresh portal state. Radio moved the hero to “Tuning the river”; the live iframe loaded from the public STARMILK DNA URL, while the sandbox did not complete a visible third-party playback session. Independent cadence probes confirmed distinct CSS pulse values at different real-transport-shaped positions, and full handoff checks confirmed Radio → Guide, Guide → Mood, and Mood → Radio close the outgoing surface before the incoming surface settles. The browser console remained free of application error.

## External Design and Runtime Evidence

The implementation is intentionally light. MDN documents `AnalyserNode` as the route for real-time frequency or time-domain analysis when an application owns an audio source, while the current SoundCloud iframe does not expose that source to the page. The conductor therefore uses real player state now and retains a narrow path for future same-origin audio analysis. MDN also recommends creating or resuming audio context from an explicit user gesture, and the system begins only from the existing play control. The reduced-motion edition preserves the listening-state language without continuous canvas activity. [1] [2] [3]

[1]: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode "MDN: AnalyserNode"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices "MDN: Web Audio API best practices"
[3]: https://web.dev/articles/prefers-reduced-motion "web.dev: prefers-reduced-motion"
[4]: https://developers.soundcloud.com/docs/api/html5-widget "SoundCloud: Widget API"
