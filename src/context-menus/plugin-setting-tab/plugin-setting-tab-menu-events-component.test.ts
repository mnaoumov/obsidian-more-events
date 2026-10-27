import type {
  App as AppOriginal,
  Menu as MenuOriginal
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
  CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import { PluginSettingTabMenuEventsComponent } from './plugin-setting-tab-menu-events-component.ts';

const CORE_PLUGIN_ID = 'file-recovery';
const COMMUNITY_PLUGIN_ID = 'sample-plugin';

describe('PluginSettingTabMenuEventsComponent', () => {
  it('should announce the menu of a core plugin\'s settings tab', () => {
    const { app, coreNavEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const titleEl = coreNavEl.createDiv();

    expect(isAnnounced(app, menu, [titleEl, coreNavEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME, menu, CORE_PLUGIN_ID);
  });

  it('should announce the menu of a community plugin\'s settings tab', () => {
    const { app, communityNavEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [communityNavEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME, menu, COMMUNITY_PLUGIN_ID);
  });

  it('should leave a menu shown on no plugin settings tab alone', () => {
    const { app } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [createDiv(), window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave every menu alone before the Settings modal exists', () => {
    const app = castTo<AppOriginal>({ internalPlugins: { plugins: {} }, workspace: { trigger: vi.fn() } });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [window])).toBe(false);
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly communityNavEl: HTMLElement;
  readonly coreNavEl: HTMLElement;
}

function createApp(): TestApp {
  const corePlugin = { instance: { id: CORE_PLUGIN_ID } };
  const coreNavEl = createDiv();
  const communityNavEl = createDiv();
  const app = castTo<AppOriginal>({
    internalPlugins: { plugins: { [CORE_PLUGIN_ID]: corePlugin } },
    setting: {
      pluginTabs: [
        // A tab whose nav item was never built, which no right-click can land on.
        { id: 'no-nav-item', plugin: {} },
        { id: CORE_PLUGIN_ID, navEl: coreNavEl, plugin: corePlugin },
        { id: COMMUNITY_PLUGIN_ID, navEl: communityNavEl, plugin: { manifest: { id: COMMUNITY_PLUGIN_ID } } }
      ]
    },
    workspace: { trigger: vi.fn() }
  });
  return { app, communityNavEl, coreNavEl };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new PluginSettingTabMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
