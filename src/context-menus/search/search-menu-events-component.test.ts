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

import { SEARCH_RESULTS_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { SearchMenuEventsComponent } from './search-menu-events-component.ts';

describe('SearchMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: SearchMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new SearchMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
  });

  it('should relay Obsidian\'s own search results menu event', () => {
    const handler = vi.fn();
    app.workspace.on(SEARCH_RESULTS_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const searchView = {};

    app.workspace.trigger('search:results-menu', menu, searchView);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, searchView);
  });

  it('should stop relaying once unloaded', () => {
    const handler = vi.fn();
    app.workspace.on(SEARCH_RESULTS_MENU_EVENT_NAME, handler);
    component.unload();

    app.workspace.trigger('search:results-menu', Menu.create2__().asOriginalType2__(), {});

    expect(handler).not.toHaveBeenCalled();
  });
});
