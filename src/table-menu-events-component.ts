import type {
  App,
  Menu,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type {
  TableCellMenuItem,
  TableCellPosition,
  TableHandleAxis,
  TableHandleMenuItem
} from '../api.d.ts';
import type {
  DeferredMenuAnnouncer,
  MenuAnnouncer
} from './patches/menu-patch-component.ts';

import { findMarkdownEditorLeaf } from './markdown-editor-leaf.ts';
import {
  TABLE_CELL_MENU_EVENT_NAME,
  TABLE_HANDLE_MENU_EVENT_NAME
} from './more-events-api.ts';

/**
 * The class Obsidian gives a Live Preview table widget's element (`app.js:119088`).
 */
const TABLE_WIDGET_CLASS = 'cm-table-widget';

/**
 * The class Obsidian gives each selected cell of a table (`app.js:120356`).
 */
const SELECTED_CELL_CLASS = 'is-selected';

/**
 * The classes Obsidian gives a table's drag handles (`app.js:120113`), by the axis each one moves.
 */
const DRAG_HANDLE_AXES: ReadonlyMap<string, TableHandleAxis> = new Map([
  ['table-col-drag-handle', 'column'],
  ['table-row-drag-handle', 'row']
]);

/**
 * Parameters for the {@link TableMenuEventsComponent} constructor.
 */
export interface TableMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * A rendered table, and where it is.
 */
interface RenderedTable {
  /**
   * The leaf holding the Markdown view the table is in.
   */
  readonly leaf: WorkspaceLeaf;

  /**
   * The line of the table's header row, counted from 0.
   */
  readonly line: number;

  /**
   * The table widget's element.
   */
  readonly tableWidgetEl: HTMLElement;
}

/**
 * Publishes the context-menu events of a table in a Live Preview editor: a cell's, and a drag handle's.
 *
 * **A cell's menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** Each cell binds one
 * `contextmenu` listener on its own `td` or `th` (`app.js:118717`). When the cell is not the one being edited, or
 * is part of a cell selection, the listener fills `Menu.forEvent(evt)` through the table's `onContextMenu`
 * (`:118733`, `:118737`), with **Row** and **Column** submenus and the sort items, or with the selection's
 * clipboard, alignment, clear and delete items. Its other two branches hand the event to the cell's own editor,
 * whose menu is the editor menu, and fires `editor-menu` (`:150894`), so a menu `editor-menu` was triggered for
 * is never announced as a cell's.
 *
 * **A drag handle's menu fires nothing either, and it is shown TWICE.** The handle's listener (`:120116`) calls
 * `Menu.forEvent(evt)`, which schedules a show, fills the menu, and then shows it at once with
 * `showAtMouseEvent`. So it is announced through {@link MenuAnnouncer} by its listener's element, during the
 * dispatch, and the scheduled show, which reaches the deferred announcers with the handle on its path, is left
 * alone: the handle sits inside its cell, so the cell would otherwise claim it too.
 *
 * The table widget object is out of reach, but the DOM carries everything: a cell's row is its `tr`'s `rowIndex`
 * and its column its `cellIndex`, which are Obsidian's own `row` and `col` (the header row is 0, and the
 * delimiter row is never rendered), the selection is the cells carrying `is-selected`, and the table's line comes
 * from CodeMirror's `posAtDOM` on the widget. A table in an editor that is not a Markdown view's, such as a canvas
 * card's, is not announced.
 */
export class TableMenuEventsComponent extends Component implements DeferredMenuAnnouncer, MenuAnnouncer {
  private readonly app: App;
  private readonly editorMenus = new WeakSet<Menu>();

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: TableMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a table cell.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a cell of a table in a Markdown view's Live Preview editor.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    if (this.editorMenus.has(menu) || eventPath.some((eventTarget) => getDragHandleAxis(eventTarget) !== null)) {
      return false;
    }

    const cellEl = eventPath.find(isTableCellEl);
    const table = cellEl ? this.findTable(cellEl) : null;
    if (!table) {
      return false;
    }

    const cell: TableCellMenuItem = {
      ...getCellPosition(castTo<HTMLTableCellElement>(cellEl)),
      line: table.line,
      selectedCells: Array.from(table.tableWidgetEl.querySelectorAll<HTMLTableCellElement>(`td.${SELECTED_CELL_CLASS}, th.${SELECTED_CELL_CLASS}`), getCellPosition)
    };
    this.app.workspace.trigger(TABLE_CELL_MENU_EVENT_NAME, menu, table.leaf, cell);
    return true;
  }

  /**
   * Announces the menu of a table's drag handle.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from the listener of a drag handle of a table in a Markdown
   * view's Live Preview editor.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const { currentTarget } = mouseEvent;
    const axis = currentTarget ? getDragHandleAxis(currentTarget) : null;
    if (!axis) {
      return false;
    }

    // The handle is created inside its own cell (`app.js:120113`).
    const cellEl = castTo<HTMLElement>(currentTarget).parentElement;
    const table = cellEl && isTableCellEl(cellEl) ? this.findTable(cellEl) : null;
    if (!table) {
      return false;
    }

    const { column, row } = getCellPosition(castTo<HTMLTableCellElement>(cellEl));
    const handle: TableHandleMenuItem = {
      axis,
      index: axis === 'column' ? column : row,
      line: table.line
    };
    this.app.workspace.trigger(TABLE_HANDLE_MENU_EVENT_NAME, menu, table.leaf, handle);
    return true;
  }

  /**
   * Starts telling the editor menus apart, which a cell's own editor shows for some right-clicks on a cell.
   */
  public override onload(): void {
    this.registerEvent(this.app.workspace.on('editor-menu', (menu) => {
      this.editorMenus.add(menu);
    }));
  }

  private findTable(cellEl: HTMLElement): null | RenderedTable {
    const tableWidgetEl = cellEl.closest<HTMLElement>(`.${TABLE_WIDGET_CLASS}`);
    if (!tableWidgetEl) {
      return null;
    }

    const markdownEditorLeaf = findMarkdownEditorLeaf(this.app, tableWidgetEl);
    if (!markdownEditorLeaf) {
      return null;
    }

    const { editor, leaf } = markdownEditorLeaf;
    const { line } = editor.offsetToPos(editor.cm.posAtDOM(tableWidgetEl));
    return { leaf, line, tableWidgetEl };
  }
}

function getCellPosition(cellEl: HTMLTableCellElement): TableCellPosition {
  return {
    column: cellEl.cellIndex,
    row: castTo<HTMLTableRowElement>(cellEl.parentElement).rowIndex
  };
}

function getDragHandleAxis(eventTarget: EventTarget): null | TableHandleAxis {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  const { classList } = castTo<Partial<HTMLElement>>(eventTarget);
  for (const [cls, axis] of DRAG_HANDLE_AXES) {
    if (classList?.contains(cls)) {
      return axis;
    }
  }

  return null;
}

function isTableCellEl(eventTarget: EventTarget): eventTarget is HTMLTableCellElement {
  // Duck-typed rather than `instanceof HTMLTableCellElement`, which is false for an element of another window.
  const { tagName } = castTo<Partial<HTMLElement>>(eventTarget);
  return tagName === 'TD' || tagName === 'TH';
}
