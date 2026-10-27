import type { BasesView } from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { PositionedMenuAnnouncer } from '../menu-patch-component.ts';

import { BASES_VIEW_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The view type of the **Bases** core plugin's view.
 */
const BASES_VIEW_TYPE = 'bases';

/**
 * Parameters for the {@link BasesViewMenuEventsComponent} constructor.
 */
export interface BasesViewMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * A base's query controller, as far as finding its **Views** toolbar menu needs it.
 */
interface BasesQueryController {
  /**
   * The **Views** toolbar menu (`app.js:120220` in 1.15.0).
   */
  readonly viewMenu?: BasesToolbarMenu;
}

/**
 * A toolbar menu of a base: its button, and the popover it opens.
 */
interface BasesToolbarMenu {
  readonly toolbarItem: BasesToolbarMenuItem;
}

/**
 * A toolbar item of a base, as far as reaching its popover needs it.
 */
interface BasesToolbarMenuItem {
  /**
   * The popover the item's button opens (`app.js:114646` in 1.15.0).
   */
  readonly menu: BasesToolbarMenuPopover;
}

/**
 * One page of a Bases toolbar popover.
 */
interface BasesToolbarMenuPage {
  /**
   * The buttons the page shows in the popover's header, its **More options** button among them (`app.js:114627`).
   */
  readonly actionEls?: readonly HTMLElement[];

  /**
   * The view a view configuration page configures (`app.js:119912`). Other pages have none.
   */
  readonly view?: BasesViewConfig;
}

/**
 * A Bases toolbar popover (`ou`, `app.js:114674` in 1.15.0).
 */
interface BasesToolbarMenuPopover {
  /**
   * The pages the popover has shown, the one on screen last (`app.js:114677`).
   */
  readonly pageStack: readonly BasesToolbarMenuPage[];
}

/**
 * A view of a base, as its `views` list declares it.
 */
interface BasesViewConfig {
  readonly name: string;
}

/**
 * Publishes the event of the **More options** menu on a Bases view's configuration page.
 *
 * **That menu fires nothing, so it is announced through {@link PositionedMenuAnnouncer}.** The **Views** toolbar
 * menu shows a view's configuration page (`vE`, `app.js:119912` in 1.15.0) in its popover, and the page's
 * **More options** button calls `showActions` on a click (`:120135`), which fills `Menu.forEvent(evt)` with
 * **Set as default view**, **Duplicate view** and **Delete view**, and anchors it with `setParentElement(button)`.
 * `Menu.forEvent` shows the menu on a later task for an event that is not a `contextmenu` one, so no path was
 * recorded for it, and the anchor is what names it: the button is one of the page's `actionEls`.
 *
 * The page keeps the view it configures, which need not be the view the base shows: the list of views opens the
 * page of any of them. The controller is reached from a `bases` leaf as `view.controller`, so a base embedded in a
 * note is not announced.
 */
export class BasesViewMenuEventsComponent extends Component implements PositionedMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: BasesViewMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the **More options** menu of a Bases view's configuration page.
   *
   * @param menu - The menu about to be shown.
   * @param parentEl - The element the menu was anchored to.
   * @returns `true` when the menu was anchored to the **More options** button of a view configuration page in a
   * **Bases** view's **Views** toolbar menu.
   */
  public announcePositionedMenu(menu: Menu, parentEl: HTMLElement): boolean {
    for (const leaf of this.app.workspace.getLeavesOfType(BASES_VIEW_TYPE)) {
      // `Partial`, because a deferred leaf reports the view type before its real view, and its controller, exist.
      const { controller } = castTo<Partial<BasesView>>(leaf.view);
      const pages = castTo<BasesQueryController | undefined>(controller)?.viewMenu?.toolbarItem.menu.pageStack ?? [];
      const page = pages.find((candidate) => !!candidate.view && (candidate.actionEls?.includes(parentEl) ?? false));
      if (!page?.view) {
        continue;
      }

      this.app.workspace.trigger(BASES_VIEW_MENU_EVENT_NAME, menu, leaf, page.view.name);
      return true;
    }

    return false;
  }
}
