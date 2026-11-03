# Configuration events

`More Events` relays native vault configuration changes on `app.workspace`, without patching Obsidian.

| Event                        | Fires when                              | Arguments |
| ---------------------------- | --------------------------------------- | --------- |
| `more-events:config-changed` | a native vault configuration key changes | `key`     |

Available in contract `1.11.0`.

## What it means

The key is the string Obsidian emits, such as `readableLineLength`. It is open-ended, so future native keys do not need a new contract. The in-memory value has changed when the event arrives; disk persistence may still be pending. Repeating a native setter with the same value is silent. Native external `app.json` reloads also emit this event for changed or removed keys.

This is not a notification for arbitrary plugin `data.json`, hotkeys, CSS snippets or every file in the configuration directory. There is no initial replay. Read the current setting through the vault when needed.

## Listen

Copy [api.d.ts](https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/api.d.ts) into the listening plugin:

```ts
this.registerEvent(app.workspace.on('more-events:config-changed', (key) => {
  console.log('Changed vault configuration key', key);
}));
```

```code-button
---
caption: Demonstrate a configuration change
---
require('/demoSetup.ts').demonstrateConfigChange(app);
```

Manual equivalent: subscribe as above and toggle **Readable line length** in **Settings → Editor**. The button temporarily toggles that setting, displays the changed key, restores the original setting and removes its listener.
