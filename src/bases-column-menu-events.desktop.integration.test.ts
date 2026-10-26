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

import type { BasesColumnMenuItem } from '../api.d.ts';

import { BASES_COLUMN_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The `status` column is the second of three, so the first or last column would not pass as the right one by
 * accident, and the view is not the base's first, so a wrong view name would not either.
 */
const BASE_CONTENT = `views:
  - type: table
    name: Other table
    order:
      - file.name
  - type: table
    name: Status table
    order:
      - file.name
      - note.status
      - file.mtime
`;

const NOTE_CONTENT = `---
status: draft
---
`;

interface MenuRecord {
  /**
   * Whether the listener was given the leaf the base is open in, once per call.
   */
  baseLeafMatches: boolean[];

  /**
   * The columns the listener was given.
   */
  columns: BasesColumnMenuItem[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement rests
 * on the path the plugin recorded during the dispatch, and the column's property on the table view's own cell
 * lookup, which only a real trusted right-click on a real rendered header proves.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`, and on mobile the header opens
 * that menu on a tap instead.
 */
describe('Bases column menu events', () => {
  it('should let a listener add an item to a Bases table column header\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickColumnHeader();

    expect(record.columns).toEqual([{ propertyId: 'note.status', viewName: 'Status table' }]);
    expect(record.baseLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Hide column');
  });
});

/**
 * Opens a base's second table view in its own tab, right-clicks the header of its `status` column with a trusted
 * click, and records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickColumnHeader(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      BASE_CONTENT: baseContent,
      BASES_COLUMN_MENU_EVENT_NAME: basesColumnMenuEventName,
      lib,
      NOTE_CONTENT: noteContent
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const BASE_PATH = 'bases-column-menu-events.base';
      const NOTE_PATH = 'bases-column-menu-events.md';

      // With Bases off, `openFile` hands a `.base` to the operating system's default app.
      const basesCorePlugin = app.internalPlugins.getPluginById('bases');
      if (!basesCorePlugin) {
        throw new Error('The Bases core plugin was not found.');
      }
      const wasBasesEnabled = basesCorePlugin.enabled;
      if (!wasBasesEnabled) {
        await basesCorePlugin.enable(false);
      }

      const columns: BasesColumnMenuItem[] = [];
      const baseLeafMatches: boolean[] = [];
      let baseLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(basesColumnMenuEventName, (menu, leaf, column) => {
        shownMenu = menu;
        columns.push(column);
        baseLeafMatches.push(leaf === baseLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      const noteFile = await app.vault.create(NOTE_PATH, noteContent);
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

        function findStatusHeaderEl(): HTMLElement | undefined {
          return [...leaf.view.containerEl.querySelectorAll<HTMLElement>(':scope .bases-thead .bases-td')].find((headerEl) => headerEl.querySelector(':scope .bases-table-header-name')?.textContent === 'status');
        }
        await waitUntil({
          message: 'the status column header to render',
          predicate: () => !!findStatusHeaderEl(),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const headerEl = findStatusHeaderEl();
        if (!headerEl) {
          throw new Error('No rendered status column header');
        }
        const headerRect = headerEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(headerRect.left + headerRect.width / 3),
          y: Math.round(headerRect.top + headerRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          baseLeafMatches,
          columns,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        baseLeaf?.detach();
        await app.fileManager.trashFile(baseFile);
        await app.fileManager.trashFile(noteFile);
        if (!wasBasesEnabled) {
          basesCorePlugin.disable(false);
        }
      }
    },
    input: {
      BASE_CONTENT,
      BASES_COLUMN_MENU_EVENT_NAME,
      NOTE_CONTENT
    },
    vaultPath: getTemporaryVault().path
  });
}
