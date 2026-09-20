import type { App as AppOriginal } from 'obsidian';

import { noopAsync } from 'obsidian-dev-utils/function';
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
  id: string;
  name: string;
  onUserDisable?: () => void;
  onUserEnable?: () => void;
}

interface CorePluginStubConstructorParams {
  readonly id: string;
  readonly internalPluginsEvents: Events;
  readonly isEnabled: boolean;
  readonly name: string;
}

/**
 * A stand-in for one entry of `app.internalPlugins.plugins`.
 *
 * A CLASS rather than the object literal this fixture used to be, because the component now patches
 * `InternalPlugin.prototype.enable` / `.disable`, and an object literal's prototype is `Object.prototype` —
 * neither the right thing to patch nor a thing anything should ever patch. One class, one prototype, every
 * fixture plugin sharing it: the shape the real app has, and the reason one patch covers every core plugin.
 *
 * `enable` and `disable` mirror Obsidian's. Both are guarded, so a call that changes nothing triggers
 * nothing. Both call the instance's own `onUserEnable` / `onUserDisable` hook when the flag is set, which
 * is the ONLY thing Obsidian does with that argument. And both end by triggering `change` on the manager
 * without it — which is the gap this component patches to fill.
 */
class CorePluginStub {
  public enabled: boolean;
  public readonly instance: CorePluginInstanceStub;
  private readonly internalPluginsEvents: Events;

  public constructor(params: CorePluginStubConstructorParams) {
    this.enabled = params.isEnabled;
    this.instance = {
      id: params.id,
      name: params.name
    };
    this.internalPluginsEvents = params.internalPluginsEvents;
  }

  public disable(isDisabledByUser?: boolean): void {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    if (isDisabledByUser) {
      this.instance.onUserDisable?.();
    }
    this.internalPluginsEvents.trigger('change');
  }

  public enable(isEnabledByUser?: boolean): Promise<void> {
    if (this.enabled) {
      return noopAsync();
    }

    this.enabled = true;
    if (isEnabledByUser) {
      this.instance.onUserEnable?.();
    }
    this.internalPluginsEvents.trigger('change');
    return noopAsync();
  }
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

    /*
     * A real emitter rather than a double: the component registers through `Component.registerEvent`, which
     * reaches back into the emitter to unregister, so a `vi.fn()` `on` would make the unload test vacuous.
     */
    internalPluginsEvents = Events.create__();

    corePlugins = {
      'backlink': createCorePlugin('backlink', 'Backlinks', true),
      'canvas': createCorePlugin('canvas', 'Canvas', false),
      'file-explorer': createCorePlugin('file-explorer', 'Files', true),
      'graph': createCorePlugin('graph', 'Graph', false)
    };

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

  it('should trigger the enabled event when a core plugin becomes enabled', async () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, handler);

    await corePlugin('canvas').enable(true);

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'canvas',
      corePluginName: 'Canvas',
      isUserInitiated: true
    });
    expect(component.isCorePluginEnabled('canvas')).toBe(true);
  });

  it('should trigger the disabled event when a core plugin becomes disabled', () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, handler);

    corePlugin('backlink').disable(true);

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'backlink',
      corePluginName: 'Backlinks',
      isUserInitiated: true
    });
    expect(component.isCorePluginEnabled('backlink')).toBe(false);
  });

  /*
   * The distinction the patch exists for. `enable(true)` is what the toggle in **Settings -> Core plugins**
   * calls; `enable(false)` is what a plugin enabling something for itself calls, and what Obsidian calls
   * when it turns the default core plugins on at startup. Both trigger the same `change`, which is exactly
   * why a diff on its own can never tell them apart.
   */
  it('should report a programmatic change as not user-initiated', async () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    await corePlugin('canvas').enable(false);
    corePlugin('backlink').disable(false);

    expect(enabledHandler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'canvas',
      corePluginName: 'Canvas',
      isUserInitiated: false
    });
    expect(disabledHandler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'backlink',
      corePluginName: 'Backlinks',
      isUserInitiated: false
    });
  });

  /*
   * Obsidian's own signature makes the argument optional. Its own call sites always pass one, but a third
   * party need not, and the answer then has to be the cautious one.
   */
  it('should report an omitted flag as not user-initiated', async () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    await corePlugin('canvas').enable();
    corePlugin('backlink').disable();

    expect(enabledHandler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'canvas',
      corePluginName: 'Canvas',
      isUserInitiated: false
    });
    expect(disabledHandler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'backlink',
      corePluginName: 'Backlinks',
      isUserInitiated: false
    });
  });

  /*
   * The patch has to be transparent: whatever Obsidian did with the argument before still has to happen.
   * `onUserEnable` / `onUserDisable` are the only thing it does with it, and they are also the hook the
   * plugins this one exists to unburden patch for themselves — so a patch that swallowed them would break
   * the very consumers it is built for.
   */
  it('should leave the hooks Obsidian runs for a user-initiated change alone', async () => {
    loadComponent();
    const onUserEnable = vi.fn();
    const onUserDisable = vi.fn();
    corePlugin('canvas').instance.onUserEnable = onUserEnable;
    corePlugin('backlink').instance.onUserDisable = onUserDisable;

    await corePlugin('canvas').enable(true);
    corePlugin('backlink').disable(true);

    expect(onUserEnable).toHaveBeenCalledOnce();
    expect(onUserDisable).toHaveBeenCalledOnce();
  });

  /*
   * A transition that never went through `enable` / `disable` cannot have been recorded, and `false` is the
   * only honest answer: nothing said the user did it. A real vault has no such path, because those two are
   * the only writers of the flag Obsidian itself reads.
   */
  it('should report an unrecorded change as not user-initiated', () => {
    loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, handler);

    setEnabledBehindTheSeam('canvas', true);
    internalPluginsEvents.trigger('change');

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'canvas',
      corePluginName: 'Canvas',
      isUserInitiated: false
    });
  });

  it('should not let one core plugin flag reach another core plugin event', async () => {
    loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, handler);

    await corePlugin('canvas').enable(true);
    setEnabledBehindTheSeam('graph', true);
    internalPluginsEvents.trigger('change');

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({
      corePluginId: 'canvas',
      corePluginName: 'Canvas',
      isUserInitiated: true
    });
    expect(handler).toHaveBeenCalledWith({
      corePluginId: 'graph',
      corePluginName: 'Graph',
      isUserInitiated: false
    });
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

    setEnabledBehindTheSeam('canvas', true);
    setEnabledBehindTheSeam('backlink', false);
    setEnabledBehindTheSeam('file-explorer', false);
    internalPluginsEvents.trigger('change');

    expect(enabledHandler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'canvas',
      corePluginName: 'Canvas',
      isUserInitiated: false
    });
    expect(disabledHandler).toHaveBeenCalledTimes(2);
    expect(disabledHandler).toHaveBeenCalledWith({
      corePluginId: 'backlink',
      corePluginName: 'Backlinks',
      isUserInitiated: false
    });
    expect(disabledHandler).toHaveBeenCalledWith({
      corePluginId: 'file-explorer',
      corePluginName: 'Files',
      isUserInitiated: false
    });
  });

  it('should stop listening once it has unloaded', async () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, handler);

    component.unload();
    loadedComponents.pop();
    await corePlugin('canvas').enable(true);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should uninstall its patch once it has unloaded', () => {
    const component = loadComponent();
    const patchedEnable = corePlugin('canvas').enable;

    component.unload();
    loadedComponents.pop();

    // The patch lives on a prototype every core plugin in the vault shares, so leaving it installed would
    // outlive the plugin and keep recording into a component nothing reads any more.
    expect(corePlugin('canvas').enable).not.toBe(patchedEnable);
  });

  it('should keep publishing when there is no core plugin to read the prototype from', () => {
    /*
     * A real Obsidian always has core plugins, so this is not a vault state. It is the one branch in the
     * patch component, and what it asserts is that the events do not depend on the patch: the diff still
     * works, and every payload says the cautious thing.
     */
    const emptyCorePlugins: Record<string, CorePluginStub> = {};
    seedOnRawTarget(internalPluginsEvents, 'plugins', emptyCorePlugins);

    loadComponent();
    const handler = vi.fn();
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, handler);

    emptyCorePlugins['canvas'] = createCorePlugin('canvas', 'Canvas', true);
    internalPluginsEvents.trigger('change');

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      corePluginId: 'canvas',
      corePluginName: 'Canvas',
      isUserInitiated: false
    });
  });

  function corePlugin(corePluginId: string): CorePluginStub {
    const stub = corePlugins[corePluginId];
    if (!stub) {
      throw new Error(`No core plugin fixture for ${corePluginId}`);
    }

    return stub;
  }

  function createCorePlugin(id: string, name: string, isEnabled: boolean): CorePluginStub {
    return new CorePluginStub({
      id,
      internalPluginsEvents,
      isEnabled,
      name
    });
  }

  function loadComponent(): CorePluginEventsComponent {
    const component = new CorePluginEventsComponent({ app });
    component.load();
    loadedComponents.push(component);
    return component;
  }

  /**
   * Moves a core plugin without going through `enable` / `disable`, so nothing records who did it.
   *
   * Obsidian has no such path — those two methods are the only writers — so this exists to drive the diff
   * on its own, and to prove what the events say when the flag was never offered.
   *
   * @param corePluginId - The core plugin's id.
   * @param isEnabled - The state to move it to.
   */
  function setEnabledBehindTheSeam(corePluginId: string, isEnabled: boolean): void {
    corePlugin(corePluginId).enabled = isEnabled;
  }
});

function seedOnRawTarget(strictProxiedObject: object, key: string, value: unknown): void {
  const rawTarget = castTo<object | undefined>(Reflect.get(strictProxiedObject, STRICT_PROXY_TARGET_SYMBOL)) ?? strictProxiedObject;
  Reflect.set(rawTarget, key, value);
}
