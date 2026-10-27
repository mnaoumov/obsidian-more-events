import type {
  App,
  Menu
} from 'obsidian';

import { Component } from 'obsidian';

import type { RibbonSide } from '../../../api.d.ts';
import type { MenuAnnouncer } from '../menu-patch-component.ts';

import { RIBBON_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * Parameters for the {@link RibbonMenuEventsComponent} constructor.
 */
export interface RibbonMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * One ribbon, as far as telling its menu apart needs it.
 */
interface Ribbon {
  readonly containerEl: HTMLElement;
}

/**
 * The two ribbons of the workspace, as far as telling their menus apart needs them.
 */
interface Ribbons {
  readonly leftRibbon: Ribbon;
  readonly rightRibbon: Ribbon;
}

/**
 * Publishes the context-menu event of the ribbon's empty area.
 *
 * **That menu fires nothing, so it is announced through {@link MenuAnnouncer}.** Each ribbon registers one
 * `contextmenu` listener on its `containerEl` (`app.js:167121`) and, when the click landed on the bare
 * container rather than on an icon, shows a menu with a checkbox per ribbon action and **Hide ribbon**
 * straight from it (`:167260`). That menu is recognized by the listener's element, which is still
 * `evt.currentTarget` while it is shown.
 *
 * A ribbon icon shows no menu at all, because that listener returns unless the click landed on the
 * container itself, so there is nothing to announce for one.
 */
export class RibbonMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: RibbonMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the ribbon's empty-area menu.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from a ribbon's own listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const side = this.getRibbonSide(mouseEvent.currentTarget);
    if (!side) {
      return false;
    }

    this.app.workspace.trigger(RIBBON_MENU_EVENT_NAME, menu, side);
    return true;
  }

  private getRibbonSide(currentTarget: EventTarget | null): null | RibbonSide {
    /*
     * An upcast to a local shape rather than `app.workspace.rightRibbon`, because `obsidian-typings` marks
     * `rightRibbon` as no longer used. The 1.14.5 bundle still builds it (`app.js:167677`), mounts its
     * `containerEl` at the right edge of the workspace (`:169303`) and shows it whenever the right sidebar
     * holds a tab (`:88932`), so its menu is real.
     */
    const ribbons: Ribbons = this.app.workspace;
    if (currentTarget === ribbons.leftRibbon.containerEl) {
      return 'left';
    }
    return currentTarget === ribbons.rightRibbon.containerEl ? 'right' : null;
  }
}
