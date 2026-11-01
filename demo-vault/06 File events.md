# File events

Obsidian fires `create` when a file is created, but it does not promise the file holds its content yet. `obsidian://new`, which Web Clipper and every `obsidian://new?content=...` link use, creates the note **empty**, fires `create`, and only then writes the content. A plugin that reads the note from `create`, as a template plugin does, reads an empty file and has to guess how long to wait.

| Event                        | Fires once                                     | Payload |
| ---------------------------- | ---------------------------------------------- | ------- |
| `more-events:new-file-ready` | a newly created file holds its initial content | `file`  |

## Watch it arrive

Start listening. This registers a handler for the event and, for comparison, one for Obsidian's own `create`, and shows a notice for each with the size of the file at that moment:

```code-button
---
caption: Start listening
---
require('/demoSetup.ts').startListeningToNewFileReady(app);
```

Manual equivalent: the two `on(...)` calls from your own plugin.

Now create a note the way an `obsidian://new` link does. The button creates `New file ready demo.md`, replacing it when it is already there:

```code-button
---
caption: Create a note through obsidian://new
---
await require('/demoSetup.ts').createNoteThroughObsidianUri(app);
```

The `create` notice should say the note holds **0 bytes**, and the `more-events:new-file-ready` notice that it holds its content. Then stop:

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToNewFileReady();
```

## What the event promises

- **Exactly once per file** created after the vault has loaded. Folders are not announced.
- **A file created with its content**, such as a new note or a file another plugin writes with `vault.create`, is announced straight from its `create`, because Obsidian writes the content before it fires `create`.
- **A file created while an `obsidian://` action runs** is announced once that action has finished. That covers `obsidian://new`, `obsidian://unique` and `obsidian://daily`, and a plugin's own action when its handler returns a promise that settles when it is done.

## What it deliberately does not promise

- **A file created during an `obsidian://` action for another reason** waits until the action ends too, so it comes late rather than early.
- **A file deleted before its action ends** is not announced.
- **A plugin that creates a file and writes it afterwards outside any `obsidian://` action** is not covered: nothing tells it apart from a file meant to stay as it was created.
