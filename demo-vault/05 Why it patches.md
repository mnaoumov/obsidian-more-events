# Why it patches

`More Events` exists so that other plugins can stop patching Obsidian's internals. It does patch them itself, and that is the reason it works rather than a contradiction. This note has no buttons: it explains the mechanism behind the events the other notes demonstrate.

## One patch instead of one per plugin

The risk is never a single patch. It is **N** plugins patching the same shared prototype, at different versions, each unaware of the others. A plugin is the right place for such a patch, because a vault holds only one copy of it. So the prototype carries one patch, installed once and removed cleanly when the plugin unloads, and every consumer gets the context it needs without adding its own.

## The plugin lifecycle patches

`InternalPlugin.enable(isEnabledByUser)` / `disable(isDisabledByUser)` for core plugins, and `Plugins.enablePlugin(id, isUserEnabled)` / `disablePlugin(id, isUserDisabled)` for community ones, take the answer to *"did the user do it?"*. Obsidian then drops it before raising the signal the events are built on. The patches record that answer and nothing else, so every payload can carry `isUserInitiated`. See [01 Core plugin events](<./01 Core plugin events.md>) and [02 Community plugin events](<./02 Community plugin events.md>) for what it means precisely.

The patch supplements the diff rather than replacing it. It intercepts the transition. What makes the events per plugin, and correct when Obsidian collapses several transitions into one debounced signal, is still the diff of what is loaded before and after.

## The context menu patch

The context menus that fire no event of their own take one more patch, on `Menu.prototype.showAtMouseEvent` and the `showAtPosition` it shows through. Every such menu goes through that same patch, so a new menu never means a new patch.

- **It tells the menus apart by the element whose right-click listener is showing the menu**, and it raises the event before the menu is built, while the menu still accepts items.
- **A menu Obsidian shows a moment after the right-click**, when that element is no longer known, is told apart by the path the right-click took, which `More Events` records while it happens.
- **A menu a button shows with no right-click at all**, such as a plugin row's **More options**, is told apart by the button Obsidian anchors it to.

The menus Obsidian already raises an undocumented event for are relayed, with no patch. See [04 Context menu events](<./04 Context menu events.md>) for which ones those are.

## The URI action patch

`more-events:new-file-ready` takes one more patch, on the `obsidian://` action handlers. Obsidian calls a handler and drops the promise it returns, so nothing says when `obsidian://new` has finished writing the note it created. `More Events` wraps each handler, the ones already registered and every one registered later, and holds a file created while one runs until its promise settles. The wrapper returns the handler's own result untouched. See [06 File events](<./06 File events.md>) for what the event promises.

## Text-view saves and command dispatch

`Vault.modify` is the shared text-write path used by manual saves, autosaves and plugin writes on both supported Obsidian builds. No event exposes its before-write moment. One patch brackets that routine and returns its original promise unchanged. A native `modify` event arrives after the file changed, and does not bracket the caller's write promise. Patching `TextFileView.writeData` would miss the public build, which has no such method; patching `TextFileView.save` would miss autosave callbacks already bound before this plugin loaded. See [06 File events](<./06 File events.md>).

The command manager's `executeCommand` is the shared path for keyboard, palette and programmatic dispatch. It raises no event and drops asynchronous callback promises. One patch announces its successful synchronous return without invoking the callback again or changing that return value. See [09 Command events](<./09 Command events.md>).

Frontmatter needs no patch: `metadataCache.changed` already announces indexing. Keeping independent snapshots supplies the old values and changed keys that the native event does not carry.
