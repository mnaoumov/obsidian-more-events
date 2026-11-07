import type {
  App as AppOriginal,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { TAB_SWITCHER_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { TabSwitcherMenuEventsComponent } from './tab-switcher-menu-events-component.ts';

describe('TabSwitcherMenuEventsComponent', () => {
  it('should announce the menu of the navigation bar\'s tab button, with the most recent leaf', () => {
    const leaf = castTo<WorkspaceLeaf>({});
    const { app, navbarEl } = createApp(leaf);
    const tabsEl = navbarEl.createDiv('mobile-navbar-actions').createDiv('mobile-navbar-action mobile-navbar-action-tabs');
    const iconEl = tabsEl.createDiv('clickable-icon');
    const menu = Menu.create2__().asOriginalType2__();

    expect(new TabSwitcherMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), [iconEl, tabsEl, navbarEl, window]))
      .toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(TAB_SWITCHER_MENU_EVENT_NAME, menu, leaf);
  });

  it('should pass null when there is no recent leaf', () => {
    const { app, navbarEl } = createApp(null);
    const tabsEl = navbarEl.createDiv('mobile-navbar-action-tabs');
    const menu = Menu.create2__().asOriginalType2__();

    expect(new TabSwitcherMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), [tabsEl, navbarEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(TAB_SWITCHER_MENU_EVENT_NAME, menu, null);
  });

  it('should leave a menu for another navigation bar button alone', () => {
    const { app, navbarEl } = createApp(null);
    const menuButtonEl = navbarEl.createDiv('mobile-navbar-action-menu');

    expect(
      new TabSwitcherMenuEventsComponent({ app }).announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [
        menuButtonEl,
        navbarEl,
        window
      ])
    ).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave an element of that class outside the navigation bar alone', () => {
    const { app } = createApp(null);
    const strayEl = createDiv('mobile-navbar-action-tabs');

    expect(new TabSwitcherMenuEventsComponent({ app }).announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [strayEl, window]))
      .toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should announce nothing on desktop, where there is no navigation bar', () => {
    const trigger = vi.fn();
    const app = castTo<AppOriginal>({ mobileNavbar: null, workspace: { getMostRecentLeaf: vi.fn(), trigger } });
    const strayEl = createDiv('mobile-navbar-action-tabs');

    expect(new TabSwitcherMenuEventsComponent({ app }).announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [strayEl, window]))
      .toBe(false);
    expect(trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly navbarEl: HTMLElement;
}

function createApp(leaf: null | WorkspaceLeaf): TestApp {
  const navbarEl = createDiv('mobile-navbar');
  const app = castTo<AppOriginal>({
    mobileNavbar: {
      containerEl: navbarEl
    },
    workspace: {
      getMostRecentLeaf: vi.fn(() => leaf),
      trigger: vi.fn()
    }
  });
  return { app, navbarEl };
}
