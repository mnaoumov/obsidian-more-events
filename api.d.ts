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
 * The name of the event triggered when the context menu of one or more bookmarks is about to open.
 */
export type BookmarksMenuEventName = 'more-events:bookmarks-menu';

/**
 * The name of the event triggered when the context menu of the **Bookmarks** view's empty area is about to
 * open — the right-click below the last bookmark, which offers **New group**.
 */
export type BookmarksViewMenuEventName = 'more-events:bookmarks-view-menu';

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

declare module 'obsidian' {
  interface Workspace {
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
  }
}
