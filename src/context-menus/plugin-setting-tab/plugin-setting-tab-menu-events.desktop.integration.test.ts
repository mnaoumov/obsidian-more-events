import type { InternalPluginNameType } from '@obsidian-typings/obsidian-public-latest';
import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
  CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/**
 * A core plugin with a settings tab, which the run's temporary vault has enabled by default.
 */
const CORE_PLUGIN_ID = 'file-recovery' as InternalPluginNameType;

const TEST_COMMUNITY_PLUGIN_ID = 'more-events-setting-tab-test-plugin';

/*
 * `More Events` has no settings tab of its own, so the community case brings a throwaway plugin whose only
 * job is to add one.
 */
const TEST_COMMUNITY_PLUGIN_MAIN_JS = `const { Plugin, PluginSettingTab } = require('obsidian');
module.exports = class extends Plugin {
  onload() {
    this.addSettingTab(new (class extends PluginSettingTab {
      display() {}
    })(this.app, this));
  }
};
`;

const TEST_COMMUNITY_PLUGIN_MANIFEST_JSON = JSON.stringify(
  {
    author: 'More Events integration tests',
    description: 'A throwaway plugin that exists only to have a settings tab for an integration test.',
    id: TEST_COMMUNITY_PLUGIN_ID,
    isDesktopOnly: false,
    minAppVersion: '0.15.0',
    name: 'More Events Setting Tab Test Plugin',
    version: '1.0.0'
  },
  null,
  2
);

interface MenuRecord {
  /**
   * The community plugin ids the community event's listener was given.
   */
  readonly communityPluginIds: string[];

  /**
   * The core plugin ids the core event's listener was given.
   */
  readonly corePluginIds: string[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement
 * rests on the path the plugin recorded during the dispatch, which only a real trusted right-click through the
 * real listener proves. Both events are subscribed in each test, so a tab announced under the wrong one fails
 * too.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Plugin setting tab menu events', () => {
  it('should let a listener add an item to a core plugin\'s settings tab menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickPluginSettingTab(CORE_PLUGIN_ID, false);

    expect(record.corePluginIds).toEqual([CORE_PLUGIN_ID]);
    expect(record.communityPluginIds).toEqual([]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Reveal in plugin list');
  });

  it('should let a listener add an item to a community plugin\'s settings tab menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickPluginSettingTab(TEST_COMMUNITY_PLUGIN_ID, true);

    expect(record.communityPluginIds).toEqual([TEST_COMMUNITY_PLUGIN_ID]);
    expect(record.corePluginIds).toEqual([]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Reveal in plugin list');
  });
});

/**
 * Opens the Settings modal, right-clicks a plugin's tab in its sidebar with a trusted click, and records what
 * the listeners saw and what the menu on screen showed.
 *
 * @param pluginId - The plugin whose tab to right-click.
 * @param shouldInstallTestCommunityPlugin - Whether to write, enable and afterwards remove the throwaway
 * community plugin first.
 * @returns What happened.
 */
async function rightClickPluginSettingTab(pluginId: string, shouldInstallTestCommunityPlugin: boolean): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME: communityEventName,
      CORE_PLUGIN_ID: corePluginId,
      CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME: coreEventName,
      lib,
      pluginId: tabPluginId,
      shouldInstallTestCommunityPlugin: shouldInstall,
      TEST_COMMUNITY_PLUGIN_ID: testPluginId,
      TEST_COMMUNITY_PLUGIN_MAIN_JS: mainJs,
      TEST_COMMUNITY_PLUGIN_MANIFEST_JSON: manifestJson
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const testPluginFolderPath = `${app.vault.configDir}/plugins/${testPluginId}`;

      const communityPluginIds: string[] = [];
      const corePluginIds: string[] = [];
      let shownMenu: Menu | null = null;

      const coreEventRef = app.workspace.on(coreEventName, (menu, id) => {
        shownMenu = menu;
        corePluginIds.push(id);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });
      const communityEventRef = app.workspace.on(communityEventName, (menu, id) => {
        shownMenu = menu;
        communityPluginIds.push(id);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      try {
        if (shouldInstall) {
          await app.vault.adapter.mkdir(testPluginFolderPath);
          await app.vault.adapter.write(`${testPluginFolderPath}/manifest.json`, manifestJson);
          await app.vault.adapter.write(`${testPluginFolderPath}/main.js`, mainJs);
          await app.plugins.loadManifests();
          await app.plugins.enablePlugin(testPluginId);
        } else if (!app.internalPlugins.getEnabledPluginById(corePluginId)) {
          throw new Error(`Core plugin ${corePluginId} is not enabled`);
        }

        app.setting.open();
        const selector = `.vertical-tab-nav-item[data-setting-id="${tabPluginId}"]`;
        await waitUntil({
          message: 'the plugin\'s settings tab to be listed',
          predicate: () => !!activeDocument.body.querySelector(selector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const navEl = activeDocument.body.querySelector(selector);
        if (!navEl) {
          throw new Error(`No settings tab for ${tabPluginId}`);
        }
        navEl.scrollIntoView({ block: 'center' });
        const navRect = navEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(navRect.left + navRect.width / 2),
          y: Math.round(navRect.top + navRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          communityPluginIds,
          corePluginIds,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(coreEventRef);
        app.workspace.offref(communityEventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        app.setting.close();

        if (shouldInstall && await app.vault.adapter.exists(testPluginFolderPath)) {
          await app.plugins.disablePlugin(testPluginId);
          await app.vault.adapter.rmdir(testPluginFolderPath, true);
          // So Obsidian forgets the manifest too, rather than keeping one for a folder that is gone.
          await app.plugins.loadManifests();
        }
      }
    },
    input: {
      COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
      CORE_PLUGIN_ID,
      CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
      pluginId,
      shouldInstallTestCommunityPlugin,
      TEST_COMMUNITY_PLUGIN_ID,
      TEST_COMMUNITY_PLUGIN_MAIN_JS,
      TEST_COMMUNITY_PLUGIN_MANIFEST_JSON
    },
    vaultPath: getTemporaryVault().path
  });
}
