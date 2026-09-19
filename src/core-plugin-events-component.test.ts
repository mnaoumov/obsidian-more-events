import type { App as AppOriginal } from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  App,
  Events
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { CorePluginEventsComponent } from './core-plugin-events-component.ts';
import {
  CORE_PLUGIN_DISABLED_EVENT_NAME,
  CORE_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';

// `obsidian-test-mocks` deliberately leaves `App.internalPlugins` unmocked, so the strict proxy refuses a
// plain assignment; the seed goes onto its raw target, as it does for every other unmocked member.
const STRICT_PROXY_TARGET_SYMBOL = Symbol.for('strictProxyTarget');

interface CorePluginInstanceStub {
  name: string;
}

interface CorePluginStub {
  enabled: boolean;
  instance: CorePluginInstanceStub;
}

describe('CorePluginEventsComponent', () => {
  let app: AppOriginal;
  let appMock: App;
  let corePlugins: Record<string, CorePluginStub>;
  let internalPluginsEvents: Events;
  const loadedComponents: CorePluginEventsComponent[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    appMock = App.createConfigured__();
    app = appMock.asOriginalType__();

    corePlugins = {
      'backlink': createCorePlugin('Backlinks', true),
      'canvas': createCorePlugin('Canvas', false),
      'file-explorer': createCorePlugin('Files', true)
    };

    /*
     * A real emitter rather than a double: the component registers through `Component.registerEvent`, which
     * reaches back into the emitter to unregister, so a `vi.fn()` `on` would make the unload test vacuous.
     */
    internalPluginsEvents = Events.create__();
    seedOnRawTarget(internalPluginsEvents, 'plugins', corePlugins);
    seedOnRawTarget(app, 'internalPlugins', internalPluginsEvents.asOriginalType__());
  });

  afterEach(() => {
    while (loadedComponents.length > 0) {
      loadedComponents.pop()?.unload();
    }
    vi.restoreAllMocks();
  });

  it('should report the core plugins that were enabled when it loaded', () => {
    loadComponent();

    expect(loadedComponents[0]?.getEnabledCorePluginIds()).toEqual(['backlink', 'file-explorer']);
    expect(loadedComponents[0]?.isCorePluginEnabled('backlink')).toBe(true);
    expect(loadedComponents[0]?.isCorePluginEnabled('canvas')).toBe(false);
  });

  it('should trigger the enabled event when a core plugin becomes enabled', () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, handler);

    enableCorePlugin('canvas');

    expect(handler).toHaveBeenCalledExactlyOnceWith({ corePluginId: 'canvas', corePluginName: 'Canvas' });
    expect(component.isCorePluginEnabled('canvas')).toBe(true);
  });

  it('should trigger the disabled event when a core plugin becomes disabled', () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, handler);

    disableCorePlugin('backlink');

    expect(handler).toHaveBeenCalledExactlyOnceWith({ corePluginId: 'backlink', corePluginName: 'Backlinks' });
    expect(component.isCorePluginEnabled('backlink')).toBe(false);
  });

  it('should trigger nothing when the change left every core plugin as it was', () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    // Obsidian triggers `change` for reasons of its own, and the settings tab answers every one of them by
    // redrawing. This plugin answers by diffing, so a change that moved nothing must announce nothing.
    internalPluginsEvents.trigger('change');

    expect(enabledHandler).not.toHaveBeenCalled();
    expect(disabledHandler).not.toHaveBeenCalled();
  });

  it('should trigger one event per core plugin when several change at once', () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    setEnabled('canvas', true);
    setEnabled('backlink', false);
    setEnabled('file-explorer', false);
    internalPluginsEvents.trigger('change');

    expect(enabledHandler).toHaveBeenCalledExactlyOnceWith({ corePluginId: 'canvas', corePluginName: 'Canvas' });
    expect(disabledHandler).toHaveBeenCalledTimes(2);
    expect(disabledHandler).toHaveBeenCalledWith({ corePluginId: 'backlink', corePluginName: 'Backlinks' });
    expect(disabledHandler).toHaveBeenCalledWith({ corePluginId: 'file-explorer', corePluginName: 'Files' });
  });

  it('should stop listening once it has unloaded', () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, handler);

    component.unload();
    loadedComponents.pop();
    enableCorePlugin('canvas');

    expect(handler).not.toHaveBeenCalled();
  });

  function createCorePlugin(name: string, isEnabled: boolean): CorePluginStub {
    return {
      enabled: isEnabled,
      instance: { name }
    };
  }

  function disableCorePlugin(corePluginId: string): void {
    setEnabled(corePluginId, false);
    internalPluginsEvents.trigger('change');
  }

  function enableCorePlugin(corePluginId: string): void {
    setEnabled(corePluginId, true);
    internalPluginsEvents.trigger('change');
  }

  function loadComponent(): CorePluginEventsComponent {
    const component = new CorePluginEventsComponent({ app });
    component.load();
    loadedComponents.push(component);
    return component;
  }

  function setEnabled(corePluginId: string, isEnabled: boolean): void {
    const corePlugin = corePlugins[corePluginId];
    if (corePlugin) {
      corePlugin.enabled = isEnabled;
    }
  }
});

function seedOnRawTarget(strictProxiedObject: object, key: string, value: unknown): void {
  const rawTarget = castTo<object | undefined>(Reflect.get(strictProxiedObject, STRICT_PROXY_TARGET_SYMBOL)) ?? strictProxiedObject;
  Reflect.set(rawTarget, key, value);
}
