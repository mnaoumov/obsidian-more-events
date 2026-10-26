import type {
  BasesTableView,
  BasesView
} from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { BasesColumnMenuItem } from '../api.d.ts';
import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import { BASES_COLUMN_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The view type of the **Bases** core plugin's view.
 */
const BASES_VIEW_TYPE = 'bases';

/**
 * The class Obsidian gives every cell of a Bases table, the header's included (`app.js:187588`).
 */
const CELL_CLASS = 'bases-td';

/**
 * The class Obsidian gives a Bases table's header (`app.js:185594`).
 */
const HEADER_CLASS = 'bases-thead';

/**
 * Parameters for the {@link BasesColumnMenuEventsComponent} constructor.
 */
export interface BasesColumnMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of a column header in a Bases table view.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** Each header cell binds
 * one `contextmenu` listener on its own element when it is created (`app.js:187664`), which fills
 * `Menu.forEvent(evt)` with **Hide column**, **Edit property**, the summary, group and sort items. `Menu.forEvent`
 * shows the menu on a later task, so it is recognized by a header cell being on the event's recorded path.
 *
 * The column's property comes from the table view itself, which maps every cell element to its cell
 * (`getCellFromDom`, `:187514`). The table view is reached from a `bases` leaf as `view.controller.view`, so a
 * base embedded in a note is not announced. On mobile the header opens that menu on a tap, which is not a
 * `contextmenu` event, so nothing is announced there.
 */
export class BasesColumnMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: BasesColumnMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a Bases table column header.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a column header of a table in a **Bases** view.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const cellIndex = eventPath.findIndex((eventTarget) => hasClass(eventTarget, CELL_CLASS));
    // The header cell, and not a body cell: the header is the cell's ancestor.
    if (cellIndex === -1 || eventPath.slice(cellIndex + 1).every((eventTarget) => !hasClass(eventTarget, HEADER_CLASS))) {
      return false;
    }

    const cellEl = castTo<HTMLElement>(eventPath[cellIndex]);
    for (const leaf of this.app.workspace.getLeavesOfType(BASES_VIEW_TYPE)) {
      // `Partial`, because a deferred leaf reports the view type before its real view, and its controller, exist.
      const { controller } = castTo<Partial<BasesView>>(leaf.view);
      // Whatever view the base shows: only a table view has `getCellFromDom`.
      const tableView = castTo<Partial<BasesTableView> | undefined>(controller?.view);
      const cell = tableView?.getCellFromDom?.(cellEl);
      if (!controller || !cell) {
        continue;
      }

      const column: BasesColumnMenuItem = {
        propertyId: cell.prop,
        viewName: controller.viewName
      };
      this.app.workspace.trigger(BASES_COLUMN_MENU_EVENT_NAME, menu, leaf, column);
      return true;
    }

    return false;
  }
}

function hasClass(eventTarget: EventTarget, className: string): boolean {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  return castTo<Partial<HTMLElement>>(eventTarget).classList?.contains(className) ?? false;
}
