# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

More Events publishes the plugin-lifecycle events Obsidian does not: four named, typed, per-plugin events on `app.workspace` — one pair for a **core plugin** being enabled or disabled, one pair for a **community plugin**. It has no user interface, no settings and no commands beyond the shared **Open demo vault** one — its entire audience is other plugins.

It exists because the alternative is every interested plugin monkey-patching one shared prototype. `obsidian-dev-utils`' own rule says a shared **global** patch belongs in a plugin rather than the library, since every consumer bundles its own copy of the library and two copies at different versions both patch. A core-plugin enable patch is exactly that shape, and Backlink Cache and Backlink Full Path each carry one today.

Prior-art gate, 2026-09-19: the 7808-entry community registry holds nothing comparable. The 17 near-matches are plugin *management* tools (Plugin Groups, Profile Manager, Device Extensions Switcher) or core-plugin *enhancers*; none publishes a signal another plugin can subscribe to.

## Current state

**Built, not released, and not listed.** Both pairs of events, the API, the demo vault, the README and its four screenshots are in place, with unit tests at 100% and two behavioral desktop integration suites against a real Obsidian. There is no GitHub remote yet, so `lint:md` reports a 404 on every `github.com/mnaoumov/obsidian-more-events` link until one exists — now including the four screenshot links the README's block adds — expected, not a defect, and the only red gate.

**The two `*.desktop.integration.test.ts` suites are the tests that can fail for the right reason.** Everything else here runs against mocks, while this plugin's whole premise is a claim about the real app. `core-plugin-events` disables and re-enables the Canvas core plugin; `community-plugin-events` writes a two-line throwaway plugin into the temporary vault, calls `loadManifests()`, then enables and disables it. Both assert exactly one event of each kind, naming that plugin.

The community suite brings its own plugin rather than toggling one that is already there, and that is not fussiness: toggling More Events itself would unload the component under test, and toggling whatever else the run installed would make the suite depend on the harness's contents. Both suites are desktop-only deliberately: the components touch nothing platform-specific, and `plugin.android.integration.test.ts` already proves the plugin loads on Android, so an Android leg would buy an emulator run and no coverage. `screenshots.android-capture.integration.test.ts` is not a counter-example: it takes pictures for the listing and asserts nothing about the events that the desktop pair does not already assert.

## The seam, measured rather than assumed

Measured in `obsidian-versions/obsidian.asar/app.js` (unminified, 1.14.x public build) on 2026-09-19. **Re-measure before changing any of this; do not re-derive it from the typings, which do not carry the event at all.**

- **`InternalPlugin.prototype.enable(isEnabledByUser)` ends with `this.manager.trigger('change', this)`** (`app.js:171963`), and **`disable(isDisabledByUser)` ends with the same call** (`:171997`). `manager` is `app.internalPlugins`, declared `extends Events` by `obsidian-typings`. Both call sites are guarded — `enable` returns early when already enabled, `disable` runs only `if (this.enabled)` — so every trigger is a real transition.
- **It is first-party and used**: Obsidian's own **Core plugins** settings tab subscribes to it (`app.js:225346`, a 100 ms-debounced redraw).
- **The community-plugin signal is much poorer.** `Plugins.didChange` is `debounce(() => trigger('changed'), 0)` (`app.js:170854`), fired from `enablePlugin`, `disablePlugin`, `uninstallPlugin`, `setEnable`, the manifest load and the update check alike (`:170938`, `:171322`, `:171341`, `:171421`, `:171524`, `:171703`, `:171815`), with **no payload at all** and a past-tense name. The diff is therefore the whole answer, and the `0` ms debounce makes it load-bearing rather than defensive.
- **`app.plugins.enabledPlugins` is NOT the set to diff, and the temptation to use it is the trap here.** It is the persisted config, and `obsidian-typings` says so in its own remark: the ids *"aren't guaranteed to be either active (in `app.plugins.plugins`) or installed (in `app.plugins.manifests`)"*. `setEnable(false)` — the master **Community plugins** switch — `disablePlugin`s every entry of `app.plugins.plugins` and **never touches `enabledPlugins`** (`:171483`), so a diff of the set announces nothing while every plugin in the vault is unloaded. `app.plugins.plugins` is the set that moves, and it is also what `getPlugin()` answers from, which is why the events mean **loaded / unloaded**.

## Architecture

- `api.d.ts` (repo ROOT) — the consumer-facing declarations: the four event-name literal types, the two payloads, `MoreEventsApi`, and the two `Workspace.on` augmentations. Hand-written, self-contained, importing only from `obsidian`.
- `src/more-events-api.ts` — the runtime half: the four event-name constants, the registry contract and its version. It **imports the types from `../api.d.ts`** rather than re-declaring them, so there is one declaration of each.
- `src/more-events-api-impl.ts` — a thin delegate implementing `MoreEventsApi` over the two components below.
- `src/plugin-events-component-base.ts` — the snapshot-then-diff machinery both event sources share: take the baseline on load, subscribe, and on each signal diff the last known id-to-name map against a fresh read. The subclasses supply only what actually differs.
- `src/core-plugin-events-component.ts` — reads `app.internalPlugins.plugins` (`enabled` flag per entry), subscribes to its `change`.
- `src/community-plugin-events-component.ts` — reads `app.plugins.plugins` (entries come and go), subscribes to its `changed`.
- `src/plugin.ts` — wires both components and declares the API through `getPluginApis()`.

## Invariants that are easy to break

- **Nothing is patched, and nothing may start being patched.** The two richer seams — `InternalPlugin.prototype.enable` / `disable` for the `isEnabledByUser` argument, and the per-instance `onUserEnable` / `onUserDisable` — are monkey-patches on prototypes every plugin in the vault shares. Installing one here would recreate the exact problem this plugin was built to remove, in the plugin built to remove it.
- **The event names and the payloads are a WIRE CONTRACT.** Consumers hardcode the strings; a rename breaks every plugin already listening and compiles perfectly here. `src/more-events-api.test.ts` asserts the literals for that reason — it is not a tautology test. `PLUGIN_API_VERSION` moves with the contract and not with the plugin: the community pair was additive, so it went to `1.1.0` and a consumer asking `^1` was undisturbed.
- **The payloads are plain data and only ever grow.** No class instances, no types owned by this repo: they cross between plugins that share no code. The two pairs carry deliberately DIFFERENT key names (`corePluginId` / `communityPluginId`) rather than a shared `pluginId` plus a kind flag, because a consumer almost always wants exactly one of the two and a flag it can forget to check is a bug waiting to happen.
- **`getPluginApis()` is the only accessor.** Never `publishPluginApi` by hand — the `plugin-loaded` broadcast's `apiVersions` is derived from `getPluginApis()` alone, so a hand call announces this plugin as publishing no API while the registry still works, which makes the mistake invisible from inside this repo. No instance `api` getter either.
- **The baseline snapshot is taken before subscribing** — in `PluginEventsComponentBase.onload`, for both halves. Reversed, the first signal would announce every already-enabled plugin as newly enabled.
- **Diff, never trust the signal's payload.** The core one passes the `InternalPlugin` that moved and the community one passes nothing at all, but a diff is correct when one signal follows several transitions and does not depend on an undocumented argument.
- **Disabled events are announced before enabled ones**, in that same base class. An update unloads a plugin and loads the new build, and both halves can land in one signal; a consumer that re-reads on the enabled event must not then be told the plugin left.
- **No `isBuiltOnObsidianDevUtils`-style flag in the community payload, and this was decided rather than overlooked.** A fleet plugin raises both this pair and `obsidian-dev-utils`' own `plugin-loaded` / `-unloaded`; detecting which plugins those are from outside is a guess, and the payload is additive-only so a flag can never be taken back. The overlap is stated in the README and in the demo vault instead.

## Deviations from the standard plugin architecture

The workspace convention is that all plugins share the same architecture; intentional deviations are documented here.

- **No settings, no settings tab, no `src/plugin-settings*.ts`.** There is nothing a user could sensibly configure about an event bus. The demo-vault coverage suite is registered without a config interface accordingly, which `obsidian-dev-utils` supports explicitly. Root Folder Context Menu and Fix Tab Size are the other settings-free plugins in the fleet.
- **No `src/styles/`.** The plugin renders nothing. The 0-byte-`styles.css` release trap below therefore cannot apply — there is no stylesheet at all, so no empty asset is produced.

## Screenshots, and what one can honestly show for a plugin with no UI

Four frames — `images/screenshots/screenshot-desktop-{1,2}.png` at 1200x800 and `screenshot-mobile-{1,2}.png` at 900x1600 — captured by `src/screenshots.desktop-capture.integration.test.ts` and `src/screenshots.android-capture.integration.test.ts`, and written **only** by `npm run capture:screenshots`. Their `*-capture.` infix matches none of the standard project globs on purpose, so `npm run test:integration` never rewrites the PNGs and never dirties the tree mid-release.

**The decision, 2026-09-19.** This plugin has no settings tab, no modal, no view, no ribbon icon and no command but the shared **Open demo vault** one, so there is no screen *of the plugin* to photograph. The frames are of **Settings -> Core plugins** and **Settings -> Community plugins** — the screen where the change actually happens — with a notice on it raised by a listener the suite registers. Cause and effect are then in one picture, the picture is a screen a reader can reach, and nothing in it claims a UI this plugin does not have. Three alternatives were refused: shipping no block at all, because a real reachable screen does exist; a DevTools console showing the events arrive, because `captureObsidianScreenshot` photographs the Obsidian window and DevTools is a separate one; and a screenshot of source, which is not a screenshot of the plugin and which the README already carries as copyable text.

**Not the demo vault**, though its notes do the same thing with buttons. The capture suites open the plain temporary vault the harness stages, as every other plugin of mine does; pointing this one at `demo-vault-global-setup.ts` would put CodeScript Toolkit in the capture path to buy background prose the Settings tab already supplies.

**The mobile pair is byte-reproducible; the desktop pair is not, and the reason is measured.** Two emulator runs produced identical mobile PNGs. Three desktop runs produced three different files, differing in exactly 349 pixels at `x:153-197 y:774-783` — the temporary vault's name, whose six-character suffix is random per run, showing through the caption band, which is drawn at 94 % opacity and therefore attenuates what is under it rather than hiding it. Invisible to a reader, but it means `npm run capture:screenshots` always leaves a dirty tree on the desktop leg, so a diff there proves nothing on its own.

**`labelScreenshot` CLIPS a caption, it does not wrap or shrink it** — and it clips at both ends, so an overlong one reads as a sentence fragment with no hint that anything was lost. The first captured pair shipped exactly that. The band's font is `width * 0.034`, which is 41px on the desktop frame and 31px on the mobile one, leaving room for roughly 58 and 55 characters respectively; the four shipped captions run 51-55. Re-measure rather than counting characters if one is reworded — em dashes and capitals are wider than the average that ratio implies.

## Traps to clear before the first release

- **No GitHub remote exists yet.** `gh repo create mnaoumov/obsidian-more-events --public --source . --remote origin --push` is the step, and it is the owner's to run: it is outward-facing.
- **The plugin id can never be renamed once the community registry lists it.** `more-events` is confirmed free as of 2026-09-19 but has not been signed off; that is the open question tracked centrally.
- **The demo-vault asset is `more-events-demo-vault.zip`, unversioned**, and it unzips into one `more-events-demo-vault-<version>` folder. Do not reintroduce the versioned asset name — no release produces it.
- **`scripts/version.ts` carries no template-release guard, and must stay that way.** The sample-plugin-extended template disables its own release with such a guard; a scaffold that copies it re-arms it against the new plugin and makes every release throw.
