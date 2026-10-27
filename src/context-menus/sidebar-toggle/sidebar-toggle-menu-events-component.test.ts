import type { App as AppOriginal } from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { SIDEBAR_TOGGLE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { SidebarToggleMenuEventsComponent } from './sidebar-toggle-menu-events-component.ts';

describe('SidebarToggleMenuEventsComponent', () => {
  it('should announce the menu of the left sidebar toggle button', () => {
    const { app, leftButtonEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const iconEl = leftButtonEl.createDiv();

    expect(new SidebarToggleMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), [iconEl, leftButtonEl, window]))
      .toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(SIDEBAR_TOGGLE_MENU_EVENT_NAME, menu, 'left');
  });

  it('should announce the menu of the right sidebar toggle button', () => {
    const { app, rightButtonEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new SidebarToggleMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), [rightButtonEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(SIDEBAR_TOGGLE_MENU_EVENT_NAME, menu, 'right');
  });

  it('should leave a menu for anything else alone', () => {
    const { app } = createApp();

    expect(
      new SidebarToggleMenuEventsComponent({ app }).announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [
        createDiv(),
        window
      ])
    ).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly leftButtonEl: HTMLElement;
  readonly rightButtonEl: HTMLElement;
}

function createApp(): TestApp {
  const leftButtonEl = createDiv();
  const rightButtonEl = createDiv();
  const app = castTo<AppOriginal>({
    workspace: {
      leftSidebarToggleButtonEl: leftButtonEl,
      rightSidebarToggleButtonEl: rightButtonEl,
      trigger: vi.fn()
    }
  });
  return { app, leftButtonEl, rightButtonEl };
}
