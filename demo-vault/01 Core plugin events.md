# Core plugin events

Obsidian tells a plugin nothing useful about its core plugins being turned on and off. There is a signal — `app.internalPlugins` fires an untyped `change` — but it does not say which plugin moved, which way, or who did it, so the usual answer has been to monkey-patch Obsidian's internals and hope no other plugin in the vault is patching the same prototype. This plugin does that once, in one place, and re-publishes the result as two ordinary workspace events.

The two names are `more-events:core-plugin-enabled` and `more-events:core-plugin-disabled`. Each carries the core plugin's id, its display name, and whether Obsidian was told the user did it.

## Watch them arrive

Start listening. This registers the same two handlers a plugin would register in its own `onload`, and shows a notice for each event:

```code-button
---
caption: Start listening
---
require('/demoSetup.ts').startListeningToCorePlugins(app);
```

Manual equivalent: the two `app.workspace.on(...)` calls from your own plugin.

Now toggle a core plugin. Either open **Settings -> Core plugins** and flip **Canvas**, or press this button, which flips the same toggle:

```code-button
---
caption: Toggle the Canvas core plugin
---
await require('/demoSetup.ts').toggleCanvasCorePlugin(app);
```

A notice should say **Enabled: Canvas (canvas), by the user** or **Disabled: Canvas (canvas), by the user**. Press it again for the other one. Then stop:

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToCorePlugins();
```

Manual equivalent: unloading the component that registered the handlers, which a plugin gets for free when it is disabled.

## What the events promise

- **One event per plugin that actually changed.** The signal Obsidian sends says only that *something* moved; this plugin works out what, so a listener never diffs anything itself.
- **Past tense.** By the time a handler runs, the core plugin is already enabled or already disabled. There is no `before-*` pair and nothing to veto.
- **The payload is plain data** — `corePluginId`, `corePluginName` and `isUserInitiated` — so it crosses between plugins that share no code.
- **It says whether the user did it.** `InternalPlugin.enable(isEnabledByUser)` and `.disable(isDisabledByUser)` take that answer, use it to decide whether the core plugin's own `onUserEnable` / `onUserDisable` hook runs, and then drop it when they trigger `change`. More Events intercepts those two methods to keep it, which is the only patch it installs for core plugins.

## What `isUserInitiated` means, precisely

**That plugin's own toggle was flipped**, which is narrower than "a person caused it". The toggle in **Settings -> Core plugins** passes `true`; Obsidian passes `false` when it enables the default core plugins at startup. It is a claim rather than a proof, too: a plugin that calls `enable(true)` itself reports `true`, because that is what Obsidian itself believes. The button above passes `true`, exactly as the Settings toggle does.

A consumer that wants only the user's toggles — which is what the plugins this one was built to unburden actually patch `onUserEnable` for — can now write `if (!isUserInitiated) { return; }` and drop its patch.

## What they deliberately do not promise

- **Nothing fires for the core plugins that were already enabled when More Events loaded.** Nothing changed, so nothing is announced. The starting state comes from the API instead — see [03 For plugin developers](<./03 For plugin developers.md>).
- **Community plugins are not covered by *these two*.** They have a manager of their own and a pair of events of their own — see [02 Community plugin events](<./02 Community plugin events.md>).
