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

import { CommunityPluginMenuEventsComponent } from './community-plugin-menu-events-component.ts';
import { COMMUNITY_PLUGIN_MENU_EVENT_NAME } from './more-events-api.ts';

const PLUGIN_ID = 'sample-plugin';

describe('CommunityPluginMenuEventsComponent', () => {
  it('should announce the menu of an installed community plugin\'s row', () => {
    const { app, rowEl, tabEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const nameEl = rowEl.createDiv();

    expect(isAnnounced(app, menu, [nameEl, rowEl, tabEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(COMMUNITY_PLUGIN_MENU_EVENT_NAME, menu, PLUGIN_ID);
  });

  it('should leave a menu shown outside the Community plugins tab alone', () => {
    const { app, otherTabEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [otherTabEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu shown on the tab but on no plugin row alone', () => {
    const { app, tabEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [tabEl, window])).toBe(false);
  });

  it('should leave the row of a plugin with no known manifest alone', () => {
    const { app, rowEl, tabEl } = createApp();
    rowEl.dataset['pluginId'] = 'not-installed';

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [rowEl, tabEl, window])).toBe(false);
  });

  it('should leave every menu alone before the Settings modal exists', () => {
    const app = castTo<AppOriginal>({ plugins: { manifests: {} }, workspace: { trigger: vi.fn() } });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [window])).toBe(false);
    expect(new CommunityPluginMenuEventsComponent({ app }).announcePositionedMenu(Menu.create2__().asOriginalType2__(), createDiv())).toBe(false);
  });

  it('should announce the menu of an installed community plugin\'s More options button', () => {
    const { app, rowEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const buttonEl = rowEl.createDiv().createDiv();

    expect(new CommunityPluginMenuEventsComponent({ app }).announcePositionedMenu(menu, buttonEl)).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(COMMUNITY_PLUGIN_MENU_EVENT_NAME, menu, PLUGIN_ID);
  });

  it('should leave a menu anchored outside the tab\'s plugin rows alone', () => {
    const { app, otherTabEl, tabEl } = createApp();
    const component = new CommunityPluginMenuEventsComponent({ app });

    expect(component.announcePositionedMenu(Menu.create2__().asOriginalType2__(), otherTabEl.createDiv())).toBe(false);
    expect(component.announcePositionedMenu(Menu.create2__().asOriginalType2__(), tabEl.createDiv())).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave the More options button of a plugin with no known manifest alone', () => {
    const { app, rowEl } = createApp();
    rowEl.dataset['pluginId'] = 'not-installed';

    expect(new CommunityPluginMenuEventsComponent({ app }).announcePositionedMenu(Menu.create2__().asOriginalType2__(), rowEl.createDiv())).toBe(false);
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly otherTabEl: HTMLElement;
  readonly rowEl: HTMLElement;
  readonly tabEl: HTMLElement;
}

function createApp(): TestApp {
  const tabEl = createDiv();
  tabEl.createDiv({ cls: 'setting-item' });
  const rowEl = tabEl.createDiv({ attr: { 'data-plugin-id': PLUGIN_ID }, cls: 'setting-item' });
  const otherTabEl = createDiv();
  const app = castTo<AppOriginal>({
    plugins: { manifests: { [PLUGIN_ID]: { id: PLUGIN_ID } } },
    setting: {
      settingTabs: [
        { containerEl: otherTabEl, id: 'appearance' },
        { containerEl: tabEl, id: 'community-plugins' }
      ]
    },
    workspace: { trigger: vi.fn() }
  });
  return { app, otherTabEl, rowEl, tabEl };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new CommunityPluginMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
