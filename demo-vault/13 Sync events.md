# Sync events

`More Events` announces the core **Sync** plugin's state changing on `app.workspace`, without patching Obsidian.

| Event                             | Fires when                         | Arguments                  |
| --------------------------------- | ---------------------------------- | -------------------------- |
| `more-events:sync-status-changed` | the vault's **Sync** state changes | `status`, `previousStatus` |

Available in contract `1.13.0`.

## What it means

Both arguments are the plugin's own `getStatus()`: `uninitialized`, `disconnected`, `error`, `paused`, `syncing` or `synced`. `syncing` to `synced` is the vault going idle, so a plugin that waits for Sync to settle listens for `status === 'synced'`.

Obsidian reports progress many times per sync (each upload, download and comparison). Those lines are not announced: only a change between the six states is. Nothing is announced while the **Sync** core plugin is disabled, and after it is enabled again the next real change is announced. There is no initial replay, so read the current state from the plugin when you subscribe.

## Listen

Copy [api.d.ts](https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/api.d.ts) into the listening plugin:

```ts
this.registerEvent(app.workspace.on('more-events:sync-status-changed', (status, previousStatus) => {
  if (status === 'synced') {
    console.log('Sync is idle again, after', previousStatus);
  }
}));
```

```code-button
---
caption: Listen for Sync state changes
---
require('/demoSetup.ts').startListeningToSyncStatus(app);
```

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToSyncStatus();
```

The events need a vault connected to a remote vault through **Settings -> Sync**. After the listen button, edit any note: a notice shows Sync going from `synced` to `syncing` and back. Pausing and resuming Sync in its settings shows `paused`.
