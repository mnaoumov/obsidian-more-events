# Index readiness

Wait for Obsidian's initial metadata parsing and link resolution before reading the whole index.

| Event                     | Fires when                                                     | Arguments |
| ------------------------- | -------------------------------------------------------------- | --------- |
| `more-events:index-ready` | the metadata cache first becomes clean after this plugin loads | none      |

Available in contract `1.10.0`. A clean cache means that Obsidian has no pending metadata parsing or link-resolution work. This event fires once per `More Events` installation, including when it is enabled after startup with an already-clean cache. The already-clean case is asynchronous.

Subscribe before enabling `More Events` to observe the late-enable case. The event is not replayed to subscribers added later. Consumers that load after the event should use Obsidian's `metadataCache.onCleanCache(callback)` to wait for the current cache themselves.

```ts
this.registerEvent(app.workspace.on('more-events:index-ready', () => {
  console.log('Initial index ready');
}));
```

Further edits are indexed normally and do not repeat this event. It does not mean that the vault will stay unchanged, and it does not reconstruct files changed while Obsidian was closed. That would require a separately persisted baseline. [Frontmatter changes](<./06 File events.md>) report indexed changes observed while the plugin is running.

## Watch it arrive

This button subscribes first, then reloads `More Events` and waits for its one readiness announcement:

```code-button
---
caption: Reload and observe index readiness
---
await require('/demoSetup.ts').demonstrateIndexReadiness(app);
```

Manual equivalent: subscribe from a separate plugin, then disable and enable `More Events` in **Settings -> Community plugins**. A notice confirms that metadata parsing and link resolution are ready.

## Comparing a persisted baseline

Consumers can compare their own last completed snapshot after `more-events:index-ready`, then save the new baseline only after comparison completes. Keep the baseline per device if the goal is changes unseen by that device. Treat a missing, corrupt or incompatible baseline as a first scan, not a vault full of changes.

A size/mtime snapshot can miss timestamp-preserving edits. A content hash can identify different final bytes, but cannot recover intermediate edits, their order, attribution or rename identity. `More Events` stores no offline file history and does not replay changes made while it was absent.