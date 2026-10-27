import type {
  Menu,
  WorkspaceLeaf
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { BASES_VIEW_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The view is not the base's first, so a wrong view name would not pass as the right one by accident.
 */
const BASE_CONTENT = `views:
  - type: table
    name: Other table
  - type: table
    name: Status table
`;

interface MenuRecord {
  /**
   * Whether the listener was given the leaf the base is open in, once per call.
   */
  baseLeafMatches: boolean[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * The view names the listener was given.
   */
  viewNames: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent` for a CLICK, on a later task, when the event's `currentTarget` is already `null` and no path was
 * recorded for it, so the announcement rests on the anchor `setParentElement` gave the menu, and the view on the page
 * Obsidian keeps in the toolbar popover, which only a real trusted click on the real button proves.
 *
 * Desktop only: the trusted click goes through Electron's `sendInputEvent`.
 */
describe('Bases view menu events', () => {
  it('should let a listener add an item to the More options menu of a Bases view\'s configuration page', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickViewMoreOptions();

    expect(record.viewNames).toEqual(['Status table']);
    expect(record.baseLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Duplicate view');
  });
});

/**
 * Opens a base's second view in its own tab, opens that view's configuration page by right-clicking the **Views**
 * toolbar button, clicks the page's **More options** button with a trusted click, and records what the listener saw
 * and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function clickViewMoreOptions(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      BASE_CONTENT: baseContent,
      BASES_VIEW_MENU_EVENT_NAME: basesViewMenuEventName,
      lib
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const BASE_PATH = 'bases-view-menu-events.base';
      // The toolbar popover is a `.menu` too (`app.js:114692` in 1.15.0), so Obsidian's `Menu` is told apart from it.
      const MENU_SELECTOR = '.menu:not(.bases-toolbar-menu)';

      // With Bases off, `openFile` hands a `.base` to the operating system's default app.
      const basesCorePlugin = app.internalPlugins.getPluginById('bases');
      if (!basesCorePlugin) {
        throw new Error('The Bases core plugin was not found.');
      }
      const wasBasesEnabled = basesCorePlugin.enabled;
      if (!wasBasesEnabled) {
        await basesCorePlugin.enable(false);
      }

      const viewNames: string[] = [];
      const baseLeafMatches: boolean[] = [];
      let baseLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(basesViewMenuEventName, (menu, leaf, viewName) => {
        shownMenu = menu;
        viewNames.push(viewName);
        baseLeafMatches.push(leaf === baseLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      const baseFile = await app.vault.create(BASE_PATH, baseContent);
      try {
        const leaf = app.workspace.getLeaf('tab');
        baseLeaf = leaf;
        // The view's state names the base's view to show (`app.js:182529`).
        await leaf.setViewState({
          active: true,
          state: { file: baseFile.path, viewName: 'Status table' },
          type: 'bases'
        });
        if (leaf.view.getViewType() !== 'bases') {
          throw new Error(`Expected a Bases view, got ${leaf.view.getViewType()}`);
        }

        const viewsButtonSelector = '.bases-toolbar-views-menu .text-icon-button';
        await waitUntil({
          message: 'the Views toolbar button to render',
          predicate: () => !!leaf.view.containerEl.querySelector(viewsButtonSelector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const viewsButtonEl = leaf.view.containerEl.querySelector(viewsButtonSelector);
        if (!viewsButtonEl) {
          throw new Error('No Views toolbar button');
        }
        // A right-click opens the configuration page of the view the base shows (`app.js:119884` in 1.15.0).
        const viewsButtonRect = viewsButtonEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(viewsButtonRect.left + viewsButtonRect.width / 2),
          y: Math.round(viewsButtonRect.top + viewsButtonRect.height / 2)
        });

        const moreOptionsSelector = '.bases-toolbar-menu .bases-toolbar-menu-container-header .clickable-icon:not(.close-icon)';
        await waitUntil({
          message: 'the view configuration page to open',
          predicate: () => !!activeDocument.body.querySelector(moreOptionsSelector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const moreOptionsEl = activeDocument.body.querySelector(moreOptionsSelector);
        if (!moreOptionsEl) {
          throw new Error('No More options button on the view configuration page');
        }
        const moreOptionsRect = moreOptionsEl.getBoundingClientRect();
        await clickMouse({
          button: 'left',
          x: Math.round(moreOptionsRect.left + moreOptionsRect.width / 2),
          y: Math.round(moreOptionsRect.top + moreOptionsRect.height / 2)
        });

        await waitUntil({
          message: 'the More options menu to open',
          predicate: () => !!activeDocument.body.querySelector(MENU_SELECTOR),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector(MENU_SELECTOR);
        return {
          baseLeafMatches,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          viewNames
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        baseLeaf?.detach();
        await app.fileManager.trashFile(baseFile);
        if (!wasBasesEnabled) {
          basesCorePlugin.disable(false);
        }
      }
    },
    input: {
      BASE_CONTENT,
      BASES_VIEW_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
