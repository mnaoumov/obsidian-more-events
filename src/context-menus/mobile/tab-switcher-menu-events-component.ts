import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { DeferredMenuAnnouncer } from '../menu-patch-component.ts';

import { TAB_SWITCHER_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The class of the mobile navigation bar's tab button, the element whose listener builds the menu.
 */
const TABS_BUTTON_CLASS = 'mobile-navbar-action-tabs';

/**
 * Parameters for the {@link TabSwitcherMenuEventsComponent} constructor.
 */
export interface TabSwitcherMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The mobile navigation bar, as far as finding its tab button needs it. No typings declare it.
 */
interface MobileNavbar {
  /**
   * The navigation bar's own element (`app.js:144891` in 1.15.0).
   */
  readonly containerEl: HTMLElement;
}

/**
 * The app, as far as reaching the mobile navigation bar needs it.
 */
interface WithMobileNavbar {
  /**
   * Built on mobile only, `null` on desktop (`app.js:177259`, `:177501` in 1.15.0).
   */
  readonly mobileNavbar?: MobileNavbar | null;
}

/**
 * Publishes the context-menu event of the mobile navigation bar's tab button.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** On mobile, the navigation
 * bar builds its tab button once (`.mobile-navbar-action-tabs`, `app.js:144942` in 1.15.0), with one `contextmenu`
 * listener, which a long-press raises, that calls `mobileTabSwitcher.showTabManagementMenu(evt)` (`:145422`). That
 * fills `Menu.forEvent(evt)` with **New tab**, **Undo close tab** and the close items for the most recently active
 * leaf, so the menu is shown on a later task and recognized by the button being on the event's recorded path.
 *
 * The tab switcher's own chevron button builds the same menu on a CLICK (`:145258`), anchored to nothing, and only
 * `contextmenu` paths are recorded, so that one never reaches this announcer.
 */
export class TabSwitcherMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: TabSwitcherMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the tab button's menu.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the long-press landed on the navigation bar's tab button.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const navbarEl = castTo<WithMobileNavbar>(this.app).mobileNavbar?.containerEl;
    if (!navbarEl) {
      return false;
    }

    const isTabsButton = eventPath.some((eventTarget) => eventTarget instanceof HTMLElement && eventTarget.hasClass(TABS_BUTTON_CLASS) && navbarEl.contains(eventTarget));
    if (!isTabsButton) {
      return false;
    }

    this.app.workspace.trigger(TAB_SWITCHER_MENU_EVENT_NAME, menu, this.app.workspace.getMostRecentLeaf());
    return true;
  }
}
