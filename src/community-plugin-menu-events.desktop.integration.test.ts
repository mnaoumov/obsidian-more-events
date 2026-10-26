import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { COMMUNITY_PLUGIN_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The community plugin ids the listener was given.
   */
  communityPluginIds: string[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent` from a listener the tab DELEGATES from its `containerEl`, on a later task, when the event's
 * `currentTarget` is already `null`, so the announcement rests on the path the plugin recorded during the
 * dispatch, which only a real trusted right-click through the real listener proves.
 *
 * It right-clicks `More Events`' own row, because the plugin under test is the one community plugin the run
 * is sure to have installed.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Community plugin menu events', () => {
  it('should let a listener add an item to a community plugin\'s settings row menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickCommunityPluginRow('more-events');

    expect(record.communityPluginIds).toEqual(['more-events']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Uninstall');
  });
});

/**
 * Opens **Settings -> Community plugins**, right-clicks a plugin's row with a trusted click, and records what
 * the listener saw and what the menu on screen showed.
 *
 * @param communityPluginId - The plugin whose row to right-click.
 * @returns What happened.
 */
async function rightClickCommunityPluginRow(communityPluginId: string): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      COMMUNITY_PLUGIN_MENU_EVENT_NAME: communityPluginMenuEventName,
      communityPluginId: pluginId,
      lib
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';

      const communityPluginIds: string[] = [];
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(communityPluginMenuEventName, (menu, id) => {
        shownMenu = menu;
        communityPluginIds.push(id);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      app.setting.open();
      try {
        app.setting.openTabById('community-plugins');
        const selector = `.setting-item[data-plugin-id="${pluginId}"] .setting-item-name`;
        await waitUntil({
          message: 'the plugin\'s row to render',
          predicate: () => !!activeDocument.body.querySelector(selector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const nameEl = activeDocument.body.querySelector(selector);
        if (!nameEl) {
          throw new Error(`No row for ${pluginId}`);
        }
        nameEl.scrollIntoView({ block: 'center' });
        const nameRect = nameEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(nameRect.left + Math.min(nameRect.width / 2, 20)),
          y: Math.round(nameRect.top + nameRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          communityPluginIds,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        app.setting.close();
      }
    },
    input: {
      COMMUNITY_PLUGIN_MENU_EVENT_NAME,
      communityPluginId
    },
    vaultPath: getTemporaryVault().path
  });
}
