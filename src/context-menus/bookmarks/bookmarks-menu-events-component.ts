import type {
  App,
  Menu
} from 'obsidian';

import { Component } from 'obsidian';

import type { MenuAnnouncer } from '../menu-patch-component.ts';

import {
  BOOKMARKS_MENU_EVENT_NAME,
  BOOKMARKS_VIEW_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

/**
 * The event Obsidian itself triggers on `app.workspace` for a bookmarks context menu, undocumented.
 *
 * Measured in the public 1.14.5 `app.js` (`:189038` for a multiple selection, `:189168` for one bookmark),
 * and present since 1.8.0.
 */
const OBSIDIAN_BOOKMARKS_MENU_EVENT_NAME = 'bookmarks:bookmarks-menu';

/**
 * The view type of the **Bookmarks** core plugin's view.
 */
const BOOKMARKS_VIEW_TYPE = 'bookmarks';

/**
 * Parameters for the {@link BookmarksMenuEventsComponent} constructor.
 */
export interface BookmarksMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the two bookmarks context-menu events.
 *
 * **The bookmark menu is a relay, and needs no patch.** Obsidian already triggers its own
 * `bookmarks:bookmarks-menu` for it, with the menu and the bookmarks it is for, but documents it nowhere
 * in the public API. `obsidian-typings` declares it. This component re-publishes it as `more-events:bookmarks-menu`, so a consumer
 * has one typed name to depend on and this plugin is the one place that has to follow Obsidian if it ever
 * renames its own.
 *
 * **The empty-area menu fires nothing, so it is announced through {@link MenuAnnouncer}.** The
 * **Bookmarks** view registers one `contextmenu` listener on its `containerEl` and, when no bookmark has
 * claimed the event, shows a menu offering **New group** straight from it (`app.js:189581`). That menu is
 * recognized by the listener's element, which is still `evt.currentTarget` while it is shown.
 */
export class BookmarksMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: BookmarksMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the **Bookmarks** view's empty-area menu.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from a **Bookmarks** view's own listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const { currentTarget } = mouseEvent;
    const bookmarksLeaf = this.app.workspace.getLeavesOfType(BOOKMARKS_VIEW_TYPE).find((leaf) => leaf.view.containerEl === currentTarget);
    if (!bookmarksLeaf) {
      return false;
    }

    this.app.workspace.trigger(BOOKMARKS_VIEW_MENU_EVENT_NAME, menu, bookmarksLeaf);
    return true;
  }

  /**
   * Subscribes to Obsidian's own bookmarks menu event.
   */
  public override onload(): void {
    this.registerEvent(this.app.workspace.on(OBSIDIAN_BOOKMARKS_MENU_EVENT_NAME, (menu, bookmarks) => {
      this.app.workspace.trigger(BOOKMARKS_MENU_EVENT_NAME, menu, bookmarks);
    }));
  }
}
