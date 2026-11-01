# Canvas events

Obsidian's canvas tells a plugin nothing about what happens on it: not when the selection changes, not when a card is added or moved, not when the canvas is made read-only or a card opens its editor, and it offers no place to add a button to the toolbar above a selection. Every canvas plugin that needs one of these patches the canvas's internals for itself. This plugin patches them once, for everybody.

| Event                                     | Fires once                                                           | Payload                          |
| ----------------------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| `more-events:canvas-content-changed`      | a node or a connection was added, changed, moved, resized or removed | `leaf`, `change`                 |
| `more-events:canvas-node-editing-changed` | a card started or stopped being edited                               | `leaf`, `nodeId`, `isEditing`    |
| `more-events:canvas-read-only-changed`    | the canvas was made read-only, or editable again                     | `leaf`, `isReadOnly`             |
| `more-events:canvas-selection-changed`    | what is selected changed                                             | `leaf`, `selection`              |
| `more-events:canvas-toolbar-rendered`     | the toolbar above a selection was built                              | `leaf`, `toolbarEl`, `selection` |

`change` lists the ids of the nodes and of the connections that were `added`, `changed` and `removed`. `selection` holds copies of the selected nodes and connections, as the canvas file stores them.

## Watch them arrive

Open the demo canvas:

```code-button
---
caption: Open the demo canvas
---
await require('/demoSetup.ts').openDemoCanvas(app);
```

Start listening. This shows a notice for each event, and adds an info button to the toolbar above a selection:

```code-button
---
caption: Start listening
---
require('/demoSetup.ts').startListeningToCanvasEvents(app);
```

Manual equivalent: the five `on(...)` calls from your own plugin.

Now click a card, drag it, double-click it to edit it, and press the toolbar's new info button. The canvas's settings button, at its top right, has the **Read-only** item. Then stop:

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToCanvasEvents();
```

## What the events promise

- **Selection** is announced once per gesture, on the frame the canvas draws it, so clearing a selection and selecting something else is one event, and a gesture that ends where it started is none.
- **Content** is announced for every edit the canvas commits, for an undo and a redo, and for the canvas file changing on disk while it is open, from Sync or another editor.
- **Read-only** is announced for a real change only.
- **Card editing** is announced when a text card or a note card opens its editor in place, and when it closes it.
- **The toolbar** is announced each time Obsidian builds it, after its own buttons, so a button added from the event shows beside them. Obsidian empties the toolbar before each build, so add the button every time.

## What they deliberately do not promise

- **Opening a canvas file** is not a content change, and nothing is announced for it.
- **Opening a canvas file** resets the read-only state before restoring the one the file was left in, so switching a leaf from one read-only canvas to another announces `false` and then `true`.
- **The first canvas opened after `More Events` loads** is patched just after it opens, because the canvas's classes are not exported and are reached from an open canvas, so the read-only state it opens in is not announced. Every later change, on it and on every other canvas, is.
