import type { PluginApiDeclaration } from '@mnaoumov/obsidian-lib/plugin/plugin-api';
import type {
  App as AppType,
  PluginManifest
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { AllPropertiesMenuEventsComponent } from './all-properties-menu-events-component.ts';
import { BookmarksMenuEventsComponent } from './bookmarks-menu-events-component.ts';
import { CalloutMenuEventsComponent } from './callout-menu-events-component.ts';
import { CanvasMenuEventsComponent } from './canvas-menu-events-component.ts';
import { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import { CommunityPluginMenuEventsComponent } from './community-plugin-menu-events-component.ts';
import { CorePluginEventsComponent } from './core-plugin-events-component.ts';
import { MoreEventsApiImpl } from './more-events-api-impl.ts';
import {
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './more-events-api.ts';
import { MenuPatchComponent } from './patches/menu-patch-component.ts';
import { PdfThumbnailMenuEventsComponent } from './pdf-thumbnail-menu-events-component.ts';
import { PluginSettingTabMenuEventsComponent } from './plugin-setting-tab-menu-events-component.ts';
import { Plugin } from './plugin.ts';
import { RibbonMenuEventsComponent } from './ribbon-menu-events-component.ts';
import { SidebarToggleMenuEventsComponent } from './sidebar-toggle-menu-events-component.ts';
import { WebViewerHistoryMenuEventsComponent } from './web-viewer-history-menu-events-component.ts';

vi.mock('./community-plugin-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CommunityPluginEventsComponent: vi.fn(function communityPluginEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./bookmarks-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    BookmarksMenuEventsComponent: vi.fn(function bookmarksMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./canvas-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CanvasMenuEventsComponent: vi.fn(function canvasMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./ribbon-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    RibbonMenuEventsComponent: vi.fn(function ribbonMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./all-properties-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    AllPropertiesMenuEventsComponent: vi.fn(function allPropertiesMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./web-viewer-history-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    WebViewerHistoryMenuEventsComponent: vi.fn(function webViewerHistoryMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./pdf-thumbnail-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PdfThumbnailMenuEventsComponent: vi.fn(function pdfThumbnailMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./sidebar-toggle-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    SidebarToggleMenuEventsComponent: vi.fn(function sidebarToggleMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./community-plugin-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CommunityPluginMenuEventsComponent: vi.fn(function communityPluginMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./callout-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CalloutMenuEventsComponent: vi.fn(function calloutMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./plugin-setting-tab-menu-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    PluginSettingTabMenuEventsComponent: vi.fn(function pluginSettingTabMenuEventsComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./patches/menu-patch-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    MenuPatchComponent: vi.fn(function menuPatchComponentStub() {
      return new Component();
    })
  };
});

vi.mock('./core-plugin-events-component.ts', async () => {
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
  app: AppType;
}

interface LoadedFlagHolder {
  loaded__: boolean;
}

interface ObsidianModule {
  Component: new () => object;
}

interface PluginApisReader {
  getPluginApis: () => PluginApiDeclaration[];
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
      vi.mocked(BookmarksMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(CanvasMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(RibbonMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(AllPropertiesMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(WebViewerHistoryMenuEventsComponent).mock.results[0]?.value,
      vi.mocked(PdfThumbnailMenuEventsComponent).mock.results[0]?.value
    ]);

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
      vi.mocked(PluginSettingTabMenuEventsComponent).mock.results[0]?.value
    ]);

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

function seedOnRawTarget(strictProxiedObject: object, key: string, value: unknown): void {
  const rawTarget = castTo<object | undefined>(Reflect.get(strictProxiedObject, STRICT_PROXY_TARGET_SYMBOL)) ?? strictProxiedObject;
  Reflect.set(rawTarget, key, value);
}
