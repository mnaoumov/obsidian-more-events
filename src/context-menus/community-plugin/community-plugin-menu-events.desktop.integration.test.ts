import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { COMMUNITY_PLUGIN_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/**
 * Where the menu is opened from: a right-click on the row, or a click on the row's **More options** button.
 */
type MenuOpener = 'more-options' | 'row';

interface MenuRecord {
  /**
   * The community plugin ids the listener was given.
   */
  readonly communityPluginIds: string[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent` from a listener the tab DELEGATES from its `containerEl`, on a later task, when the event's
 * `currentTarget` is already `null`, so the announcement rests on the path the plugin recorded during the
 * dispatch, which only a real trusted right-click through the real listener proves.
 *
 * The row's **More options** button builds the same menu and shows it with `showAtPosition`, with no event at all,
 * anchored to the button by `setParentElement`, so that announcement rests on the anchor alone, which only a real
 * trusted click through the real button proves.
 *
 * It opens `More Events`' own row's menu, because the plugin under test is the one community plugin the run is
 * sure to have installed.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Community plugin menu events', () => {
  it('should let a listener add an item to a community plugin\'s settings row menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openCommunityPluginMenu('more-events', 'row');

    expect(record.communityPluginIds).toEqual(['more-events']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Uninstall');
  });

  it('should let a listener add an item to the menu of a community plugin\'s More options button', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openCommunityPluginMenu('more-events', 'more-options');

    expect(record.communityPluginIds).toEqual(['more-events']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Uninstall');
  });
});

/**
 * Opens **Settings -> Community plugins**, right-clicks a plugin's row or clicks its **More options** button with a
 * trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @param communityPluginId - The plugin whose row to open the menu of.
 * @param menuOpener - Where to open the menu from.
 * @returns What happened.
 */
async function openCommunityPluginMenu(communityPluginId: string, menuOpener: MenuOpener): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      COMMUNITY_PLUGIN_MENU_EVENT_NAME: communityPluginMenuEventName,
      communityPluginId: pluginId,
      lib,
      MENU_OPENER: opener
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
        const selector = opener === 'row'
          ? `.setting-item[data-plugin-id="${pluginId}"] .setting-item-name`
          : `.setting-item[data-plugin-id="${pluginId}"] .extra-setting-button`;
        await waitUntil({
          message: 'the plugin\'s row to render',
          predicate: () => !!activeDocument.body.querySelector(selector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const targetEl = activeDocument.body.querySelector(selector);
        if (!targetEl) {
          throw new Error(`No ${opener} target for ${pluginId}`);
        }
        targetEl.scrollIntoView({ block: 'center' });
        const targetRect = targetEl.getBoundingClientRect();
        await clickMouse({
          button: opener === 'row' ? 'right' : 'left',
          x: Math.round(targetRect.left + Math.min(targetRect.width / 2, 20)),
          y: Math.round(targetRect.top + targetRect.height / 2)
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
      communityPluginId,
      MENU_OPENER: menuOpener
    },
    vaultPath: getTemporaryVault().path
  });
}
