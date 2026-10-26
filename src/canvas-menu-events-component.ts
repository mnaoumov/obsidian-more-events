import type { CanvasView } from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { CanvasMenuPosition } from '../api.d.ts';
import type { MenuAnnouncer } from './patches/menu-patch-component.ts';

import { CANVAS_VIEW_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The view type of the **Canvas** core plugin's view.
 */
const CANVAS_VIEW_TYPE = 'canvas';

/**
 * Parameters for the {@link CanvasMenuEventsComponent} constructor.
 */
export interface CanvasMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of the **Canvas** view's empty background.
 *
 * **That menu fires nothing, so it is announced through {@link MenuAnnouncer}.** The canvas registers one
 * `contextmenu` listener on its `wrapperEl` (`app.js:192611`) and, when the click landed on the bare
 * background of an editable canvas, shows a menu offering **Add card**, **Add note from vault** and the
 * rest straight from it (`:194500`). That menu is recognized by the listener's element, which is still
 * `evt.currentTarget` while it is shown.
 *
 * The menus of a node, an edge and a selection are not this one: Obsidian triggers its own undocumented
 * `canvas:node-menu`, `canvas:edge-menu` and `canvas:selection-menu` for those.
 */
export class CanvasMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CanvasMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the **Canvas** view's empty-background menu.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from a **Canvas** view's own `contextmenu` listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    /*
     * The type check is cheap insurance: the canvas also shows menus from its drag handlers, and none of
     * them is the background menu even if one were ever shown while the wrapper's listener runs.
     */
    if (mouseEvent.type !== 'contextmenu') {
      return false;
    }

    const { currentTarget } = mouseEvent;
    for (const leaf of this.app.workspace.getLeavesOfType(CANVAS_VIEW_TYPE)) {
      // `Partial`, because a deferred leaf reports the view type before its real view, and its canvas, exist.
      const { canvas } = castTo<Partial<CanvasView>>(leaf.view);
      if (canvas?.wrapperEl !== currentTarget) {
        continue;
      }

      const { x, y } = castTo<CanvasMenuPosition>(canvas.posFromEvt(mouseEvent));
      this.app.workspace.trigger(CANVAS_VIEW_MENU_EVENT_NAME, menu, leaf, { x, y });
      return true;
    }

    return false;
  }
}
