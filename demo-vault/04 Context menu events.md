---
demo-status: right-click me in All properties
demo-topics:
  - menus
  - events
  - properties
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
- **`more-events:pdf-outline-menu`** is the menu of an entry in a PDF's outline, where Obsidian offers **Copy link to** that section. The listener gets the PDF's leaf, and the entry's title and page number.
- **`more-events:pdf-page-menu`** is the menu of a page in a PDF, on the desktop app, where Obsidian offers **Copy** and its quote and link items for a text selection. The listener gets the PDF's leaf and the page number.
- **`more-events:external-image-menu`** is the menu of an image embedded from a URL in a note's Live Preview editor, where Obsidian offers **Copy image** and **Remove image**. The listener gets the note's leaf, and the image's line and URL.
- **`more-events:bases-kanban-column-menu`** is the menu of a column's empty area in a base's board view, where Obsidian offers **Add item** and **Hide column**. The listener gets the base's leaf, the value the column groups by and the name of the base's view.

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

## Try the PDF ones

A PDF open in its own tab has three menus that fire nothing: a page thumbnail's, an outline entry's and a page's own. First, a PDF to right-click. This opens a three-page demo PDF in a new tab, with its thumbnail sidebar open:

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
caption: Start listening to the PDF menus
---
require('/demoSetup.ts').startListeningToPdfMenus(app);
```

Now right-click the thumbnail of page 2: below Obsidian's **Copy link to page 2** is **Which page is this? (added by a listener)**, and clicking it names the PDF and the page. Switch the sidebar to the outline with the button at its top and right-click **Part 2**: below **Copy link to "Part 2"** is **Which outline entry is this? (added by a listener)**. Then select some text on a page and right-click it: below Obsidian's **Copy** and quote items is **Which page is this? (added by a listener)** again, on the desktop app only, as Obsidian shows a page no menu on mobile. Then stop:

```code-button
---
caption: Stop listening to the PDF menus
---
require('/demoSetup.ts').stopListeningToPdfMenus();
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

## Try the callout and plugin settings tab ones

These are shown a moment after the right-click too. Start listening:

```code-button
---
caption: Start listening to the callout and plugin settings tab menus
---
require('/demoSetup.ts').startListeningToCalloutAndPluginSettingTabMenus(app);
```

Now, in Live Preview, right-click the callout below: below Obsidian's **Edit** and **Callout type** is **Which callout is this? (added by a listener)**, and clicking it names the callout's type and line.

> [!tip] Right-click me
> This callout is here to be right-clicked.

Then open **Settings** and right-click a plugin's tab in the sidebar, such as **File recovery** under **Core plugins** or one of your own under **Community plugins**: below Obsidian's **Reveal in plugin list** is **Which plugin is this? (added by a listener)**. Then stop:

```code-button
---
caption: Stop listening to the callout and plugin settings tab menus
---
require('/demoSetup.ts').stopListeningToCalloutAndPluginSettingTabMenus();
```

## Try the table ones

A table cell's menu is shown a moment after the right-click as well, and a drag handle's is shown twice, once at once and once a moment later. Start listening:

```code-button
---
caption: Start listening to the table menus
---
require('/demoSetup.ts').startListeningToTableMenus(app);
```

Now, in Live Preview, right-click a cell of the table below that you are not typing in: below Obsidian's **Row** and **Column** is **Which cell is this? (added by a listener)**, and clicking it names the cell's row and column and the table's line. Then hover a cell and right-click the grip that appears above a column or left of a row: below Obsidian's own items is **Which handle is this? (added by a listener)**.

| Planet  | Moons |
| ------- | ----- |
| Mercury | 0     |
| Earth   | 1     |
| Mars    | 2     |

Then stop:

```code-button
---
caption: Stop listening to the table menus
---
require('/demoSetup.ts').stopListeningToTableMenus();
```

## Try the property value and Bases column ones

These two menus are also shown a moment after the right-click. Start listening:

```code-button
---
caption: Start listening to the property value and Bases column menus
---
require('/demoSetup.ts').startListeningToPropertyValueAndBasesColumnMenus(app);
```

Now right-click one of the values of `demo-topics` in this note's properties, at the top: below Obsidian's **Edit**, **Copy** and **Remove from list** is **Which value is this? (added by a listener)**, and clicking it names the property, the value and its place in the list. Then open the demo base and right-click a column header of its table: below Obsidian's **Hide column** and the sort items is **Which column is this? (added by a listener)**.

```code-button
---
caption: Open the demo base
---
await require('/demoSetup.ts').openDemoBase(app);
```

Then stop:

```code-button
---
caption: Stop listening to the property value and Bases column menus
---
require('/demoSetup.ts').stopListeningToPropertyValueAndBasesColumnMenus();
```

## Try the property and CSS snippet ones

A property's own menu opens from its icon, on a click as well as a right-click, and a CSS snippet's row has a menu in **Settings -> Appearance -> CSS snippets** on the desktop app. Start listening:

```code-button
---
caption: Start listening to the property and CSS snippet menus
---
require('/demoSetup.ts').startListeningToPropertyAndCssSnippetMenus(app);
```

Now click the icon beside `demo-topics` in this note's properties, at the top: below Obsidian's **Property type**, clipboard items and **Remove** is **Which property is this? (added by a listener)**, and clicking it names the property. Then open **Settings -> Appearance -> CSS snippets** and right-click `more-events-demo`, a snippet this vault ships: below Obsidian's **Show in system explorer** (**Reveal in Finder** on macOS) is **Which snippet is this? (added by a listener)**.

Then stop:

```code-button
---
caption: Stop listening to the property and CSS snippet menus
---
require('/demoSetup.ts').stopListeningToPropertyAndCssSnippetMenus();
```

## Try the external image and board column ones

These two menus are shown a moment after the right-click too. The image below is embedded from a URL rather than from the vault, a `data:` URL, so it shows with no network; an image from the vault already fires Obsidian's own `file-menu` and is not announced again. Start listening:

```code-button
---
caption: Start listening to the external image and board column menus
---
require('/demoSetup.ts').startListeningToExternalImageAndBasesKanbanColumnMenus(app);
```

Now, in Live Preview, right-click the image below: below Obsidian's **Copy image**, **Remove image** and **Reset size** is **Which image is this? (added by a listener)**, and clicking it names the image's line and URL.

![Right-click me](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMTIwIj48cmVjdCB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEyMCIgcng9IjEyIiBmaWxsPSIjN2MzYWVkIi8+PHRleHQgeD0iMTIwIiB5PSI2OCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmYiPlJpZ2h0LWNsaWNrIG1lPC90ZXh0Pjwvc3ZnPg==)

Then open the demo base's board and right-click a column's empty area, below its cards: below Obsidian's **Add item**, **Hide column** and **Edit columns** is **Which column is this? (added by a listener)**, and clicking it names the value the column groups by.

```code-button
---
caption: Open the demo base's board
---
await require('/demoSetup.ts').openDemoBase(app, 'Demo board');
```

Then stop:

```code-button
---
caption: Stop listening to the external image and board column menus
---
require('/demoSetup.ts').stopListeningToExternalImageAndBasesKanbanColumnMenus();
```

## Try the vault name, tab and tab group ones

The vault name's menu raises nothing in Obsidian, while a tab's and a tab group's raise events of Obsidian's own that it documents nowhere, which `More Events` relays. Start listening:

```code-button
---
caption: Start listening to the vault name, tab and tab group menus
---
require('/demoSetup.ts').startListeningToVaultAndTabMenus(app);
```

Now right-click the vault name at the bottom of the left sidebar, on the desktop app: below Obsidian's **Show in system explorer** and **Copy path** is **Which vault is this? (added by a listener)**. Then right-click this note's tab header: among Obsidian's **Close** and split items is **Which tab is this? (added by a listener)**. Then click the chevron at the right end of the tab headers: below Obsidian's **Close all** is **Which tab group is this? (added by a listener)**, and clicking it names the tabs in the group.

Then stop:

```code-button
---
caption: Stop listening to the vault name, tab and tab group menus
---
require('/demoSetup.ts').stopListeningToVaultAndTabMenus();
```

## What the events promise

- **They fire before the menu opens**, after Obsidian has added its own items, so an item you add appears in the menu.
- **The bookmarks are Obsidian's own objects**, not copies, so the **Bookmarks** core plugin recognizes them if you hand them back to it. Read them; do not write to them.
- **The history entry is a copy**, a plain title and address, so writing to it changes nothing in Obsidian.

## Where they come from

Obsidian already raises an event for the bookmark menu, `bookmarks:bookmarks-menu`, and for the tab and tab group menus, `leaf-menu` and `tab-group-menu`, but documents and types them nowhere. `More Events` relays them under names it keeps stable, so a plugin that listens here keeps working if Obsidian renames its own.

The vault name menu, the bookmarks empty-area menu, the canvas background menu, the ribbon menu, the **All properties** menu, the History menu, the PDF thumbnail, outline and page menus, the sidebar toggle menu, the community plugin menu, the callout menu, the plugin settings tab menus, the table cell and drag handle menus, the property value menu, the Bases column header menu, a property's own menu, the CSS snippet menu, the external image menu and the board column menu raise nothing at all. `More Events` recognizes each as it is about to be shown, through one patch on `Menu`, and every later menu that fires no event goes through that same patch.
