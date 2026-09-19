import type {
  App as AppType,
  PluginManifest
} from 'obsidian';
import type { PluginApiDeclaration } from 'obsidian-dev-utils/obsidian/plugin/plugin-api';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import { CorePluginEventsComponent } from './core-plugin-events-component.ts';
import { MoreEventsApiImpl } from './more-events-api-impl.ts';
import {
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './more-events-api.ts';
import { Plugin } from './plugin.ts';

vi.mock('./community-plugin-events-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    CommunityPluginEventsComponent: vi.fn(function communityPluginEventsComponentStub() {
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

    // The real PluginBase reads dev-utils state off the app (and the global app).
    seedOnRawTarget(app, 'obsidianDevUtilsState', {});
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
