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

import { MarkdownMenuEventsComponent } from './markdown-menu-events-component.ts';
import {
  MARKDOWN_PROPERTIES_MENU_EVENT_NAME,
  MARKDOWN_VIEWPORT_MENU_EVENT_NAME
} from './more-events-api.ts';

describe('MarkdownMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: MarkdownMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new MarkdownMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
  });

  it('should relay Obsidian\'s own viewport menu event, without its section argument', () => {
    const handler = vi.fn();
    app.workspace.on(MARKDOWN_VIEWPORT_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const view = {};

    app.workspace.trigger('markdown-viewport-menu', menu, view, 'preview', 'gutter');

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, view, 'preview');
  });

  it('should relay Obsidian\'s own properties menu event', () => {
    const handler = vi.fn();
    app.workspace.on(MARKDOWN_PROPERTIES_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const file = {};

    app.workspace.trigger('markdown-properties-menu', menu, file);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, file);
  });

  it('should stop relaying once unloaded', () => {
    const viewportHandler = vi.fn();
    const propertiesHandler = vi.fn();
    app.workspace.on(MARKDOWN_VIEWPORT_MENU_EVENT_NAME, viewportHandler);
    app.workspace.on(MARKDOWN_PROPERTIES_MENU_EVENT_NAME, propertiesHandler);
    component.unload();

    app.workspace.trigger('markdown-viewport-menu', Menu.create2__().asOriginalType2__(), {}, 'source', 'gutter');
    app.workspace.trigger('markdown-properties-menu', Menu.create2__().asOriginalType2__(), null);

    expect(viewportHandler).not.toHaveBeenCalled();
    expect(propertiesHandler).not.toHaveBeenCalled();
  });
});
