import type {
  App as AppOriginal,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
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
  BOOKMARKS_MENU_EVENT_NAME,
  BOOKMARKS_VIEW_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import { BookmarksMenuEventsComponent } from './bookmarks-menu-events-component.ts';

describe('BookmarksMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: BookmarksMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new BookmarksMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  it('should relay Obsidian\'s own bookmarks menu event', () => {
    const handler = vi.fn();
    app.workspace.on(BOOKMARKS_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const bookmarks = [{ ctime: 1, path: 'Note.md', type: 'file' }];

    app.workspace.trigger('bookmarks:bookmarks-menu', menu, bookmarks);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, bookmarks);
  });

  it('should stop relaying once unloaded', () => {
    const handler = vi.fn();
    app.workspace.on(BOOKMARKS_MENU_EVENT_NAME, handler);
    component.unload();

    app.workspace.trigger('bookmarks:bookmarks-menu', Menu.create2__().asOriginalType2__(), []);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should announce the menu a bookmarks view shows from its own listener', () => {
    const containerEl = createDiv();
    const leaf = mockBookmarksLeaf(containerEl);
    const handler = vi.fn();
    app.workspace.on(BOOKMARKS_VIEW_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, mouseEventWithCurrentTarget(containerEl))).toBe(true);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('bookmarks');
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf);
  });

  it('should leave a menu shown from any other listener alone', () => {
    mockBookmarksLeaf(createDiv());
    const handler = vi.fn();
    app.workspace.on(BOOKMARKS_VIEW_MENU_EVENT_NAME, handler);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(createDiv()))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  /*
   * `Menu.forEvent` shows its menu on a later task, after the dispatch has finished and `currentTarget` has
   * gone back to `null`. That is the path a bookmark's OWN menu takes, and it must not read as the view's.
   */
  it('should leave a menu shown after the dispatch alone', () => {
    mockBookmarksLeaf(createDiv());

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'))).toBe(false);
  });

  function mockBookmarksLeaf(containerEl: HTMLElement): WorkspaceLeaf {
    const leaf = castTo<WorkspaceLeaf>({
      view: {
        containerEl
      }
    });
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([leaf]);
    return leaf;
  }
});

/**
 * A `contextmenu` event as a listener on `currentTarget` sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function mouseEventWithCurrentTarget(currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}
