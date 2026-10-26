/**
 * @file
 *
 * `More Events`' public surface, as a consumer sees it.
 *
 * Hand-written and self-contained on purpose: it imports from `obsidian` and nothing else, so a plugin that
 * has never heard of `@mnaoumov/obsidian-lib` can copy this file, or reference it, and depend on `More Events`
 * with no build-time dependency on this repo at all.
 *
 * Two things live here. The **events** — a `Workspace.on` overload plus the payloads they carry — which are
 * what most consumers want, and the **API** reached through the `@mnaoumov/obsidian-lib` plugin registry, which
 * answers the question the events cannot: what is enabled *right now*, before anything has changed. There
 * are two pairs of events, one for **core** plugins and one for **community** plugins, and they are
 * deliberately separate names rather than one pair with a kind flag: the two live in different managers,
 * their ids come from different namespaces, and almost every consumer wants exactly one of the two.
 *
 * The event NAMES are a wire contract and are spelled out as literal types rather than exported as
 * constants, because a declaration file has no runtime values to export: a consumer hardcodes the strings,
 * exactly as `@mnaoumov/obsidian-lib` tells third parties to hardcode its own broadcast's names. The payloads
 * are plain data for the same reason they are in that library — they cross between plugins that share no
 * code.
 */

import type {
  EventRef,
  Menu,
  WorkspaceLeaf
} from 'obsidian';

/**
 * The name of the event triggered when the context menu of a property in the **All properties** view is
 * about to open — the right-click on a property, which offers its types, **Rename** and **Delete**.
 */
export type AllPropertiesMenuEventName = 'more-events:all-properties-menu';

/**
 * One bookmark, as the **Bookmarks** core plugin stores it — the object a bookmarks context menu is for.
 *
 * It is Obsidian's own object rather than a copy, so it is the one the **Bookmarks** core plugin's
 * methods recognize: hand it to `removeItem`, or compare it by identity with the plugin's `items`. Treat
 * it as read-only; writing to it edits the bookmark without telling Obsidian.
 *
 * Declared here rather than imported, because the public `obsidian` typings do not describe bookmarks at
 * all. Additive only, like the other payloads in this file.
 */
export interface BookmarkMenuItem {
  /**
   * When the bookmark was created, in milliseconds since the epoch. The **Bookmarks** core plugin uses it
   * as the bookmark's identity, so it is unique within a vault.
   */
  readonly ctime: number;

  /**
   * The bookmarks inside a `group`. Absent for every other type.
   */
  readonly items?: readonly BookmarkMenuItem[];

  /**
   * The vault path of a `file` or `folder` bookmark.
   */
  readonly path?: string;

  /**
   * The search query of a `search` bookmark.
   */
  readonly query?: string;

  /**
   * The heading or block a `file` bookmark points into, such as `#Heading` or `#^block-id`.
   */
  readonly subpath?: string;

  /**
   * The title the user gave the bookmark. Absent or empty when the bookmark shows its target's own name.
   */
  readonly title?: string;

  /**
   * What the bookmark points at.
   */
  readonly type: 'file' | 'folder' | 'graph' | 'group' | 'search' | 'url';

  /**
   * The address of a `url` bookmark.
   */
  readonly url?: string;
}

/**
 * The name of the event triggered when the context menu of a column header in a Bases table is about to open —
 * the right-click on the header, which offers **Hide column**, **Edit property** and the sort items.
 */
export type BasesColumnMenuEventName = 'more-events:bases-column-menu';

/**
 * One column of a Bases table view — the column a column header menu is for.
 *
 * Plain data, read from the table when the menu opens, and additive only, like the other payloads in this file.
 */
export interface BasesColumnMenuItem {
  /**
   * The id of the property the column shows, as the base's `order` writes it: `note.status`, `file.name` or
   * `formula.total`.
   */
  readonly propertyId: string;

  /**
   * The name of the base's view the table renders, as the base's `views` list writes it.
   */
  readonly viewName: string;
}

/**
 * The name of the event triggered when the context menu of one or more bookmarks is about to open.
 */
export type BookmarksMenuEventName = 'more-events:bookmarks-menu';

/**
 * The name of the event triggered when the context menu of the **Bookmarks** view's empty area is about to
 * open — the right-click below the last bookmark, which offers **New group**.
 */
export type BookmarksViewMenuEventName = 'more-events:bookmarks-view-menu';

/**
 * The name of the event triggered when the context menu of a callout in a Live Preview editor is about to open
 * — the right-click on a rendered callout, which offers **Edit**, a **Callout type** submenu and **Delete**.
 */
export type CalloutMenuEventName = 'more-events:callout-menu';

/**
 * One callout in a Markdown note — the callout a callout menu is for.
 *
 * Plain data, read from the note when the menu opens, and additive only, like the other payloads in this file.
 */
export interface CalloutMenuItem {
  /**
   * The line of the callout's header, such as `> [!note] Title`, counted from 0 as `Editor.getLine` counts
   * it.
   */
  readonly line: number;

  /**
   * The callout's type, such as `note` or `warning`, as written in its header: the case is the note's, not
   * lowered.
   */
  readonly type: string;
}

/**
 * A point on a canvas, in the canvas's own coordinates: the ones a node's `x` and `y` are stored in, which
 * do not move when the view is panned or zoomed.
 *
 * Plain data, and additive only, like the other payloads in this file.
 */
export interface CanvasMenuPosition {
  /**
   * The horizontal coordinate, growing to the right.
   */
  readonly x: number;

  /**
   * The vertical coordinate, growing downwards.
   */
  readonly y: number;
}

/**
 * The name of the event triggered when the context menu of the **Canvas** view's empty background is about
 * to open — the right-click on no node, edge or selection, which offers **Add card** and the rest.
 */
export type CanvasViewMenuEventName = 'more-events:canvas-view-menu';

/**
 * The name of the event triggered after a community plugin has been disabled.
 */
export type CommunityPluginDisabledEventName = 'more-events:community-plugin-disabled';

/**
 * The name of the event triggered after a community plugin has been enabled.
 */
export type CommunityPluginEnabledEventName = 'more-events:community-plugin-enabled';

/**
 * Either community-plugin event name.
 */
export type CommunityPluginEventName = CommunityPluginDisabledEventName | CommunityPluginEnabledEventName;

/**
 * The payload both community-plugin events carry.
 *
 * Plain data, and additive only: a new member may be added, none may change meaning or be removed, because
 * a consumer compiled against an older copy of this file is still passed the same object.
 */
export interface CommunityPluginEventPayload {
  /**
   * The community plugin's id — the `id` from its `manifest.json`, which is also its folder name under
   * `.obsidian/plugins/` and the string `app.plugins.getPlugin` takes.
   */
  readonly communityPluginId: string;

  /**
   * The community plugin's display name, as Obsidian shows it in **Settings -> Community plugins**. Present
   * so a consumer can name the plugin in a notice without reaching into `app.plugins` for it.
   */
  readonly communityPluginName: string;

  /**
   * Whether Obsidian was told that this change came from the user.
   *
   * Obsidian carries its own flag for exactly this, one level below the signal these events are built on.
   * `Plugins.enablePlugin(id, isUserEnabled)` hands it to `loadPlugin`, which is what calls the plugin's
   * own `onUserEnable()`; `disablePlugin(id, isUserDisabled)` hands it to `unloadPlugin`, which is what
   * sets the plugin's `_userDisabled`. The toggle in **Settings -> Community plugins** reaches them
   * through `enablePluginAndSave` / `disablePluginAndSave`, which pass `true`. The `changed` signal
   * these events are built on carries no payload at all, so the flag is dropped; `More Events` recovers it.
   *
   * **It means one plugin's own toggle, which is narrower than "a person did it".** Obsidian passes
   * nothing when the master **Community plugins** switch unloads every plugin at once, and nothing when a
   * vault starts in restricted mode, so both report `false` although a person caused them. It is also a
   * claim rather than a proof: a plugin that calls `enablePluginAndSave` itself reports `true`, because
   * that is what Obsidian itself believes.
   *
   * `false` when nothing recorded the transition at all, which takes something moving
   * `app.plugins.plugins` without going through either method above.
   */
  readonly isUserInitiated: boolean;
}

/**
 * The name of the event triggered when the context menu of an installed community plugin's row in **Settings
 * -> Community plugins** is about to open — the right-click on the row, which offers **Hotkeys**, **View
 * details**, **Uninstall** and the rest.
 */
export type CommunityPluginMenuEventName = 'more-events:community-plugin-menu';

/**
 * The name of the event triggered when the context menu of a community plugin's tab in the Settings sidebar is
 * about to open — the right-click on the tab under **Community plugins**, which offers **Reveal in plugin
 * list**.
 */
export type CommunityPluginSettingTabMenuEventName = 'more-events:community-plugin-setting-tab-menu';

/**
 * The name of the event triggered after a core plugin has been disabled.
 */
export type CorePluginDisabledEventName = 'more-events:core-plugin-disabled';

/**
 * The name of the event triggered after a core plugin has been enabled.
 */
export type CorePluginEnabledEventName = 'more-events:core-plugin-enabled';

/**
 * Either core-plugin event name.
 */
export type CorePluginEventName = CorePluginDisabledEventName | CorePluginEnabledEventName;

/**
 * The name of the event triggered when the context menu of a core plugin's tab in the Settings sidebar is
 * about to open — the right-click on the tab under **Core plugins**, which offers **Reveal in plugin list**.
 */
export type CorePluginSettingTabMenuEventName = 'more-events:core-plugin-setting-tab-menu';

/**
 * The name of the event triggered when the context menu of a snippet's row on the **CSS snippets** page of
 * **Settings -> Appearance** is about to open — the right-click on the row, which offers **Show in system
 * explorer** (**Reveal in Finder** on macOS). Desktop only: Obsidian gives the row no menu on mobile.
 */
export type CssSnippetMenuEventName = 'more-events:css-snippet-menu';

/**
 * One CSS snippet — the snippet a CSS snippet menu is for.
 *
 * Plain data, read when the menu opens, and additive only, like the other payloads in this file.
 */
export interface CssSnippetMenuItem {
  /**
   * The snippet's name: its file name in `.obsidian/snippets` without `.css`, as `app.customCss.snippets` lists
   * it and as the row shows it.
   */
  readonly name: string;
}

/**
 * The payload both core-plugin events carry.
 *
 * Plain data, and additive only: a new member may be added, none may change meaning or be removed, because
 * a consumer compiled against an older copy of this file is still passed the same object.
 */
export interface CorePluginEventPayload {
  /**
   * The core plugin's id — `backlink`, `canvas`, `file-explorer` and so on. The same string
   * `app.internalPlugins.getPluginById` takes.
   */
  readonly corePluginId: string;

  /**
   * The core plugin's display name, as Obsidian shows it in **Settings -> Core plugins**. Present so a
   * consumer can name the plugin in a notice without reaching into `app.internalPlugins` for it.
   */
  readonly corePluginName: string;

  /**
   * Whether Obsidian was told that this change came from the user.
   *
   * Obsidian carries its own flag for exactly this: `InternalPlugin.enable(isEnabledByUser)` and
   * `.disable(isDisabledByUser)` take it, and it is what decides whether the core plugin's own
   * `onUserEnable()` / `onUserDisable()` hooks run. The toggle in **Settings -> Core plugins** passes
   * `true`. The `change` signal these events are built on drops it; `More Events` recovers it.
   *
   * **It means that plugin's own toggle, which is narrower than "a person did it"**, and it is a claim
   * rather than a proof: a plugin that calls `enable(true)` itself reports `true`, because that is what
   * Obsidian itself believes. Obsidian passes `false` when it enables the default core plugins at
   * startup.
   *
   * `false` when nothing recorded the transition at all, which takes something moving a core plugin
   * without going through either method above.
   */
  readonly isUserInitiated: boolean;
}

/**
 * `More Events`' API, published through the `@mnaoumov/obsidian-lib` plugin registry.
 *
 * The events say when something changed; this says what the state is. A consumer needs both — it has to
 * reconcile once when it loads, and again on each event, and the load-time answer is the one no event can
 * give it.
 */
export interface MoreEventsApi {
  /**
   * The ids of the community plugins that are loaded right now.
   *
   * A fresh array on each call, so writing to it changes nothing here.
   *
   * @returns The enabled community plugin ids.
   */
  getEnabledCommunityPluginIds(): string[];

  /**
   * The ids of the core plugins enabled right now.
   *
   * A fresh array on each call, so writing to it changes nothing here.
   *
   * @returns The enabled core plugin ids.
   */
  getEnabledCorePluginIds(): string[];

  /**
   * Whether the named community plugin is loaded right now.
   *
   * @param communityPluginId - The community plugin's id, as
   * {@link CommunityPluginEventPayload.communityPluginId} carries it.
   * @returns `true` when it is enabled.
   */
  isCommunityPluginEnabled(communityPluginId: string): boolean;

  /**
   * Whether the named core plugin is enabled right now.
   *
   * @param corePluginId - The core plugin's id, as {@link CorePluginEventPayload.corePluginId} carries it.
   * @returns `true` when it is enabled.
   */
  isCorePluginEnabled(corePluginId: string): boolean;
}

/**
 * The name of the event triggered when the context menu of an item in the PDF view's outline is about to open —
 * the right-click on a heading in the sidebar's outline, which offers **Copy link to section**.
 */
export type PdfOutlineMenuEventName = 'more-events:pdf-outline-menu';

/**
 * One item of a PDF's outline — the item a PDF outline menu is for.
 *
 * Plain data, read when the menu opens, and additive only, like the other payloads in this file.
 */
export interface PdfOutlineMenuItem {
  /**
   * The number of the page the item points to, counted from 1 as in a `#page=` link.
   */
  readonly pageNumber: number;

  /**
   * The item's title, as the PDF stores it and as the outline shows it.
   */
  readonly title: string;
}

/**
 * The name of the event triggered when the context menu of a page in the PDF view is about to open — the
 * right-click on a page, which offers **Copy** for a text selection, the selection's quote and link items, and the
 * annotation items when it lands on an annotation. Desktop only: Obsidian gives a page no menu on mobile.
 */
export type PdfPageMenuEventName = 'more-events:pdf-page-menu';

/**
 * The name of the event triggered when the context menu of a page thumbnail in the PDF view's sidebar is
 * about to open — the right-click on a thumbnail, which offers **Copy link to page**.
 */
export type PdfThumbnailMenuEventName = 'more-events:pdf-thumbnail-menu';

/**
 * The name of the event triggered when a property's own menu is about to open — the right-click or the click on
 * the property's icon in the properties editor, which offers **Property type**, the clipboard items and
 * **Remove**.
 */
export type PropertyMenuEventName = 'more-events:property-menu';

/**
 * One property — the property a property menu is for.
 *
 * Plain data, read from the properties editor when the menu opens, and additive only, like the other payloads
 * in this file.
 */
export interface PropertyMenuItem {
  /**
   * The property's key, as written in the note: the case is the note's, not lowered.
   */
  readonly key: string;
}

/**
 * The name of the event triggered when the context menu of one value of a list or tags property is about to
 * open — the right-click on the value's pill in the properties editor, which offers **Edit**, **Copy** and
 * **Remove from list**.
 */
export type PropertyValueMenuEventName = 'more-events:property-value-menu';

/**
 * One value of a list or tags property — the value a property value menu is for.
 *
 * Plain data, read from the properties editor when the menu opens, and additive only, like the other payloads
 * in this file.
 */
export interface PropertyValueMenuItem {
  /**
   * The value's place in the property's list, counted from 0.
   */
  readonly index: number;

  /**
   * The property's key, as written in the note: the case is the note's, not lowered.
   */
  readonly key: string;

  /**
   * The value as text, as Obsidian's own **Copy** item copies it.
   */
  readonly value: string;
}

/**
 * The name of the event triggered when the context menu of the ribbon's empty area is about to open — the
 * right-click below its icons, which offers a checkbox per ribbon action and **Hide ribbon**.
 */
export type RibbonMenuEventName = 'more-events:ribbon-menu';

/**
 * Which ribbon a ribbon menu belongs to. `left` is the one with the icons. `right` is the narrow strip at the
 * right edge that Obsidian shows while the right sidebar holds a tab; it has no icons, so its menu offers
 * only **Hide ribbon**.
 */
export type RibbonSide = 'left' | 'right';

/**
 * Which sidebar a sidebar toggle button opens and closes.
 */
export type SidebarSide = 'left' | 'right';

/**
 * The name of the event triggered when the context menu of a sidebar toggle button is about to open — the
 * right-click on the button at the top of a sidebar, which offers a checkbox for that sidebar, and on the left
 * one for the ribbon too.
 */
export type SidebarToggleMenuEventName = 'more-events:sidebar-toggle-menu';

/**
 * The name of the event triggered when the context menu of a table cell in a Live Preview editor is about to
 * open — the right-click on a cell that is not the one being edited, which offers **Row** and **Column**
 * submenus and the sort items, or on a cell of a cell selection, which offers the selection's items.
 */
export type TableCellMenuEventName = 'more-events:table-cell-menu';

/**
 * One cell of a Live Preview table, and the table it is in — the cell a table cell menu is for.
 *
 * Plain data, read from the rendered table when the menu opens, and additive only, like the other payloads in
 * this file.
 */
export interface TableCellMenuItem extends TableCellPosition {
  /**
   * The line of the table's header row, counted from 0 as `Editor.getLine` counts it.
   */
  readonly line: number;

  /**
   * The selected cells, row by row, when the table has a cell selection; the menu then acts on them. Empty when
   * it has none.
   */
  readonly selectedCells: readonly TableCellPosition[];
}

/**
 * Where a cell is in its table.
 */
export interface TableCellPosition {
  /**
   * The cell's column, counted from 0.
   */
  readonly column: number;

  /**
   * The cell's row, counted from 0 for the header row. The delimiter row (`| --- |`) is not counted, so row `n`
   * of a table whose header row is on line `line` is on line `line + n + 1` for every `n` above 0.
   */
  readonly row: number;
}

/**
 * What a table's drag handle moves: a column, from the handle above its header cell, or a row, from the handle
 * left of its first cell.
 */
export type TableHandleAxis = 'column' | 'row';

/**
 * The name of the event triggered when the context menu of a table's row or column drag handle in a Live
 * Preview editor is about to open — the right-click on the grip, which offers the row items, or the sort and
 * column items.
 */
export type TableHandleMenuEventName = 'more-events:table-handle-menu';

/**
 * One drag handle of a Live Preview table, and the table it is in — the handle a table handle menu is for.
 *
 * Plain data, read from the rendered table when the menu opens, and additive only, like the other payloads in
 * this file.
 */
export interface TableHandleMenuItem {
  /**
   * Whether the handle moves a column or a row.
   */
  readonly axis: TableHandleAxis;

  /**
   * The column or the row the handle moves, counted from 0 as {@link TableCellPosition} counts them.
   */
  readonly index: number;

  /**
   * The line of the table's header row, counted from 0 as `Editor.getLine` counts it.
   */
  readonly line: number;
}

/**
 * The name of the event triggered when the context menu of an entry in the **Web viewer** core plugin's
 * History view is about to open — the right-click on a visited page, which offers **Copy URL** and **Remove
 * from history**.
 */
export type WebViewerHistoryMenuEventName = 'more-events:web-viewer-history-menu';

/**
 * One entry of the **Web viewer** core plugin's history — the page a History view menu is for.
 *
 * A plain copy of the stored entry, so writing to it changes nothing in Obsidian. Additive only, like the
 * other payloads in this file.
 */
export interface WebViewerHistoryMenuItem {
  /**
   * The page's title when it was visited. Empty when the page had none.
   */
  readonly title: string;

  /**
   * The page's address.
   */
  readonly url: string;
}

declare module 'obsidian' {
  interface Workspace {
    /**
     * Subscribes to the context menu of a property in the **All properties** view.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown.
     *
     * @param name - Should be `'more-events:all-properties-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the **All properties** view, and
     * the names of the properties the menu acts on: every selected one when the user right-clicks a
     * property that is part of a multiple selection, otherwise the one right-clicked. Never empty.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    /*
     * An augmentation of an EXISTING overload set has to stay a method signature. A property member does not
     * merge into `Workspace.on`'s overloads, and the failure surfaces at every call site rather than here.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: AllPropertiesMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, propertyNames: readonly string[]) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a column header in a Bases table view.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, for a
     * right-click on the header of a table in a base opened in its own tab. A base embedded in a note is not
     * announced, and neither is the header's tap on mobile, which opens the same menu.
     *
     * @param name - Should be `'more-events:bases-column-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the **Bases** view (its `view.file`
     * is the base), and the column.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: BasesColumnMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, column: BasesColumnMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of one or more bookmarks in the **Bookmarks** view.
     *
     * Shaped like Obsidian's own `files-menu`: add items to `menu` and they appear in it. Triggered before
     * the menu is shown, after Obsidian has added its own items.
     *
     * @param name - Should be `'more-events:bookmarks-menu'`.
     * @param callback - The callback receiving the menu, and the bookmarks it is for: one, or every selected
     * one when the user right-clicks a multiple selection. Never empty.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    /*
     * An augmentation of an EXISTING overload set has to stay a method signature. A property member does not
     * merge into `Workspace.on`'s overloads, and the failure surfaces at every call site rather than here.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: BookmarksMenuEventName, callback: (menu: Menu, bookmarks: readonly BookmarkMenuItem[]) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of the **Bookmarks** view's empty area, below its last bookmark.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own **New group**.
     *
     * @param name - Should be `'more-events:bookmarks-view-menu'`.
     * @param callback - The callback receiving the menu, and the leaf holding the **Bookmarks** view.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: BookmarksViewMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a callout in a Live Preview editor.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, for a
     * right-click on a rendered callout in a Markdown view. A callout in another editor, such as a canvas card's,
     * and one in Reading view are not announced.
     *
     * @param name - Should be `'more-events:callout-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the Markdown view (its `view.editor`
     * is the editor the callout is in), and the callout.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CalloutMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, callout: CalloutMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of the **Canvas** view's empty background.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered only where Obsidian shows
     * that menu: on an editable canvas, for a right-click on no node, edge or selection. A canvas embedded
     * in a note or shown in a hover popover is not announced.
     *
     * @param name - Should be `'more-events:canvas-view-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the **Canvas** view, and the
     * point that was right-clicked in canvas coordinates — where a node created from the menu belongs.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CanvasViewMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, position: CanvasMenuPosition) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to a community plugin being enabled or disabled.
     *
     * **Enabled here means LOADED** — the plugin's code is running and `app.plugins.getPlugin(id)` answers
     * with it. That is deliberately not the same as membership of `app.plugins.enabledPlugins`, which is
     * the persisted config and can name a plugin that is not running at all: switching **Community
     * plugins** off in Settings unloads every one of them without touching that set, and so does starting
     * Obsidian in restricted mode.
     *
     * Triggered after the change has happened, so `getEnabledCommunityPluginIds()` already reflects it.
     * Nothing is triggered for the community plugins that were already loaded when `More Events` loaded —
     * read those from the API instead.
     *
     * @param name - Should be `'more-events:community-plugin-enabled'` or
     * `'more-events:community-plugin-disabled'`.
     * @param callback - The callback receiving the community plugin's payload.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    /*
     * An augmentation of an EXISTING overload set has to stay a method signature. A property member does not
     * merge into `Workspace.on`'s overloads, and the failure surfaces at every call site rather than here.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CommunityPluginEventName, callback: (payload: CommunityPluginEventPayload) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of an installed community plugin's row in **Settings -> Community plugins**.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, for a
     * right-click on the row. The row's **More options** button opens the same menu without a right-click, and
     * is not announced.
     *
     * @param name - Should be `'more-events:community-plugin-menu'`.
     * @param callback - The callback receiving the menu, and the community plugin's id, as
     * {@link CommunityPluginEventPayload.communityPluginId} carries it. Its manifest is in `app.plugins.manifests`.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CommunityPluginMenuEventName, callback: (menu: Menu, communityPluginId: string) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a community plugin's tab in the Settings sidebar.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown. A core
     * plugin's tab triggers `'more-events:core-plugin-setting-tab-menu'` instead.
     *
     * @param name - Should be `'more-events:community-plugin-setting-tab-menu'`.
     * @param callback - The callback receiving the menu, and the community plugin's id, as
     * {@link CommunityPluginEventPayload.communityPluginId} carries it.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CommunityPluginSettingTabMenuEventName, callback: (menu: Menu, communityPluginId: string) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to a core plugin being enabled or disabled.
     *
     * Triggered after the change has happened, so `getEnabledCorePluginIds()` already reflects it. Nothing
     * is triggered for the core plugins that were already enabled when `More Events` loaded — read those
     * from the API instead.
     *
     * @param name - Should be `'more-events:core-plugin-enabled'` or `'more-events:core-plugin-disabled'`.
     * @param callback - The callback receiving the core plugin's payload.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    /*
     * An augmentation of an EXISTING overload set has to stay a method signature. A property member does not
     * merge into `Workspace.on`'s overloads, and the failure surfaces at every call site rather than here.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CorePluginEventName, callback: (payload: CorePluginEventPayload) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a core plugin's tab in the Settings sidebar.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown. A
     * community plugin's tab triggers `'more-events:community-plugin-setting-tab-menu'` instead.
     *
     * @param name - Should be `'more-events:core-plugin-setting-tab-menu'`.
     * @param callback - The callback receiving the menu, and the core plugin's id, as
     * {@link CorePluginEventPayload.corePluginId} carries it.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CorePluginSettingTabMenuEventName, callback: (menu: Menu, corePluginId: string) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a snippet's row on the **CSS snippets** page of **Settings -> Appearance**.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, on the
     * desktop app only, where Obsidian gives the row its menu.
     *
     * @param name - Should be `'more-events:css-snippet-menu'`.
     * @param callback - The callback receiving the menu, and the snippet. Its path is
     * `app.customCss.getSnippetPath(snippet.name)`.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CssSnippetMenuEventName, callback: (menu: Menu, snippet: CssSnippetMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of an item in the PDF view's outline.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown,
     * for a PDF opened in its own tab, and only for an item that points to a page, as Obsidian shows no menu for
     * any other. A PDF embedded in a note is not announced.
     *
     * @param name - Should be `'more-events:pdf-outline-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the PDF view (its `view.file` is
     * the PDF), and the outline item.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: PdfOutlineMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, outlineItem: PdfOutlineMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a page in the PDF view.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown,
     * on the desktop app only, for a PDF opened in its own tab. A PDF embedded in a note is not announced. The
     * text selection the menu offers to copy is still the window's selection when the event is triggered.
     *
     * @param name - Should be `'more-events:pdf-page-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the PDF view (its `view.file` is
     * the PDF), and the number of the page right-clicked, counted from 1 as in a `#page=` link.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: PdfPageMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, pageNumber: number) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a page thumbnail in the PDF view's sidebar.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown,
     * for a PDF opened in its own tab. A PDF embedded in a note is not announced.
     *
     * @param name - Should be `'more-events:pdf-thumbnail-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the PDF view (its `view.file` is
     * the PDF), and the number of the page right-clicked, counted from 1 as in a `#page=` link.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: PdfThumbnailMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, pageNumber: number) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to a property's own menu in the properties editor, the one its icon opens.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, for a
     * right-click or a click on the property's icon in a Markdown view's properties or in the **Properties** view.
     * A properties editor shown outside a tab, such as a hover popover's, is not announced.
     *
     * @param name - Should be `'more-events:property-menu'`.
     * @param callback - The callback receiving the menu, the leaf whose view shows the properties (its
     * `view.file` is the note), and the property.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: PropertyMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, property: PropertyMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of one value of a list or tags property in the properties editor.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, for a
     * right-click on a value's pill in a Markdown view's properties or in the **Properties** view. A properties
     * editor shown outside a tab, such as a hover popover's, is not announced.
     *
     * @param name - Should be `'more-events:property-value-menu'`.
     * @param callback - The callback receiving the menu, the leaf whose view shows the properties (its
     * `view.file` is the note), and the value.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: PropertyValueMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, value: PropertyValueMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of the ribbon's empty area, below its icons.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. A ribbon icon has no context menu
     * at all, so nothing is triggered for one.
     *
     * @param name - Should be `'more-events:ribbon-menu'`.
     * @param callback - The callback receiving the menu, and which ribbon it belongs to.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: RibbonMenuEventName, callback: (menu: Menu, side: RibbonSide) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a sidebar toggle button.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown.
     *
     * @param name - Should be `'more-events:sidebar-toggle-menu'`.
     * @param callback - The callback receiving the menu, and which sidebar the button toggles.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: SidebarToggleMenuEventName, callback: (menu: Menu, side: SidebarSide) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a table cell in a Live Preview editor.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, for a
     * right-click on a cell of a table in a Markdown view that is not the cell being edited, or that is part of a
     * cell selection. A right-click in the cell being edited opens the editor menu, which Obsidian announces as
     * `editor-menu`, and is not announced here.
     *
     * @param name - Should be `'more-events:table-cell-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the Markdown view (its `view.editor`
     * is the editor the table is in), and the cell.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: TableCellMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, cell: TableCellMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of a table's row or column drag handle in a Live Preview editor.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown, for a
     * right-click on a handle of a table in a Markdown view.
     *
     * @param name - Should be `'more-events:table-handle-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the Markdown view (its `view.editor`
     * is the editor the table is in), and the handle.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: TableHandleMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, handle: TableHandleMenuItem) => unknown, context?: unknown): EventRef;

    /**
     * Subscribes to the context menu of an entry in the **Web viewer** core plugin's History view.
     *
     * Add items to `menu` and they appear in it, after Obsidian's own. Triggered before the menu is shown.
     *
     * @param name - Should be `'more-events:web-viewer-history-menu'`.
     * @param callback - The callback receiving the menu, the leaf holding the History view, and the history
     * entry right-clicked.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: WebViewerHistoryMenuEventName, callback: (menu: Menu, leaf: WorkspaceLeaf, historyItem: WebViewerHistoryMenuItem) => unknown, context?: unknown): EventRef;
  }
}
