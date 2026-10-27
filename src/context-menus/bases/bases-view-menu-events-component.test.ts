import type {
  App as AppOriginal,
  Menu as MenuOriginal,
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

import { BASES_VIEW_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { BasesViewMenuEventsComponent } from './bases-view-menu-events-component.ts';

describe('BasesViewMenuEventsComponent', () => {
  it('should announce the menu of a view configuration page\'s More options button, with the view the page configures', () => {
    const { app, leaf, moreOptionsEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, moreOptionsEl)).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(BASES_VIEW_MENU_EVENT_NAME, menu, leaf, 'Status table');
  });

  it('should leave a menu anchored to a button of a page that configures no view alone', () => {
    const { app, rootPageButtonEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), rootPageButtonEl)).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu anchored to an element of no open base alone', () => {
    const { app } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), createDiv())).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly leaf: WorkspaceLeaf;
  readonly moreOptionsEl: HTMLElement;
  readonly rootPageButtonEl: HTMLElement;
}

function createApp(): TestApp {
  const moreOptionsEl = createDiv();
  const rootPageButtonEl = createDiv();

  const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
  // A controller with no Views toolbar menu.
  const bareLeaf = castTo<WorkspaceLeaf>({ view: { controller: {} } });
  const leaf = castTo<WorkspaceLeaf>({
    view: {
      controller: {
        viewMenu: {
          toolbarItem: {
            menu: {
              pageStack: [
                // The list of views, which configures no view.
                { actionEls: [rootPageButtonEl] },
                // A page configuring a view, but with no buttons of its own.
                { view: { name: 'Other table' } },
                { actionEls: [moreOptionsEl], view: { name: 'Status table' } }
              ]
            }
          }
        }
      }
    }
  });

  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): WorkspaceLeaf[] => viewType === 'bases' ? [deferredLeaf, bareLeaf, leaf] : [],
      trigger: vi.fn()
    }
  });
  return { app, leaf, moreOptionsEl, rootPageButtonEl };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, parentEl: HTMLElement): boolean {
  return new BasesViewMenuEventsComponent({ app }).announcePositionedMenu(menu, parentEl);
}
