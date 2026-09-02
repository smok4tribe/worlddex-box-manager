# Worlddex Box Manager

Unofficial community Box Manager for [Worlddex](https://worlddex.de/).

It adds a floating PC-management panel that helps you clean duplicates, track breeding and Pokédex needs, and organize large boxes without changing how Worlddex itself works.

> **Current version: v1.15.1**

## What it can do

### Clean Up

Reviews your PC and suggests duplicate Pokémon that may be safe to remove.

The cleaner protects important copies, including:

- nicknamed Pokémon;
- Pokémon with 70%+ IVs;
- favourites;
- trained Pokémon;
- Pokémon holding items;
- useful Synchronize Pokémon;
- Pokémon needed for breeding plans;
- Pokémon needed to complete your Pokédex;
- rare or hard-to-replace Pokémon covered by the Special Pokémon rules.

Nothing is released automatically. You review the list and confirm before anything is removed.

### Special Pokémon

Lets you decide how many copies to keep for Pokémon that are difficult or impossible to replace through normal breeding.

Available choices include keeping the best 1, best 2, or every copy. Other safety rules still take priority.

### Pokédex Tasks

Shows Pokémon that you still need to obtain through breeding or evolution.

- **EVOLVE** keeps one suitable Pokémon for the missing evolution.
- **BREED** keeps a compatible female + male pair when possible.

Completed tasks disappear after you reload the manager.

### Breeding Plans

Lets you mark evolution families as:

- `BREED NOW`
- `TO-BE`
- `DONE`
- `NO BREED`
- `KEEP ALL`

These choices help the cleaner know which breeding stock still matters.

Breeding Plans can also be used by the Organizer, or ignored entirely if you only care about keeping the Pokémon safe and do not want breeding-specific boxes.

### Organize Boxes

Builds a preview before moving anything.

You can choose whether to keep these groups together:

- Battle Ready / trained Pokémon;
- breeding projects;
- Synchronize Pokémon;
- Pokédex Tasks;
- Special Pokémon.

You can also:

- keep favourites in their current boxes;
- turn automatic box renaming on or off;
- choose the level threshold used for Battle Ready Pokémon;
- choose how strongly the manager should preserve your current layout;
- customize the order of the sections that actually exist in your current setup.

The Organizer never releases Pokémon. It only moves them between boxes and optionally renames boxes.

## Organization styles

### Minimal

Keeps the number of separate functional groups low.

### Recommended

A balanced default for most players.

### Functional

Separates more useful groups, such as Synchronize, Pokédex Tasks and breeding projects.

You can change any option after selecting a preset.

## Layout priority

All modes use the section order you choose in **Customize box order**.

- **Balanced** keeps that order while allowing gaps when they save unnecessary moves.
- **Keep boxes ordered** follows the chosen order as tightly as possible from the earliest boxes.
- **Minimize moves** treats your chosen order as a preference and may bend it when that avoids extra moves.

The order editor only shows sections that are actually present in the current preview. If your setup only creates four groups, you only need to order those four groups.

## Interface

The manager uses one floating window. The two main actions come first, followed by setup and review sections:

`Organize Boxes | Clean Up | Breeding Plans | Pokédex Tasks | Special Pokémon`

The window can be:

- dragged around the page;
- minimized;
- enlarged by dragging the bottom-right corner;
- reloaded without losing the current section;
- configured with preferences that are remembered locally.

## How to use

The current community version is still a standalone browser script.

1. Open Worlddex and log in.
2. Open your browser's Developer Tools and select **Console**.
3. Open [`box-manager.js`](./box-manager.js) on GitHub and copy the full file.
4. Paste it into the Worlddex console and run it.
5. The Box Manager window will appear.

If your PC changes while the manager is open, use **Reload** before doing a large cleanup or organization run.

## Safety

This tool can perform permanent releases, so the Cleaner is intentionally conservative.

- Cleanup is previewed before release.
- Nothing is released automatically.
- Protected Pokémon are checked again during the release process.
- Releases happen one at a time.
- The process stops if something unexpected happens.
- If Worlddex asks the tool to slow down, it waits and continues rather than blindly sending more actions.

The **Organizer never releases Pokémon**.

Even with these safeguards, this is an unofficial community tool. Review the cleanup list before confirming permanent releases.

## Transparency

The v1.15.1 source has been reviewed specifically for unexpected network activity, credential access, remote code loading and hidden browser-side behavior.

What the script does:

- reads Worlddex data from same-origin endpoints: `/api/box`, `/api/state`, `/api/nursery`, `/js/data.js` and `/js/pc.js`;
- uses the currently logged-in Worlddex session through normal `same-origin` browser requests;
- writes only to Worlddex endpoints used for the features you explicitly run: `/api/box/release`, `/api/box/move` and `/api/pc/box-name`;
- stores Box Manager preferences locally in `localStorage`, such as breeding/special retention choices, Organizer settings, the active view and panel position.

What is not present in v1.15.1:

- no third-party URLs or external API calls;
- no analytics, tracking, ads, webhooks or telemetry;
- no cookie, password, auth-token or clipboard reads;
- no WebSocket, `sendBeacon`, `XMLHttpRequest`, `postMessage`, IndexedDB or sessionStorage usage;
- no downloaded remote payloads or obfuscated/base64-loaded code.

One implementation detail worth disclosing: the script uses `window.eval` and a `Function(...)` fallback only to access or parse data constants from Worlddex's own same-origin JavaScript files. It does not use them to fetch or execute third-party code.

The source is intentionally public and readable so anyone can inspect it or run an independent code review before using it. The SHA-256 check in GitHub Actions verifies that the published `box-manager.js` is the exact reviewed build; it is an integrity check, not a security certification.

## Status

Actively prototyped and tested against the current Worlddex PC.

Worlddex updates can require changes to this tool.

## Verification

The repository verifies `box-manager.js` with a JavaScript syntax check and an exact SHA-256 check.

Current v1.15.1 SHA-256:

`91d124c9c3129ead0b84f2d4c511ba1baefe115696fc7124ca677fe19f114dc1`
