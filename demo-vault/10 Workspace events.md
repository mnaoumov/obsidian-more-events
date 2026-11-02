# Workspace events

`More Events` announces workspace transitions on `app.workspace`:

| Event                                   | Fires when                                                                                      | Arguments         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------- |
| `more-events:leaf-closed`               | a workspace leaf has detached                                                                   | `leaf, file`      |
| `more-events:leaf-visibility-changed`   | Obsidian reports a layout, active leaf or resize notification and the leaf's visibility differs | `leaf, isVisible` |
| `more-events:markdown-mode-changed`     | a Markdown view finishes switching Reading/editing mode                                         | `leaf, mode`      |
| `more-events:markdown-preview-rendered` | a Reading-view renderer finishes a pass and its tracked post-processing promises                | `leaf, file`      |

These events are available in contract `1.10.0`.

## What each event means

The closed event supplies the file captured before the leaf lost its view, or `null` for a view without a file. Closing one tab does not mean the file is closed everywhere: another tab can still show it. Moving a tab between groups does not close it.

Visibility follows Obsidian's own `leaf.isVisible()`. Focus and visibility differ: two split panes can both be visible. Existing leaves form a silent baseline when the plugin loads; newly observed visible leaves report `true`. Visibility is sampled at native notifications, so intermediate DOM states between those notifications are outside its contract. Closing uses its own event.

The mode is `preview` for Reading view or `source` for editing. Source mode and Live Preview are both editing here. A request to stay in the same mode is silent.

Preview completion is a rendering pass, and may repeat for unchanged content. Obsidian waits for the post-processing promises it tracks. It cannot promise that a third-party plugin's detached asynchronous work, a network image or every virtualized offscreen element is complete. Clearing a preview does not announce a completed render.

## Listen

Copy the declarations from [api.d.ts](https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/api.d.ts) into the listening plugin and register the subscriptions on its component:

```ts
this.registerEvent(app.workspace.on('more-events:leaf-closed', (leaf, file) => {
  console.log('Closed tab', leaf.id, file?.path);
}));
this.registerEvent(app.workspace.on('more-events:markdown-mode-changed', (leaf, mode) => {
  console.log('Mode', leaf.id, mode);
}));
this.registerEvent(app.workspace.on('more-events:markdown-preview-rendered', (leaf, file) => {
  console.log('Preview ready', leaf.id, file.path);
}));
```

Open two tabs of this note, switch tabs, switch between Reading and editing view, and close one tab. Each subscription reports the subject of the action. [Index readiness](<./11 Index readiness.md>) is a separate signal: a rendered note does not imply that every file in the vault has been indexed.

```code-button
---
caption: Listen for workspace events
---
require('/demoSetup.ts').startListeningToWorkspaceEvents(app);
```

Manual equivalent: register the subscriptions above in a listening plugin.

```code-button
---
caption: Stop listening for workspace events
---
require('/demoSetup.ts').stopListeningToWorkspaceEvents();
```

Manual equivalent: unload the listening component.
