# Community plugin events

Obsidian tells a plugin even less about community plugins than it does about core ones. There is a signal — `app.plugins` fires a `changed` event — but it carries **no payload at all**: not the plugin, not its id, not the direction, not who did it, and it is fired from enabling, disabling, the manifest load and the update check alike. This plugin watches that signal once, in one place, works out what actually moved, and re-publishes the result as two ordinary workspace events.

The two names are `more-events:community-plugin-enabled` and `more-events:community-plugin-disabled`. Each carries the plugin's id, its display name, and whether Obsidian was told the user did it — exactly as the [core plugin events](<./01 Core plugin events.md>) do.

## Watch them arrive

Start listening. This registers the same two handlers a plugin would register in its own `onload`, and shows a notice for each event:

```code-button
---
caption: Start listening
---
require('/demoSetup.ts').startListeningToCommunityPlugins(app);
```

Manual equivalent: the two `app.workspace.on(...)` calls from your own plugin.

Now toggle a community plugin. You can flip any of them in **Settings -> Community plugins**, but this vault has nothing spare to flip — More Events publishes the events and CodeScript Toolkit runs these buttons — so this button brings its own. On first press it writes a do-nothing plugin into the vault and loads it; on the next press it unloads it again:

```code-button
---
caption: Toggle the demo community plugin
---
await require('/demoSetup.ts').toggleDemoCommunityPlugin(app);
```

A notice should say **Enabled: More Events Demo Plugin (more-events-demo-plugin), programmatically** or **Disabled: ..., programmatically**. It says *programmatically* rather than *by the user* on purpose — see below. Press it again for the other one. Then stop:

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToCommunityPlugins();
```

Nothing above is written to your configuration: the toggle loads and unloads the plugin without ticking it in `community-plugins.json`, so the vault is left as it was found.

## What "enabled" means here, precisely

**Loaded.** The event fires when a plugin's code starts running, and its partner when it stops. That is deliberately not the same as the plugin being ticked in **Settings -> Community plugins**: Obsidian keeps that list separately, as `app.plugins.enabledPlugins`, and the two disagree in cases that matter.

- Switching **Community plugins** off wholesale unloads every plugin in the vault and leaves that list untouched. You get a disabled event for each one, which is the truth a listener needs — its dependency is gone.
- Starting Obsidian in restricted mode leaves the list full and nothing loaded.

So these events answer the only question a consumer really asks: *is that plugin's code running right now?*

## What `isUserInitiated` means, precisely

**That plugin's own toggle was flipped**, which is narrower than "a person caused it". `Plugins.enablePlugin(id, isUserEnabled)` and `disablePlugin(id, isUserDisabled)` take that answer and forward it to `loadPlugin` / `unloadPlugin`, which use it to decide whether the plugin's own `onUserEnable()` runs and what its `_userDisabled` becomes — and then the `changed` signal, which carries nothing, drops it. More Events intercepts `enablePlugin` and `disablePlugin` to keep it.

The toggle in **Settings -> Community plugins** reaches them through `enablePluginAndSave` / `disablePluginAndSave`, which pass `true`. Two things a person does report `false`, because Obsidian passes no flag down those paths: switching the master **Community plugins** switch off, and starting the vault in restricted mode. **And so does the button above**, which calls the plain `enablePlugin` / `disablePlugin` precisely so it never writes to your configuration — which makes it a live demonstration of the difference rather than an awkwardness.

## What the events promise

- **One event per plugin that actually moved.** The signal Obsidian sends says only that *something* changed; this plugin works out what, so a listener never diffs anything itself.
- **Past tense.** By the time a handler runs, the plugin is already loaded or already gone.
- **The payload is plain data** — `communityPluginId`, `communityPluginName` and `isUserInitiated` — so it crosses between plugins that share no code.

## What they deliberately do not promise

- **Nothing fires for the community plugins that were already loaded when More Events loaded.** Nothing changed, so nothing is announced. The starting state comes from the API instead — see [03 For plugin developers](<./03 For plugin developers.md>).
- **They arrive in batches.** Obsidian debounces its signal, so several plugins moving at once produce one signal and therefore several events back to back. That is why the plugin diffs rather than trusting the signal to mean one change.
- **They overlap with `obsidian-dev-utils`.** That library broadcasts `obsidian-dev-utils:plugin-loaded` and `obsidian-dev-utils:plugin-unloaded` — but only for plugins built on it, which is a small and particular set. These two events cover **every** community plugin in the vault, including the ones that have never heard of that library. A plugin built on it will raise both, so subscribe to one of the two and not to both.
