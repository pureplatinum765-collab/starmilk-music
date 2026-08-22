# STARMILK Rink Tapestry — Approved Asset Direction

## Intent

Create a **slow-moving polychrome tapestry** from the supplied STARMILK rink imagery. The treatment should feel like a painted stage-light memory shifting from indigo to rose quartz to ochre as the visitor moves through the listening ritual. It is not a full-screen slideshow, an autoplay video wall, or a background that competes with lyrics and controls.

## Asset Roles

| Asset | Role | Use discipline |
|---|---|---|
| `starmilk_cosmic_rink_keyframe.png` | Indigo hero anchor | One large, low-opacity impression behind the portal and hero atmosphere. |
| `starmilk_variant_twilight_velvet_2b2.png` | Dark-violet transition plate | Mirrored or cropped inside the fixed tapestry field; never full-strength behind text. |
| `starmilk_variant_rose_quartz_2b2.png` | Rose tonal interlude | Brought forward near Lyric River as a subtle color memory. |
| `starmilk_variant_solar_ochre_2b2.png` | Warm floor-light anchor | Used as a lower-layer refracted glint around support and closing sections. |
| `starmilk_variant_moonlit_denim_2b2.png` | Moonlit counterweight | Used sparingly in the Vision/Orchard passage to cool the composition. |
| `starmilk_unfinished_constellation_keyframe.png` | Constellation motif | Blended at low opacity with the music-reactive constellation system, not as an additional foreground. |

## Motion and Contrast Contract

The tapestry drifts only through `transform`, `opacity`, and `filter`; its scroll response is calculated from the visitor’s position and uses a very low movement range. It remains `pointer-events: none`, is absent under `prefers-reduced-motion`, and steps back while River or Lyrics enter their protected mobile reading state. Headline and control surfaces retain their existing opaque or gradient contrast layers.

## Exclusions

The supplied videos will **not** be placed as multiple autoplay backgrounds. They are available for a later, intentional cinematic treatment with explicit poster imagery and a user-initiated playback path. This first pass builds the requested photo tapestry from the approved stills without turning the page into a bandwidth-heavy visual loop.
