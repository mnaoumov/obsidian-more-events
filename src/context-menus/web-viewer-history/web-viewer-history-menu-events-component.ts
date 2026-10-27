import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { WebViewerHistoryMenuItem } from '../../../api.d.ts';
import type { MenuAnnouncer } from '../menu-patch-component.ts';

import { WEB_VIEWER_HISTORY_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The view type of the **Web viewer** core plugin's History view.
 */
const WEB_VIEWER_HISTORY_VIEW_TYPE = 'webviewer-history';

/**
 * Parameters for the {@link WebViewerHistoryMenuEventsComponent} constructor.
 */
export interface WebViewerHistoryMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The History view, as far as telling its item menus apart needs it. The public typings and
 * `obsidian-typings` describe none of it.
 */
interface WebViewerHistoryView {
  /**
   * The tree item of every history entry listed, by the entry's id (`app.js:173295`).
   */
  readonly itemDoms: ReadonlyMap<unknown, WebViewerHistoryViewItem>;
}

/**
 * One history entry listed in the History view.
 */
interface WebViewerHistoryViewItem {
  /**
   * The stored history entry (`app.js:173325`).
   */
  readonly item: WebViewerHistoryMenuItem;

  /**
   * The element its `contextmenu` listener is bound on (`app.js:173333`).
   */
  readonly selfEl: HTMLElement;
}

/**
 * Publishes the context-menu event of an entry in the **Web viewer** core plugin's History view.
 *
 * **That menu fires nothing, so it is announced through {@link MenuAnnouncer}.** Each entry of the view binds
 * one `contextmenu` listener on its `selfEl` at construction (`app.js:173333`) and shows a menu with
 * **Copy URL** and **Remove from history** straight from it (`:173375`). That menu is recognized by the
 * listener's element, which is still `evt.currentTarget` while it is shown.
 */
export class WebViewerHistoryMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: WebViewerHistoryMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of an entry in the History view.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from a History view entry's own listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const { currentTarget } = mouseEvent;
    for (const leaf of this.app.workspace.getLeavesOfType(WEB_VIEWER_HISTORY_VIEW_TYPE)) {
      // `Partial`, because a deferred leaf reports the view type before its real view, and its entries, exist.
      const { itemDoms } = castTo<Partial<WebViewerHistoryView>>(leaf.view);
      const historyItem = [...itemDoms?.values() ?? []].find((itemDom) => itemDom.selfEl === currentTarget)?.item;
      if (!historyItem) {
        continue;
      }

      // A plain copy, so a listener cannot edit the stored entry without telling Obsidian.
      const {
        title,
        url
      } = historyItem;
      this.app.workspace.trigger(WEB_VIEWER_HISTORY_MENU_EVENT_NAME, menu, leaf, { title, url });
      return true;
    }

    return false;
  }
}
