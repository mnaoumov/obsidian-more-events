import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { RibbonSide } from '../api.d.ts';

import { RIBBON_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * The ribbon sides the listener was given.
   */
  sides: RibbonSide[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. The announcement rests on
 * `evt.currentTarget` still being the ribbon's `containerEl` while Obsidian shows its menu, which only a
 * real trusted right-click through the real listener proves.
 *
 * It adds an item from its listener and then reads the menu Obsidian actually put on screen, because the
 * point of a menu event is that the item shows up.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Ribbon menu events', () => {
  it('should let a listener add an item to the ribbon\'s empty-area menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickRibbonEmptyArea();

    expect(record.sides).toEqual(['left']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Hide ribbon');
  });
});

/**
 * Right-clicks the left ribbon between its action icons and its settings icons with a trusted click, and
 * records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickRibbonEmptyArea(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      RIBBON_MENU_EVENT_NAME: ribbonMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';

      const { containerEl, ribbonItemsEl, ribbonSettingEl } = app.workspace.leftRibbon;
      if (!ribbonItemsEl || !ribbonSettingEl) {
        throw new Error('The left ribbon has no action or settings area');
      }

      const sides: RibbonSide[] = [];
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(ribbonMenuEventName, (menu, side) => {
        shownMenu = menu;
        sides.push(side);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      try {
        // Halfway between the last action icon and the settings icons: the bare container, which is the only place the ribbon shows a menu.
        const containerRect = containerEl.getBoundingClientRect();
        const itemsBottom = ribbonItemsEl.getBoundingClientRect().bottom;
        const settingsTop = ribbonSettingEl.getBoundingClientRect().top;
        await clickMouse({
          button: 'right',
          x: Math.round(containerRect.left + containerRect.width / 2),
          y: Math.round((itemsBottom + settingsTop) / 2)
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
      RIBBON_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
