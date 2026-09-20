# For plugin developers

An event says when something changed. It cannot say what the state is *now*, and a plugin that has only just loaded needs exactly that: it has missed every change that happened before it existed. So More Events also publishes a small API, through the `obsidian-dev-utils` plugin registry, with the reads that pair with the events — two for core plugins, two for community plugins.

Everything a consumer needs is declared in the plugin's repo-root `api.d.ts`, which imports nothing but `obsidian` — copy it, or copy the few lines you use, and you depend on this plugin without depending on anything of its author's.

## The core plugin reads

`moreEventsApi.getEnabledCorePluginIds` hands back the ids of every core plugin enabled right now, as a fresh array:

```code-button
---
caption: List the enabled core plugins
---
await require('/demoSetup.ts').showEnabledCorePlugins(app);
```

Manual equivalent: open **Settings -> Core plugins** and read the toggles.

`moreEventsApi.isCorePluginEnabled` answers the same question about one plugin, which is usually the one a caller actually wants:

```code-button
---
caption: Is Canvas enabled?
---
await require('/demoSetup.ts').showWhetherCanvasIsEnabled(app);
```

Manual equivalent: find the **Canvas** row in **Settings -> Core plugins**.

Toggle Canvas on [01 Core plugin events](<./01 Core plugin events.md>) and press either button again — the answer follows immediately, because the API reads live state rather than a cached copy.

## The community plugin reads

`moreEventsApi.getEnabledCommunityPluginIds` is the same read for community plugins, and it answers for the ones that are **loaded** rather than the ones that are ticked in Settings — see [02 Community plugin events](<./02 Community plugin events.md>) for why those two lists are not the same:

```code-button
---
caption: List the loaded community plugins
---
await require('/demoSetup.ts').showEnabledCommunityPlugins(app);
```

Manual equivalent: open **Settings -> Community plugins** and read the toggles, remembering that caveat.

`moreEventsApi.isCommunityPluginEnabled` answers for one plugin. Here it asks about the throwaway plugin the toggle button on [02 Community plugin events](<./02 Community plugin events.md>) flips, so pressing that and then this shows the answer change:

```code-button
---
caption: Is the demo community plugin loaded?
---
await require('/demoSetup.ts').showWhetherDemoCommunityPluginIsEnabled(app);
```

Manual equivalent: find that plugin's row in **Settings -> Community plugins**.

## Reaching the API

```ts
import { watchPluginApi } from 'obsidian-dev-utils/obsidian/plugin/plugin-api';

const moreEventsApiRef = watchPluginApi({
  apiVersionRange: '^1',
  app: this.app,
  component: this,
  pluginId: 'more-events'
});
```

`moreEventsApiRef.value` is `null` while More Events is not loaded and becomes non-`null` on its own when it is, so a consumer never has to care about plugin load order. The contract version is **`1.2.0`** and moves independently of the plugin's own version, which is why the range above asks for `^1` rather than naming one. It has only ever gone up by a minor: `1.1.0` added the community-plugin events to the core-plugin ones, and `1.2.0` added `isUserInitiated` to both payloads.

If you would rather not take `obsidian-dev-utils` as a dependency, the registry is a documented wire protocol you can read directly — its guide is [Cross-plugin APIs](https://mnaoumov.dev/obsidian-dev-utils/guides/cross-plugin-apis/).

## Subscribing needs no API at all

The events are ordinary workspace events, so a consumer that only wants to be told when something changes can hardcode the two names and never touch the registry:

```ts
this.registerEvent(
  this.app.workspace.on('more-events:core-plugin-enabled', ({ corePluginId, corePluginName, isUserInitiated }) => {
    if (isUserInitiated) {
      console.log(`${corePluginName} (${corePluginId}) is back, because someone turned it back on`);
    }
  })
);
```

The names and the payload are a wire contract: they will not change meaning, and the payload only ever gains members. `isUserInitiated` is the first thing that arrived that way, so a consumer written before it compiles and runs unaltered.
