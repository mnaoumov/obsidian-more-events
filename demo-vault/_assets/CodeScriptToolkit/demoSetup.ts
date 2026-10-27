import type {
  App,
  Menu,
  WorkspaceLeaf
} from 'obsidian';

import {
  Component,
  Notice
} from 'obsidian';
import { watchPluginApi } from '@mnaoumov/obsidian-lib/plugin/plugin-api';

/**
 * A copy of the declaration from the plugin's repo-root `api.d.ts`.
 *
 * Copied rather than imported, and that is the point being demonstrated as well as a practicality: this
 * script runs inside the vault, where the repo is not resolvable, and a consumer plugin is in the same
 * position. Copying the declaration is the supported route — it is why that file imports nothing.
 */
interface MoreEventsApi {
  getEnabledCommunityPluginIds(): string[];
  getEnabledCorePluginIds(): string[];
  isCommunityPluginEnabled(communityPluginId: string): boolean;
  isCorePluginEnabled(corePluginId: string): boolean;
}

const PLUGIN_ID = 'more-events';
const COMMUNITY_PLUGIN_DISABLED_EVENT_NAME = 'more-events:community-plugin-disabled';
const COMMUNITY_PLUGIN_ENABLED_EVENT_NAME = 'more-events:community-plugin-enabled';
const CORE_PLUGIN_DISABLED_EVENT_NAME = 'more-events:core-plugin-disabled';
const CORE_PLUGIN_ENABLED_EVENT_NAME = 'more-events:core-plugin-enabled';
const DEMO_CORE_PLUGIN_ID = 'canvas';
const NOTICE_DURATION_IN_MILLISECONDS = 8000;

/**
 * The throwaway community plugin the toggle button below flips.
 *
 * A vault has no community plugin that is safe to toggle for a demonstration — `More Events` itself publishes
 * the events, `CodeScript Toolkit` is what runs these buttons — so the demo brings its own. It is written into
 * `.obsidian/plugins/` on first press and does nothing at all; the toggle never persists it to
 * `community-plugins.json`, so pressing these buttons leaves your configuration exactly as it found it.
 */
const DEMO_COMMUNITY_PLUGIN_ID = 'more-events-demo-plugin';
const DEMO_COMMUNITY_PLUGIN_NAME = 'More Events Demo Plugin';

const DEMO_COMMUNITY_PLUGIN_MAIN_JS = `const { Plugin } = require('obsidian');
module.exports = class extends Plugin {};
`;

const DEMO_COMMUNITY_PLUGIN_MANIFEST_JSON = JSON.stringify(
  {
    author: 'More Events demo vault',
    description: 'A do-nothing plugin that exists only so the demo vault has something safe to enable and disable.',
    id: DEMO_COMMUNITY_PLUGIN_ID,
    isDesktopOnly: false,
    minAppVersion: '0.15.0',
    name: DEMO_COMMUNITY_PLUGIN_NAME,
    version: '1.0.0'
  },
  null,
  2
);

const ALL_PROPERTIES_MENU_EVENT_NAME = 'more-events:all-properties-menu';
const BASES_COLUMN_MENU_EVENT_NAME = 'more-events:bases-column-menu';
const BASES_KANBAN_COLUMN_MENU_EVENT_NAME = 'more-events:bases-kanban-column-menu';
const BASES_VIEW_MENU_EVENT_NAME = 'more-events:bases-view-menu';
const BOOKMARKS_MENU_EVENT_NAME = 'more-events:bookmarks-menu';
const BOOKMARKS_VIEW_MENU_EVENT_NAME = 'more-events:bookmarks-view-menu';
const CALLOUT_MENU_EVENT_NAME = 'more-events:callout-menu';
const CANVAS_EDGE_MENU_EVENT_NAME = 'more-events:canvas-edge-menu';
const CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME = 'more-events:canvas-node-connection-drop-menu';
const CANVAS_NODE_MENU_EVENT_NAME = 'more-events:canvas-node-menu';
const CANVAS_SELECTION_MENU_EVENT_NAME = 'more-events:canvas-selection-menu';
const CANVAS_VIEW_MENU_EVENT_NAME = 'more-events:canvas-view-menu';
const CSS_SNIPPET_MENU_EVENT_NAME = 'more-events:css-snippet-menu';
const EXTERNAL_IMAGE_MENU_EVENT_NAME = 'more-events:external-image-menu';
const HISTORY_MENU_EVENT_NAME = 'more-events:history-menu';
const LEAF_MENU_EVENT_NAME = 'more-events:leaf-menu';
const MARKDOWN_PROPERTIES_MENU_EVENT_NAME = 'more-events:markdown-properties-menu';
const MARKDOWN_VIEWPORT_MENU_EVENT_NAME = 'more-events:markdown-viewport-menu';
const PDF_DISPLAY_MENU_EVENT_NAME = 'more-events:pdf-display-menu';
const PDF_SIDEBAR_MENU_EVENT_NAME = 'more-events:pdf-sidebar-menu';
const PDF_OUTLINE_MENU_EVENT_NAME = 'more-events:pdf-outline-menu';
const PDF_PAGE_MENU_EVENT_NAME = 'more-events:pdf-page-menu';
const PDF_THUMBNAIL_MENU_EVENT_NAME = 'more-events:pdf-thumbnail-menu';
const PROPERTY_MENU_EVENT_NAME = 'more-events:property-menu';
const PROPERTY_VALUE_MENU_EVENT_NAME = 'more-events:property-value-menu';
const COMMUNITY_PLUGIN_MENU_EVENT_NAME = 'more-events:community-plugin-menu';
const COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME = 'more-events:community-plugin-setting-tab-menu';
const CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME = 'more-events:core-plugin-setting-tab-menu';
const RIBBON_MENU_EVENT_NAME = 'more-events:ribbon-menu';
const SEARCH_RESULTS_MENU_EVENT_NAME = 'more-events:search-results-menu';
const SIDEBAR_TOGGLE_MENU_EVENT_NAME = 'more-events:sidebar-toggle-menu';
const TAB_GROUP_MENU_EVENT_NAME = 'more-events:tab-group-menu';
const TABLE_CELL_MENU_EVENT_NAME = 'more-events:table-cell-menu';
const TABLE_HANDLE_MENU_EVENT_NAME = 'more-events:table-handle-menu';
const VAULT_MENU_EVENT_NAME = 'more-events:vault-menu';
const WEB_VIEWER_HISTORY_MENU_EVENT_NAME = 'more-events:web-viewer-history-menu';
const DEMO_HISTORY_TITLE = 'Obsidian';
const DEMO_HISTORY_URL = 'https://obsidian.md/';
const HISTORY_STORE_WAIT_IN_MILLISECONDS = 5000;
const HISTORY_STORE_POLL_IN_MILLISECONDS = 100;
const CONTEXT_MENU_NOTE_PATH = '04 Context menu events.md';
const DEMO_BASE_PATH = '_assets/Context menu demo.base';
const DEMO_CANVAS_PATH = '_assets/Context menu demo.canvas';
const DEMO_PDF_PATH = '_assets/Context menu demo.pdf';
const PDF_SIDEBAR_WAIT_IN_MILLISECONDS = 5000;
const PDF_SIDEBAR_POLL_IN_MILLISECONDS = 100;

// The subscriptions the listen buttons create, kept here so the stop buttons can find them again. A real
// plugin has its own `Component` for this and never needs a module-level handle.
let allPropertiesAndHistoryMenuListeningComponent: Component | null = null;
let bookmarksMenuListeningComponent: Component | null = null;
let calloutAndPluginSettingTabMenuListeningComponent: Component | null = null;
let basesViewMenuListeningComponent: Component | null = null;
let canvasAndRibbonMenuListeningComponent: Component | null = null;
let communityPluginListeningComponent: Component | null = null;
let corePluginListeningComponent: Component | null = null;
let externalImageAndBasesKanbanColumnMenuListeningComponent: Component | null = null;
let pdfMenuListeningComponent: Component | null = null;
let noteAndSearchMenuListeningComponent: Component | null = null;
let propertyAndCssSnippetMenuListeningComponent: Component | null = null;
let propertyValueAndBasesColumnMenuListeningComponent: Component | null = null;
let sidebarToggleAndCommunityPluginMenuListeningComponent: Component | null = null;
let tableMenuListeningComponent: Component | null = null;
let vaultAndTabMenuListeningComponent: Component | null = null;

/**
 * Lists the community plugins that are loaded right now, straight from the plugin's API.
 *
 * This is the question the events cannot answer: nothing has changed, so nothing has fired, and a listener
 * that has only just loaded still has to start from somewhere.
 *
 * Manual equivalent: open **Settings -> Community plugins** and read the toggles — with the caveat that the
 * API answers for what is actually LOADED, which is not the same list when community plugins are switched
 * off wholesale.
 */
export async function showEnabledCommunityPlugins(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const enabledCommunityPluginIds = moreEventsApi.getEnabledCommunityPluginIds();
  new Notice(
    `${String(enabledCommunityPluginIds.length)} community plugins loaded:\n${enabledCommunityPluginIds.join(', ')}`,
    NOTICE_DURATION_IN_MILLISECONDS
  );
}

/**
 * Lists the core plugins that are enabled right now, straight from the plugin's API.
 *
 * Manual equivalent: open **Settings -> Core plugins** and read the toggles.
 */
export async function showEnabledCorePlugins(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const enabledCorePluginIds = moreEventsApi.getEnabledCorePluginIds();
  new Notice(
    `${String(enabledCorePluginIds.length)} core plugins enabled:\n${enabledCorePluginIds.join(', ')}`,
    NOTICE_DURATION_IN_MILLISECONDS
  );
}

/**
 * Asks the API whether the throwaway demo plugin is loaded — the same answer as the list above, for the one
 * plugin a caller actually cares about.
 *
 * Press the toggle button on **02 Community plugin events** and then press this again: the answer follows
 * immediately, because the API reads live state rather than a cached copy.
 *
 * Manual equivalent: find that plugin's row in **Settings -> Community plugins**.
 */
export async function showWhetherDemoCommunityPluginIsEnabled(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const isEnabled = moreEventsApi.isCommunityPluginEnabled(DEMO_COMMUNITY_PLUGIN_ID);
  new Notice(createPluginNameFragment('', DEMO_COMMUNITY_PLUGIN_NAME, ` is ${isEnabled ? 'loaded' : 'not loaded'}.`));
}

/**
 * Asks the API whether one named core plugin is enabled.
 *
 * Manual equivalent: find the **Canvas** row in **Settings -> Core plugins**.
 */
export async function showWhetherCanvasIsEnabled(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const isEnabled = moreEventsApi.isCorePluginEnabled(DEMO_CORE_PLUGIN_ID);
  new Notice(createPluginNameFragment('', 'Canvas', ` is ${isEnabled ? 'enabled' : 'disabled'}.`));
}

/**
 * Bookmarks the context-menu note, if it is not bookmarked yet, and reveals the **Bookmarks** view, so there
 * is a bookmark to right-click.
 *
 * Manual equivalent: **Bookmark...** from the note's own menu, then the bookmark icon in the left sidebar.
 */
export async function showBookmarksView(app: App): Promise<void> {
  const bookmarks = app.internalPlugins.getEnabledPluginById('bookmarks');
  if (!bookmarks) {
    new Notice('Turn on the Bookmarks core plugin in Settings -> Core plugins first.');
    return;
  }

  if (!bookmarks.items.some((item) => item.path === CONTEXT_MENU_NOTE_PATH)) {
    bookmarks.addItem({ ctime: Date.now(), path: CONTEXT_MENU_NOTE_PATH, title: '', type: 'file' });
  }

  await app.workspace.ensureSideLeaf('bookmarks', 'left', { reveal: true });
}

/**
 * Subscribes to both bookmarks menu events and adds one item to each menu, until the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToBookmarksMenus(app: App): void {
  if (bookmarksMenuListeningComponent) {
    new Notice('Already listening. Right-click a bookmark, or the empty area below the last one.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(BOOKMARKS_MENU_EVENT_NAME, (menu, bookmarkItems) => {
      menu.addItem((item) => {
        item
          .setTitle('Describe these bookmarks (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const descriptions = bookmarkItems.map((bookmarkItem) => `${bookmarkItem.type}: ${bookmarkItem.path ?? bookmarkItem.title ?? ''}`);
            new Notice(`${String(bookmarkItems.length)} bookmark(s):\n${descriptions.join('\n')}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(BOOKMARKS_VIEW_MENU_EVENT_NAME, (menu, leaf) => {
      menu.addItem((item) => {
        item
          .setTitle('Added by a listener to the empty area')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`This item came from a listener. The menu is for the ${leaf.view.getDisplayText()} view.`);
          });
      });
    })
  );
  component.load();
  bookmarksMenuListeningComponent = component;

  new Notice('Listening. Now right-click a bookmark, or the empty area below the last one.');
}

/**
 * Drops both bookmarks menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToBookmarksMenus(): void {
  if (!bookmarksMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  bookmarksMenuListeningComponent.unload();
  bookmarksMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Opens the demo canvas in a new tab, so there is a canvas background to right-click.
 *
 * With the Canvas core plugin off — the toggle button on **01 Core plugin events** leaves it off after one
 * press — Obsidian has no view for a `.canvas` file and hands it to the operating system's default app
 * instead. So this turns Canvas back on first.
 *
 * Manual equivalent: open `_assets/Context menu demo.canvas` from the file explorer.
 */
export async function openDemoCanvas(app: App): Promise<void> {
  const file = app.vault.getFileByPath(DEMO_CANVAS_PATH);
  if (!file) {
    new Notice(`${DEMO_CANVAS_PATH} is missing from this vault.`);
    return;
  }

  const canvasCorePlugin = app.internalPlugins.getPluginById(DEMO_CORE_PLUGIN_ID);
  if (!canvasCorePlugin) {
    new Notice(createPluginNameFragment('', 'Canvas', ' core plugin not found.'));
    return;
  }

  if (!canvasCorePlugin.enabled) {
    await canvasCorePlugin.enable(true);
    new Notice(createPluginNameFragment('', 'Canvas', ' was off, so it was turned on to open the demo canvas.'));
  }

  await app.workspace.getLeaf('tab').openFile(file);
}

/**
 * Subscribes to the canvas view, node, connection and selection menu events and the ribbon menu event, and adds one
 * item to each menu, until the stop button below.
 *
 * Manual equivalent: the same five `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToCanvasAndRibbonMenus(app: App): void {
  if (canvasAndRibbonMenuListeningComponent) {
    new Notice('Already listening. Right-click the canvas, a card, the connection or a selection, or the ribbon below its icons.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(CANVAS_VIEW_MENU_EVENT_NAME, (menu, leaf, position) => {
      menu.addItem((item) => {
        item
          .setTitle('Where did I click? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`${leaf.getDisplayText()}: x ${String(Math.round(position.x))}, y ${String(Math.round(position.y))} in canvas coordinates.`);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(CANVAS_NODE_MENU_EVENT_NAME, (menu, leaf, node) => {
      menu.addItem((item) => {
        item
          .setTitle('Which node is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`${leaf.getDisplayText()}: a ${node.type} node, ${String(node.width)} x ${String(node.height)}, id ${node.id}`);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(CANVAS_EDGE_MENU_EVENT_NAME, (menu, leaf, edge) => {
      menu.addItem((item) => {
        item
          .setTitle('What does this connect? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`This connection goes from node ${edge.fromNode} to node ${edge.toNode} in ${leaf.getDisplayText()}.`);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(CANVAS_SELECTION_MENU_EVENT_NAME, (menu, leaf, selection) => {
      menu.addItem((item) => {
        item
          .setTitle('What is selected? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`In ${leaf.getDisplayText()}: ${String(selection.nodes.length)} node(s) and ${String(selection.edges.length)} connection(s).`);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME, (menu, leaf, fromNode, drop) => {
      menu.addItem((item) => {
        item
          .setTitle('Where was this dropped? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`In ${leaf.getDisplayText()}: dragged out of the ${drop.fromSide} side of node ${fromNode.id}, dropped at ${String(Math.round(drop.position.x))}, ${String(Math.round(drop.position.y))}.`);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(RIBBON_MENU_EVENT_NAME, (menu, side) => {
      menu.addItem((item) => {
        item
          .setTitle('Added by a listener to the ribbon')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`This item came from a listener. The menu is for the ${side} ribbon.`);
          });
      });
    })
  );
  component.load();
  canvasAndRibbonMenuListeningComponent = component;

  new Notice('Listening. Now right-click the canvas, a card, the connection or a selection, or the ribbon below its icons.');
}

/**
 * Drops the canvas and ribbon menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToCanvasAndRibbonMenus(): void {
  if (!canvasAndRibbonMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  canvasAndRibbonMenuListeningComponent.unload();
  canvasAndRibbonMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * The **Web viewer**'s history store, as far as this demo needs it. No typings describe it.
 */
interface WebViewerHistoryDb {
  // The IndexedDB connection, `null` until the plugin has opened it, which it starts on enable without waiting.
  readonly db: unknown;
  addHistoryItem(url: string, title: string): Promise<void>;
  getHistoryItems(): Promise<unknown[]>;
}

/**
 * Opens the **All properties** view and the **Web viewer**'s History view in the left sidebar, so there is a
 * property and a visited page to right-click.
 *
 * The **Web viewer** core plugin is off by default, so this turns it on, and an empty history gets one entry
 * for `https://obsidian.md/`, so the History view has something to show without visiting a page first.
 *
 * Manual equivalent: **All properties** from the command palette; then turn on **Web viewer** in
 * **Settings -> Core plugins**, open a page in it, and run **Web viewer: Show history**.
 */
export async function showAllPropertiesAndHistoryViews(app: App): Promise<void> {
  const propertiesCorePlugin = app.internalPlugins.getPluginById('properties');
  const webViewerCorePlugin = app.internalPlugins.getPluginById('webviewer');
  if (!propertiesCorePlugin || !webViewerCorePlugin) {
    new Notice('The Properties view or Web viewer core plugin was not found. The Web viewer exists only on the desktop.');
    return;
  }

  if (!propertiesCorePlugin.enabled) {
    await propertiesCorePlugin.enable(true);
  }
  if (!webViewerCorePlugin.enabled) {
    await webViewerCorePlugin.enable(true);
    new Notice(createPluginNameFragment('', 'Web viewer', ' was off, so it was turned on to show its history.'));
  }

  const { db } = webViewerCorePlugin.instance as unknown as { readonly db: WebViewerHistoryDb };
  for (let waited = 0; db.db === null && waited < HISTORY_STORE_WAIT_IN_MILLISECONDS; waited += HISTORY_STORE_POLL_IN_MILLISECONDS) {
    await sleep(HISTORY_STORE_POLL_IN_MILLISECONDS);
  }
  if ((await db.getHistoryItems()).length === 0) {
    await db.addHistoryItem(DEMO_HISTORY_URL, DEMO_HISTORY_TITLE);
  }

  await app.workspace.ensureSideLeaf('all-properties', 'left', { reveal: true });
  await app.workspace.ensureSideLeaf('webviewer-history', 'left', { reveal: true });
}

/**
 * Subscribes to the **All properties** and History menu events and adds one item to each menu, until the
 * stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToAllPropertiesAndHistoryMenus(app: App): void {
  if (allPropertiesAndHistoryMenuListeningComponent) {
    new Notice('Already listening. Right-click a property in All properties, or a page in the History view.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(ALL_PROPERTIES_MENU_EVENT_NAME, (menu, _leaf, propertyNames) => {
      menu.addItem((item) => {
        item
          .setTitle('Name these properties (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`${String(propertyNames.length)} ${propertyNames.length === 1 ? 'property' : 'properties'}:\n${propertyNames.join('\n')}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(WEB_VIEWER_HISTORY_MENU_EVENT_NAME, (menu, _leaf, historyItem) => {
      menu.addItem((item) => {
        item
          .setTitle('Which page is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`${historyItem.title || '(no title)'}\n${historyItem.url}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.load();
  allPropertiesAndHistoryMenuListeningComponent = component;

  new Notice('Listening. Now right-click a property in All properties, or a page in the History view.');
}

/**
 * Drops both **All properties** and History menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToAllPropertiesAndHistoryMenus(): void {
  if (!allPropertiesAndHistoryMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  allPropertiesAndHistoryMenuListeningComponent.unload();
  allPropertiesAndHistoryMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * The PDF view, as far as this demo needs it to open its sidebar. No typings describe it.
 */
interface PdfViewWithSidebar {
  readonly viewer?: {
    readonly child: null | {
      readonly pdfViewer: null | {
        readonly pdfSidebar?: {
          readonly isOpen: boolean;
          open(): void;
        };
      };
    };
  };
}

/**
 * Opens the demo PDF in a new tab with its thumbnail sidebar open, so there is a thumbnail to right-click.
 *
 * Manual equivalent: open `_assets/Context menu demo.pdf` from the file explorer, then the sidebar button at
 * the left end of the PDF toolbar.
 */
export async function openDemoPdf(app: App): Promise<void> {
  const file = app.vault.getFileByPath(DEMO_PDF_PATH);
  if (!file) {
    new Notice(`${DEMO_PDF_PATH} is missing from this vault.`);
    return;
  }

  const leaf = app.workspace.getLeaf('tab');
  await leaf.openFile(file, { active: true });

  // The viewer loads the document after the view is shown, and the sidebar can only be opened once it has.
  for (let waited = 0; waited < PDF_SIDEBAR_WAIT_IN_MILLISECONDS; waited += PDF_SIDEBAR_POLL_IN_MILLISECONDS) {
    const pdfSidebar = (leaf.view as unknown as PdfViewWithSidebar).viewer?.child?.pdfViewer?.pdfSidebar;
    if (pdfSidebar?.isOpen) {
      return;
    }
    pdfSidebar?.open();
    await sleep(PDF_SIDEBAR_POLL_IN_MILLISECONDS);
  }
}

/**
 * Subscribes to the PDF toolbar, thumbnail, outline and page menu events and adds one item to each menu, until the stop
 * button below.
 *
 * Manual equivalent: the same `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToPdfMenus(app: App): void {
  if (pdfMenuListeningComponent) {
    new Notice('Already listening. Right-click a page thumbnail, an outline entry or a page of the PDF.');
    return;
  }

  function addWhichPageItem(menu: Menu, leaf: WorkspaceLeaf, pageNumber: number): void {
    menu.addItem((item) => {
      item
        .setTitle('Which page is this? (added by a listener)')
        .setIcon('lucide-info')
        .onClick(() => {
          new Notice(`${leaf.getDisplayText()}: page ${String(pageNumber)}`, NOTICE_DURATION_IN_MILLISECONDS);
        });
    });
  }

  const component = new Component();
  for (const eventName of [PDF_DISPLAY_MENU_EVENT_NAME, PDF_SIDEBAR_MENU_EVENT_NAME] as const) {
    component.registerEvent(app.workspace.on(eventName, (menu, leaf) => {
      menu.addItem((item) => item
        .setTitle('Which PDF is this? (added by a listener)')
        .setIcon('lucide-info')
        .onClick(() => { new Notice(leaf.getDisplayText(), NOTICE_DURATION_IN_MILLISECONDS); }));
    }));
  }
  component.registerEvent(app.workspace.on(PDF_THUMBNAIL_MENU_EVENT_NAME, addWhichPageItem));
  component.registerEvent(app.workspace.on(PDF_PAGE_MENU_EVENT_NAME, addWhichPageItem));
  component.registerEvent(
    app.workspace.on(PDF_OUTLINE_MENU_EVENT_NAME, (menu, leaf, outlineItem) => {
      menu.addItem((item) => {
        item
          .setTitle('Which outline entry is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`${leaf.getDisplayText()}: "${outlineItem.title}", page ${String(outlineItem.pageNumber)}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.load();
  pdfMenuListeningComponent = component;

  new Notice('Listening. Now right-click a page thumbnail, an outline entry or a page of the PDF.');
}

/**
 * Drops the PDF menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToPdfMenus(): void {
  if (!pdfMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  pdfMenuListeningComponent.unload();
  pdfMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the sidebar toggle and community plugin row menu events and adds one item to each menu, until
 * the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToSidebarToggleAndCommunityPluginMenus(app: App): void {
  if (sidebarToggleAndCommunityPluginMenuListeningComponent) {
    new Notice('Already listening. Right-click a sidebar toggle button, or a plugin in Settings -> Community plugins.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(SIDEBAR_TOGGLE_MENU_EVENT_NAME, (menu, side) => {
      menu.addItem((item) => {
        item
          .setTitle('Which sidebar is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The ${side} sidebar`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(COMMUNITY_PLUGIN_MENU_EVENT_NAME, (menu, communityPluginId) => {
      menu.addItem((item) => {
        item
          .setTitle('Which plugin is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const manifest = app.plugins.manifests[communityPluginId];
            new Notice(
              createPluginNameFragment('', manifest?.name ?? communityPluginId, ` (${communityPluginId}), version ${manifest?.version ?? 'unknown'}`),
              NOTICE_DURATION_IN_MILLISECONDS
            );
          });
      });
    })
  );
  component.load();
  sidebarToggleAndCommunityPluginMenuListeningComponent = component;

  new Notice('Listening. Now right-click a sidebar toggle button, or a plugin in Settings -> Community plugins.');
}

/**
 * Drops the sidebar toggle and community plugin row menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToSidebarToggleAndCommunityPluginMenus(): void {
  if (!sidebarToggleAndCommunityPluginMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  sidebarToggleAndCommunityPluginMenuListeningComponent.unload();
  sidebarToggleAndCommunityPluginMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the callout and plugin settings tab menu events and adds one item to each menu, until the stop
 * button below.
 *
 * Manual equivalent: the same `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToCalloutAndPluginSettingTabMenus(app: App): void {
  if (calloutAndPluginSettingTabMenuListeningComponent) {
    new Notice('Already listening. Right-click a callout, or a plugin\'s tab in the Settings sidebar.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(CALLOUT_MENU_EVENT_NAME, (menu, leaf, callout) => {
      menu.addItem((item) => {
        item
          .setTitle('Which callout is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`A "${callout.type}" callout on line ${String(callout.line + 1)} of ${leaf.getDisplayText()}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME, (menu, corePluginId) => {
      menu.addItem((item) => {
        item
          .setTitle('Which plugin is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The core plugin ${corePluginId}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME, (menu, communityPluginId) => {
      menu.addItem((item) => {
        item
          .setTitle('Which plugin is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const manifest = app.plugins.manifests[communityPluginId];
            new Notice(
              createPluginNameFragment('The ', manifest?.name ?? communityPluginId, ` community plugin (${communityPluginId})`),
              NOTICE_DURATION_IN_MILLISECONDS
            );
          });
      });
    })
  );
  component.load();
  calloutAndPluginSettingTabMenuListeningComponent = component;

  new Notice('Listening. Now right-click the callout in this note, or a plugin\'s tab in the Settings sidebar.');
}

/**
 * Drops the callout and plugin settings tab menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToCalloutAndPluginSettingTabMenus(): void {
  if (!calloutAndPluginSettingTabMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  calloutAndPluginSettingTabMenuListeningComponent.unload();
  calloutAndPluginSettingTabMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the table cell and drag handle menu events and adds one item to each menu, until the stop
 * button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToTableMenus(app: App): void {
  if (tableMenuListeningComponent) {
    new Notice('Already listening. Right-click a cell of the table, or one of its drag handles.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(TABLE_CELL_MENU_EVENT_NAME, (menu, leaf, cell) => {
      menu.addItem((item) => {
        item
          .setTitle('Which cell is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const selection = cell.selectedCells.length > 0 ? `, in a selection of ${String(cell.selectedCells.length)} cells` : '';
            new Notice(
              `Row ${String(cell.row)}, column ${String(cell.column)}${selection}, of the table on line ${String(cell.line + 1)} of ${leaf.getDisplayText()}`,
              NOTICE_DURATION_IN_MILLISECONDS
            );
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(TABLE_HANDLE_MENU_EVENT_NAME, (menu, leaf, handle) => {
      menu.addItem((item) => {
        item
          .setTitle('Which handle is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(
              `The handle of ${handle.axis} ${String(handle.index)} of the table on line ${String(handle.line + 1)} of ${leaf.getDisplayText()}`,
              NOTICE_DURATION_IN_MILLISECONDS
            );
          });
      });
    })
  );
  component.load();
  tableMenuListeningComponent = component;

  new Notice('Listening. Now right-click a cell of the table in this note, or one of its drag handles.');
}

/**
 * Drops the table cell and drag handle menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToTableMenus(): void {
  if (!tableMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  tableMenuListeningComponent.unload();
  tableMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the property value and Bases column header menu events and adds one item to each menu, until
 * the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToPropertyValueAndBasesColumnMenus(app: App): void {
  if (propertyValueAndBasesColumnMenuListeningComponent) {
    new Notice('Already listening. Right-click a value of a list property, or a column header of a base\'s table.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(PROPERTY_VALUE_MENU_EVENT_NAME, (menu, leaf, value) => {
      menu.addItem((item) => {
        item
          .setTitle('Which value is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(
              `"${value.value}", value ${String(value.index + 1)} of the "${value.key}" property of ${leaf.getDisplayText()}`,
              NOTICE_DURATION_IN_MILLISECONDS
            );
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(BASES_COLUMN_MENU_EVENT_NAME, (menu, leaf, column) => {
      menu.addItem((item) => {
        item
          .setTitle('Which column is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(
              `The ${column.propertyId} column of the "${column.viewName}" view of ${leaf.getDisplayText()}`,
              NOTICE_DURATION_IN_MILLISECONDS
            );
          });
      });
    })
  );
  component.load();
  propertyValueAndBasesColumnMenuListeningComponent = component;

  new Notice('Listening. Now right-click a value of demo-topics in this note\'s properties, or a column header of the demo base.');
}

/**
 * Drops the property value and Bases column header menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToPropertyValueAndBasesColumnMenus(): void {
  if (!propertyValueAndBasesColumnMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  propertyValueAndBasesColumnMenuListeningComponent.unload();
  propertyValueAndBasesColumnMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the property and CSS snippet menu events and adds one item to each menu, until the stop button
 * below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToPropertyAndCssSnippetMenus(app: App): void {
  if (propertyAndCssSnippetMenuListeningComponent) {
    new Notice('Already listening. Click a property\'s icon, or right-click a snippet in Settings -> Appearance -> CSS snippets.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(PROPERTY_MENU_EVENT_NAME, (menu, leaf, property) => {
      menu.addItem((item) => {
        item
          .setTitle('Which property is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The "${property.key}" property of ${leaf.getDisplayText()}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(CSS_SNIPPET_MENU_EVENT_NAME, (menu, snippet) => {
      menu.addItem((item) => {
        item
          .setTitle('Which snippet is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The "${snippet.name}" CSS snippet`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.load();
  propertyAndCssSnippetMenuListeningComponent = component;

  new Notice('Listening. Now click the icon of demo-topics in this note\'s properties, or right-click a snippet in Settings -> Appearance -> CSS snippets.');
}

/**
 * Drops the property and CSS snippet menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToPropertyAndCssSnippetMenus(): void {
  if (!propertyAndCssSnippetMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  propertyAndCssSnippetMenuListeningComponent.unload();
  propertyAndCssSnippetMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the external image and Bases board column menu events and adds one item to each menu, until the
 * stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToExternalImageAndBasesKanbanColumnMenus(app: App): void {
  if (externalImageAndBasesKanbanColumnMenuListeningComponent) {
    new Notice('Already listening. Right-click an image embedded from a URL, or a column of a base\'s board.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(EXTERNAL_IMAGE_MENU_EVENT_NAME, (menu, leaf, image) => {
      menu.addItem((item) => {
        item
          .setTitle('Which image is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const shownUrl = image.url.length > 60 ? `${image.url.slice(0, 60)}...` : image.url;
            new Notice(`The image on line ${String(image.line + 1)} of ${leaf.getDisplayText()}, from ${shownUrl}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(BASES_KANBAN_COLUMN_MENU_EVENT_NAME, (menu, leaf, column) => {
      menu.addItem((item) => {
        item
          .setTitle('Which column is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const groupText = column.groupKey === null ? 'the column of the notes with no value' : `the "${column.groupKey}" column`;
            new Notice(`${groupText} of the "${column.viewName}" view of ${leaf.getDisplayText()}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.load();
  externalImageAndBasesKanbanColumnMenuListeningComponent = component;

  new Notice('Listening. Now right-click the image in this note, or a column of the demo board.');
}

/**
 * Drops the external image and Bases board column menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToExternalImageAndBasesKanbanColumnMenus(): void {
  if (!externalImageAndBasesKanbanColumnMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  externalImageAndBasesKanbanColumnMenuListeningComponent.unload();
  externalImageAndBasesKanbanColumnMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the Bases view menu event and adds one item to the menu, until the stop button below.
 *
 * Manual equivalent: the same `app.workspace.on(...)` call from your own plugin's `onload`.
 */
export function startListeningToBasesViewMenu(app: App): void {
  if (basesViewMenuListeningComponent) {
    new Notice('Already listening. Open a view\'s settings in a base and click its More options button.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(BASES_VIEW_MENU_EVENT_NAME, (menu, leaf, viewName) => {
      menu.addItem((item) => {
        item
          .setTitle('Which view is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The "${viewName}" view of ${leaf.getDisplayText()}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.load();
  basesViewMenuListeningComponent = component;

  new Notice('Listening. Now open a view\'s settings in the demo base and click its More options button.');
}

/**
 * Stops the listener the start button above registered.
 *
 * Manual equivalent: unloading the component that registered it, which a plugin gets for free when it is disabled.
 */
export function stopListeningToBasesViewMenu(): void {
  if (!basesViewMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  basesViewMenuListeningComponent.unload();
  basesViewMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the vault name, leaf, tab group and history menu events and adds one item to each menu, until the
 * stop button below.
 *
 * Manual equivalent: the same four `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToVaultAndTabMenus(app: App): void {
  if (vaultAndTabMenuListeningComponent) {
    new Notice('Already listening. Right-click the vault name, a tab or the back arrow, or click the chevron right of the tabs.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(VAULT_MENU_EVENT_NAME, (menu) => {
      menu.addItem((item) => {
        item
          .setTitle('Which vault is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The vault "${app.vault.getName()}"`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(LEAF_MENU_EVENT_NAME, (menu, leaf) => {
      menu.addItem((item) => {
        item
          .setTitle('Which tab is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The tab "${leaf.getDisplayText()}"`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(TAB_GROUP_MENU_EVENT_NAME, (menu, tabGroup) => {
      menu.addItem((item) => {
        item
          .setTitle('Which tab group is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const tabTitles: string[] = [];
            app.workspace.iterateAllLeaves((leaf) => {
              if (leaf.parent === tabGroup) {
                tabTitles.push(leaf.getDisplayText());
              }
            });
            new Notice(`The tab group holding ${tabTitles.join(', ')}`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(HISTORY_MENU_EVENT_NAME, (menu, leaf, direction) => {
      menu.addItem((item) => {
        item
          .setTitle('Which history is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const pages = direction === 'back' ? leaf.history.backHistory : leaf.history.forwardHistory;
            new Notice(`${String(pages.length)} page(s) ${direction} in the tab "${leaf.getDisplayText()}"`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.load();
  vaultAndTabMenuListeningComponent = component;

  new Notice('Listening. Now right-click the vault name or this tab, or click the chevron right of the tabs.');
}

/**
 * Drops the vault name, leaf and tab group menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToVaultAndTabMenus(): void {
  if (!vaultAndTabMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  vaultAndTabMenuListeningComponent.unload();
  vaultAndTabMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Subscribes to the note margin, **Properties** heading and **Search** results menu events and adds one item to each
 * menu, until the stop button below.
 *
 * Manual equivalent: the same `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToNoteAndSearchMenus(app: App): void {
  if (noteAndSearchMenuListeningComponent) {
    new Notice('Already listening. Right-click this note\'s margin or its Properties heading, or click a search\'s result count.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(MARKDOWN_VIEWPORT_MENU_EVENT_NAME, (menu, view, mode) => {
      menu.addItem((item) => {
        item
          .setTitle('Which note is this? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const modeText = mode === 'preview' ? 'Reading view' : 'editor';
            new Notice(`The ${modeText} of "${view.file?.path ?? 'no file'}"`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(MARKDOWN_PROPERTIES_MENU_EVENT_NAME, (menu, file) => {
      menu.addItem((item) => {
        item
          .setTitle('Whose properties are these? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            new Notice(`The properties of "${file?.path ?? 'no file'}"`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.registerEvent(
    app.workspace.on(SEARCH_RESULTS_MENU_EVENT_NAME, (menu, searchView) => {
      menu.addItem((item) => {
        item
          .setTitle('How many results? (added by a listener)')
          .setIcon('lucide-info')
          .onClick(() => {
            const resultCount = searchView.containerEl.querySelectorAll('.search-result').length;
            new Notice(`${String(resultCount)} file(s) found`, NOTICE_DURATION_IN_MILLISECONDS);
          });
      });
    })
  );
  component.load();
  noteAndSearchMenuListeningComponent = component;

  new Notice('Listening. Now right-click this note\'s margin or its Properties heading, or click a search\'s result count.');
}

/**
 * Drops the note margin, **Properties** heading and **Search** results menu subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToNoteAndSearchMenus(): void {
  if (!noteAndSearchMenuListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  noteAndSearchMenuListeningComponent.unload();
  noteAndSearchMenuListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Opens the demo base in a new tab, turning the **Bases** core plugin on first if it is off, so there is a table
 * header to right-click.
 *
 * Manual equivalent: turn on **Bases** in **Settings -> Core plugins**, then open `_assets/Context menu demo.base`
 * from the file explorer, and pick the view from its view menu. With no `viewName`, the base shows its first view.
 */
export async function openDemoBase(app: App, viewName?: string): Promise<void> {
  const file = app.vault.getFileByPath(DEMO_BASE_PATH);
  if (!file) {
    new Notice(`${DEMO_BASE_PATH} is missing from this vault.`);
    return;
  }

  const basesCorePlugin = app.internalPlugins.getPluginById('bases');
  if (!basesCorePlugin) {
    new Notice('The Bases core plugin was not found.');
    return;
  }
  if (!basesCorePlugin.enabled) {
    await basesCorePlugin.enable(true);
    new Notice(createPluginNameFragment('', 'Bases', ' was off, so it was turned on to open the demo base.'));
  }

  // The view's state names the base's view to show.
  await app.workspace.getLeaf('tab').setViewState({
    active: true,
    state: viewName ? { file: file.path, viewName } : { file: file.path },
    type: 'bases'
  });
}

/**
 * Subscribes to both community-plugin events and shows a notice for each one, until the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToCommunityPlugins(app: App): void {
  if (communityPluginListeningComponent) {
    new Notice('Already listening. Toggle a community plugin in Settings -> Community plugins.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, ({ communityPluginId, communityPluginName, isUserInitiated }) => {
      new Notice(createPluginNameFragment('Enabled: ', communityPluginName, ` (${communityPluginId}), ${describeInitiator(isUserInitiated)}`));
    })
  );
  component.registerEvent(
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, ({ communityPluginId, communityPluginName, isUserInitiated }) => {
      new Notice(createPluginNameFragment('Disabled: ', communityPluginName, ` (${communityPluginId}), ${describeInitiator(isUserInitiated)}`));
    })
  );
  component.load();
  communityPluginListeningComponent = component;

  new Notice('Listening. Now toggle a community plugin — the button below brings its own.');
}

/**
 * Subscribes to both core-plugin events and shows a notice for each one, until the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToCorePlugins(app: App): void {
  if (corePluginListeningComponent) {
    new Notice('Already listening. Toggle a core plugin in Settings -> Core plugins.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, ({ corePluginId, corePluginName, isUserInitiated }) => {
      new Notice(createPluginNameFragment('Enabled: ', corePluginName, ` (${corePluginId}), ${describeInitiator(isUserInitiated)}`));
    })
  );
  component.registerEvent(
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, ({ corePluginId, corePluginName, isUserInitiated }) => {
      new Notice(createPluginNameFragment('Disabled: ', corePluginName, ` (${corePluginId}), ${describeInitiator(isUserInitiated)}`));
    })
  );
  component.load();
  corePluginListeningComponent = component;

  new Notice('Listening. Now toggle a core plugin in Settings -> Core plugins.');
}

/**
 * Drops both community-plugin subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToCommunityPlugins(): void {
  if (!communityPluginListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  communityPluginListeningComponent.unload();
  communityPluginListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Drops both core-plugin subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToCorePlugins(): void {
  if (!corePluginListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  corePluginListeningComponent.unload();
  corePluginListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Loads the throwaway demo plugin if it is unloaded, and unloads it if it is loaded — so the
 * community-plugin events can be seen without leaving this note.
 *
 * `enablePlugin` / `disablePlugin` rather than their `...AndSave` siblings, on purpose: both raise the same
 * signal, and the plain pair never writes to `community-plugins.json`, so a demo cannot leave a throwaway
 * plugin ticked in your vault's configuration.
 *
 * That choice is also why the notice this produces says *programmatically* rather than *by the user*: the
 * `...AndSave` pair is what the Settings toggle calls and what passes Obsidian's user flag, so this button
 * demonstrates the other side of `isUserInitiated` for free.
 *
 * Manual equivalent: any plugin's toggle in **Settings -> Community plugins**.
 */
export async function toggleDemoCommunityPlugin(app: App): Promise<void> {
  await installDemoCommunityPlugin(app);

  if (app.plugins.getPlugin(DEMO_COMMUNITY_PLUGIN_ID)) {
    await app.plugins.disablePlugin(DEMO_COMMUNITY_PLUGIN_ID);
  } else {
    await app.plugins.enablePlugin(DEMO_COMMUNITY_PLUGIN_ID);
  }
}

/**
 * Turns the Canvas core plugin off if it is on, and on if it is off — so the core-plugin events can be seen
 * without leaving that note.
 *
 * Manual equivalent: the **Canvas** toggle in **Settings -> Core plugins**.
 */
export async function toggleCanvasCorePlugin(app: App): Promise<void> {
  const canvasCorePlugin = app.internalPlugins.getPluginById(DEMO_CORE_PLUGIN_ID);
  if (!canvasCorePlugin) {
    new Notice(createPluginNameFragment('', 'Canvas', ' core plugin not found.'));
    return;
  }

  if (canvasCorePlugin.enabled) {
    canvasCorePlugin.disable(true);
  } else {
    await canvasCorePlugin.enable(true);
  }

  await app.internalPlugins.saveConfig();
}

/**
 * Builds notice text whose plugin name renders as code, the way every plugin name in this collection's UI
 * does.
 *
 * @param prefix - The text before the name.
 * @param pluginName - The plugin's display name.
 * @param suffix - The text after the name.
 * @returns The fragment to pass to `Notice`.
 */
function createPluginNameFragment(prefix: string, pluginName: string, suffix: string): DocumentFragment {
  return createFragment((fragment) => {
    fragment.appendText(prefix);
    fragment.createEl('code', { text: pluginName });
    fragment.appendText(suffix);
  });
}

/**
 * Puts Obsidian's own user flag into words for a notice.
 *
 * @param isUserInitiated - The payload's `isUserInitiated`.
 * @returns `'by the user'` or `'programmatically'`.
 */
function describeInitiator(isUserInitiated: boolean): string {
  return isUserInitiated ? 'by the user' : 'programmatically';
}

async function getApi(app: App): Promise<MoreEventsApi> {
  const moreEventsApiRef = watchPluginApi<MoreEventsApi>({
    apiVersionRange: '^1',
    app,
    component: new Component(),
    pluginId: PLUGIN_ID
  });

  return await moreEventsApiRef.whenAvailable();
}

async function installDemoCommunityPlugin(app: App): Promise<void> {
  const demoCommunityPluginFolderPath = `${app.vault.configDir}/plugins/${DEMO_COMMUNITY_PLUGIN_ID}`;

  if (!await app.vault.adapter.exists(demoCommunityPluginFolderPath)) {
    await app.vault.adapter.mkdir(demoCommunityPluginFolderPath);
  }

  await app.vault.adapter.write(`${demoCommunityPluginFolderPath}/manifest.json`, DEMO_COMMUNITY_PLUGIN_MANIFEST_JSON);
  await app.vault.adapter.write(`${demoCommunityPluginFolderPath}/main.js`, DEMO_COMMUNITY_PLUGIN_MAIN_JS);

  // Obsidian reads the plugins folder at startup, so a manifest written a moment ago is not known yet.
  await app.plugins.loadManifests();
}

let rootMenuListeningComponent: Component | null = null;

/**
 * Adds a live item identifying which vault-root spot opened the menu.
 *
 * @param app - The application.
 */
export function startListeningToFileExplorerRootMenus(app: App): void {
  stopListeningToFileExplorerRootMenus();
  const component = new Component();
  component.registerEvent(app.workspace.on('more-events:file-explorer-root-menu', (menu, spot) => {
    menu.addItem((item) => item.setTitle(`Root menu from ${spot} (added by a listener)`).onClick(() => {
      new Notice(`The vault root menu was opened from ${spot}.`, NOTICE_DURATION_IN_MILLISECONDS);
    }));
  }));
  component.load();
  rootMenuListeningComponent = component;
  new Notice('Listening. Right-click the vault name or the empty area below the File Explorer files.');
}

/**
 * Removes the vault-root demo subscription.
 */
export function stopListeningToFileExplorerRootMenus(): void {
  rootMenuListeningComponent?.unload();
  rootMenuListeningComponent = null;
}