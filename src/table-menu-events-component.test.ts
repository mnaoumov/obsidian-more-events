import type {
  App as AppOriginal,
  EditorPosition,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  App,
  Menu
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  TABLE_CELL_MENU_EVENT_NAME,
  TABLE_HANDLE_MENU_EVENT_NAME
} from './more-events-api.ts';
import { TableMenuEventsComponent } from './table-menu-events-component.ts';

const TABLE_LINE = 3;
const TABLE_OFFSET = 42;

interface TestTable extends TestTableWidget {
  readonly editorEl: HTMLElement;
  readonly leaf: WorkspaceLeaf;
}

interface TestTableWidget {
  readonly cells: readonly (readonly HTMLTableCellElement[])[];
  readonly tableWidgetEl: HTMLElement;
}

describe('TableMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: TableMenuEventsComponent;
  let table: TestTable;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    table = createTable(app);
    component = new TableMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  describe('a cell menu', () => {
    it('should announce the menu of a cell', () => {
      const handler = vi.fn();
      app.workspace.on(TABLE_CELL_MENU_EVENT_NAME, handler);
      const menu = Menu.create2__().asOriginalType2__();
      const cellEl = getCell(table, 2, 1);
      const contentEl = cellEl.createDiv();

      expect(component.announceDeferredMenu(menu, new MouseEvent('contextmenu'), [contentEl, cellEl, table.tableWidgetEl, window])).toBe(true);
      expect(handler).toHaveBeenCalledExactlyOnceWith(menu, table.leaf, {
        column: 1,
        line: TABLE_LINE,
        row: 2,
        selectedCells: []
      });
    });

    it('should hand over the cell selection, row by row', () => {
      const handler = vi.fn();
      app.workspace.on(TABLE_CELL_MENU_EVENT_NAME, handler);
      getCell(table, 0, 1).addClass('is-selected');
      getCell(table, 1, 0).addClass('is-selected');
      const cellEl = getCell(table, 1, 0);

      expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [cellEl, window])).toBe(true);
      expect(handler).toHaveBeenCalledExactlyOnceWith(expect.anything(), table.leaf, {
        column: 0,
        line: TABLE_LINE,
        row: 1,
        selectedCells: [{ column: 1, row: 0 }, { column: 0, row: 1 }]
      });
    });

    /*
     * Two of the cell listener's branches hand the event to the cell's own editor, whose menu is the editor menu
     * and fires `editor-menu`. That menu is not a cell menu, though its path runs through the cell.
     */
    it('should leave a menu `editor-menu` was triggered for alone', () => {
      const handler = vi.fn();
      app.workspace.on(TABLE_CELL_MENU_EVENT_NAME, handler);
      const menu = Menu.create2__().asOriginalType2__();
      app.workspace.trigger('editor-menu', menu);

      expect(component.announceDeferredMenu(menu, new MouseEvent('contextmenu'), [getCell(table, 1, 1), window])).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    /*
     * A handle's menu is shown during the dispatch and again by `Menu.forEvent`'s timer. The second show reaches
     * the deferred announcers with the cell on its path, and must not read as the cell's.
     */
    it('should leave a menu shown on a drag handle alone', () => {
      const cellEl = getCell(table, 0, 1);
      const handleEl = cellEl.createDiv({ cls: 'table-col-drag-handle' });

      expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [handleEl, cellEl, window])).toBe(false);
    });

    it('should leave a menu shown on no cell alone', () => {
      expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [table.editorEl, window])).toBe(false);
    });

    it('should leave a cell outside every table widget alone', () => {
      const strayCellEl = createEl('table').createTBody().insertRow().insertCell();

      expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [strayCellEl, window])).toBe(false);
    });

    it('should leave a table outside every Markdown view alone', () => {
      const strayTable = createTableWidget();

      expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [getCell(strayTable, 1, 0), window])).toBe(false);
    });
  });

  describe('a drag handle menu', () => {
    it('should announce the menu of a column handle', () => {
      const handler = vi.fn();
      app.workspace.on(TABLE_HANDLE_MENU_EVENT_NAME, handler);
      const menu = Menu.create2__().asOriginalType2__();
      const handleEl = getCell(table, 0, 1).createDiv({ cls: 'table-col-drag-handle' });

      expect(component.announceMenu(menu, mouseEventWithCurrentTarget(handleEl))).toBe(true);
      expect(handler).toHaveBeenCalledExactlyOnceWith(menu, table.leaf, { axis: 'column', index: 1, line: TABLE_LINE });
    });

    it('should announce the menu of a row handle', () => {
      const handler = vi.fn();
      app.workspace.on(TABLE_HANDLE_MENU_EVENT_NAME, handler);
      const handleEl = getCell(table, 2, 0).createDiv({ cls: 'table-row-drag-handle' });

      expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(handleEl))).toBe(true);
      expect(handler).toHaveBeenCalledExactlyOnceWith(expect.anything(), table.leaf, { axis: 'row', index: 2, line: TABLE_LINE });
    });

    it('should leave a menu shown after the dispatch alone', () => {
      expect(component.announceMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'))).toBe(false);
    });

    it('should leave a menu shown from any other listener alone', () => {
      expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(getCell(table, 1, 1)))).toBe(false);
    });

    it('should leave a handle that is in no cell alone', () => {
      const detachedHandleEl = createDiv({ cls: 'table-row-drag-handle' });
      const misplacedHandleEl = table.tableWidgetEl.createDiv({ cls: 'table-row-drag-handle' });

      expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(detachedHandleEl))).toBe(false);
      expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(misplacedHandleEl))).toBe(false);
    });

    it('should leave a handle of a table outside every Markdown view alone', () => {
      const handleEl = getCell(createTableWidget(), 1, 0).createDiv({ cls: 'table-row-drag-handle' });

      expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(handleEl))).toBe(false);
    });
  });
});

/**
 * Builds a table in a Markdown view's editor, with a header row and two body rows of two cells each, beside a
 * deferred leaf and another Markdown leaf.
 *
 * @param app - The app whose workspace holds the leaves.
 * @returns The table.
 */
function createTable(app: AppOriginal): TestTable {
  const tableWidget = createTableWidget();
  const editorEl = createDiv({ cls: 'cm-editor' });
  editorEl.append(tableWidget.tableWidgetEl);

  const editor = {
    cm: {
      dom: editorEl,
      posAtDOM: (node: Node): number => node === tableWidget.tableWidgetEl ? TABLE_OFFSET : -1
    },
    offsetToPos: (offset: number): EditorPosition => ({ ch: 0, line: offset === TABLE_OFFSET ? TABLE_LINE : -1 })
  };
  const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
  const otherLeaf = castTo<WorkspaceLeaf>({ view: { editor: { cm: { dom: createDiv({ cls: 'cm-editor' }) } } } });
  const leaf = castTo<WorkspaceLeaf>({ view: { editor } });
  vi.spyOn(app.workspace, 'getLeavesOfType').mockImplementation((viewType) => viewType === 'markdown' ? [deferredLeaf, otherLeaf, leaf] : []);

  return { ...tableWidget, editorEl, leaf };
}

/**
 * Builds a table widget the way Obsidian renders one: the header row in `thead`, the body rows in `tbody`, and
 * no row for the delimiter line.
 *
 * @returns The widget and its cells, by row and column.
 */
function createTableWidget(): TestTableWidget {
  const tableWidgetEl = createDiv({ cls: 'cm-embed-block cm-table-widget' });
  const tableEl = tableWidgetEl.createDiv({ cls: 'table-wrapper' }).createEl('table');
  const headerRowEl = tableEl.createTHead().insertRow();
  const headerCells = [headerRowEl.createEl('th'), headerRowEl.createEl('th')];
  const tBodyEl = tableEl.createTBody();
  const bodyRows = [tBodyEl.insertRow(), tBodyEl.insertRow()].map((rowEl) => [rowEl.insertCell(), rowEl.insertCell()]);
  return { cells: [headerCells, ...bodyRows], tableWidgetEl };
}

function getCell(table: TestTableWidget, row: number, column: number): HTMLTableCellElement {
  const cellEl = table.cells[row]?.[column];
  if (!cellEl) {
    throw new Error(`No cell at ${String(row)}:${String(column)}`);
  }
  return cellEl;
}

/**
 * A `contextmenu` event as a listener on `currentTarget` sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function mouseEventWithCurrentTarget(currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}
