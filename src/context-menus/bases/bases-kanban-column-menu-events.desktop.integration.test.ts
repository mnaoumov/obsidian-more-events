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

import type { BasesKanbanColumnMenuItem } from '../../../api.d.ts';

import { BASES_KANBAN_COLUMN_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The `beta` column is the second of three, so the first or last column would not pass as the right one by
 * accident, and the view is not the base's first, so a wrong view name would not either. `FOLDER` is the
 * folder of the test's own notes.
 */
const BASE_CONTENT = `filters:
  and:
    - file.inFolder("FOLDER")
views:
  - type: table
    name: Other table
  - type: kanban
    name: Status board
    groupBy:
      property: note.status
      direction: ASC
`;

const STATUSES = ['alpha', 'beta', 'gamma'];

interface MenuRecord {
  /**
   * Whether the listener was given the leaf the base is open in, once per call.
   */
  baseLeafMatches: boolean[];

  /**
   * The columns the listener was given.
   */
  columns: BasesKanbanColumnMenuItem[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];
}

type Target = 'card' | 'header';

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement rests
 * on the path the plugin recorded during the dispatch, and the column's group on the board view's own columns,
 * which only a real trusted right-click on a real rendered column proves. A card is inside its column, and the
 * second test proves its menu is not taken for the column's.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Bases board column menu events', () => {
  it('should let a listener add an item to a Bases board column\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickColumn('header');

    expect(record.columns).toEqual([{ groupKey: 'beta', viewName: 'Status board' }]);
    expect(record.baseLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Hide column');
  });

  it('should leave a card\'s menu alone', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickColumn('card');

    expect(record.columns).toEqual([]);
    expect(record.shownItemTitles).not.toContain('Hide column');
  });
});

/**
 * Opens a base's board view in its own tab, right-clicks the `beta` column's header, or its one card, with a
 * trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @param target - What to right-click.
 * @returns What happened.
 */
async function rightClickColumn(target: Target): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      BASE_CONTENT: baseContent,
      BASES_KANBAN_COLUMN_MENU_EVENT_NAME: basesKanbanColumnMenuEventName,
      lib,
      STATUSES: statuses,
      TARGET: clickTarget
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      // Named by the target, because the vault may not have dropped the previous test's files yet.
      const folderPath = `bases-kanban-column-menu-events-${clickTarget}`;
      const BASE_PATH = `${folderPath}.base`;

      // With Bases off, `openFile` hands a `.base` to the operating system's default app.
      const basesCorePlugin = app.internalPlugins.getPluginById('bases');
      if (!basesCorePlugin) {
        throw new Error('The Bases core plugin was not found.');
      }
      const wasBasesEnabled = basesCorePlugin.enabled;
      if (!wasBasesEnabled) {
        await basesCorePlugin.enable(false);
      }

      const columns: BasesKanbanColumnMenuItem[] = [];
      const baseLeafMatches: boolean[] = [];
      let baseLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(basesKanbanColumnMenuEventName, (menu, leaf, column) => {
        shownMenu = menu;
        columns.push(column);
        baseLeafMatches.push(leaf === baseLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });
      const fileMenuEventRef = app.workspace.on('file-menu', (menu) => {
        shownMenu = menu;
      });

      const folder = await app.vault.createFolder(folderPath);
      for (const status of statuses) {
        await app.vault.create(`${folderPath}/${status}.md`, `---\nstatus: ${status}\n---\n`);
      }
      const baseFile = await app.vault.create(BASE_PATH, baseContent.replace('FOLDER', () => folderPath));
      try {
        const leaf = app.workspace.getLeaf('tab');
        baseLeaf = leaf;
        // The view's state names the base's view to show (`app.js:182529`).
        await leaf.setViewState({
          active: true,
          state: { file: baseFile.path, viewName: 'Status board' },
          type: 'bases'
        });
        if (leaf.view.getViewType() !== 'bases') {
          throw new Error(`Expected a Bases view, got ${leaf.view.getViewType()}`);
        }

        function findBetaColumnEl(): HTMLElement | undefined {
          return [...leaf.view.containerEl.querySelectorAll<HTMLElement>(':scope .bases-kanban-column')].find((columnEl) =>
            columnEl.querySelector(':scope > .bases-kanban-column-header .bases-group-value')?.textContent === 'beta'
            && !!columnEl.querySelector(':scope .bases-kanban-card')
          );
        }
        await waitUntil({
          message: 'the beta column and its card to render',
          predicate: () => !!findBetaColumnEl(),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const columnEl = findBetaColumnEl();
        const targetEl = columnEl?.querySelector(clickTarget === 'card' ? ':scope .bases-kanban-card' : ':scope .bases-kanban-column-count');
        if (!targetEl) {
          throw new Error(`No rendered ${clickTarget} in the beta column`);
        }
        const targetRect = targetEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(targetRect.left + targetRect.width / 2),
          y: Math.round(targetRect.top + targetRect.height / 2)
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
        app.workspace.offref(fileMenuEventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        baseLeaf?.detach();
        await app.fileManager.trashFile(baseFile);
        await app.fileManager.trashFile(folder);
        if (!wasBasesEnabled) {
          basesCorePlugin.disable(false);
        }
      }
    },
    input: {
      BASE_CONTENT,
      BASES_KANBAN_COLUMN_MENU_EVENT_NAME,
      STATUSES,
      TARGET: target
    },
    vaultPath: getTemporaryVault().path
  });
}
