# Context menu events

Obsidian lets a plugin add items to some of its context menus: it raises `file-menu` when you right-click a file, `editor-menu` in a note, and a few others. Many more menus are built with no event at all, so the only way to add an item to one is to patch the code that builds it. This set publishes events for those menus, starting with the **Bookmarks** view.

They are shaped like Obsidian's own: the listener receives the `Menu` first, then what the menu is for, and whatever it adds shows up in the menu Obsidian opens.

- **`more-events:bookmarks-menu`** is the menu of one or more bookmarks. The listener gets the bookmarks: the one you right-clicked, or every selected one.
- **`more-events:bookmarks-view-menu`** is the menu of the view's empty area, below the last bookmark, where Obsidian offers **New group**. The listener gets the view's leaf.

## Try them

First, a bookmark to right-click. This bookmarks this note and opens the **Bookmarks** view in the left sidebar:

```code-button
---
caption: Show the bookmarks view
---
await require('/demoSetup.ts').showBookmarksView(app);
```

Manual equivalent: **Bookmark...** from this note's menu, then the bookmark icon in the left sidebar.

Then start listening. This registers the two handlers a plugin would register in its own `onload`, and each adds one item to its menu:

```code-button
---
caption: Start listening
---
require('/demoSetup.ts').startListeningToBookmarksMenus(app);
```

Now right-click the bookmark: the menu has a **Describe these bookmarks (added by a listener)** item, and clicking it shows what the listener was told. Select several bookmarks with Ctrl or Shift and right-click again, and it describes all of them. Then right-click the empty area below the last bookmark: Obsidian's **New group** is followed by **Added by a listener to the empty area**. Then stop:

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToBookmarksMenus();
```

## What the events promise

- **They fire before the menu opens**, after Obsidian has added its own items, so an item you add appears in the menu.
- **The bookmarks are Obsidian's own objects**, not copies, so the **Bookmarks** core plugin recognizes them if you hand them back to it. Read them; do not write to them.

## Where they come from

Obsidian already raises an event for the bookmark menu, `bookmarks:bookmarks-menu`, but documents and types it nowhere. `More Events` relays it under a name it keeps stable, so a plugin that listens here keeps working if Obsidian renames its own.

The empty-area menu raises nothing at all. `More Events` recognizes it as it is about to be shown, through one patch on `Menu`, and every later menu that fires no event goes through that same patch.
