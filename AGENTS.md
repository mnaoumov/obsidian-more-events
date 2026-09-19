# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

More Events publishes the plugin-lifecycle events Obsidian does not: two named, typed, per-plugin events on `app.workspace` for a **core plugin** being enabled or disabled. It has no user interface, no settings and no commands beyond the shared **Open demo vault** one — its entire audience is other plugins.

It exists because the alternative is every interested plugin monkey-patching one shared prototype. `obsidian-dev-utils`' own rule says a shared **global** patch belongs in a plugin rather than the library, since every consumer bundles its own copy of the library and two copies at different versions both patch. A core-plugin enable patch is exactly that shape, and Backlink Cache and Backlink Full Path each carry one today.

Prior-art gate, 2026-09-19: the 7808-entry community registry holds nothing comparable. The 17 near-matches are plugin *management* tools (Plugin Groups, Profile Manager, Device Extensions Switcher) or core-plugin *enhancers*; none publishes a signal another plugin can subscribe to.

## Current state

**Built, not released, and not listed.** The events, the API, the demo vault and the README are in place, with unit tests at 100% and a behavioral desktop integration suite that disables and re-enables the Canvas core plugin against a real Obsidian and asserts exactly one event of each kind arrives, naming that plugin. There is no GitHub remote yet, so `lint:md` reports a 404 on every `github.com/mnaoumov/obsidian-more-events` link until one exists — expected, not a defect, and the only red gate.

**`src/core-plugin-events.desktop.integration.test.ts` is the one test that can fail for the right reason.** Everything else here runs against mocks, while this plugin's whole premise is a claim about the real app. It is desktop-only deliberately: the component touches nothing platform-specific, and `plugin.android.integration.test.ts` already proves the plugin loads on Android, so an Android leg would buy an emulator run and no coverage.

## The seam, measured rather than assumed

Measured in `obsidian-versions/obsidian.asar/app.js` (unminified, 1.14.x public build) on 2026-09-19. **Re-measure before changing any of this; do not re-derive it from the typings, which do not carry the event at all.**

- **`InternalPlugin.prototype.enable(isEnabledByUser)` ends with `this.manager.trigger('change', this)`** (`app.js:171963`), and **`disable(isDisabledByUser)` ends with the same call** (`:171997`). `manager` is `app.internalPlugins`, declared `extends Events` by `obsidian-typings`. Both call sites are guarded — `enable` returns early when already enabled, `disable` runs only `if (this.enabled)` — so every trigger is a real transition.
- **It is first-party and used**: Obsidian's own **Core plugins** settings tab subscribes to it (`app.js:225346`, a 100 ms-debounced redraw).
- **The community-plugin side is much poorer.** `Plugins.didChange` is `debounce(() => trigger('changed'), 0)` (`app.js:170854`), fired from enable, disable, manifest load and uninstall alike, with **no payload at all**. Reconstructing per-plugin events there means diffing `app.plugins.enabledPlugins`. Deliberately out of scope here.

## Architecture

- `api.d.ts` (repo ROOT) — the consumer-facing declarations: the two event-name literal types, `CorePluginEventPayload`, `MoreEventsApi`, and the `Workspace.on` augmentation. Hand-written, self-contained, importing only from `obsidian`.
- `src/more-events-api.ts` — the runtime half: the two event-name constants, the registry contract and its version. It **imports the types from `../api.d.ts`** rather than re-declaring them, so there is one declaration of each.
- `src/more-events-api-impl.ts` — a thin delegate implementing `MoreEventsApi` over the component below.
- `src/core-plugin-events-component.ts` — subscribes to `app.internalPlugins.on('change')`, diffs the enabled set, and triggers the two workspace events.
- `src/plugin.ts` — wires the component and declares the API through `getPluginApis()`.

## Invariants that are easy to break

- **Nothing is patched, and nothing may start being patched.** The two richer seams — `InternalPlugin.prototype.enable` / `disable` for the `isEnabledByUser` argument, and the per-instance `onUserEnable` / `onUserDisable` — are monkey-patches on prototypes every plugin in the vault shares. Installing one here would recreate the exact problem this plugin was built to remove, in the plugin built to remove it.
- **The event names and the payload are a WIRE CONTRACT.** Consumers hardcode the strings; a rename breaks every plugin already listening and compiles perfectly here. `src/more-events-api.test.ts` asserts the literals for that reason — it is not a tautology test.
- **The payload is plain data and only ever grows.** No class instances, no types owned by this repo: it crosses between plugins that share no code.
- **`getPluginApis()` is the only accessor.** Never `publishPluginApi` by hand — the `plugin-loaded` broadcast's `apiVersions` is derived from `getPluginApis()` alone, so a hand call announces this plugin as publishing no API while the registry still works, which makes the mistake invisible from inside this repo. No instance `api` getter either.
- **The baseline snapshot is taken before subscribing.** Reversed, the first `change` would announce every already-enabled core plugin as newly enabled.
- **Diff, never trust the `change` payload.** Obsidian passes the `InternalPlugin` that moved, but a diff is correct when one `change` follows several transitions and does not depend on an undocumented argument.

## Deviations from the standard plugin architecture

The workspace convention is that all plugins share the same architecture; intentional deviations are documented here.

- **No settings, no settings tab, no `src/plugin-settings*.ts`.** There is nothing a user could sensibly configure about an event bus. The demo-vault coverage suite is registered without a config interface accordingly, which `obsidian-dev-utils` supports explicitly. Root Folder Context Menu and Fix Tab Size are the other settings-free plugins in the fleet.
- **No `src/styles/`.** The plugin renders nothing. The 0-byte-`styles.css` release trap below therefore cannot apply — there is no stylesheet at all, so no empty asset is produced.

## Traps to clear before the first release

- **No GitHub remote exists yet.** `gh repo create mnaoumov/obsidian-more-events --public --source . --remote origin --push` is the step, and it is the owner's to run: it is outward-facing.
- **The plugin id can never be renamed once the community registry lists it.** `more-events` is confirmed free as of 2026-09-19 but has not been signed off; that is the open question tracked centrally.
- **The README has no screenshot block**, which the fleet README skeleton wants between the lead paragraph and `## Demo vault`. This plugin renders nothing, so what a screenshot set can even show is a real question rather than a capture chore.
- **The demo-vault asset is `more-events-demo-vault.zip`, unversioned**, and it unzips into one `more-events-demo-vault-<version>` folder. Do not reintroduce the versioned asset name — no release produces it.
- **`scripts/version.ts` carries no template-release guard, and must stay that way.** The sample-plugin-extended template disables its own release with such a guard; a scaffold that copies it re-arms it against the new plugin and makes every release throw.
