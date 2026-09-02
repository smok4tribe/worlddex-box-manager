# Worlddex Box Manager

Unofficial community Box Manager for [Worlddex](https://worlddex.de/).

The project started as a QA / convenience tool for managing large PC boxes and is currently a standalone client-side prototype. It uses Worlddex's existing frontend data and API endpoints; it is **not integrated into the official game**.

## Current version

**v1.11.1**

## Features

- **Cleaner**
  - Living-Dex retention
  - Hard protection for nicknamed Pokémon
  - Hard protection for Pokémon with IVs >= 70%
  - Protection for favourites, held items, EV-trained Pokémon and other configured safety cases
  - Reviewed, sequential release flow with local safety interlocks and rate-limit handling

- **Synchronize management**
  - Keeps useful Synchronize Pokémon by nature
  - Redundant copies can be cleaned when they are not otherwise protected

- **Breeding setup**
  - `BREED NOW`
  - `TO-BE`
  - `DONE`
  - `NO BREED`
  - `KEEP ALL`
  - Per-family retention and box policies

- **Dex tasks**
  - `EVOLVE`: preserves one eligible source Pokémon
  - `BREED`: preserves a compatible female + male pair when possible
  - Sex-restricted evolution requirements are respected when exposed by the game data

- **Specials / no-eggs**
  - Explicit per-species retention controls
  - `AUTO`, `KEEP BEST 1`, `KEEP BEST 2`, `KEEP ALL`
  - Conservative defaults for risky non-breedable species

- **Organizer**
  - Functional categories such as Syncro, Dex Tasks, Specials, breeding projects, finals and storage
  - Dedicated family boxes when appropriate
  - Stable max-overlap placement to minimize repeat moves
  - 99/100 safe-capacity planning
  - `box_full` recovery
  - HTTP 429 backoff / retry
  - Box renaming
  - Single-family boxes use clean Pokémon/family names only

- **UI**
  - One floating draggable panel
  - Persistent navigation:
    `Cleaner | Specials | Dex tasks | Breeding setup | Organizer`
  - Minimize / restore
  - Position persistence
  - Reload keeps the active section

## How to use

At the moment this is still the standalone prototype.

1. Open Worlddex and log in.
2. Open the browser DevTools Console.
3. Copy the full contents of [`box-manager.js`](./box-manager.js).
4. Paste and run it.
5. The Box Manager overlay will appear.

The tool operates on the currently logged-in Worlddex session.

## Safety

The cleaner intentionally uses multiple local safeguards before destructive release operations.

Important protections include:

- release candidates are recalculated from live box data;
- protected cores are checked before the batch;
- the protection interlock is checked again immediately before every release request;
- releases are sequential;
- unexpected responses stop the batch;
- HTTP 429 responses pause and retry instead of blindly continuing.

The Organizer **does not release Pokémon**. It only moves Pokémon between boxes and renames boxes.

Even with these safeguards, this is an unofficial prototype. Review Cleaner candidates before releasing anything.

## Organizer design

The Organizer does not simply assign logical groups to Box 1, Box 2, Box 3, etc.

It uses a stable max-overlap assignment so that, when the PC is already mostly organized, logical groups are mapped back to the physical boxes that already contain the largest number of their Pokémon. This avoids re-moving hundreds of Pokémon after a small box change.

Worlddex's current move endpoint reports a maximum capacity of 100 Pokémon per box. The Organizer deliberately plans at 99 to retain one temporary safety slot.

## Native integration

The current source can also be used as a reference implementation for a future native Worlddex PC feature.

For native integration, the main cleanup would be:

- remove console/IIFE bootstrap code;
- move the UI into the game's normal frontend structure;
- replace injected CSS with native styles/components;
- use game modules directly instead of compatibility fallbacks;
- optionally replace sequential Organizer moves with a server-side batch operation.

Most Box Manager rules and workflow logic are already contained in `box-manager.js`.

## Status

Actively prototyped and tested against the current Worlddex frontend/API.

Breaking changes in Worlddex can require updates to this tool.
