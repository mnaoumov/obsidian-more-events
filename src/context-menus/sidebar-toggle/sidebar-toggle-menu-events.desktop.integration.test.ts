import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { SidebarSide } from '../../../api.d.ts';

import { SIDEBAR_TOGGLE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * The sidebar sides the listener was given.
   */
  sides: SidebarSide[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement
 * rests on the path the plugin recorded during the dispatch, which only a real trusted right-click through the
 * real listener proves.
 *
 * It adds an item from its listener and then reads the menu Obsidian actually put on screen, because the
 * point of a menu event is that the item shows up.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Sidebar toggle menu events', () => {
  it('should let a listener add an item to the left sidebar toggle button\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickSidebarToggleButton('left');

    expect(record.sides).toEqual(['left']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Left sidebar');
  });

  it('should let a listener add an item to the right sidebar toggle button\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickSidebarToggleButton('right');

    expect(record.sides).toEqual(['right']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Right sidebar');
  });
});

/**
 * Right-clicks a sidebar toggle button with a trusted click, and records what the listener saw and what the
 * menu on screen showed.
 *
 * @param side - Which button.
 * @returns What happened.
 */
async function rightClickSidebarToggleButton(side: SidebarSide): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      side: buttonSide,
      SIDEBAR_TOGGLE_MENU_EVENT_NAME: sidebarToggleMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';

      const buttonEl = buttonSide === 'left' ? app.workspace.leftSidebarToggleButtonEl : app.workspace.rightSidebarToggleButtonEl;

      const sides: SidebarSide[] = [];
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(sidebarToggleMenuEventName, (menu, sidebarSide) => {
        shownMenu = menu;
        sides.push(sidebarSide);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      try {
        const buttonRect = buttonEl.getBoundingClientRect();
        if (buttonRect.width === 0 || buttonRect.height === 0) {
          throw new Error(`The ${buttonSide} sidebar toggle button is not on screen`);
        }
        await clickMouse({
          button: 'right',
          x: Math.round(buttonRect.left + buttonRect.width / 2),
          y: Math.round(buttonRect.top + buttonRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          sides
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
      }
    },
    input: {
      side,
      SIDEBAR_TOGGLE_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
