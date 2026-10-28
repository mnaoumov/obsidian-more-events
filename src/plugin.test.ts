import type { PluginApiDeclaration } from '@mnaoumov/obsidian-lib/plugin/plugin-api';
import type {
  App as AppType,
  PluginManifest
} from 'obsidian';
import type { Mock } from 'vitest';

import {
  FileExplorerRootMenuComponent,
  FileExplorerRootMenuSpot
} from '@mnaoumov/obsidian-lib/components/file-explorer-root-menu-component';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { MoreEventsApiImpl } from './api/more-events-api-impl.ts';
import {
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './api/more-events-api.ts';
import { AllPropertiesMenuEventsComponent } from './context-menus/all-properties/all-properties-menu-events-component.ts';
import { BasesColumnMenuEventsComponent } from './context-menus/bases/bases-column-menu-events-component.ts';
import { BasesKanbanColumnMenuEventsComponent } from './context-menus/bases/bases-kanban-column-menu-events-component.ts';
import { BasesViewMenuEventsComponent } from './context-menus/bases/bases-view-menu-events-component.ts';
import { BookmarksMenuEventsComponent } from './context-menus/bookmarks/bookmarks-menu-events-component.ts';
import { CalloutMenuEventsComponent } from './context-menus/callout/callout-menu-events-component.ts';
import { CanvasMenuEventsComponent } from './context-menus/canvas/canvas-menu-events-component.ts';
import { CanvasObjectMenuEventsComponent } from './context-menus/canvas/canvas-object-menu-events-component.ts';
import { CanvasToolbarMenuEventsComponent } from './context-menus/canvas/canvas-toolbar-menu-events-component.ts';
import { CommunityPluginMenuEventsComponent } from './context-menus/community-plugin/community-plugin-menu-events-component.ts';
import { CssSnippetMenuEventsComponent } from './context-menus/css-snippet/css-snippet-menu-events-component.ts';
import { ExternalImageMenuEventsComponent } from './context-menus/external-image/external-image-menu-events-component.ts';
import { HistoryMenuEventsComponent } from './context-menus/history/history-menu-events-component.ts';
import { MarkdownMenuEventsComponent } from './context-menus/markdown/markdown-menu-events-component.ts';
import { MenuPatchComponent } from './context-menus/menu-patch-component.ts';
import { PdfOutlineMenuEventsComponent } from './context-menus/pdf/pdf-outline-menu-events-component.ts';
import { PdfPageMenuEventsComponent } from './context-menus/pdf/pdf-page-menu-events-component.ts';
import { PdfThumbnailMenuEventsComponent } from './context-menus/pdf/pdf-thumbnail-menu-events-component.ts';
import { PdfToolbarMenuEventsComponent } from './context-menus/pdf/pdf-toolbar-menu-events-component.ts';
import { PluginSettingTabMenuEventsComponent } from './context-menus/plugin-setting-tab/plugin-setting-tab-menu-events-component.ts';
import { PropertyMenuEventsComponent } from './context-menus/property/property-menu-events-component.ts';
import { PropertyValueMenuEventsComponent } from './context-menus/property/property-value-menu-events-component.ts';
import { RibbonMenuEventsComponent } from './context-menus/ribbon/ribbon-menu-events-component.ts';
import { SearchMenuEventsComponent } from './context-menus/search/search-menu-events-component.ts';
import { SidebarToggleMenuEventsComponent } from './context-menus/sidebar-toggle/sidebar-toggle-menu-events-component.ts';
import { TableMenuEventsComponent } from './context-menus/table/table-menu-events-component.ts';
import { VaultMenuEventsComponent } from './context-menus/vault/vault-menu-events-component.ts';
import { WebViewerHistoryMenuEventsComponent } from './context-menus/web-viewer-history/web-viewer-history-menu-events-component.ts';
import { WorkspaceMenuEventsComponent } from './context-menus/workspace/workspace-menu-events-component.ts';
import { CommunityPluginEventsComponent } from './plugin-lifecycle/community-plugin-events-component.ts';
import { CorePluginEventsComponent } from './plugin-lifecycle/core-plugin-events-component.ts';
import { Plugin } from './plugin.ts';

vi.mock('@mnaoumov/obsidian-lib/components/file-explorer-root-menu-component', async (importOriginal) => {
  const original = await importOriginal<typeof import('@mnaoumov/obsidian-lib/components/file-explorer-root-menu-component')>();
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    ...original,
    // eslint-disable-next-line prefer-arrow-callback -- The component stub must be constructible.
    FileExplorerRootMenuComponent: vi.fn(function fileExplorerRootMenuComponentStub() {
      return new Component();
    })
  };
});
vi.mock('./plugin-lifecycle/community-plugin-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CommunityPluginEventsComponent: vi.fn(function communityPluginEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/bookmarks/bookmarks-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    BookmarksMenuEventsComponent: vi.fn(function bookmarksMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/canvas/canvas-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CanvasMenuEventsComponent: vi.fn(function canvasMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/ribbon/ribbon-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    RibbonMenuEventsComponent: vi.fn(function ribbonMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/all-properties/all-properties-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    AllPropertiesMenuEventsComponent: vi.fn(function allPropertiesMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/web-viewer-history/web-viewer-history-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    WebViewerHistoryMenuEventsComponent: vi.fn(function webViewerHistoryMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/canvas/canvas-toolbar-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A constructible stub must return a fresh real Component, as in the other component mocks.
    CanvasToolbarMenuEventsComponent: vi.fn(function canvasToolbarMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/pdf/pdf-toolbar-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A constructible stub must return a fresh real Component, as in the other component mocks.
    PdfToolbarMenuEventsComponent: vi.fn(function pdfToolbarMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/pdf/pdf-thumbnail-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PdfThumbnailMenuEventsComponent: vi.fn(function pdfThumbnailMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/sidebar-toggle/sidebar-toggle-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    SidebarToggleMenuEventsComponent: vi.fn(function sidebarToggleMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/community-plugin/community-plugin-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CommunityPluginMenuEventsComponent: vi.fn(function communityPluginMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/external-image/external-image-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    ExternalImageMenuEventsComponent: vi.fn(function externalImageMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/bases/bases-kanban-column-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    BasesKanbanColumnMenuEventsComponent: vi.fn(function basesKanbanColumnMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/bases/bases-view-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    BasesViewMenuEventsComponent: vi.fn(function basesViewMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/history/history-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    HistoryMenuEventsComponent: vi.fn(function historyMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/vault/vault-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    VaultMenuEventsComponent: vi.fn(function vaultMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/workspace/workspace-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    WorkspaceMenuEventsComponent: vi.fn(function workspaceMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/search/search-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    SearchMenuEventsComponent: vi.fn(function searchMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/canvas/canvas-object-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CanvasObjectMenuEventsComponent: vi.fn(function canvasObjectMenuEventsComponentStub() {
      return new Component();
    })
  };
});
vi.mock('./context-menus/markdown/markdown-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    MarkdownMenuEventsComponent: vi.fn(function markdownMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/callout/callout-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CalloutMenuEventsComponent: vi.fn(function calloutMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/plugin-setting-tab/plugin-setting-tab-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PluginSettingTabMenuEventsComponent: vi.fn(function pluginSettingTabMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/table/table-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    TableMenuEventsComponent: vi.fn(function tableMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/property/property-value-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PropertyValueMenuEventsComponent: vi.fn(function propertyValueMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/bases/bases-column-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    BasesColumnMenuEventsComponent: vi.fn(function basesColumnMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/property/property-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PropertyMenuEventsComponent: vi.fn(function propertyMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/css-snippet/css-snippet-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CssSnippetMenuEventsComponent: vi.fn(function cssSnippetMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/pdf/pdf-outline-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PdfOutlineMenuEventsComponent: vi.fn(function pdfOutlineMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/pdf/pdf-page-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PdfPageMenuEventsComponent: vi.fn(function pdfPageMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./context-menus/menu-patch-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    MenuPatchComponent: vi.fn(function menuPatchComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./plugin-lifecycle/core-plugin-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CorePluginEventsComponent: vi.fn(function corePluginEventsComponentStub() {
      return new Component();
    })
  };
});

const PLUGIN_ID = 'more-events';
const STRICT_PROXY_TARGET_SYMBOL = Symbol.for('strictProxyTarget');

interface AppGlobal {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Tests replace and restore the global app.
  app: AppType;
}

interface LoadedFlagHolder {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Tests reset the mock component's load state.
  loaded__: boolean;
}

interface ObsidianModule {
  readonly Component: new () => object;
}

interface PluginApisReader {
  readonly getPluginApis: () => PluginApiDeclaration[];
}

interface PluginEventsComponentConstructorParams {
  readonly app: AppType;
}

const manifest = castTo<PluginManifest>({
  id: PLUGIN_ID,
  name: 'More Events',
  version: '1.0.0'
});

let app: AppType;
let appMock: App;
let savedGlobalApp: AppType;

describe('Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMock = App.createConfigured__();
    app = appMock.asOriginalType__();

    seedOnRawTarget(app.workspace, 'onLayoutReady', () => {
      // The wrapper test never fires layout-ready; the child component is a stub.
    });

    savedGlobalApp = castTo<AppGlobal>(window).app;
    castTo<AppGlobal>(window).app = app;
  });

  afterEach(() => {
    castTo<AppGlobal>(window).app = savedGlobalApp;
  });

  it('should add the core plugin events component with the app', async () => {
    const plugin = new Plugin(app, manifest);
    // PluginBase.onload is async; driving it directly runs onloadImpl and eager-loads the child.
    await plugin.onload();

    const calls = vi.mocked(CorePluginEventsComponent).mock.calls;
    expect(calls).toHaveLength(1);

    const params = castTo<PluginEventsComponentConstructorParams>(calls[0]?.[0]);
    expect(params.app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the community plugin events component with the app', async () => {
    const plugin = new Plugin(app, manifest);
    // PluginBase.onload is async; driving it directly runs onloadImpl and eager-loads the child.
    await plugin.onload();

    const calls = vi.mocked(CommunityPluginEventsComponent).mock.calls;
    expect(calls).toHaveLength(1);

    const params = castTo<PluginEventsComponentConstructorParams>(calls[0]?.[0]);
    expect(params.app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the menu events components and announce their menus through the menu patch', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const bookmarksCalls = vi.mocked(BookmarksMenuEventsComponent).mock.calls;
    expect(bookmarksCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(bookmarksCalls[0]?.[0]).app).toBe(plugin.app);

    const canvasCalls = vi.mocked(CanvasMenuEventsComponent).mock.calls;
    expect(canvasCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(canvasCalls[0]?.[0]).app).toBe(plugin.app);

    const ribbonCalls = vi.mocked(RibbonMenuEventsComponent).mock.calls;
    expect(ribbonCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(ribbonCalls[0]?.[0]).app).toBe(plugin.app);

    const allPropertiesCalls = vi.mocked(AllPropertiesMenuEventsComponent).mock.calls;
    expect(allPropertiesCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(allPropertiesCalls[0]?.[0]).app).toBe(plugin.app);

    const webViewerHistoryCalls = vi.mocked(WebViewerHistoryMenuEventsComponent).mock.calls;
    expect(webViewerHistoryCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(webViewerHistoryCalls[0]?.[0]).app).toBe(plugin.app);

    const pdfThumbnailCalls = vi.mocked(PdfThumbnailMenuEventsComponent).mock.calls;
    expect(pdfThumbnailCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(pdfThumbnailCalls[0]?.[0]).app).toBe(plugin.app);

    const sidebarToggleCalls = vi.mocked(SidebarToggleMenuEventsComponent).mock.calls;
    expect(sidebarToggleCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(sidebarToggleCalls[0]?.[0]).app).toBe(plugin.app);

    const communityPluginMenuCalls = vi.mocked(CommunityPluginMenuEventsComponent).mock.calls;
    expect(communityPluginMenuCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(communityPluginMenuCalls[0]?.[0]).app).toBe(plugin.app);

    const menuPatchCalls = vi.mocked(MenuPatchComponent).mock.calls;
    expect(menuPatchCalls).toHaveLength(1);
    expect(menuPatchCalls[0]?.[0].app).toBe(plugin.app);
    expect(menuPatchCalls[0]?.[0].menuAnnouncers).toEqual([
      BookmarksMenuEventsComponent,
      CanvasMenuEventsComponent,
      RibbonMenuEventsComponent,
      AllPropertiesMenuEventsComponent,
      WebViewerHistoryMenuEventsComponent,
      PdfThumbnailMenuEventsComponent,
      TableMenuEventsComponent,
      PropertyMenuEventsComponent,
      PdfOutlineMenuEventsComponent,
      HistoryMenuEventsComponent
    ].map((componentClass) => getFirstInstance(componentClass)));

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the callout and plugin settings tab menu events components and announce their menus as deferred', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const calloutCalls = vi.mocked(CalloutMenuEventsComponent).mock.calls;
    expect(calloutCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(calloutCalls[0]?.[0]).app).toBe(plugin.app);

    const pluginSettingTabCalls = vi.mocked(PluginSettingTabMenuEventsComponent).mock.calls;
    expect(pluginSettingTabCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(pluginSettingTabCalls[0]?.[0]).app).toBe(plugin.app);
    expect(vi.mocked(MenuPatchComponent).mock.calls[0]?.[0].deferredMenuAnnouncers).toEqual([
      vi.mocked(SidebarToggleMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(CommunityPluginMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(CalloutMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(PluginSettingTabMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(ExternalImageMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(TableMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(PropertyValueMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(BasesColumnMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(CssSnippetMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(PdfOutlineMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(PdfPageMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(BasesKanbanColumnMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(VaultMenuEventsComponent).mock.results[0]?.value
    ]);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the property value and Bases column menu events components with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const propertyValueCalls = vi.mocked(PropertyValueMenuEventsComponent).mock.calls;
    expect(propertyValueCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(propertyValueCalls[0]?.[0]).app).toBe(plugin.app);

    const basesColumnCalls = vi.mocked(BasesColumnMenuEventsComponent).mock.calls;
    expect(basesColumnCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(basesColumnCalls[0]?.[0]).app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the property and CSS snippet menu events components with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const propertyCalls = vi.mocked(PropertyMenuEventsComponent).mock.calls;
    expect(propertyCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(propertyCalls[0]?.[0]).app).toBe(plugin.app);

    const cssSnippetCalls = vi.mocked(CssSnippetMenuEventsComponent).mock.calls;
    expect(cssSnippetCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(cssSnippetCalls[0]?.[0]).app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the PDF outline and page menu events components with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const pdfOutlineCalls = vi.mocked(PdfOutlineMenuEventsComponent).mock.calls;
    expect(pdfOutlineCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(pdfOutlineCalls[0]?.[0]).app).toBe(plugin.app);

    const pdfPageCalls = vi.mocked(PdfPageMenuEventsComponent).mock.calls;
    expect(pdfPageCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(pdfPageCalls[0]?.[0]).app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the external image and Bases board column menu events components with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const externalImageCalls = vi.mocked(ExternalImageMenuEventsComponent).mock.calls;
    expect(externalImageCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(externalImageCalls[0]?.[0]).app).toBe(plugin.app);

    const basesKanbanColumnCalls = vi.mocked(BasesKanbanColumnMenuEventsComponent).mock.calls;
    expect(basesKanbanColumnCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(basesKanbanColumnCalls[0]?.[0]).app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the vault menu and workspace menu events components with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const vaultCalls = vi.mocked(VaultMenuEventsComponent).mock.calls;
    expect(vaultCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(vaultCalls[0]?.[0]).app).toBe(plugin.app);

    const workspaceCalls = vi.mocked(WorkspaceMenuEventsComponent).mock.calls;
    expect(workspaceCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(workspaceCalls[0]?.[0]).app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the search menu, markdown menu and canvas object menu events components with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const searchCalls = vi.mocked(SearchMenuEventsComponent).mock.calls;
    expect(searchCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(searchCalls[0]?.[0]).app).toBe(plugin.app);

    const markdownCalls = vi.mocked(MarkdownMenuEventsComponent).mock.calls;
    expect(markdownCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(markdownCalls[0]?.[0]).app).toBe(plugin.app);

    const canvasObjectCalls = vi.mocked(CanvasObjectMenuEventsComponent).mock.calls;
    expect(canvasObjectCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(canvasObjectCalls[0]?.[0]).app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the Bases view menu events component as a positioned announcer, after the community plugin one', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const basesViewCalls = vi.mocked(BasesViewMenuEventsComponent).mock.calls;
    expect(basesViewCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(basesViewCalls[0]?.[0]).app).toBe(plugin.app);
    expect(vi.mocked(MenuPatchComponent).mock.calls[0]?.[0].positionedMenuAnnouncers).toEqual([
      vi.mocked(CommunityPluginMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(BasesViewMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(PdfToolbarMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(CanvasToolbarMenuEventsComponent).mock.results[0]?.value
    ]);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the history menu events component as an immediate announcer, and the community plugin one as a positioned one too', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const historyCalls = vi.mocked(HistoryMenuEventsComponent).mock.calls;
    expect(historyCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(historyCalls[0]?.[0]).app).toBe(plugin.app);
    expect(vi.mocked(MenuPatchComponent).mock.calls[0]?.[0].positionedMenuAnnouncers).toContain(
      vi.mocked(CommunityPluginMenuEventsComponent).mock.results[0]?.value
    );

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should add the table menu events component once, as both a deferred and an immediate announcer', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const tableCalls = vi.mocked(TableMenuEventsComponent).mock.calls;
    expect(tableCalls).toHaveLength(1);
    expect(castTo<PluginEventsComponentConstructorParams>(tableCalls[0]?.[0]).app).toBe(plugin.app);
    const tableComponent: unknown = vi.mocked(TableMenuEventsComponent).mock.results[0]?.value;
    const menuPatchParams = vi.mocked(MenuPatchComponent).mock.calls[0]?.[0];
    expect(menuPatchParams?.deferredMenuAnnouncers).toContain(tableComponent);
    expect(menuPatchParams?.menuAnnouncers).toContain(tableComponent);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should publish both root menu spots through the shared component without requesting folder replacement', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();
    const calls = vi.mocked(FileExplorerRootMenuComponent).mock.calls;
    expect(calls).toHaveLength(1);
    const params = calls[0]?.[0];
    expect(params?.app).toBe(app);
    expect(params?.shouldPresentRootAsFolder).toBeUndefined();
    const trigger = vi.spyOn(app.workspace, 'trigger');
    const menu = new Menu();
    for (const spot of [FileExplorerRootMenuSpot.EmptyArea, FileExplorerRootMenuSpot.VaultName]) {
      params?.handler({ menu, mouseEvent: new MouseEvent('contextmenu'), rootFolder: app.vault.getRoot(), spot });
      expect(trigger).toHaveBeenLastCalledWith('more-events:file-explorer-root-menu', menu, spot);
    }
    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });
  it('should register the PDF toolbar announcer with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();
    expect(vi.mocked(PdfToolbarMenuEventsComponent)).toHaveBeenCalledExactlyOnceWith({ app });
    expect(vi.mocked(MenuPatchComponent).mock.calls[0]?.[0].positionedMenuAnnouncers).toContain(getFirstInstance(PdfToolbarMenuEventsComponent));
    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should register the canvas toolbar announcer with the app', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();
    expect(vi.mocked(CanvasToolbarMenuEventsComponent)).toHaveBeenCalledExactlyOnceWith({ app });
    expect(vi.mocked(MenuPatchComponent).mock.calls[0]?.[0].positionedMenuAnnouncers).toContain(getFirstInstance(CanvasToolbarMenuEventsComponent));
    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should register the open demo vault command', async () => {
    const plugin = new Plugin(app, manifest);
    const addCommandSpy = vi.spyOn(plugin, 'addCommand');
    // PluginBase.onload is async; driving it directly runs onloadImpl and registers the command handlers.
    await plugin.onload();

    expect(addCommandSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'open-demo-vault' }));

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should declare no api before it has loaded', () => {
    const plugin = new Plugin(app, manifest);

    expect(castTo<PluginApisReader>(plugin).getPluginApis()).toEqual([]);
  });

  it('should declare the api for the base to publish once it has loaded', async () => {
    const plugin = new Plugin(app, manifest);
    await plugin.onload();

    const declarations = castTo<PluginApisReader>(plugin).getPluginApis();
    expect(declarations).toHaveLength(1);
    expect(declarations[0]?.api).toBeInstanceOf(MoreEventsApiImpl);
    expect(declarations[0]?.apiVersion).toBe(PLUGIN_API_VERSION);
    expect(declarations[0]?.contract).toBe(PLUGIN_API_CONTRACT);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });
});

/**
 * The instance a mocked component class constructed first.
 *
 * @param componentClass - The mocked class.
 * @returns The instance.
 */
function getFirstInstance(componentClass: object): unknown {
  return castTo<Mock>(componentClass).mock.results[0]?.value;
}

function seedOnRawTarget(strictProxiedObject: object, key: string, value: unknown): void {
  const rawTarget = castTo<object | undefined>(Reflect.get(strictProxiedObject, STRICT_PROXY_TARGET_SYMBOL)) ?? strictProxiedObject;
  Reflect.set(rawTarget, key, value);
}
