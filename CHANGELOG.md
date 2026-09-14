# Changelog

## v1.18.9

- Fixed Breed Planner ranking changing solely because a breeder was moved from the PC into the six-Pokémon main Team; Team location is now informational and no longer applies a ranking penalty.
- Breed Planner live inventory watching now includes `/api/state` Team data alongside Box + Nursery, so Box ↔ Team breeder moves trigger the same safe automatic refresh as hatches and Nursery changes.
- Automatic Breed Planner inventory refresh is now UI-state-safe: it will not reopen a closed Planner, switch back from another manager view, or expand a minimized panel; a deferred change is picked up when the visible Planner is restored.
- Added a permanent Team regression contract while preserving all v1.18.8 Cleaner safety invariants and breeding probability logic.

## v1.18.8

- **Safety hardening:** Cleaner now revalidates a whole-PC safety snapshot before every irreversible release request, including after 429 backoff; keeper disappearance, new inventory, or safety-relevant property changes stop the batch.
- Expanded live fingerprints to include EVs, level, friendship, favourite, Shiny/Shadow/Rainbow, nickname and held item in addition to identity/IV fields.
- Required Egg Group metadata now fails closed at the release interlock instead of silently treating unavailable metadata as an empty ruleset.
- Active cross-family Egg Group donors are protected by project demand even when the donor's own family is AUTO/DONE/NO BREED.
- Fixed Cleaner interlock reason formatting for Set-backed breeder-core reasons.
- Breeding Project auto-mode synchronization now runs before the initial Cleaner analysis, eliminating stale AUTO candidate rows after load.
- Persisted family decisions survive when a family is temporarily absent from PC because all copies are in Team/Nursery; community defaults are neutral AUTO instead of source-hardcoded personal species choices.
- Pokédex evolution tasks allocate distinct irreversible sources when alternatives exist and prefer not to consume the current Living Dex representative. Same-species donor tier now truly outranks cross-species/ Ditto quality as documented.
- Fixed unrestricted multi-step Breed Planner virtual offspring incorrectly becoming Dex 0 when no explicit breed Dex is supplied.
- Added permanent safety regression checks to CI while preserving `doneMarketHardIVPct: 90`, `protectFourPerfectIVsHard: true`, double confirmation and the no-auto-release invariant.

## v1.18.7

- Breed Planner now ranks held-item assignments by the estimated inheritance roll instead of flat Power Item bonuses, preventing redundant shared-31 Power Item recommendations when a better forced IV exists.
- Pair ranking now incorporates estimated per-Egg checkpoint odds and no longer gives the current Nursery pair a ranking lock; materially stronger newly hatched breeders can replace weaker parents immediately.
- **Recalculate best pair** now performs a full live Box + Team + Nursery reload instead of reusing the manager's old inventory snapshot.
- While Breed Planner is open, Box + Nursery inventory is checked every 4 seconds; a hatch or breeder change triggers an automatic safe refresh while preserving the saved planner target and filters.
- Cleaner release protections, the 90%+ / 4×31+ hard safeguards, and Organizer behavior are unchanged.

## v1.18.6

- Surfaced **Living Dex protection** directly in Clean Up: at least one copy of every owned Pokédex species/form remains protected, and the preview shows the protected Living Dex core count.
- Pokédex **EVOLVE** tasks now enrich live Pokémon evolution data with Worlddex's own `species.js` metadata and display known item, level, trade, sex and regional-source requirements.
- Added confirmed **Island Shard** handling for Alolan Raichu, Alolan Exeggutor and Alolan Marowak, including the verified **Alola region** requirement.
- Added confirmed **Ancient Shard** handling for Hisuian evolution branches without inventing an unverified Hisui-location requirement.
- Added Galar evolution support including **Galarica Cuff**, **Galarica Wreath**, Ice Stone branches and the client's `REGION_ONLY` source-form eligibility rules.
- Regional-only branches now mirror Worlddex's `form` / 10xxx-Dex source checks, preventing ordinary Meowth, Corsola, Yamask, Linoone and similar base forms from being falsely protected for Galar-only evolutions.
- Cleaner release safeguards, premium-IV protections, Organizer capacity/interlocks and breeding-ranking behavior are unchanged.

## v1.18.5

- The standalone **Box Manager** launcher is now draggable and remembers its screen position; click-vs-drag uses a movement threshold so repositioning does not accidentally open the panel.
- Added a separate Organizer **Box direction** preference: `32 → 1 (recommended)` remains the default, while `1 → 32` is available without duplicating Layout priority modes.
- Organizer sizing controls and preferences are persisted locally; new users keep the safe `32 boxes / 99 per box / private family from 12` factory values.
- Recommended Battle Ready defaults now use EV-trained + **Level 100+** while Synchronize grouping remains off by default.
- Cleaner and Organizer action logs now stay at a fixed compact height with scrollable history and a bounded in-DOM event count.
- Breed Planner remembers the last target / Nature / Ability / IV mask / same-species preference, but recalculates pair recommendations from current Box + Team + Nursery data whenever reopened or reloaded.
- Added a green **Recalculate best pair** action and a small “Calculated from current Box + Team + Nursery” timestamp.
- No Cleaner release-safety, Organizer interlock/pacing, or breeding-ranking rules were weakened.

## v1.18.4

- Added an on-demand **Box Manager** launcher: loading the script no longer opens the full manager or reads Box/State data until the player clicks it.
- `×` now hides the manager back to the launcher instead of making the UI disappear permanently.
- `_` is now a true compact minimize; the minimized shell keeps only the title and restore/close controls visible.
- Restoring preserves the full panel dimensions from before minimize and clamps the restored panel back inside the viewport.
- Added `window.__WORLDDEX_BOX_MANAGER_OPEN()` / `CLOSE()` hooks for future Tampermonkey, extension and embedded integrations.
- Embedded hosts can set `window.__WORLDDEX_BOX_MANAGER_EMBEDDED = true` to use their own launcher while keeping the same shell behavior.
- Cleaner and Organizer safety behavior is unchanged.

## v1.18.3

- Organizer **Balanced** and **Keep boxes ordered** now place the organized PC from **Box 32 downward** instead of starting at Box 1.
- This intentionally leaves low-numbered boxes as an intake buffer because Worlddex places new catches / received Pokémon into the first available PC space.
- The selected section order is preserved while physical placement runs in reverse (`32 → 31 → 30...`).
- Balanced still retains limited move-saving flexibility, while Keep boxes ordered strongly packs the high end; **Minimize moves** remains available when preserving current physical positions matters more than the intake buffer.
- Updated Organizer help / preview text and added physical-direction metadata to exported plans.
- Updated documentation and exact v1.18.3 verification hash.

## v1.18.2

- Reworked **DONE** family cleanup so finished breeding lines no longer keep every ordinary 70%+ IV duplicate forever.
- Added compact quality retention for completed lines while still keeping living-collection copies and existing hard protections.
- Added permanent breeder / market safeguards: **90%+ IV** is always hard-protected, and every **4×31 / 5×31 / 6×31** Pokémon is always hard-protected even when its overall IV percentage is below 90%.
- Added clear protection reasons for premium perfect-IV stock, including `FOUR_PERFECT_IVS`, `FIVE_PERFECT_IVS` and `SIX_PERFECT_IVS`.
- Organizer now treats `DONE` / `NO BREED` families with `AUTO` Box Policy as ordinary collection stock, pooling them into **FINAL EVOLUTIONS** / **STORAGE** instead of creating large dedicated family boxes. Manual `OWN BOX` still overrides this.
- Pokédex breeding tasks now search owned Pokémon across **PC + team + Nursery** instead of staying inside the target family pool.
- Pokédex breeding donor priority is now **same species → compatible shared Egg Group → Ditto fallback**.
- Cross-family Egg-Group donors and Ditto selected by an active Pokédex task are protected from Clean Up while the task is needed.
- Improved Pokédex Task text so cross-species Egg Group and Ditto pairings are shown explicitly instead of misleading “missing parent in this Dex-parent pool” messages.
- Updated player-facing cleanup explanations, Safety / Transparency documentation and exact v1.18.2 verification hash.

## v1.17.1

- Added **Breed Planner**, which starts from the Pokémon / Nature / Ability / IV target you want and searches the Pokémon you actually own for useful breeding routes.
- Breed Planner scans Pokémon in the PC, team and Nursery; Nursery-held Pokémon remain visible even though Worlddex removes them from `/api/box` while they are breeding.
- Added Physical 5×31, Special 5×31 and 6×31 target presets plus custom 31-IV selection.
- Added **Only same species** to constrain the full path to faster same-species pairings.
- Added recommended Destiny Knot, Everstone and Power Item assignments.
- Added overall **IV %** beside exact IV spreads to make suggested breeders easier to find in large boxes.
- Added compact Top 3 pairing results with expandable details and cleaner handling of long planner information.
- Added **Full Breeding Path** planning with explicit **Desired Output** conditions for intermediate offspring and recalculation after new eggs hatch.
- Added an **Estimated roll** (`X% · ≈ 1 in N`) for the requested inheritance result. This is intentionally presented as an estimate until Worlddex's exact full Nursery formula is confirmed.
- Same-species pairs receive a strong Egg-speed preference; different-species pairs are clearly flagged as slower.
- Renamed **Breeding Plans** to **Breeding Projects** and connected saved planner targets to project state.
- Saving a planner result normally creates a `TO-BE` project; matching parents detected in Nursery can synchronize it to `BREED NOW`.
- Added **Remove project** without moving, releasing or otherwise modifying Pokémon.
- Saved planner breeder IDs can protect required donors from Clean Up, including donors belonging to another evolution family.
- Cleaned internal alternate labels such as `Dratini-Alt` from player-facing Breed Planner text.
- Improved the floating window / navigation sizing and made planner cards expandable so important information remains readable without maximizing the panel.
- Updated Safety / Transparency documentation and exact v1.17.1 verification hash.

## v1.15.1

- Reordered the top navigation around how the manager is actually used.
- **Organize Boxes** and **Clean Up** now appear first as the two main actions.
- **Breeding Plans**, **Pokédex Tasks**, and **Special Pokémon** are grouped after them as setup / review sections.
- Added a subtle visual divider between actions and configuration sections.
- Gave the two primary action buttons slightly stronger visual emphasis without changing their behavior.
- Responsive layouts hide the divider when the navigation wraps on narrow screens.

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
