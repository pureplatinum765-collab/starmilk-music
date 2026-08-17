# STARMILK Production Refactor Audit

## Verified failure sources

The live source currently layers three incompatible visual systems in a single stylesheet: the original Starry Night interface, a later matte palette override, and a subsequent “Genius Mode” overhaul. They redefine core selectors such as `body`, `nav`, `section`, `.section-title`, `.card`, `footer`, the radio surface, and mobile navigation multiple times. The result is an unpredictable cascade rather than a single design system.

The page also contains independent fixed layers and runtime controllers that do not share a single state contract. These include the parking-lot entry, nav, mood selector, clearing ritual, radio player, chat launcher/panel, scroll rail, depth-current label, game overlays, starfield, particle field, and mesh canvas. The rendered audit confirmed overlapping fixed chrome at the page edge, including the radio, chat control, depth label, and scroll rail.

The interaction layer repeats responsibilities. Separate inline scripts and external files modify navigation appearance and active state, inject scroll chrome, repaint visual canvases, and schedule transitions. The chatbot loads an embedding model in the browser and calls a public remote endpoint, so it is both heavy for visitors and not a suitable architecture for a secure, page-aware AI guide.

## Rebuild rules

1. Replace the accumulated stylesheet with one canonical design system; do not append another override block.
2. Define one explicit layer scale for page background, content, navigation, utility controls, panels, dialogs, and entry state.
3. Remove duplicate scroll chrome and duplicate navigation observers; persistent UI must have a single owner.
4. Preserve functional content IDs required by the music, orchard, river, lyric, and game scripts, while rewriting their container layout and style contracts.
5. Move the chatbot to a server-side AI boundary before claiming it is an AI assistant; browser code may only call a restricted public endpoint.
6. Validate each overlay as a state transition: open, keyboard escape, focus return, resize, visibility change, and mutually exclusive display.

## Definition of done

- No fixed controls overlap at desktop or mobile widths.
- No page section inherits conflicting layout, background, typography, or shadow rules.
- Opening one transient panel cannot leave another transient panel visible or interactive.
- Navigation, entry, music player, games, orchard, river, lyric interaction, and chat each open and close reliably.
- The site has a visibly different editorial composition: an asymmetrical art-led hero, a clear listening route, a curated catalog, a restrained interactive river, an orchard gallery, a coherent game terminal, and a grounded support/connections ending.
- The client console is clean and the code passes static checks before the review branch is updated.
