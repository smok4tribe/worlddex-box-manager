# Worlddex Box Manager

Unofficial community Box Manager for [Worlddex](https://worlddex.de/).

It adds an on-demand floating PC-management panel that helps you organize large boxes, clean duplicates, plan breeding projects and track Pokédex needs without changing how Worlddex itself works.

> **Current version: v1.19.0**

## What it can do

### Organize Boxes

Builds a preview before moving anything.

Organizer v1.19 is structured around three decisions: **what goes where**, **breeding families**, and **box layout**.

- **Battle Ready** is strict by default: Level 100 **and** a complete competitive EV spread (508+ total EVs). Enabled Battle Ready checks are cumulative rather than OR conditions.
- **Favourites** are Cleaner protection, not an Organizer destination. They can still become Battle Ready; an independent option can pin favourites in their current boxes.
- **Rare / unbreedable**, Pokédex Tasks and Synchronize Pokémon can each be grouped separately.
- **BREED NOW / TO-BE** projects can receive family boxes. `AUTO`, `DONE` and `NO BREED` families flow into normal collection pools unless the family is explicitly set to `OWN BOX`.
- Generic fallback storage is presented as **COLLECTION** and cleanup-candidate boxes are named **CLEANUP REVIEW**.

Physical layout separates **intake reserve** from **fill direction**. Reserve the first N boxes for incoming catches / received Pokémon, then choose **Low → High** or **High → Low** for the remaining organized range. With the default 2-box reserve, that means either Box 3 → 32 or Box 32 → 3. In **Balanced** and **Keep boxes ordered**, the first item in **Edit box order** maps to the visible start side of that traversal; **Minimize moves** treats direction and section order as preferences while still excluding the reserved intake boxes.

The Organizer never releases Pokémon. It only moves them between boxes and optionally renames boxes. Final planned boxes stay under the conservative 99-Pokémon cap; the move scheduler may use one verified backend slot temporarily to break a full-box swap cycle without changing the final cap.

### Clean Up

Reviews your PC and suggests duplicate Pokémon that may be safe to remove.

The cleaner protects important copies, including:

- at least one **Living Dex** copy of every owned Pokédex species/form;
- nicknamed Pokémon;
- favourites;
- trained Pokémon;
- Pokémon holding items;
- useful Synchronize Pokémon;
- Pokémon needed for breeding projects;
- Pokémon needed to complete your Pokédex;
- rare or hard-to-replace Pokémon covered by the Special Pokémon rules;
- premium breeder / market stock.

High-IV protection is intentionally different for completed breeding families:

- outside a `DONE` family, the normal 70%+ IV protection still applies;
- inside a `DONE` family, redundant ordinary 70–89.99% copies may be compacted after living-collection and quality-retention rules are applied;
- **90%+ IV is always hard-protected**;
- **every 4×31, 5×31 or 6×31 Pokémon is always hard-protected**, even below 90% overall IV.

`DONE` also keeps a small useful quality collection of strong final evolutions instead of blindly preserving every merely-good duplicate.

Nothing is released automatically. You review the list and confirm before anything is removed.

Before every irreversible release request, v1.19.0 revalidates the full PC safety snapshot. If a keeper disappears, a new Pokémon appears, or a safety-relevant property such as favourite, nickname, held item, EVs, friendship or rare status changes, the batch stops and requires a fresh review. Required breeding metadata also fails closed instead of silently weakening cleanup protection.

### Breed Planner

Starts from the Pokémon you actually want to breed and searches the Pokémon you own for useful breeding routes.

Choose:

- the desired Pokémon;
- desired Nature;
- desired Ability;
- the IVs you want at 31, with Physical 5×31, Special 5×31 and 6×31 presets;
- **Only same species** when you want to prioritize faster same-species breeding.

The planner scans Pokémon from your PC, team and Nursery. Pokémon currently in the Nursery remain visible to the planner even though Worlddex no longer returns them through `/api/box`.

For suggested parents it shows useful identifying information such as:

- species and gender;
- Pokémon ID;
- exact IV spread;
- overall IV percentage;
- Nature and Ability;
- current location;
- recommended held items.

The planner can show the best immediate pair and a multi-step breeding path. Each step includes a **Desired Output** so you know exactly what kind of offspring is worth keeping before recalculating the next step.

It also displays an **Estimated roll** such as `≈ 1 in 300` for the requested IV / Nature result. This is an estimate based on the inheritance model currently used by the planner; it is not yet presented as an exact Worlddex server probability until the game's full Nursery formula is confirmed.

Same-species pairings are preferred for faster Egg production. Different-species pairings can still be suggested when their breeding value is strong enough, unless **Only same species** is enabled.

The last planner target / filters are remembered locally. While Breed Planner is open it watches Box + Team + Nursery inventory changes and refreshes from live data when a hatch, team swap or breeder change appears. A breeder has the same ranking value whether it currently lives in the PC or in the six-Pokémon main team; location is informational only. Automatic inventory refresh only runs while the Planner is the active visible view, so closing, switching away from, or minimizing it will never make the panel reopen or expand on its own. **Recalculate best pair** now performs a full live Box + Team + Nursery reload instead of re-ranking a stale snapshot. Pair and held-item ranking use the estimated inheritance roll so a materially better new offspring can replace an older breeder even when both pairs cover the same theoretical target IVs.

A result can be saved directly as a Breeding Project.

### Breeding Projects

Tracks evolution families you are breeding or plan to breed.

Available states include:

- `BREED NOW`
- `TO-BE`
- `DONE`
- `NO BREED`
- `KEEP ALL`

Saving a Breed Planner result creates / updates the corresponding project. A planned project is normally `TO-BE`; when its selected pair is detected in the Nursery it can be synchronized to `BREED NOW`.

Saved projects remember the target and planner setup, can be reopened in Breed Planner, and can be removed without moving or releasing any Pokémon.

These choices help the Cleaner know which breeding stock still matters. Breeding Projects can also be used by the Organizer, or ignored entirely if you only care about keeping the Pokémon safe and do not want breeding-specific boxes.

### Pokédex Tasks

Shows Pokémon that you still need to obtain through breeding or evolution.

- **EVOLVE** keeps one suitable Pokémon for the missing evolution and shows known level, item, trade, sex and regional-form requirements.
- Regional evolution data is read from Worlddex itself, including confirmed **Island Shard** Alolan branches, **Ancient Shard** Hisuian branches, Galarica Cuff/Wreath, and Galar-only source-form branches.
- Island Shard tasks explicitly show the confirmed **Alola region** requirement; Ancient Shard is identified as a Hisuian evolution item without inventing an unconfirmed Hisui-location requirement.
- **BREED** searches owned Pokémon across the PC, team and Nursery and chooses a legal donor with this practical priority: **same species → compatible shared Egg Group → Ditto fallback**.
- Cross-family Egg-Group donors selected by an active Pokédex task are protected from Clean Up while the task is still needed.

Completed tasks disappear after you reload the manager.

### Special Pokémon

Lets you decide how many copies to keep for Pokémon that are difficult or impossible to replace through normal breeding.

Available choices include keeping the best 1, best 2, or every copy. Other safety rules still take priority.

## Organization styles

### Minimal

Keeps the number of separate functional groups low.

### Recommended

A balanced default for most players.

### Functional

Separates more useful groups, such as Synchronize, Pokédex Tasks and breeding projects.

You can change any option after selecting a preset.

## Layout priority and intake reserve

The PC currently has **32 boxes**. Organizer v1.19 reserves the low-numbered intake area first, then applies the selected **Fill direction** only to the remaining physical range. With 2 reserved boxes, **Low → High** traverses Box 3 → 32 and **High → Low** traverses Box 32 → 3.

- **Balanced** preserves section order along the selected direction while allowing a gap when it meaningfully reduces unnecessary moves.
- **Keep boxes ordered** follows the chosen physical traversal as tightly as possible.
- **Minimize moves** prioritizes leaving Pokémon where they already are. The selected direction becomes a preference rather than a strict packing rule, but reserved intake boxes are still excluded as final Organizer destinations.

Worlddex normally places newly caught / received Pokémon into the first available PC space. **Reserve first boxes for catches** therefore remains independent from direction: Box 1–2 can stay as a predictable landing zone even while the organized collection fills from Box 32 downward.

The physical-map preview follows the selected direction and still marks intake boxes, planned destinations and unused boxes. **Edit box order** expands a compact wrapped editor inline beneath the persistent traversal summary (for example `Box 32 → Box 3`), so reordering does not cover the physical map and the first category is not confused with a generic physical “1”. The Organizer content area uses one continuous vertical scroll, so configuration, physical map, summary, preview table and log remain reachable without resizing the window.

Large applies remain sequential and rate-limit aware. The scheduler updates its local occupancy after each successful move and performs a periodic live `/api/box` sanity refresh every 50 successful moves rather than every 10. This does **not** remove safety gates: apply still starts from a live PC validation, `BOX_FULL` forces an immediate server-truth refresh/replan step, HTTP 429 uses adaptive backoff, and the completed move batch is verified against a fresh live box read before box renames finish.

## Interface

The manager uses one floating window. The main actions come first, followed by project / review sections:

`Organize Boxes | Clean Up | Breed Planner | Breeding Projects | Pokédex Tasks | Special Pokémon`

The window can be:

- opened on demand from a small **Box Manager** launcher;
- moved by dragging either the launcher or the full panel, with both positions remembered locally;
- truly minimized to a compact title bar;
- hidden with `×`, which returns it to the small launcher;
- enlarged by dragging the bottom-right corner;
- reloaded without losing the current section;
- configured with preferences that are remembered locally.

Breed Planner uses compact / expandable result cards so parent information, Desired Outputs and path details remain readable without requiring the window to stay maximized.

## How to use

The current community version is still a standalone browser script.

1. Open Worlddex and log in.
2. Open your browser's Developer Tools and select **Console**.
3. Open [`box-manager.js`](./box-manager.js) on GitHub and copy the full file.
4. Paste it into the Worlddex console and run it.
5. A small **Box Manager** button appears; click it when you want to load the manager.
5. The Box Manager window will appear.

If your PC changes while the manager is open, use **Reload** before doing a large cleanup, organization run or breeding-path recalculation.

## Safety

This tool can perform permanent releases, so the Cleaner is intentionally conservative.

- Cleanup is previewed before release.
- Nothing is released automatically.
- Protected Pokémon are checked again during the release process.
- Releases happen one at a time.
- The process stops if something unexpected happens.
- If Worlddex asks the tool to slow down, it waits and continues rather than blindly sending more actions.

The **Organizer never releases Pokémon**.

The **Breed Planner does not breed, move or release Pokémon**. Saved breeding projects are planner state stored locally; you still perform the actual Nursery actions yourself.

Even with these safeguards, this is an unofficial community tool. Review the cleanup list before confirming permanent releases.

## Transparency

The current v1.19.0 source remains same-origin-only and has been reviewed for unexpected network activity, credential access, remote code loading and hidden browser-side behavior.

What the script does:

- reads Worlddex data from same-origin endpoints: `/api/box`, `/api/state`, `/api/nursery`, `/js/data.js`, `/js/pc.js`, `/js/species.js`, `/js/battle-core.js` and `/js/items.js`;
- uses the currently logged-in Worlddex session through normal `same-origin` browser requests;
- writes only to Worlddex endpoints used for the features you explicitly run: `/api/box/release`, `/api/box/move` and `/api/pc/box-name`;
- stores Box Manager preferences and project state locally in `localStorage`, including breeding / special retention choices, Breed Planner projects, Organizer settings, the active view and panel position.

What is not present in v1.19.0:

- no third-party URLs or external API calls;
- no analytics, tracking, ads, webhooks or telemetry;
- no cookie, password, auth-token or clipboard reads;
- no WebSocket, `sendBeacon`, `XMLHttpRequest`, `postMessage`, IndexedDB or sessionStorage usage;
- no downloaded remote payloads or obfuscated / base64-loaded code.

One implementation detail worth disclosing: the script uses `window.eval` and a `Function(...)` fallback only to access or parse data constants from Worlddex's own same-origin JavaScript files. It does not use them to fetch or execute third-party code.

The source is intentionally public and readable so anyone can inspect it or run an independent code review before using it. GitHub Actions syntax-checks the published `box-manager.js` and verifies release-safety / feature markers; this is an integrity sanity check, not a security certification.

## Status

Actively prototyped and tested against the current Worlddex PC and Nursery.

Worlddex updates can require changes to this tool.

## Verification

The repository verifies `box-manager.js` with a JavaScript syntax check plus release-safety and current-feature marker checks.
