# Task events

Obsidian toggles a task when its checkbox is clicked, and tells a plugin nothing about it. The usual workaround is a CodeMirror extension, which only sees the editor: a click in Reading view goes straight past it. This event fires for both, after Obsidian has written the toggled task to the note.

| Event                               | Fires once                                                  | Payload                |
| ----------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `more-events:task-checkbox-clicked` | a task's checkbox was clicked and Obsidian toggled the task | `leaf`, `file`, `task` |

`task` holds the task's `line` (counted from 0), its status character before and after (`previousChar`, `char`), `isChecked`, the whole `lineText` after the click, and the view's `mode`: `preview` for Reading view, `source` for Live Preview.

## Watch it arrive

Start listening:

```code-button
---
caption: Start listening
---
require('/demoSetup.ts').startListeningToTaskCheckboxes(app);
```

Manual equivalent: the `on(...)` call from your own plugin.

Now click these checkboxes, here in Live Preview, then again in Reading view. A notice names each task and its status before and after:

<!-- markdownlint-disable MD052 -- A task status such as [/] is not a reference link. -->

- [ ] Call the bank
- [/] Write the report
- [x] Water the plants

> [!note] Tasks inside a callout count too
>
> - [ ] Book the tickets

<!-- markdownlint-enable MD052 -->

Then stop:

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToTaskCheckboxes();
```

## What the event promises

- **Once per click that changed the note**, after the change: the note's text already holds the new status when a listener runs.
- **Reading view and Live Preview alike**, including a task Live Preview renders inside a block such as a callout.
- **What Obsidian actually wrote**, not a prediction: a task of any status other than a space is unchecked, so `[/]` becomes `[ ]`.

## What it deliberately does not promise

- **A checkbox in an embedded note or a hover popover** writes another file and is not announced.
- **A task changed any other way**, by typing, by a command or by another plugin, is not a click and is not announced.
- **Source mode** renders no checkboxes, so there is nothing to click there.
