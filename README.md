# More Events

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov) [![GitHub release](https://img.shields.io/github/v/release/mnaoumov/obsidian-more-events)](https://github.com/mnaoumov/obsidian-more-events/releases) [![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/obsidian-more-events/total)](https://github.com/mnaoumov/obsidian-more-events/releases) [![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/mnaoumov/obsidian-more-events)

**A home for the events [Obsidian](https://obsidian.md/) does not publish.** `More Events` publishes them on `app.workspace`, named, typed and per subject, so any plugin can subscribe with no dependency beyond `obsidian` itself.

Without it, a plugin that needs such an event reads undocumented internals or patches a shared prototype, and two plugins doing that in one vault means two patches on one prototype. This plugin patches once, for everybody. The first set of events is plugin lifecycle, the second is context menus, and more sets follow under the same contract. It has no user interface: the screenshots show another plugin reacting to its events.

<!-- markdownlint-disable MD033 -->

<a href="https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/images/screenshots/screenshot-desktop-1.png"><img src="images/screenshots/screenshot-desktop-1.png" alt="Canvas enabled in Settings — a listening plugin is told" width="600"></a>

<details>
<summary>More screenshots</summary>

<div>
<a href="https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/images/screenshots/screenshot-desktop-2.png"><img src="images/screenshots/screenshot-desktop-2.png" alt="Any community plugin too, named the moment it loads" width="600"></a>
<a href="https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/images/screenshots/screenshot-mobile-1.png"><img src="images/screenshots/screenshot-mobile-1.png" alt="Canvas enabled in Settings — a listening plugin is told" width="270"></a>
<a href="https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/images/screenshots/screenshot-mobile-2.png"><img src="images/screenshots/screenshot-mobile-2.png" alt="Any community plugin too, named the moment it loads" width="270"></a>
</div>

</details>

<!-- markdownlint-enable MD033 -->

## Demo vault

**The documentation is a demo vault.** Its notes explain what the events are and when they fire, with buttons that subscribe to them live so you can toggle a plugin in Settings and watch them arrive.

**[Start reading here](<./demo-vault/00 Start.md>)** — it is plain markdown, so it works on GitHub with nothing installed.

A copy of the vault ships with every release. You can access it via any of the following:

1. Running the **`More Events`: Open demo vault** command.
2. Downloading `more-events-demo-vault.zip` from the [Releases](https://github.com/mnaoumov/obsidian-more-events/releases). It unzips into a single `more-events-demo-vault-<version>` folder.
3. Browsing its source in [`demo-vault/`](./demo-vault/README.md) in this repository.

## What it does

Every event fires on `app.workspace`. The full declarations are in [`api.d.ts`](./api.d.ts), and [05 Why it patches](<./demo-vault/05 Why it patches.md>) explains how they are recovered.

### Plugin lifecycle

Each event fires once per plugin that changed, after it changed, and says whether the user did it (`isUserInitiated`). For community plugins, enabled means loaded. Nothing fires for the plugins already enabled when `More Events` loads: read that from the [API](<./demo-vault/03 For plugin developers.md>). Details: [01 Core plugin events](<./demo-vault/01 Core plugin events.md>), [02 Community plugin events](<./demo-vault/02 Community plugin events.md>).

| Event | Fires after | Payload |
| --- | --- | --- |
| `more-events:core-plugin-enabled` | a core plugin is enabled | `{ corePluginId, corePluginName, isUserInitiated }` |
| `more-events:core-plugin-disabled` | a core plugin is disabled | `{ corePluginId, corePluginName, isUserInitiated }` |
| `more-events:community-plugin-enabled` | a community plugin is loaded | `{ communityPluginId, communityPluginName, isUserInitiated }` |
| `more-events:community-plugin-disabled` | a community plugin is unloaded | `{ communityPluginId, communityPluginName, isUserInitiated }` |

### Context menus

Each event fires just before the menu opens, after Obsidian has added its own items, so an item a listener adds appears in it. The listener gets the `Menu` first, then the arguments below. Obsidian raises an undocumented event of its own for the rows marked *relay*, and `More Events` relays it under a stable name. The others fire nothing in Obsidian. Details: [04 Context menu events](<./demo-vault/04 Context menu events.md>).

| Event | Fires for the menu of | Arguments after `menu` |
| --- | --- | --- |
| `more-events:all-properties-menu` | a property in the **All properties** view | `leaf`, `propertyNames` |
| `more-events:bases-column-menu` | a Bases table column header | `leaf`, `column` |
| `more-events:bases-kanban-column-menu` | a Bases board column's empty area | `leaf`, `column` |
| `more-events:bases-view-menu` | a Bases view settings page's **More options** button (a click) | `leaf`, `viewName` |
| `more-events:bookmarks-menu` | one or more bookmarks (*relay*) | `bookmarks` |
| `more-events:bookmarks-view-menu` | the **Bookmarks** view's empty area | `leaf` |
| `more-events:callout-menu` | a Live Preview callout | `leaf`, `callout` |
| `more-events:canvas-edge-menu` | a canvas connection (*relay*) | `leaf`, `edge` |
| `more-events:canvas-node-connection-drop-menu` | a connection dropped onto empty canvas (*relay*) | `leaf`, `fromNode`, `drop` |
| `more-events:canvas-node-menu` | a canvas node (*relay*) | `leaf`, `node` |
| `more-events:canvas-selection-menu` | a canvas selection (*relay*) | `leaf`, `selection` |
| `more-events:canvas-view-menu` | a canvas's empty background | `leaf`, `position` |
| `more-events:community-plugin-menu` | a plugin's row in **Settings -> Community plugins**, or its **More options** button | `communityPluginId` |
| `more-events:community-plugin-setting-tab-menu` | a community plugin's tab in the Settings sidebar | `communityPluginId` |
| `more-events:core-plugin-setting-tab-menu` | a core plugin's tab in the Settings sidebar | `corePluginId` |
| `more-events:css-snippet-menu` | a CSS snippet's row in **Settings -> Appearance** (desktop) | `snippet` |
| `more-events:external-image-menu` | a Live Preview image embedded from a URL | `leaf`, `image` |
| `more-events:history-menu` | a view's back or forward button | `leaf`, `direction` |
| `more-events:leaf-menu` | a tab header, or a view's **More options** (*relay*) | `leaf` |
| `more-events:markdown-properties-menu` | a note's **Properties** heading (*relay*) | `file` |
| `more-events:markdown-viewport-menu` | a note's margin or the editor's gutter (*relay*) | `view`, `mode` |
| `more-events:pdf-outline-menu` | an entry in a PDF's outline | `leaf`, `outlineItem` |
| `more-events:pdf-page-menu` | a page of a PDF (desktop) | `leaf`, `pageNumber` |
| `more-events:pdf-thumbnail-menu` | a page thumbnail in a PDF's sidebar | `leaf`, `pageNumber` |
| `more-events:property-menu` | a property's icon | `leaf`, `property` |
| `more-events:property-value-menu` | a value of a list or tags property | `leaf`, `value` |
| `more-events:ribbon-menu` | the ribbon's empty area | `side` |
| `more-events:search-results-menu` | the **Search** view's result count (*relay*) | `searchView` |
| `more-events:sidebar-toggle-menu` | a sidebar's toggle button | `side` |
| `more-events:tab-group-menu` | a tab group's tab list chevron (*relay*) | `tabGroup` |
| `more-events:table-cell-menu` | a Live Preview table cell | `leaf`, `cell` |
| `more-events:table-handle-menu` | a Live Preview table's row or column drag handle | `leaf`, `handle` |
| `more-events:vault-menu` | the vault name in the left sidebar (desktop) | nothing |
| `more-events:web-viewer-history-menu` | a page in the **Web viewer**'s History view | `leaf`, `historyItem` |

## Similar plugins

No similar plugin was found when this was last searched for, on 2026-10-26.

## For plugin developers

The events and the API are declared in [`api.d.ts`](./api.d.ts), which imports nothing but `obsidian`. The events need no API handle: copy the declarations into your project, or hardcode the names, and subscribe:

```ts
this.registerEvent(
  this.app.workspace.on('more-events:core-plugin-enabled', ({ corePluginId, corePluginName, isUserInitiated }) => {
    if (isUserInitiated) {
      console.log(`${corePluginName} (${corePluginId}) is back, because someone turned it back on`);
    }
  })
);

this.registerEvent(
  this.app.workspace.on('more-events:bookmarks-menu', (menu, bookmarks) => {
    menu.addItem((item) => {
      item.setTitle(`Log ${bookmarks.length} bookmark(s)`).onClick(() => {
        console.log(bookmarks.map((bookmark) => bookmark.path ?? bookmark.title));
      });
    });
  })
);
```

For the current state, and to know whether `More Events` is installed at all, take the API through the registry. The contract is **`1.4.0`** and moves independently of the plugin's own version, so ask for a range.

Beside `api.d.ts`, [`api-contract.ts`](./api-contract.ts) holds the API's contract, `MORE_EVENTS_API_CONTRACT`: for every method, a schema over its arguments and a schema over what it returns. Copy it next to `api.d.ts` and pass it as the `contract`, so both sides check the same definition. It imports from one package besides `./api.d.ts`, [`@mnaoumov/typescript-lib`](https://www.npmjs.com/package/@mnaoumov/typescript-lib) (`1.3.0` or later). More in [03 For plugin developers](<./demo-vault/03 For plugin developers.md>).

```ts
import { watchPluginApi } from '@mnaoumov/obsidian-lib/plugin/plugin-api';

import type { MoreEventsApi } from './api.d.ts';

import { MORE_EVENTS_API_CONTRACT } from './api-contract.ts';

const moreEventsApiRef = watchPluginApi<MoreEventsApi>({
  apiVersionRange: '^1',
  app: this.app,
  component: this,
  contract: MORE_EVENTS_API_CONTRACT,
  pluginId: 'more-events'
});

// `value` is always current and never stale: it is `null` while `More Events` is not loaded, and becomes
// non-`null` on its own when it is.
const moreEventsApi = moreEventsApiRef.value;
if (moreEventsApi) {
  console.log(moreEventsApi.getEnabledCorePluginIds());
  console.log(moreEventsApi.isCorePluginEnabled('backlink'));
  console.log(moreEventsApi.getEnabledCommunityPluginIds());
  console.log(moreEventsApi.isCommunityPluginEnabled('dataview'));
}
```

If you would rather not depend on [`@mnaoumov/obsidian-lib`](https://www.npmjs.com/package/@mnaoumov/obsidian-lib) for that, the registry is a documented wire protocol you can read directly — see [Cross-plugin APIs](https://mnaoumov.dev/obsidian-lib/guides/cross-plugin-apis/).

## Installation

The plugin is available in [the official Community Plugins repository](https://community.obsidian.md/plugins/more-events).

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://community.obsidian.md) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://community.obsidian.md/plugins/obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-more-events).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin (id: `more-events`) are hidden.

If you need to enable them refer to the [documentation](https://mnaoumov.dev/obsidian-lib/guides/debugging/).

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
