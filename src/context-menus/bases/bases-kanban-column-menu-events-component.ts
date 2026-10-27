import type { BasesView } from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  BasesEntryGroup,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { BasesKanbanColumnMenuItem } from '../../../api.d.ts';
import type { DeferredMenuAnnouncer } from '../menu-patch-component.ts';

import { BASES_KANBAN_COLUMN_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The view type of the **Bases** core plugin's view.
 */
const BASES_VIEW_TYPE = 'bases';

/**
 * The class Obsidian gives a board column's element (`app.js:147415`).
 */
const COLUMN_CLASS = 'bases-kanban-column';

/**
 * The classes of the elements inside a column whose right-click Obsidian leaves to them rather than showing the
 * column's menu (`app.js:147435`): a card, the column's create button and its **New item** button.
 */
const REFUSED_CLASSES = ['bases-kanban-card', 'bases-kanban-column-create', 'text-icon-button'] as const;

/**
 * Parameters for the {@link BasesKanbanColumnMenuEventsComponent} constructor.
 */
export interface BasesKanbanColumnMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * A column of a Bases board view, as far as the component reads one. The class is not exported.
 */
interface BasesKanbanColumnLike {
  /**
   * The column's element, which the `contextmenu` listener is bound on.
   */
  readonly containerEl: HTMLElement;

  /**
   * The group the column shows, or `null` before it is first rendered.
   */
  readonly group: BasesEntryGroup | null;
}

/**
 * A Bases board view, as far as the component reads one. The class is not exported.
 */
interface BasesKanbanViewLike {
  /**
   * The view's columns, one per group shown (`app.js:147179`).
   */
  readonly columns: readonly BasesKanbanColumnLike[];
}

/**
 * Publishes the context-menu event of a column's empty area in a Bases board view.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** Each column binds one
 * `contextmenu` listener on its own element when it is built (`app.js:147428`), which, unless the right-click
 * landed on a card or one of the column's buttons, or the base is read-only, fills `Menu.forEvent(evt)` with
 * **Add item**, **Hide column** and **Edit columns**. `Menu.forEvent` shows the menu on a later task, so it is
 * recognized by a column being on the event's recorded path, with none of those elements below it.
 *
 * The column's group comes from the board view itself, whose `columns` hold every column element and its group.
 * The view is reached from a `bases` leaf as `view.controller.view`, so a base embedded in a note is not announced.
 */
export class BasesKanbanColumnMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: BasesKanbanColumnMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a Bases board column.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a column's empty area in a **Bases** view's board view.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const columnIndex = eventPath.findIndex((eventTarget) => hasClass(eventTarget, COLUMN_CLASS));
    // A card's menu, or a button's, has the column on its path too, and the column's own listener shows nothing for it.
    if (columnIndex === -1 || eventPath.slice(0, columnIndex).some((eventTarget) => REFUSED_CLASSES.some((className) => hasClass(eventTarget, className)))) {
      return false;
    }

    const columnEl = eventPath[columnIndex];
    for (const leaf of this.app.workspace.getLeavesOfType(BASES_VIEW_TYPE)) {
      // `Partial`, because a deferred leaf reports the view type before its real view, and its controller, exist.
      const { controller } = castTo<Partial<BasesView>>(leaf.view);
      // Whatever view the base shows: only a board view has `columns`.
      const kanbanView = castTo<Partial<BasesKanbanViewLike> | undefined>(controller?.view);
      const group = kanbanView?.columns?.find((column) => column.containerEl === columnEl)?.group;
      if (!controller || !group) {
        continue;
      }

      const column: BasesKanbanColumnMenuItem = {
        groupKey: group.hasKey() ? String(group.key) : null,
        viewName: controller.viewName
      };
      this.app.workspace.trigger(BASES_KANBAN_COLUMN_MENU_EVENT_NAME, menu, leaf, column);
      return true;
    }

    return false;
  }
}

function hasClass(eventTarget: EventTarget, className: string): boolean {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  return castTo<Partial<HTMLElement>>(eventTarget).classList?.contains(className) ?? false;
}
