# Changelog

## v1.15

- Category order is now customizable in **Balanced**, **Keep boxes ordered**, and **Minimize moves**.
- Reordering categories no longer changes the selected layout mode.
- The order editor now shows only sections that actually exist in the current preview.
- Switching between Minimal / Recommended / Functional immediately refreshes the available order rows.
- Presets no longer erase the player's saved section order.
- Drag & drop and ↑ / ↓ controls both work on the currently visible sections.

## v1.14.2

- Balanced and Keep boxes ordered now preserve the selected section order instead of letting later sections jump ahead.
- Minimize moves remains the most flexible mode when reducing move count matters more than strict physical order.
- Organizer preview and Apply button stay synchronized after order changes.

## v1.14.1

- Removed the redundant category-count strip between the preview cards and the box table.

## v1.14

- Reworked the category-order UI into a compact, collapsible editor.
- Added drag & drop ordering with ↑ / ↓ fallback controls.
- Moved long explanations behind a small expandable help section.
- Reduced visual clutter so more of the box preview remains visible.

## v1.13.1

- Turning off **Use Breeding Plans when organizing** now fully removes breeding-family organization rules.
- When disabled, ordinary Pokémon are pooled into Final Evolutions / Storage instead of being forced into family boxes.
- Breeding choices still protect Pokémon in Clean Up; the toggle only changes organization.

## v1.13

- Removed repeated numeric prefixes from box names (`01 SPECIAL` → `SPECIAL`).
- Cleaned alternate internal family labels such as `Dratini-Alt` → `Dratini` for physical box names.
- Added persistent custom category ordering.

## v1.12.2

- Made the floating manager resizable while keeping its normal starting size as the desktop minimum.
- Improved the Organizer breeding toggle so breeding layout rules can be ignored without changing Cleaner protection.

## v1.12.1

- Fixed the Apply Organization button so move / rename counts update with every preview change.
- Added layout priorities: Balanced, Minimize moves, and Keep boxes ordered.

## v1.12

- Reworked the UI and instructions for normal players rather than QA/developer use.
- Renamed the main sections to Clean Up, Special Pokémon, Pokédex Tasks, Breeding Plans and Organize Boxes.
- Added Organizer presets: Minimal, Recommended and Functional.
- Added optional groups for trained Pokémon, breeding projects, Synchronize, Pokédex Tasks and Special Pokémon.
- Added Battle Ready grouping with EV and level rules.
- Added "keep favourites where they are" and optional automatic box renaming.
- Added clearer Clean Up and Organizer previews.

## v1.11.1

- Cleaned dedicated family box names.
- Removed workflow suffixes such as `TO-BE` / `BR` from single-family physical box names.
- Single-family boxes use only the Pokémon / evolution-family name.

## v1.11

- Added stable physical-box assignment to reduce unnecessary repeat moves.
- Rebuilding the Organizer tries to keep Pokémon that are already correctly grouped in place.
- Organizer logs how many Pokémon are already in place.

## v1.10

- Unified Clean Up, Special Pokémon, Pokédex Tasks, Breeding Plans and Organizer into one floating panel.
- Added persistent top navigation and active view.
- Added a shared draggable/minimizable shell.

## Earlier prototype work

Earlier iterations established the core safety and retention rules, including Living-Dex cleanup, Synchronize retention, breeding-family states, sex-aware Pokédex breeding tasks, Special Pokémon handling, IV protection, release safeguards, box-capacity handling and Organizer verification.
