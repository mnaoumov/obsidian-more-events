import type {
  App,
  Menu
} from 'obsidian';

import { Component } from 'obsidian';

import type { SidebarSide } from '../api.d.ts';
import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import { SIDEBAR_TOGGLE_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * Parameters for the {@link SidebarToggleMenuEventsComponent} constructor.
 */
export interface SidebarToggleMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of the left and right sidebar toggle buttons.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** The workspace builds
 * each button once, as `leftSidebarToggleButtonEl` / `rightSidebarToggleButtonEl` (`app.js:167678`,
 * `:167718`), with one `contextmenu` listener on it (`:167694`, `:167734`) that fills `Menu.forEvent(evt)`
 * with **Left sidebar** and **Ribbon**, or **Right sidebar**. `Menu.forEvent` shows the menu on a later task,
 * so it is recognized by the button being on the event's recorded path.
 */
export class SidebarToggleMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: SidebarToggleMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces a sidebar toggle button's menu.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a sidebar toggle button.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const side = this.getSidebarSide(eventPath);
    if (!side) {
      return false;
    }

    this.app.workspace.trigger(SIDEBAR_TOGGLE_MENU_EVENT_NAME, menu, side);
    return true;
  }

  private getSidebarSide(eventPath: readonly EventTarget[]): null | SidebarSide {
    const { leftSidebarToggleButtonEl, rightSidebarToggleButtonEl } = this.app.workspace;
    if (eventPath.includes(leftSidebarToggleButtonEl)) {
      return 'left';
    }
    return eventPath.includes(rightSidebarToggleButtonEl) ? 'right' : null;
  }
}
