# 2B2 1234567 Master Prompt — STARMILK Synapse Conduction

## Governing Intent

Create the greatest viable version of the existing STARMILK music world. The result must become more deeply authored, sensorial, and emotionally legible while preserving the site's real music, routes, support links, games, and coordinated interface contract. The experience must feel like a **living record sleeve that becomes conscious when the listener presses play**, rather than a generic “music visualizer.”

> The page is not a dashboard, a sci-fi control room, or an animation demo. It is a field guide to a private cosmology: repaired childhood, rivers, folklore, electricity, and songs that make the wound luminous.

## 1234567 Conduction Tunnel

| Node | Creative question | Compiled decision |
|---:|---|---|
| 1 | What must remain true? | Preserve STARMILK's authored mythology, Star Wizard portrait, real listening and support paths, matte material language, and all accessibility/overlay work already merged. |
| 2 | What has the highest salience? | The missing connective tissue is a shared **music state**. Radio currently knows when a track plays, but the surrounding site does not feel that fact. |
| 3 | What constraints prevent false grandeur? | No glossy cyberpunk, no new competing control surfaces, no fake waveform claims, no autoplay, no constant motion, and no CORS-fragile attempt to analyse the SoundCloud iframe. |
| 4 | What is the smallest useful creative mind-state? | A page-wide conductor that receives semantic playback events and turns them into restrained light, orbit, drift, and typographic energy across the existing composition. |
| 5 | Which alternatives deserve challenge? | Consider a full Three.js visualizer, an SVG-only visual layer, and a CSS-only “playing” state. Reject the first as disproportionate to the site’s static architecture and the last as too shallow; select a lightweight canvas constellation plus CSS score. |
| 6 | What is the execution score? | Install a `starmilk:audioState` contract; build a hero-resident Synapse Conductor; let CSS choreograph play/pause across the hero, radio, river, cards, and controls; preserve a still reduced-motion edition. |
| 7 | What proves the evolution earned its place? | Playback must visibly alter the experience; pause must return it to stillness; no panel may collide; user control and reduced-motion behavior must remain intact; browser and syntax checks must pass. |

## Neutral Creative Exploration

The prompt family was deliberately explored without assuming that “epic” means louder, bluer, shinier, or more technically complex.

| Candidate family | Promise | Failure risk | Decision |
|---|---|---|---|
| Astral surveillance room | High-tech drama and numerical music readouts | Dilutes STARMILK's tenderness into familiar sci-fi UI | Rejected |
| Psychedelic festival visualizer | Immediate energy and saturated motion | Competes with listening and turns the album world into decoration | Rejected |
| Cinematic 3D anomaly | Spectacle and obvious audio responsiveness | Adds a heavy runtime and puts the browser demo before the music | Rejected |
| Inked Relic Synapse | Editorial gravity, mythic intimacy, and a world that moves only when invited | Requires disciplined motion and clear playback semantics | Selected |

## Selected Direction: Inked Relic Synapse

The existing Inked Relic Editorial system evolves into an **Inked Relic Synapse**. The page becomes a score with three states: **at rest**, **listening**, and **afterglow**. At rest, the visual field is archival and matte. During listening, small constellations awaken around the hero; the radio gains a visible pulse; the river appears to deepen; typography receives a faint thermal halo; and cards lift as though a quiet pressure is moving beneath the paper. At pause, the system returns to stillness without a hard reset, leaving a brief residue of amber light.

The conductor does not pretend to read SoundCloud audio samples. It responds honestly to the player’s semantic `PLAY`, `PAUSE`, `FINISH`, and `ERROR` states and to the track’s elapsed journey. This is both more robust and more truthful for an embedded cross-origin player. If STARMILK later hosts same-origin audio, the contract can accept real `AnalyserNode` energy without changing the visual language. `AnalyserNode` is intended for real-time frequency and time-domain data, while its output may remain unconnected; the implementation therefore keeps that future extension narrow and optional. [1]

## Implementation Prompt

```text
You are the visual conductor for STARMILK, an independent electronic music universe.

Preserve the real music, navigation, games, support links, accessibility behavior, and the existing Inked Relic Editorial design system. Never replace the site with a generic neon visualizer or a dashboard. Do not add autoplay. Do not create competing fixed panels.

Treat playback as a ritual state. When a listener explicitly starts music, bring the surrounding world into a restrained state of conduction: a hand-drawn constellation canvas in the hero forms low-contrast synaptic paths, a warm amber pulse travels through its nodes, the radio’s live indicator breathes, the hero portrait gains a subtle color-temperature shift, and section surfaces receive small, asynchronous pressure changes. When playback pauses, settle these signals gradually back into a stable, matte archival field.

Use semantic player events as the baseline source of truth. Do not claim beat-level audio analysis when the playback source is a cross-origin SoundCloud iframe. If a same-origin audio element becomes available later, accept a normalized energy value through the same event contract and improve intensity without changing the art direction.

Motion must be purposeful, not decorative. It should use transforms, opacity, canvas drawing, and color variables; suspend work when the document is hidden; cap canvas device-pixel ratio; and remain fully legible with `prefers-reduced-motion`. The reduced-motion experience keeps the active-state color, label, and hierarchy while removing continuous movement. User control begins with an explicit play gesture, following Web Audio autoplay guidance. [2] [3]

Make each interaction feel authored: play activates a conductor cue, pause creates an afterglow, track changes alter the constellation seed, and navigation never loses the listener’s current place. The emotional arc is not “system online.” It is “the song found a body.”
```

## Acceptance Contract

The evolved experience succeeds only if it is visibly more alive during real radio playback, remains calm and legible when music is paused, avoids any new overlap regressions, and protects users who request reduced motion. It must reuse the canonical visual vocabulary—ink, paper, river, orchard, honey, and clay—so the expansion feels inevitable rather than pasted on.

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode "MDN: AnalyserNode"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices "MDN: Web Audio API best practices"
[3]: https://web.dev/articles/prefers-reduced-motion "web.dev: prefers-reduced-motion"
[4]: https://github.com/willianjusten/awesome-audio-visualization "GitHub: Awesome Audio Visualization"
[5]: https://tympanus.net/codrops/2025/06/18/coding-a-3d-audio-visualizer-with-three-js-gsap-web-audio-api/ "Codrops: Coding a 3D Audio Visualizer"
