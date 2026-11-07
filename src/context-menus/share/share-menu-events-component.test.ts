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
  RECEIVE_FILES_MENU_EVENT_NAME,
  RECEIVE_TEXT_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import { ShareMenuEventsComponent } from './share-menu-events-component.ts';

describe('ShareMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: ShareMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new ShareMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
  });

  it('should relay Obsidian\'s own shared text menu event', () => {
    const handler = vi.fn();
    app.workspace.on(RECEIVE_TEXT_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    app.workspace.trigger('receive-text-menu', menu, 'shared text');

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, 'shared text');
  });

  it('should relay Obsidian\'s own imported files menu event', () => {
    const handler = vi.fn();
    app.workspace.on(RECEIVE_FILES_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const files = [{ path: 'shared.txt' }];

    app.workspace.trigger('receive-files-menu', menu, files);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, files);
  });

  it('should stop relaying once unloaded', () => {
    const textHandler = vi.fn();
    const filesHandler = vi.fn();
    app.workspace.on(RECEIVE_TEXT_MENU_EVENT_NAME, textHandler);
    app.workspace.on(RECEIVE_FILES_MENU_EVENT_NAME, filesHandler);
    component.unload();

    app.workspace.trigger('receive-text-menu', Menu.create2__().asOriginalType2__(), 'shared text');
    app.workspace.trigger('receive-files-menu', Menu.create2__().asOriginalType2__(), []);

    expect(textHandler).not.toHaveBeenCalled();
    expect(filesHandler).not.toHaveBeenCalled();
  });
});
