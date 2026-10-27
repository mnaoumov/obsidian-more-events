import type {
  Events,
  Menu,
  View
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { SEARCH_RESULTS_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/**
 * A word no other note of the temporary vault holds, so the search finds exactly the suite's own note.
 */
const SEARCH_QUERY = 'periwinkle';

interface MenuRecord {
  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];

  /**
   * Whether the listener was given the **Search** view, once per call.
   */
  readonly subjectMatches: boolean[];
}

/*
 * The test that can fail for the right reason: a relay is only as good as the name of the Obsidian event it listens
 * to, and that name is undocumented, so only the real app can say it is still the one Obsidian triggers. The test runs
 * a search, opens the results menu with a trusted click on the result count, and reads the menu Obsidian actually
 * put on screen.
 *
 * It also listens to Obsidian's own event, and closes the menu it is handed there, so a broken relay leaves no menu
 * open to swallow a later test's click.
 *
 * Desktop only: the trusted click goes through Electron's `sendInputEvent`.
 */
describe('Search menu events', () => {
  it('should let a listener add an item to the Search view\'s results menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openResultsMenu();

    expect(record.subjectMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Copy search results');
  });
});

/**
 * Searches for the suite's own note, clicks the result count with a trusted click, and records what the listener
 * saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function openResultsMenu(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      SEARCH_QUERY: searchQuery,
      SEARCH_RESULTS_MENU_EVENT_NAME: searchResultsMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'search-menu-events.md';

      const subjectMatches: boolean[] = [];
      let searchView: null | View = null;
      const shownMenus = new Set<Menu>();

      const eventRef = app.workspace.on(searchResultsMenuEventName, (menu, view) => {
        subjectMatches.push(view === searchView);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });
      // Obsidian's own event, so the menu can be closed even when the relay is broken.
      const workspaceEvents: Events = app.workspace;
      const obsidianEventRef = workspaceEvents.on('search:results-menu', (menu: unknown) => {
        shownMenus.add(menu as Menu);
      });

      const file = await app.vault.create(NOTE_PATH, `# Search menu\n\n${searchQuery}\n`);
      try {
        const searchPlugin = app.internalPlugins.getEnabledPluginById('global-search');
        if (!searchPlugin) {
          throw new Error('The Search core plugin is not enabled');
        }
        searchPlugin.openGlobalSearch(searchQuery);

        const searchLeaf = app.workspace.getLeavesOfType('search')[0];
        if (!searchLeaf) {
          throw new Error('No Search view');
        }
        await app.workspace.revealLeaf(searchLeaf);
        searchView = searchLeaf.view;

        const selector = '.search-results-result-count';
        await waitUntil({
          message: 'the search to find the note',
          predicate: () => {
            const countEl = searchLeaf.view.containerEl.querySelector(selector);
            return !!countEl && countEl.getBoundingClientRect().width > 0 && !!searchLeaf.view.containerEl.querySelector('.search-result');
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const countEl = searchLeaf.view.containerEl.querySelector(selector);
        if (!countEl) {
          throw new Error('No result count');
        }
        const countRect = countEl.getBoundingClientRect();
        await clickMouse({
          button: 'left',
          x: Math.round(countRect.left + countRect.width / 2),
          y: Math.round(countRect.top + countRect.height / 2)
        });

        await waitUntil({
          message: 'the menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjectMatches
        };
      } finally {
        app.workspace.offref(eventRef);
        workspaceEvents.offref(obsidianEventRef);
        for (const menu of shownMenus) {
          menu.hide();
        }
        await app.fileManager.trashFile(file);
      }
    },
    input: {
      SEARCH_QUERY,
      SEARCH_RESULTS_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
