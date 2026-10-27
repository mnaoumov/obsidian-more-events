import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { VAULT_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * How many times the listener was called.
   */
  readonly listenerCallCount: number;

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement
 * rests on the path the plugin recorded during the dispatch, which only a real trusted right-click through the
 * real listener proves.
 *
 * One test only: with the announcer unplugged, the menu reaches no listener, so nothing the suite holds can close
 * it, and a menu left open would swallow a later test's click.
 *
 * Desktop only: the vault name is shown on the desktop app alone, and the trusted right-click goes through
 * Electron's `sendInputEvent`.
 */
describe('Vault menu events', () => {
  it('should let a listener add an item to the vault name\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickVaultName();

    expect(record.listenerCallCount).toBe(1);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Copy path');
  });
});

/**
 * Right-clicks the vault name at the bottom of the left sidebar with a trusted click, and records what the listener
 * saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickVaultName(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      VAULT_MENU_EVENT_NAME: vaultMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';

      let listenerCallCount = 0;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(vaultMenuEventName, (menu) => {
        shownMenu = menu;
        listenerCallCount++;
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      try {
        app.workspace.leftSplit.expand();
        const vaultSwitcherEl = app.workspace.leftSplit.containerEl.querySelector<HTMLElement>('.workspace-drawer-vault-switcher');
        if (!vaultSwitcherEl) {
          throw new Error('No vault name in the left sidebar');
        }
        await waitUntil({
          message: 'the vault name to be on screen',
          predicate: () => vaultSwitcherEl.getBoundingClientRect().width > 0,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const vaultSwitcherRect = vaultSwitcherEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(vaultSwitcherRect.left + vaultSwitcherRect.width / 2),
          y: Math.round(vaultSwitcherRect.top + vaultSwitcherRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          listenerCallCount,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
      }
    },
    input: {
      VAULT_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
