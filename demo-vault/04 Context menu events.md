---
demo-status: right-click me in All properties
---

# Context menu events

Obsidian lets a plugin add items to some of its context menus: it raises `file-menu` when you right-click a file, `editor-menu` in a note, and a few others. Many more menus are built with no event at all, so the only way to add an item to one is to patch the code that builds it. This set publishes events for those menus, starting with the **Bookmarks** view.

They are shaped like Obsidian's own: the listener receives the `Menu` first, then what the menu is for, and whatever it adds shows up in the menu Obsidian opens.

- **`more-events:bookmarks-menu`** is the menu of one or more bookmarks. The listener gets the bookmarks: the one you right-clicked, or every selected one.
- **`more-events:bookmarks-view-menu`** is the menu of the view's empty area, below the last bookmark, where Obsidian offers **New group**. The listener gets the view's leaf.
- **`more-events:canvas-view-menu`** is the menu of a canvas's empty background, where Obsidian offers **Add card**. The listener gets the canvas's leaf and the point you right-clicked, in the canvas's own coordinates.
- **`more-events:ribbon-menu`** is the menu of the ribbon's empty area, below its icons, where Obsidian offers **Hide ribbon**. The listener gets which ribbon it is.
- **`more-events:all-properties-menu`** is the menu of a property in the **All properties** view, where Obsidian offers its types, **Rename** and **Delete**. The listener gets the names of the properties the menu acts on: the one you right-clicked, or the whole selection when that property is part of one.
- **`more-events:web-viewer-history-menu`** is the menu of a visited page in the **Web viewer**'s History view, where Obsidian offers **Copy URL** and **Remove from history**. The listener gets that page's title and address.
- **`more-events:pdf-thumbnail-menu`** is the menu of a page thumbnail in a PDF's sidebar, where Obsidian offers **Copy link to page**. The listener gets the PDF's leaf and the page number.

## Try the bookmarks ones

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

## Try the canvas and ribbon ones

First, an empty canvas to right-click. This opens the demo canvas in a new tab, turning the **Canvas** core plugin back on first if the toggle on [01 Core plugin events](<./01 Core plugin events.md>) left it off:

```code-button
---
caption: Open the demo canvas
---
await require('/demoSetup.ts').openDemoCanvas(app);
```

Manual equivalent: open `_assets/Context menu demo.canvas` from the file explorer.

Then start listening:

```code-button
---
caption: Start listening to the canvas and ribbon menus
---
require('/demoSetup.ts').startListeningToCanvasAndRibbonMenus(app);
```

Now right-click the empty canvas: below Obsidian's own items is **Where did I click? (added by a listener)**, and clicking it shows the point in canvas coordinates. Then right-click the ribbon on the far left, in the gap below its icons: Obsidian's **Hide ribbon** is joined by **Added by a listener to the ribbon**. Then stop:

```code-button
---
caption: Stop listening to the canvas and ribbon menus
---
require('/demoSetup.ts').stopListeningToCanvasAndRibbonMenus();
```

## Try the All properties and History ones

First, a property and a visited page to right-click. This note carries a `demo-status` property for the first. This opens the **All properties** view and the **Web viewer**'s History view in the left sidebar, turning the **Web viewer** core plugin on and giving an empty history one entry, `https://obsidian.md/`:

```code-button
---
caption: Show the All properties and History views
---
await require('/demoSetup.ts').showAllPropertiesAndHistoryViews(app);
```

Manual equivalent: **All properties** from the command palette; then turn on **Web viewer** in **Settings -> Core plugins**, open a page in it, and run **Web viewer: Show history**.

Then start listening:

```code-button
---
caption: Start listening to the All properties and History menus
---
require('/demoSetup.ts').startListeningToAllPropertiesAndHistoryMenus(app);
```

Now right-click `demo-status` in **All properties**: below Obsidian's **Rename** and **Delete** is **Name these properties (added by a listener)**. Select several properties with Ctrl or Shift and right-click one of them, and it names them all. Then right-click the page in the History view: below **Copy URL** is **Which page is this? (added by a listener)**. Then stop:

```code-button
---
caption: Stop listening to the All properties and History menus
---
require('/demoSetup.ts').stopListeningToAllPropertiesAndHistoryMenus();
```

## Try the PDF thumbnail one

First, a PDF to right-click. This opens a three-page demo PDF in a new tab, with its thumbnail sidebar open:

```code-button
---
caption: Open the demo PDF
---
await require('/demoSetup.ts').openDemoPdf(app);
```

Manual equivalent: open `_assets/Context menu demo.pdf` from the file explorer, then the sidebar button at the left end of the PDF toolbar.

Then start listening:

```code-button
---
caption: Start listening to the PDF thumbnail menu
---
require('/demoSetup.ts').startListeningToPdfThumbnailMenu(app);
```

Now right-click the thumbnail of page 2: below Obsidian's **Copy link to page 2** is **Which page is this? (added by a listener)**, and clicking it names the PDF and the page. Then stop:

```code-button
---
caption: Stop listening to the PDF thumbnail menu
---
require('/demoSetup.ts').stopListeningToPdfThumbnailMenu();
```

## Try the sidebar toggle and community plugin ones

These two menus are shown a moment after the right-click rather than during it, which is the harder case for `More Events` to recognize. Start listening:

```code-button
---
caption: Start listening to the sidebar toggle and community plugin menus
---
require('/demoSetup.ts').startListeningToSidebarToggleAndCommunityPluginMenus(app);
```

Now right-click the button at the top of the left sidebar that opens and closes it: below Obsidian's **Left sidebar** and **Ribbon** is **Which sidebar is this? (added by a listener)**. Then open **Settings -> Community plugins** and right-click `More Events` in the list of installed plugins: below Obsidian's **Uninstall** is **Which plugin is this? (added by a listener)**. Then stop:

```code-button
---
caption: Stop listening to the sidebar toggle and community plugin menus
---
require('/demoSetup.ts').stopListeningToSidebarToggleAndCommunityPluginMenus();
```

## What the events promise

- **They fire before the menu opens**, after Obsidian has added its own items, so an item you add appears in the menu.
- **The bookmarks are Obsidian's own objects**, not copies, so the **Bookmarks** core plugin recognizes them if you hand them back to it. Read them; do not write to them.
- **The history entry is a copy**, a plain title and address, so writing to it changes nothing in Obsidian.

## Where they come from

Obsidian already raises an event for the bookmark menu, `bookmarks:bookmarks-menu`, but documents and types it nowhere. `More Events` relays it under a name it keeps stable, so a plugin that listens here keeps working if Obsidian renames its own.

The bookmarks empty-area menu, the canvas background menu, the ribbon menu, the **All properties** menu, the History menu, the PDF thumbnail menu, the sidebar toggle menu and the community plugin menu raise nothing at all. `More Events` recognizes each as it is about to be shown, through one patch on `Menu`, and every later menu that fires no event goes through that same patch.
