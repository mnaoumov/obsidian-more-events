# Core plugin events

Obsidian tells a plugin nothing useful about its core plugins being turned on and off. There is a signal — `app.internalPlugins` fires an untyped `change` — but it does not say which plugin moved or which way, so the usual answer has been to monkey-patch Obsidian's internals and hope no other plugin in the vault is patching the same prototype. This plugin does that watching once, in one place, and re-publishes the result as two ordinary workspace events.

The two names are `more-events:core-plugin-enabled` and `more-events:core-plugin-disabled`. Each carries the core plugin's id and its display name.

## Watch them arrive

Start listening. This registers the same two handlers a plugin would register in its own `onload`, and shows a notice for each event:

```code-button
---
caption: Start listening
---
require('/demoSetup.ts').startListening(app);
```

Manual equivalent: the two `app.workspace.on(...)` calls from your own plugin.

Now toggle a core plugin. Either open **Settings -> Core plugins** and flip **Canvas**, or press this button, which flips the same toggle:

```code-button
---
caption: Toggle the Canvas core plugin
---
await require('/demoSetup.ts').toggleCanvasCorePlugin(app);
```

A notice should say **Enabled: Canvas (canvas)** or **Disabled: Canvas (canvas)**. Press it again for the other one. Then stop:

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListening();
```

Manual equivalent: unloading the component that registered the handlers, which a plugin gets for free when it is disabled.

## What the events promise

- **One event per plugin that actually changed.** The signal Obsidian sends says only that *something* moved; this plugin works out what, so a listener never diffs anything itself.
- **Past tense.** By the time a handler runs, the core plugin is already enabled or already disabled. There is no `before-*` pair and nothing to veto.
- **The payload is plain data** — `corePluginId` and `corePluginName` — so it crosses between plugins that share no code.

## What they deliberately do not promise

- **Nothing fires for the core plugins that were already enabled when More Events loaded.** Nothing changed, so nothing is announced. The starting state comes from the API instead — see [02 For plugin developers](<./02 For plugin developers.md>).
- **They do not say whether the user did it.** Obsidian's underlying signal fires identically for a toggle in Settings and for a plugin enabling something programmatically, and the only way to tell them apart is to patch the internals this plugin exists to stop everybody patching.
- **Community plugins are not covered.** `obsidian-dev-utils` already broadcasts `obsidian-dev-utils:plugin-loaded` and `obsidian-dev-utils:plugin-unloaded` for every plugin built on it.
