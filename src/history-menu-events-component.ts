import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { HistoryMenuDirection } from '../api.d.ts';
import type { MenuAnnouncer } from './patches/menu-patch-component.ts';

import { HISTORY_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * Parameters for the {@link HistoryMenuEventsComponent} constructor.
 */
export interface HistoryMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * A view, as far as telling its history buttons apart needs it.
 */
interface ViewWithHistoryButtons {
  /**
   * The header's back button, which every `ItemView` builds (`app.js:64952` in 1.15.0).
   */
  readonly backButtonEl?: HTMLElement;

  /**
   * The header's forward button, built beside it (`:64955`).
   */
  readonly forwardButtonEl?: HTMLElement;
}

/**
 * Publishes the history menu of a view's back and forward buttons.
 *
 * **That menu fires nothing, so it is announced through {@link MenuAnnouncer}.** Every `ItemView` builds both
 * buttons in its header once (`app.js:64952` in 1.15.0), and each binds one `contextmenu` listener that fills a
 * `new Menu()` with one item per page of `history.backHistory` or `forwardHistory` and shows it with
 * `showAtPosition` and no event, straight from the listener (`:64819`). `MenuPatchComponent` offers such a menu
 * with the `contextmenu` event still being dispatched, so it is recognized by the button being
 * `evt.currentTarget`, and the leaf by whose view holds that button.
 *
 * The same menu also opens when the mouse button is held down on the button for 400 ms, or dragged down from it
 * (`:64761`). That show comes from a timer or a mouse move, with no event and no `setParentElement`, so it is
 * not announced.
 */
export class HistoryMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: HistoryMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces a view's back or forward button history menu.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from a view's back or forward button's own listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const { currentTarget } = mouseEvent;
    if (mouseEvent.type !== 'contextmenu' || !currentTarget) {
      return false;
    }

    let isAnnounced = false;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (isAnnounced) {
        return;
      }

      const view = castTo<ViewWithHistoryButtons>(leaf.view);
      let direction: HistoryMenuDirection;
      if (currentTarget === view.backButtonEl) {
        direction = 'back';
      } else if (currentTarget === view.forwardButtonEl) {
        direction = 'forward';
      } else {
        return;
      }

      isAnnounced = true;
      this.app.workspace.trigger(HISTORY_MENU_EVENT_NAME, menu, leaf, direction);
    });
    return isAnnounced;
  }
}
