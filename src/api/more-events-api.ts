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
  BasesColumnMenuEventName,
  BasesKanbanColumnMenuEventName,
  BasesViewMenuEventName,
  BookmarksMenuEventName,
  BookmarksViewMenuEventName,
  CalloutMenuEventName,
  CanvasEdgeMenuEventName,
  CanvasNodeConnectionDropMenuEventName,
  CanvasNodeMenuEventName,
  CanvasSelectionMenuEventName,
  CanvasViewMenuEventName,
  CommunityPluginDisabledEventName,
  CommunityPluginEnabledEventName,
  CommunityPluginMenuEventName,
  CommunityPluginSettingTabMenuEventName,
  CorePluginDisabledEventName,
  CorePluginEnabledEventName,
  CorePluginSettingTabMenuEventName,
  CssSnippetMenuEventName,
  ExternalImageMenuEventName,
  FileExplorerRootMenuEventName,
  HistoryMenuEventName,
  LeafMenuEventName,
  MarkdownPropertiesMenuEventName,
  MarkdownViewportMenuEventName,
  PdfOutlineMenuEventName,
  PdfPageMenuEventName,
  PdfThumbnailMenuEventName,
  PropertyMenuEventName,
  PropertyValueMenuEventName,
  RibbonMenuEventName,
  SearchResultsMenuEventName,
  SidebarToggleMenuEventName,
  TabGroupMenuEventName,
  TableCellMenuEventName,
  TableHandleMenuEventName,
  VaultMenuEventName,
  WebViewerHistoryMenuEventName
} from '../../api.d.ts';

import { MORE_EVENTS_API_CONTRACT } from '../../api-contract.ts';

export type {
  AllPropertiesMenuEventName,
  BasesColumnMenuEventName,
  BasesColumnMenuItem,
  BasesKanbanColumnMenuEventName,
  BasesKanbanColumnMenuItem,
  BasesViewMenuEventName,
  BookmarkMenuItem,
  BookmarksMenuEventName,
  BookmarksViewMenuEventName,
  CalloutMenuEventName,
  CalloutMenuItem,
  CanvasEdgeMenuEventName,
  CanvasMenuPosition,
  CanvasMenuSelection,
  CanvasNodeConnectionDrop,
  CanvasNodeConnectionDropMenuEventName,
  CanvasNodeMenuEventName,
  CanvasSelectionMenuEventName,
  CanvasViewMenuEventName,
  CommunityPluginDisabledEventName,
  CommunityPluginEnabledEventName,
  CommunityPluginEventName,
  CommunityPluginEventPayload,
  CommunityPluginMenuEventName,
  CommunityPluginSettingTabMenuEventName,
  CorePluginDisabledEventName,
  CorePluginEnabledEventName,
  CorePluginEventName,
  CorePluginEventPayload,
  CorePluginSettingTabMenuEventName,
  CssSnippetMenuEventName,
  CssSnippetMenuItem,
  ExternalImageMenuEventName,
  ExternalImageMenuItem,
  FileExplorerRootMenuEventName,
  FileExplorerRootMenuSpot,
  HistoryMenuDirection,
  HistoryMenuEventName,
  LeafMenuEventName,
  MarkdownPropertiesMenuEventName,
  MarkdownViewportMenuEventName,
  MoreEventsApi,
  PdfOutlineMenuEventName,
  PdfOutlineMenuItem,
  PdfPageMenuEventName,
  PdfThumbnailMenuEventName,
  PropertyMenuEventName,
  PropertyMenuItem,
  PropertyValueMenuEventName,
  PropertyValueMenuItem,
  RibbonMenuEventName,
  RibbonSide,
  SearchResultsMenuEventName,
  SidebarSide,
  SidebarToggleMenuEventName,
  TabGroupMenuEventName,
  TableCellMenuEventName,
  TableCellMenuItem,
  TableCellPosition,
  TableHandleAxis,
  TableHandleMenuEventName,
  TableHandleMenuItem,
  VaultMenuEventName,
  WebViewerHistoryMenuEventName,
  WebViewerHistoryMenuItem
} from '../../api.d.ts';

/**
 * Triggered on `app.workspace` when the context menu of a property in the **All properties** view is about to open.
 */
export const ALL_PROPERTIES_MENU_EVENT_NAME: AllPropertiesMenuEventName = 'more-events:all-properties-menu';

/**
 * Triggered on `app.workspace` when the context menu of a column header in a Bases table is about to open.
 */
export const BASES_COLUMN_MENU_EVENT_NAME: BasesColumnMenuEventName = 'more-events:bases-column-menu';

/**
 * Triggered on `app.workspace` when the context menu of a column in a Bases board view is about to open.
 */
export const BASES_KANBAN_COLUMN_MENU_EVENT_NAME: BasesKanbanColumnMenuEventName = 'more-events:bases-kanban-column-menu';

/**
 * Triggered on `app.workspace` when the **More options** menu of a Bases view's configuration page is about to open.
 */
export const BASES_VIEW_MENU_EVENT_NAME: BasesViewMenuEventName = 'more-events:bases-view-menu';

/**
 * Triggered on `app.workspace` when the context menu of one or more bookmarks is about to open.
 */
export const BOOKMARKS_MENU_EVENT_NAME: BookmarksMenuEventName = 'more-events:bookmarks-menu';

/**
 * Triggered on `app.workspace` when the context menu of the **Bookmarks** view's empty area is about to open.
 */
export const BOOKMARKS_VIEW_MENU_EVENT_NAME: BookmarksViewMenuEventName = 'more-events:bookmarks-view-menu';

/**
 * Triggered on `app.workspace` when the context menu of a callout in a Live Preview editor is about to open.
 */
export const CALLOUT_MENU_EVENT_NAME: CalloutMenuEventName = 'more-events:callout-menu';

/**
 * Triggered on `app.workspace` when the context menu of a connection on a canvas is about to open.
 */
export const CANVAS_EDGE_MENU_EVENT_NAME: CanvasEdgeMenuEventName = 'more-events:canvas-edge-menu';

/**
 * Triggered on `app.workspace` when the menu shown after a connection is dragged out of a canvas node onto empty
 * canvas is about to open.
 */
export const CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME: CanvasNodeConnectionDropMenuEventName = 'more-events:canvas-node-connection-drop-menu';

/**
 * Triggered on `app.workspace` when the context menu of a single node on a canvas is about to open.
 */
export const CANVAS_NODE_MENU_EVENT_NAME: CanvasNodeMenuEventName = 'more-events:canvas-node-menu';

/**
 * Triggered on `app.workspace` when the context menu of a selection on a canvas is about to open.
 */
export const CANVAS_SELECTION_MENU_EVENT_NAME: CanvasSelectionMenuEventName = 'more-events:canvas-selection-menu';

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
 * Triggered on `app.workspace` when the context menu of a community plugin's tab in the Settings sidebar is about to open.
 */
export const COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME: CommunityPluginSettingTabMenuEventName = 'more-events:community-plugin-setting-tab-menu';

/**
 * Triggered on `app.workspace` after a core plugin has been disabled.
 */
export const CORE_PLUGIN_DISABLED_EVENT_NAME: CorePluginDisabledEventName = 'more-events:core-plugin-disabled';

/**
 * Triggered on `app.workspace` after a core plugin has been enabled.
 */
export const CORE_PLUGIN_ENABLED_EVENT_NAME: CorePluginEnabledEventName = 'more-events:core-plugin-enabled';

/**
 * Triggered on `app.workspace` when the context menu of a core plugin's tab in the Settings sidebar is about to open.
 */
export const CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME: CorePluginSettingTabMenuEventName = 'more-events:core-plugin-setting-tab-menu';

/**
 * Triggered on `app.workspace` when the context menu of a snippet's row on the **CSS snippets** page of **Settings -> Appearance** is about to open.
 */
export const CSS_SNIPPET_MENU_EVENT_NAME: CssSnippetMenuEventName = 'more-events:css-snippet-menu';

/**
 * Triggered on `app.workspace` when the context menu of an external image in a Live Preview editor is about to open.
 */
export const EXTERNAL_IMAGE_MENU_EVENT_NAME: ExternalImageMenuEventName = 'more-events:external-image-menu';

/**
 * Triggered on `app.workspace` when the history menu of a view's back or forward button is about to open.
 */
export const HISTORY_MENU_EVENT_NAME: HistoryMenuEventName = 'more-events:history-menu';

/**
 * Triggered on `app.workspace` when a leaf's menu, from its tab header or its view's **More options** button, is about to open.
 */
export const LEAF_MENU_EVENT_NAME: LeafMenuEventName = 'more-events:leaf-menu';

/**
 * Triggered on `app.workspace` when the menu of a note's **Properties** heading is about to open.
 */
export const MARKDOWN_PROPERTIES_MENU_EVENT_NAME: MarkdownPropertiesMenuEventName = 'more-events:markdown-properties-menu';

/**
 * Triggered on `app.workspace` when a note's viewport menu, from a right-click in its margin, is about to open.
 */
export const MARKDOWN_VIEWPORT_MENU_EVENT_NAME: MarkdownViewportMenuEventName = 'more-events:markdown-viewport-menu';

/**
 * Triggered on `app.workspace` when the context menu of an item in the PDF view's outline is about to open.
 */
export const PDF_OUTLINE_MENU_EVENT_NAME: PdfOutlineMenuEventName = 'more-events:pdf-outline-menu';

/**
 * Triggered on `app.workspace` when the context menu of a page in the PDF view is about to open.
 */
export const PDF_PAGE_MENU_EVENT_NAME: PdfPageMenuEventName = 'more-events:pdf-page-menu';

/**
 * Triggered on `app.workspace` when the context menu of a page thumbnail in the PDF view is about to open.
 */
export const PDF_THUMBNAIL_MENU_EVENT_NAME: PdfThumbnailMenuEventName = 'more-events:pdf-thumbnail-menu';

/**
 * Triggered on `app.workspace` when a property's own menu, the one its icon opens, is about to open.
 */
export const PROPERTY_MENU_EVENT_NAME: PropertyMenuEventName = 'more-events:property-menu';

/**
 * Triggered on `app.workspace` when the context menu of one value of a list or tags property is about to open.
 */
export const PROPERTY_VALUE_MENU_EVENT_NAME: PropertyValueMenuEventName = 'more-events:property-value-menu';

/**
 * Triggered on `app.workspace` when the context menu of the ribbon's empty area is about to open.
 */
export const RIBBON_MENU_EVENT_NAME: RibbonMenuEventName = 'more-events:ribbon-menu';

/**
 * Triggered on `app.workspace` when the **Search** view's results menu is about to open.
 */
export const SEARCH_RESULTS_MENU_EVENT_NAME: SearchResultsMenuEventName = 'more-events:search-results-menu';

/**
 * Triggered on `app.workspace` when the context menu of a sidebar toggle button is about to open.
 */
export const SIDEBAR_TOGGLE_MENU_EVENT_NAME: SidebarToggleMenuEventName = 'more-events:sidebar-toggle-menu';

/**
 * Triggered on `app.workspace` when a tab group's tab list menu is about to open.
 */
export const TAB_GROUP_MENU_EVENT_NAME: TabGroupMenuEventName = 'more-events:tab-group-menu';

/**
 * Triggered on `app.workspace` when the context menu of a table cell in a Live Preview editor is about to open.
 */
export const TABLE_CELL_MENU_EVENT_NAME: TableCellMenuEventName = 'more-events:table-cell-menu';

/**
 * Triggered on `app.workspace` when the context menu of a table's row or column drag handle in a Live Preview editor is about to open.
 */
export const TABLE_HANDLE_MENU_EVENT_NAME: TableHandleMenuEventName = 'more-events:table-handle-menu';

/**
 * Triggered on `app.workspace` when the context menu of the vault name at the bottom of the left sidebar is about to open.
 */
export const VAULT_MENU_EVENT_NAME: VaultMenuEventName = 'more-events:vault-menu';

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
 * History item menus, the PDF view's thumbnail, outline item and page menus, the sidebar toggle buttons' menu, a community plugin's
 * settings row menu, a callout's menu, the core and community plugin settings tab menus, a Live Preview
 * table's cell and drag handle menus, a property value's menu, a Bases table column header's menu, a property's own
 * menu, a CSS snippet row's menu, an external image's menu, a Bases board column's menu, the vault name's menu and a view's back and forward button history menus, and
 * the relays of Obsidian's own `leaf-menu`, `tab-group-menu`, `search:results-menu`, `markdown-viewport-menu`,
 * `markdown-properties-menu`, `canvas:node-menu`, `canvas:edge-menu` and `canvas:selection-menu`.
 */
export const PLUGIN_API_VERSION = '1.4.0';

/**
 * The File Explorer vault-root context-menu event.
 */
export const FILE_EXPLORER_ROOT_MENU_EVENT_NAME: FileExplorerRootMenuEventName = 'more-events:file-explorer-root-menu';
