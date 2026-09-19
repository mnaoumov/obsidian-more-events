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

import { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import {
  COMMUNITY_PLUGIN_DISABLED_EVENT_NAME,
  COMMUNITY_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';

// `obsidian-test-mocks` deliberately leaves `App.plugins` unmocked, so the strict proxy refuses a plain
// assignment; the seed goes onto its raw target, as it does for every other unmocked member.
const STRICT_PROXY_TARGET_SYMBOL = Symbol.for('strictProxyTarget');

interface CommunityPluginManifestStub {
  name: string;
}

interface CommunityPluginStub {
  manifest: CommunityPluginManifestStub;
}

describe('CommunityPluginEventsComponent', () => {
  let app: AppOriginal;
  let appMock: App;
  let communityPlugins: Record<string, CommunityPluginStub>;
  let pluginsEvents: Events;
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
      'dataview': createCommunityPlugin('Dataview'),
      'more-events': createCommunityPlugin('More Events')
    };

    /*
     * A real emitter rather than a double: the component registers through `Component.registerEvent`, which
     * reaches back into the emitter to unregister, so a `vi.fn()` `on` would make the unload test vacuous.
     */
    pluginsEvents = Events.create__();
    seedOnRawTarget(pluginsEvents, 'plugins', communityPlugins);
    seedOnRawTarget(app, 'plugins', pluginsEvents.asOriginalType__());
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

  it('should trigger the enabled event when a community plugin becomes loaded', () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, handler);

    enableCommunityPlugin('templater', 'Templater');

    expect(handler).toHaveBeenCalledExactlyOnceWith({ communityPluginId: 'templater', communityPluginName: 'Templater' });
    expect(component.isCommunityPluginEnabled('templater')).toBe(true);
  });

  it('should trigger the disabled event when a community plugin becomes unloaded', () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, handler);

    disableCommunityPlugin('dataview');

    expect(handler).toHaveBeenCalledExactlyOnceWith({ communityPluginId: 'dataview', communityPluginName: 'Dataview' });
    expect(component.isCommunityPluginEnabled('dataview')).toBe(false);
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

  it('should trigger one event per community plugin when several change at once', () => {
    loadComponent();
    const enabledHandler = vi.fn();
    const disabledHandler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, enabledHandler);
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, disabledHandler);

    // `app.plugins.didChange` is debounced at 0 ms, so a batch of transitions really does collapse into one
    // `changed`. Turning **Community plugins** off in Settings is exactly this shape, for every plugin at
    // once.
    setLoaded('templater', 'Templater');
    setUnloaded('dataview');
    setUnloaded('more-events');
    pluginsEvents.trigger('changed');

    expect(enabledHandler).toHaveBeenCalledExactlyOnceWith({ communityPluginId: 'templater', communityPluginName: 'Templater' });
    expect(disabledHandler).toHaveBeenCalledTimes(2);
    expect(disabledHandler).toHaveBeenCalledWith({ communityPluginId: 'dataview', communityPluginName: 'Dataview' });
    expect(disabledHandler).toHaveBeenCalledWith({ communityPluginId: 'more-events', communityPluginName: 'More Events' });
  });

  it('should announce the disabled events before the enabled ones', () => {
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
    setUnloaded('dataview');
    setLoaded('templater', 'Templater');
    pluginsEvents.trigger('changed');

    expect(announced).toEqual(['disabled:dataview', 'enabled:templater']);
  });

  it('should stop listening once it has unloaded', () => {
    const component = loadComponent();
    const handler = vi.fn();
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, handler);

    component.unload();
    loadedComponents.pop();
    enableCommunityPlugin('templater', 'Templater');

    expect(handler).not.toHaveBeenCalled();
  });

  function createCommunityPlugin(name: string): CommunityPluginStub {
    return { manifest: { name } };
  }

  function disableCommunityPlugin(communityPluginId: string): void {
    setUnloaded(communityPluginId);
    pluginsEvents.trigger('changed');
  }

  function enableCommunityPlugin(communityPluginId: string, communityPluginName: string): void {
    setLoaded(communityPluginId, communityPluginName);
    pluginsEvents.trigger('changed');
  }

  function loadComponent(): CommunityPluginEventsComponent {
    const component = new CommunityPluginEventsComponent({ app });
    component.load();
    loadedComponents.push(component);
    return component;
  }

  function setLoaded(communityPluginId: string, communityPluginName: string): void {
    communityPlugins[communityPluginId] = createCommunityPlugin(communityPluginName);
  }

  function setUnloaded(communityPluginId: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Obsidian itself deletes the entry in `unloadPlugin`, and the whole point of this fixture is to be that record.
    delete communityPlugins[communityPluginId];
  }
});

function seedOnRawTarget(strictProxiedObject: object, key: string, value: unknown): void {
  const rawTarget = castTo<object | undefined>(Reflect.get(strictProxiedObject, STRICT_PROXY_TARGET_SYMBOL)) ?? strictProxiedObject;
  Reflect.set(rawTarget, key, value);
}
