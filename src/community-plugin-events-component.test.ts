import type { App as AppOriginal } from 'obsidian';

import { noopAsync } from 'obsidian-dev-utils/function';
import {
  castTo,
  getPrototypeOf
} from 'obsidian-dev-utils/object-utils';
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

import { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import {
  COMMUNITY_PLUGIN_DISABLED_EVENT_NAME,
  COMMUNITY_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';

// `obsidian-test-mocks` deliberately leaves `App.plugins` unmocked, so the strict proxy refuses a plain
// assignment; the seed goes onto its raw target, as it does for every other unmocked member.
const STRICT_PROXY_TARGET_SYMBOL = Symbol.for('strictProxyTarget');

const COMMUNITY_PLUGIN_NAMES_BY_ID: Record<string, string> = {
  'dataview': 'Dataview',
  'more-events': 'More Events',
  'templater': 'Templater'
};

interface CommunityPluginManifestStub {
  name: string;
}

interface CommunityPluginStub {
  _userDisabled?: boolean;
  manifest: CommunityPluginManifestStub;
}

describe('CommunityPluginEventsComponent', () => {
  let app: AppOriginal;
  let appMock: App;
  let communityPlugins: Record<string, CommunityPluginStub>;
  let pluginsEvents: Events;
  let pluginManager: AppOriginal['plugins'];
  const loadedComponents: CommunityPluginEventsComponent[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    appMock = App.createConfigured__();
    app = appMock.asOriginalType__();

    /*
     * `app.plugins.plugins` holds only the plugins that are LOADED — a disabled one is deleted from the
     * record rather than flagged — so the fixture is a record that entries come and go from, not a set of
     * booleans. That is the whole difference from the core-plugin fixture, and the reason this component
     * reads a different thing.
     */
    communityPlugins = {
      'dataview': createCommunityPlugin('dataview'),
      'more-events': createCommunityPlugin('more-events')
    };

    /*
     * A real emitter rather than a double: the component registers through `Component.registerEvent`, which
     * reaches back into the emitter to unregister, so a `vi.fn()` `on` would make the unload test vacuous.
     */
    pluginsEvents = Events.create__();
    seedOnRawTarget(pluginsEvents, 'plugins', communityPlugins);

    /*
     * The component patches `enablePlugin` / `disablePlugin` on the manager's PROTOTYPE, so the fixture has
     * to put them there rather than on the object — a patch and an own property are not the same test. A
     * prototype slipped into the chain per test keeps the mock's own members reachable and keeps one test's
     * patch out of the next one's.
     *
     * The two mirror Obsidian's. Both are guarded, both are the only writers of the record above, both do
     * with the flag what Obsidian does with it — `_userDisabled` on the way out — and NEITHER triggers
     * `changed` itself: that goes through a 0 ms debounce, which is why every test below fires it
     * separately and why a batch of transitions is still one signal.
     */
    const pluginsRawTarget = rawTargetOf(pluginsEvents);
    const pluginManagerPrototype = castTo<AppOriginal['plugins']>(Object.create(getPrototypeOf(pluginsRawTarget)));
    Reflect.set(pluginManagerPrototype, 'enablePlugin', enablePlugin);
    Reflect.set(pluginManagerPrototype, 'disablePlugin', disablePlugin);
    Object.setPrototypeOf(pluginsRawTarget, pluginManagerPrototype);

    seedOnRawTarget(app, 'plugins', pluginsEvents.asOriginalType__());
    pluginManager = app.plugins;
  });

  afterEach(() => {
    while (loadedComponents.length > 0) {
      loadedComponents.pop()?.unload();
    }
    vi.restoreAllMocks();
  });

  it('should report the community plugins that were loaded when it loaded', () => {
    loadComponent();

    expect(loadedComponents[0]?.getEnabledCommunityPluginIds()).toEqual(['dataview', 'more-events']);
    expect(loadedComponents[0]?.isCommunityPluginEnabled('dataview')).toBe(true);
    expect(loadedComponents[0]?.isCommunityPluginEnabled('templater')).toBe(false);
  });

  it('should trigger the enabled event when a community plugin becomes loaded', async () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, handler);

    await pluginManager.enablePlugin('templater', true);
    pluginsEvents.trigger('changed');

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      communityPluginId: 'templater',
      communityPluginName: 'Templater',
      isUserInitiated: true
    });
    expect(component.isCommunityPluginEnabled('templater')).toBe(true);
  });

  it('should trigger the disabled event when a community plugin becomes unloaded', async () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, handler);

    await pluginManager.disablePlugin('dataview', true);
    pluginsEvents.trigger('changed');

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      communityPluginId: 'dataview',
      communityPluginName: 'Dataview',
      isUserInitiated: true
    });
    expect(component.isCommunityPluginEnabled('dataview')).toBe(false);
  });

  /*
   * The distinction the patch exists for. `true` is what `enablePluginAndSave` / `disablePluginAndSave`
   * forward, which is what the toggle in **Settings -> Community plugins** calls; `false` is what a plain
   * programmatic `enablePlugin` / `disablePlugin` forwards.
   */
  it('should report a programmatic change as not user-initiated', async () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    await pluginManager.enablePlugin('templater', false);
    await pluginManager.disablePlugin('dataview', false);
    pluginsEvents.trigger('changed');

    expect(enabledHandler).toHaveBeenCalledExactlyOnceWith({
      communityPluginId: 'templater',
      communityPluginName: 'Templater',
      isUserInitiated: false
    });
    expect(disabledHandler).toHaveBeenCalledExactlyOnceWith({
      communityPluginId: 'dataview',
      communityPluginName: 'Dataview',
      isUserInitiated: false
    });
  });

  /*
   * Obsidian's own signature defaults the argument to `false` rather than requiring it, and its startup
   * path omits it entirely.
   */
  it('should report an omitted flag as not user-initiated', async () => {
    loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, handler);

    await pluginManager.enablePlugin('templater');
    pluginsEvents.trigger('changed');

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      communityPluginId: 'templater',
      communityPluginName: 'Templater',
      isUserInitiated: false
    });
  });

  /*
   * The patch has to be transparent, which is the first thing a monkey-patch gets wrong: what the original
   * returned still has to come back, and what it did with the flag still has to have happened.
   */
  it('should pass the call through to Obsidian untouched', async () => {
    loadComponent();
    const dataview = communityPlugins['dataview'];

    const wasEnabled = await pluginManager.enablePlugin('templater', true);
    await pluginManager.disablePlugin('dataview', true);

    expect(wasEnabled).toBe(true);
    expect(dataview?._userDisabled).toBe(true);
  });

  /*
   * A transition that never went through `enablePlugin` / `disablePlugin` cannot have been recorded, and
   * `false` is the only honest answer. Obsidian itself has no such path; a third party calling `loadPlugin`
   * directly is what it would take.
   */
  it('should report an unrecorded change as not user-initiated', () => {
    loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, handler);

    communityPlugins['templater'] = createCommunityPlugin('templater');
    pluginsEvents.trigger('changed');

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      communityPluginId: 'templater',
      communityPluginName: 'Templater',
      isUserInitiated: false
    });
  });

  it('should trigger nothing when the change left every community plugin as it was', () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    // Obsidian fires `changed` from the manifest load and the update check as well as from enabling and
    // disabling, so most of them move nothing at all. This plugin answers by diffing, so those announce
    // nothing.
    pluginsEvents.trigger('changed');

    expect(enabledHandler).not.toHaveBeenCalled();
    expect(disabledHandler).not.toHaveBeenCalled();
  });

  it('should trigger one event per community plugin when several change at once', async () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    /*
     * `app.plugins.didChange` is debounced at 0 ms, so a batch of transitions really does collapse into one
     * `changed`. Turning **Community plugins** off in Settings is exactly this shape, for every plugin at
     * once — and `setEnable(false)` forwards no user flag, which is why the two disabled events below say
     * `false` although a person flipped that switch. That is Obsidian's own notion of user-initiated, and
     * these events report it rather than inventing a wider one.
     */
    await pluginManager.enablePlugin('templater', true);
    await pluginManager.disablePlugin('dataview');
    await pluginManager.disablePlugin('more-events');
    pluginsEvents.trigger('changed');

    expect(enabledHandler).toHaveBeenCalledExactlyOnceWith({
      communityPluginId: 'templater',
      communityPluginName: 'Templater',
      isUserInitiated: true
    });
    expect(disabledHandler).toHaveBeenCalledTimes(2);
    expect(disabledHandler).toHaveBeenCalledWith({
      communityPluginId: 'dataview',
      communityPluginName: 'Dataview',
      isUserInitiated: false
    });
    expect(disabledHandler).toHaveBeenCalledWith({
      communityPluginId: 'more-events',
      communityPluginName: 'More Events',
      isUserInitiated: false
    });
  });

  it('should announce the disabled events before the enabled ones', async () => {
    loadComponent();
    const announced: string[] = [];
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, ({ communityPluginId }) => {
      announced.push(`enabled:${communityPluginId}`);
    });
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, ({ communityPluginId }) => {
      announced.push(`disabled:${communityPluginId}`);
    });

    // An update unloads the plugin and loads the new build, and both halves can land in one `changed`. A
    // consumer that re-reads on the enabled event must not then be told the plugin left.
    await pluginManager.disablePlugin('dataview', true);
    await pluginManager.enablePlugin('templater', true);
    pluginsEvents.trigger('changed');

    expect(announced).toEqual(['disabled:dataview', 'enabled:templater']);
  });

  it('should stop listening once it has unloaded', async () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, handler);

    component.unload();
    loadedComponents.pop();
    await pluginManager.enablePlugin('templater', true);
    pluginsEvents.trigger('changed');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should uninstall its patch once it has unloaded', () => {
    const component = loadComponent();
    const patchedEnablePlugin = pluginManager.enablePlugin;

    component.unload();
    loadedComponents.pop();

    // `app.plugins` and its prototype outlive this plugin, so a patch left on either would keep recording
    // into a component nothing reads any more.
    expect(pluginManager.enablePlugin).not.toBe(patchedEnablePlugin);
  });

  function disablePlugin(communityPluginId: string, isUserDisabled?: boolean): Promise<void> {
    const communityPlugin = communityPlugins[communityPluginId];
    if (!communityPlugin) {
      return noopAsync();
    }

    communityPlugin._userDisabled = isUserDisabled ?? false;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Obsidian itself deletes the entry in `unloadPlugin`, and the whole point of this fixture is to be that record.
    delete communityPlugins[communityPluginId];
    return noopAsync();
  }

  function enablePlugin(communityPluginId: string): Promise<boolean> {
    communityPlugins[communityPluginId] ??= createCommunityPlugin(communityPluginId);

    return Promise.resolve(true);
  }

  function loadComponent(): CommunityPluginEventsComponent {
    const component = new CommunityPluginEventsComponent({ app });
    component.load();
    loadedComponents.push(component);
    return component;
  }
});

function createCommunityPlugin(communityPluginId: string): CommunityPluginStub {
  /*
   * A manifest object per instance rather than one shared record, because that is what the component reads
   * and why: `app.plugins.manifests[id]` is re-read from disk and can already describe a build that is not
   * running, while the instance carries the manifest it was constructed with.
   */
  return { manifest: { name: COMMUNITY_PLUGIN_NAMES_BY_ID[communityPluginId] ?? communityPluginId } };
}

function rawTargetOf(strictProxiedObject: object): object {
  return castTo<object | undefined>(Reflect.get(strictProxiedObject, STRICT_PROXY_TARGET_SYMBOL)) ?? strictProxiedObject;
}

function seedOnRawTarget(strictProxiedObject: object, key: string, value: unknown): void {
  Reflect.set(rawTargetOf(strictProxiedObject), key, value);
}
