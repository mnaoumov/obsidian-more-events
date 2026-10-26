/**
 * @file
 *
 * The runtime half of this plugin's published contract: the event names, the registry contract and its
 * version.
 *
 * The TYPES are not declared here. They live in the repo-root `api.d.ts`, which is the file a consumer
 * reads, and are imported from it so there is exactly one declaration of each and nothing to drift.
 */

import type { ApiContract } from '@mnaoumov/typescript-lib/api-contract';

import type {
  AllPropertiesMenuEventName,
  BookmarksMenuEventName,
  BookmarksViewMenuEventName,
  CanvasViewMenuEventName,
  CommunityPluginDisabledEventName,
  CommunityPluginEnabledEventName,
  CommunityPluginMenuEventName,
  CorePluginDisabledEventName,
  CorePluginEnabledEventName,
  PdfThumbnailMenuEventName,
  RibbonMenuEventName,
  SidebarToggleMenuEventName,
  WebViewerHistoryMenuEventName
} from '../api.d.ts';

import { MORE_EVENTS_API_CONTRACT } from '../api-contract.ts';

export type {
  AllPropertiesMenuEventName,
  BookmarkMenuItem,
  BookmarksMenuEventName,
  BookmarksViewMenuEventName,
  CanvasMenuPosition,
  CanvasViewMenuEventName,
  CommunityPluginDisabledEventName,
  CommunityPluginEnabledEventName,
  CommunityPluginEventName,
  CommunityPluginEventPayload,
  CommunityPluginMenuEventName,
  CorePluginDisabledEventName,
  CorePluginEnabledEventName,
  CorePluginEventName,
  CorePluginEventPayload,
  MoreEventsApi,
  PdfThumbnailMenuEventName,
  RibbonMenuEventName,
  RibbonSide,
  SidebarSide,
  SidebarToggleMenuEventName,
  WebViewerHistoryMenuEventName,
  WebViewerHistoryMenuItem
} from '../api.d.ts';

/**
 * Triggered on `app.workspace` when the context menu of a property in the **All properties** view is about to open.
 */
export const ALL_PROPERTIES_MENU_EVENT_NAME: AllPropertiesMenuEventName = 'more-events:all-properties-menu';

/**
 * Triggered on `app.workspace` when the context menu of one or more bookmarks is about to open.
 */
export const BOOKMARKS_MENU_EVENT_NAME: BookmarksMenuEventName = 'more-events:bookmarks-menu';

/**
 * Triggered on `app.workspace` when the context menu of the **Bookmarks** view's empty area is about to open.
 */
export const BOOKMARKS_VIEW_MENU_EVENT_NAME: BookmarksViewMenuEventName = 'more-events:bookmarks-view-menu';

/**
 * Triggered on `app.workspace` when the context menu of the **Canvas** view's empty background is about to open.
 */
export const CANVAS_VIEW_MENU_EVENT_NAME: CanvasViewMenuEventName = 'more-events:canvas-view-menu';

/**
 * Triggered on `app.workspace` after a community plugin has been disabled.
 */
export const COMMUNITY_PLUGIN_DISABLED_EVENT_NAME: CommunityPluginDisabledEventName = 'more-events:community-plugin-disabled';

/**
 * Triggered on `app.workspace` after a community plugin has been enabled.
 */
export const COMMUNITY_PLUGIN_ENABLED_EVENT_NAME: CommunityPluginEnabledEventName = 'more-events:community-plugin-enabled';

/**
 * Triggered on `app.workspace` when the context menu of a community plugin's row in **Settings -> Community plugins** is about to open.
 */
export const COMMUNITY_PLUGIN_MENU_EVENT_NAME: CommunityPluginMenuEventName = 'more-events:community-plugin-menu';

/**
 * Triggered on `app.workspace` after a core plugin has been disabled.
 */
export const CORE_PLUGIN_DISABLED_EVENT_NAME: CorePluginDisabledEventName = 'more-events:core-plugin-disabled';

/**
 * Triggered on `app.workspace` after a core plugin has been enabled.
 */
export const CORE_PLUGIN_ENABLED_EVENT_NAME: CorePluginEnabledEventName = 'more-events:core-plugin-enabled';

/**
 * Triggered on `app.workspace` when the context menu of a page thumbnail in the PDF view is about to open.
 */
export const PDF_THUMBNAIL_MENU_EVENT_NAME: PdfThumbnailMenuEventName = 'more-events:pdf-thumbnail-menu';

/**
 * Triggered on `app.workspace` when the context menu of the ribbon's empty area is about to open.
 */
export const RIBBON_MENU_EVENT_NAME: RibbonMenuEventName = 'more-events:ribbon-menu';

/**
 * Triggered on `app.workspace` when the context menu of a sidebar toggle button is about to open.
 */
export const SIDEBAR_TOGGLE_MENU_EVENT_NAME: SidebarToggleMenuEventName = 'more-events:sidebar-toggle-menu';

/**
 * Triggered on `app.workspace` when the context menu of an entry in the **Web viewer** History view is about to open.
 */
export const WEB_VIEWER_HISTORY_MENU_EVENT_NAME: WebViewerHistoryMenuEventName = 'more-events:web-viewer-history-menu';

/**
 * The contract this plugin publishes: the repo-root `api-contract.ts` constant a consumer copies, so the
 * provider and its consumers validate against one definition. Assigning it here is also what checks that
 * its schemas are Standard Schemas the registry accepts.
 */
export const PLUGIN_API_CONTRACT: ApiContract = MORE_EVENTS_API_CONTRACT;

/**
 * The version of the contract above — independent of the plugin's own version, so a consumer asks for
 * `'^1'` and keeps working across releases that change nothing it depends on.
 *
 * `1.4.0` rather than `2.0.0`, for the same reason every earlier step was a minor: the context-menu events
 * were ADDED and nothing already published changed its meaning, so a consumer written against any
 * `1.x` compiles and runs unaltered. The payloads are declared additive-only in `api.d.ts` precisely so
 * this stays a minor.
 *
 * The history: `1.0.0` was the core-plugin pair, `1.1.0` added the community-plugin pair, `1.2.0` added
 * `isUserInitiated` to both, `1.3.0` added the context-menu events: the bookmarks pair, the canvas view
 * one and the ribbon one, all in the same release, and `1.4.0` added the **All properties** and **Web viewer**
 * History item menus, the PDF view's thumbnail menu, the sidebar toggle buttons' menu and a community plugin's
 * settings row menu.
 */
export const PLUGIN_API_VERSION = '1.4.0';
