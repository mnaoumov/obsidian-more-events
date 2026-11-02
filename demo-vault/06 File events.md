# File events

Obsidian fires `create` when a file is created, but it does not promise the file holds its content yet. `obsidian://new`, which Web Clipper and every `obsidian://new?content=...` link use, creates the note **empty**, fires `create`, and only then writes the content. A plugin that reads the note from `create`, as a template plugin does, reads an empty file and has to guess how long to wait.

| Event | Fires once | Payload |
| ---------------------------- | ---------------------------------------------- | ------- |
| `more-events:after-save` | a Vault.modify write succeeded | `file, change` |
| `more-events:before-save` | a Vault.modify write is about to start | `file, change` |
| `more-events:frontmatter-changed` | indexed YAML properties differ from the previous snapshot | `file, change` |
| `more-events:new-file-ready` | a newly created file holds its initial content | `file` |

## Saves and frontmatter

The save pair covers text writes through `vault.modify`: manual saves, autosaves, saves when closing a text view, and writes by other plugins through that API. `change.content` is the exact text supplied to `vault.modify`. Clean text-view save requests are silent because Obsidian writes nothing. An explicit `vault.modify` call is announced even if its text is unchanged. A failed write has a before event and no after event. Unloading the plugin during a write suppresses its after event.

The events carry the file rather than guessing which of its open views caused a write. These are synchronous observations, not cancellable or awaitable transformation hooks; changing the payload does not change the write. The before event runs after the caller captured its text. Metadata indexing may finish after the after event. Disk changes and other write APIs (`vault.process`, `vault.append`, binary operations and direct adapter writes) are outside this pair; they still produce frontmatter diffs when indexed.

The frontmatter event carries `{ oldValues, newValues, changedKeys }`: independently copied indexed YAML properties and alphabetically sorted top-level keys that were added, removed or changed. Nested changes name their top-level property. Initial indexing establishes a baseline silently; body edits, YAML formatting and key reordering are silent. Removing the YAML produces an empty `newValues`. Renames retain the baseline and deletions drop it. Obsidian's deprecated `position` bookkeeping is excluded. Changes coalesced by Obsidian's indexer produce one diff between the snapshots it actually indexed.

Start listening, then edit a note and save it manually or let autosave run. Change a property to see its old and new values in a notice:

```code-button
---
caption: Listen for saves and frontmatter
---
require('/demoSetup.ts').startListeningToFileChanges(app);
```

```code-button
---
caption: Stop listening for file changes
---
require('/demoSetup.ts').stopListeningToFileChanges();
```

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
