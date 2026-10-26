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

import { HistoryMenuEventsComponent } from './history-menu-events-component.ts';
import { HISTORY_MENU_EVENT_NAME } from './more-events-api.ts';

interface TestApp {
  readonly app: AppOriginal;
  readonly backButtonEl: HTMLElement;
  readonly forwardButtonEl: HTMLElement;
  readonly leaf: WorkspaceLeaf;
}

describe('HistoryMenuEventsComponent', () => {
  it('should announce the menu a view\'s back button shows from its own listener', () => {
    const { app, backButtonEl, leaf } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new HistoryMenuEventsComponent({ app }).announceMenu(menu, contextMenuEventWithCurrentTarget(backButtonEl))).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(HISTORY_MENU_EVENT_NAME, menu, leaf, 'back');
  });

  it('should announce the menu a view\'s forward button shows from its own listener, once', () => {
    const { app, forwardButtonEl, leaf } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new HistoryMenuEventsComponent({ app }).announceMenu(menu, contextMenuEventWithCurrentTarget(forwardButtonEl))).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(HISTORY_MENU_EVENT_NAME, menu, leaf, 'forward');
  });

  it('should leave a menu shown from any other listener alone', () => {
    const { app } = createApp();

    expect(new HistoryMenuEventsComponent({ app }).announceMenu(Menu.create2__().asOriginalType2__(), contextMenuEventWithCurrentTarget(createDiv())))
      .toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu shown after the dispatch, or for another kind of event, alone', () => {
    const { app, backButtonEl } = createApp();
    const component = new HistoryMenuEventsComponent({ app });
    const clickEvent = new MouseEvent('click');
    Object.defineProperty(clickEvent, 'currentTarget', { value: backButtonEl });

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'))).toBe(false);
    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), clickEvent)).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

/**
 * A `contextmenu` event as a listener on `currentTarget` sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function contextMenuEventWithCurrentTarget(currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}

/**
 * An app with a view that has no history buttons, then a view that has them, then another one that has them.
 *
 * @returns The app, and the buttons and leaf of the first view that has them.
 */
function createApp(): TestApp {
  const backButtonEl = createDiv();
  const forwardButtonEl = createDiv();
  const leaf = castTo<WorkspaceLeaf>({ view: { backButtonEl, forwardButtonEl } });
  const leaves = [
    castTo<WorkspaceLeaf>({ view: {} }),
    leaf,
    castTo<WorkspaceLeaf>({ view: { backButtonEl: createDiv(), forwardButtonEl: createDiv() } })
  ];
  const app = castTo<AppOriginal>({
    workspace: {
      iterateAllLeaves: (callback: (leaf_: WorkspaceLeaf) => void): void => {
        // The real method keeps walking after a match too, which is why the component skips the rest itself.
        for (const leaf_ of [...leaves, leaf]) {
          callback(leaf_);
        }
      },
      trigger: vi.fn()
    }
  });
  return { app, backButtonEl, forwardButtonEl, leaf };
}
