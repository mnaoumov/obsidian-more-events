import type { App as AppOriginal } from 'obsidian';

import {
  App,
  Menu
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  LEAF_MENU_EVENT_NAME,
  TAB_GROUP_MENU_EVENT_NAME
} from './more-events-api.ts';
import { WorkspaceMenuEventsComponent } from './workspace-menu-events-component.ts';

describe('WorkspaceMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: WorkspaceMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new WorkspaceMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
  });

  it('should relay Obsidian\'s own leaf menu event', () => {
    const handler = vi.fn();
    app.workspace.on(LEAF_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const leaf = {};

    app.workspace.trigger('leaf-menu', menu, leaf);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf);
  });

  it('should relay Obsidian\'s own tab group menu event', () => {
    const handler = vi.fn();
    app.workspace.on(TAB_GROUP_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const tabGroup = {};

    app.workspace.trigger('tab-group-menu', menu, tabGroup);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, tabGroup);
  });

  it('should stop relaying once unloaded', () => {
    const leafHandler = vi.fn();
    const tabGroupHandler = vi.fn();
    app.workspace.on(LEAF_MENU_EVENT_NAME, leafHandler);
    app.workspace.on(TAB_GROUP_MENU_EVENT_NAME, tabGroupHandler);
    component.unload();

    app.workspace.trigger('leaf-menu', Menu.create2__().asOriginalType2__(), {});
    app.workspace.trigger('tab-group-menu', Menu.create2__().asOriginalType2__(), {});

    expect(leafHandler).not.toHaveBeenCalled();
    expect(tabGroupHandler).not.toHaveBeenCalled();
  });
});
