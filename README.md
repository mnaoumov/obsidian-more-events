# More Events

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov) [![GitHub release](https://img.shields.io/github/v/release/mnaoumov/obsidian-more-events)](https://github.com/mnaoumov/obsidian-more-events/releases) [![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/obsidian-more-events/total)](https://github.com/mnaoumov/obsidian-more-events/releases) [![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/mnaoumov/obsidian-more-events)

A plugin that reacts to one of [Obsidian](https://obsidian.md/)'s core plugins — Backlinks, Canvas, Graph — has to know when the user turns it off or on again. Obsidian does emit something: `app.internalPlugins` fires an untyped `change` whenever any core plugin's state moves. But it does not say **which** plugin moved, or in which direction, and the object it hangs off is an internal one with no published types. So the usual answer is to monkey-patch `InternalPlugin.prototype.enable` — and when two plugins in the same vault do that, there are two patches on one prototype.

This plugin does the patching for nobody, by not patching at all. It watches the signal Obsidian already sends, works out what actually changed, and re-publishes it on `app.workspace` as two named, typed, per-plugin events any plugin can listen for with no dependency beyond `obsidian` itself.

**It has no user interface.** Nothing to configure, nothing to click: install it, and the events are there for the plugins that need them.

## Demo vault

**The documentation is a demo vault.** Its notes explain what the events are and when they fire, with buttons that subscribe to them live so you can toggle a core plugin in Settings and watch them arrive.

**[Start reading here](<./demo-vault/00 Start.md>)** — it is plain markdown, so it works on GitHub with nothing installed.

A copy of the vault ships with every release. You can access it via any of the following:

1. Running the **More Events: Open demo vault** command.
2. Downloading `more-events-demo-vault.zip` from the [Releases](https://github.com/mnaoumov/obsidian-more-events/releases). It unzips into a single `more-events-demo-vault-<version>` folder.
3. Browsing its source in [`demo-vault/`](./demo-vault/README.md) in this repository.

## What it does

- **`more-events:core-plugin-enabled`** fires on `app.workspace` after a core plugin has been enabled, carrying that plugin's id and display name. [01 Core plugin events](<./demo-vault/01 Core plugin events.md>)
- **`more-events:core-plugin-disabled`** fires the same way after one has been disabled. [01 Core plugin events](<./demo-vault/01 Core plugin events.md>)
- **A small API** answers the question the events cannot: which core plugins are enabled *right now*, which is what a listener needs when it first loads. [02 For plugin developers](<./demo-vault/02 For plugin developers.md>)

Both events are **per plugin** — one event per plugin that actually changed, so a listener never has to diff anything — and **past tense**: by the time yours runs, the core plugin has already been enabled or disabled.

## What it deliberately does not do

- **It does not say whether the user did it.** Obsidian's `change` signal fires identically whether someone flipped the toggle in **Settings -> Core plugins** or a plugin enabled something programmatically, and the only way to tell them apart is to patch the internals this plugin exists to stop everyone patching.
- **It does not fire for the core plugins that were already enabled when it loaded.** Nothing changed, so nothing is announced; read the starting state from the API instead.
- **It does not cover community plugins.** `obsidian-dev-utils` already broadcasts `obsidian-dev-utils:plugin-loaded` / `-unloaded` for every plugin built on it.

## For plugin developers

The events and the API are this plugin's whole point, and both are declared in [`api.d.ts`](./api.d.ts) — hand-written, and importing nothing but `obsidian`, so you can depend on it without depending on anything of mine.

The events need no API handle at all. Copy the declarations from `api.d.ts` into your own project, or hardcode the two names, and subscribe:

```ts
this.registerEvent(
  this.app.workspace.on('more-events:core-plugin-enabled', ({ corePluginId, corePluginName }) => {
    console.log(`${corePluginName} (${corePluginId}) is back`);
  })
);
```

For the current state, and to know whether More Events is installed at all, take the API through the registry. The contract is **`1.0.0`** and moves independently of the plugin's own version, so ask for a range:

```ts
import { watchPluginApi } from 'obsidian-dev-utils/obsidian/plugin/plugin-api';

const moreEventsApiRef = watchPluginApi<MoreEventsApi>({
  apiVersionRange: '^1',
  app: this.app,
  component: this,
  pluginId: 'more-events'
});

// `value` is always current and never stale: it is `null` while More Events is not loaded, and becomes
// non-`null` on its own when it is.
const moreEventsApi = moreEventsApiRef.value;
if (moreEventsApi) {
  console.log(moreEventsApi.getEnabledCorePluginIds());
  console.log(moreEventsApi.isCorePluginEnabled('backlink'));
}
```

If you would rather not depend on `obsidian-dev-utils` for that, the registry is a documented wire protocol you can read directly — see [Cross-plugin APIs](https://mnaoumov.dev/obsidian-dev-utils/guides/cross-plugin-apis/).

## Installation

The plugin is not yet listed in [the official Community Plugins repository](https://community.obsidian.md/plugins). Until it is, install it as a beta release.

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://community.obsidian.md) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://community.obsidian.md/plugins/obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-more-events).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin are hidden.

To show them, run the following command in the `DevTools Console`:

```js
window.DEBUG.enable('more-events');
```

For more details, refer to the [documentation](https://mnaoumov.dev/obsidian-dev-utils/guides/debugging/).

## Changelog

All notable changes to this project will be documented in the [CHANGELOG](./CHANGELOG.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

© [Michael Naumov](https://github.com/mnaoumov/)
