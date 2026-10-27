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

import type {
  TableCellMenuItem,
  TableHandleMenuItem
} from '../../../api.d.ts';

import {
  TABLE_CELL_MENU_EVENT_NAME,
  TABLE_HANDLE_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The table sits below a heading and a paragraph, so a wrong line would not pass as the right one by accident,
 * and it has three rows and two columns, so a row or column off by one, or the delimiter row counted, would not
 * either.
 */
const NOTE_CONTENT = `# Table menu

A paragraph before the table.

| Name | Value |
| ---- | ----- |
| a    | 1     |
| b    | 2     |

A paragraph after it.
`;

const TABLE_HEADER_LINE = 4;

/**
 * A cell to right-click, by row and column.
 */
interface CellClickTarget {
  readonly column: number;
  readonly kind: 'cell';
  readonly row: number;
}

/**
 * What to right-click: a cell or a drag handle.
 */
type ClickTarget = CellClickTarget | HandleClickTarget;

/**
 * A drag handle to right-click, by axis and index.
 */
interface HandleClickTarget {
  readonly axis: 'column' | 'row';
  readonly index: number;
  readonly kind: 'handle';
}

interface MenuRecord {
  /**
   * The cells the cell menu listener was given.
   */
  cells: TableCellMenuItem[];

  /**
   * The handles the handle menu listener was given.
   */
  handles: TableHandleMenuItem[];

  /**
   * Whether each listener was given the leaf the note is open in, once per call.
   */
  noteLeafMatches: boolean[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. A cell's menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so its announcement rests
 * on the path the plugin recorded during the dispatch. A handle's menu is shown during the dispatch and then
 * again by `Menu.forEvent`'s timer, so only a real right-click proves it is announced once, as a handle's and
 * not also as its cell's.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Table menu events', () => {
  it('should let a listener add an item to a table cell\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickTable({ column: 1, kind: 'cell', row: 2 });

    expect(record.cells).toEqual([{ column: 1, line: TABLE_HEADER_LINE, row: 2, selectedCells: [] }]);
    expect(record.handles).toEqual([]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Row');
  });

  it('should let a listener add an item to a table\'s column handle menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickTable({ axis: 'column', index: 1, kind: 'handle' });

    expect(record.handles).toEqual([{ axis: 'column', index: 1, line: TABLE_HEADER_LINE }]);
    expect(record.cells).toEqual([]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles.length).toBeGreaterThan(1);
  });

  it('should let a listener add an item to a table\'s row handle menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickTable({ axis: 'row', index: 2, kind: 'handle' });

    expect(record.handles).toEqual([{ axis: 'row', index: 2, line: TABLE_HEADER_LINE }]);
    expect(record.cells).toEqual([]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles.length).toBeGreaterThan(1);
  });
});

/**
 * Opens a note with a table in Live Preview, right-clicks a cell or a drag handle of the rendered table with a
 * trusted click, and records what the listeners saw and what the menu on screen showed.
 *
 * @param clickTarget - What to right-click.
 * @returns What happened.
 */
async function rightClickTable(clickTarget: ClickTarget): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      clickTarget: target,
      lib,
      NOTE_CONTENT: noteContent,
      TABLE_CELL_MENU_EVENT_NAME: tableCellMenuEventName,
      TABLE_HANDLE_MENU_EVENT_NAME: tableHandleMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, hoverElement, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      // Long enough for `Menu.forEvent`'s scheduled second show of a handle's menu to have run.
      const SETTLE_DELAY_IN_MS = 200;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'table-menu-events.md';

      const cells: TableCellMenuItem[] = [];
      const handles: TableHandleMenuItem[] = [];
      const noteLeafMatches: boolean[] = [];
      let noteLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const cellEventRef = app.workspace.on(tableCellMenuEventName, (menu, leaf, cell) => {
        shownMenu = menu;
        cells.push(cell);
        noteLeafMatches.push(leaf === noteLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });
      const handleEventRef = app.workspace.on(tableHandleMenuEventName, (menu, leaf, handle) => {
        shownMenu = menu;
        handles.push(handle);
        noteLeafMatches.push(leaf === noteLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      const file = await app.vault.create(NOTE_PATH, noteContent);
      try {
        const leaf = app.workspace.getLeaf('tab');
        noteLeaf = leaf;
        await leaf.setViewState({
          active: true,
          state: { file: file.path, mode: 'source', source: false },
          type: 'markdown'
        });

        const tableSelector = '.cm-embed-block.cm-table-widget table';
        await waitUntil({
          message: 'the table to render',
          predicate: () => !!leaf.view.containerEl.querySelector(tableSelector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const tableEl = leaf.view.containerEl.querySelector<HTMLTableElement>(tableSelector);
        if (!tableEl) {
          throw new Error('No rendered table');
        }

        let clickEl: Element | null;
        if (target.kind === 'cell') {
          clickEl = tableEl.rows[target.row]?.cells[target.column] ?? null;
        } else {
          const cellEl = target.axis === 'column' ? tableEl.rows[0]?.cells[target.index] : tableEl.rows[target.index]?.cells[0];
          if (!cellEl) {
            throw new Error('No cell for the handle');
          }
          // The handles show on hover only.
          await hoverElement({ element: cellEl });
          clickEl = cellEl.querySelector(`.table-${target.axis === 'column' ? 'col' : 'row'}-drag-handle`);
        }
        if (!clickEl) {
          throw new Error(`Nothing to right-click for ${JSON.stringify(target)}`);
        }

        const clickRect = clickEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(clickRect.left + clickRect.width / 2),
          y: Math.round(clickRect.top + clickRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        await sleep(SETTLE_DELAY_IN_MS);

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          cells,
          handles,
          noteLeafMatches,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(cellEventRef);
        app.workspace.offref(handleEventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        noteLeaf?.detach();
        await app.fileManager.trashFile(file);
      }
    },
    input: {
      clickTarget,
      NOTE_CONTENT,
      TABLE_CELL_MENU_EVENT_NAME,
      TABLE_HANDLE_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
