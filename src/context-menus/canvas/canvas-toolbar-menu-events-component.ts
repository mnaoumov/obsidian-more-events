import type { CanvasView } from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { PositionedMenuAnnouncer } from '../menu-patch-component.ts';

import {
  CANVAS_ALIGN_MENU_EVENT_NAME,
  CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME,
  CANVAS_LINE_DIRECTION_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import { getSelection } from './canvas-selection.ts';

/**
 * Parameters for the {@link CanvasToolbarMenuEventsComponent} constructor.
 */
export interface CanvasToolbarMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The icon of the **Align** button (`app.js:152731` in 1.15.0).
 */
const ALIGN_ICON = 'lucide-align-start-vertical';

/**
 * The icon of the **Set background** / **Edit background** button of a group (`app.js:153007` in 1.15.0).
 */
const GROUP_BACKGROUND_ICON = 'lucide-image';

/**
 * The icons of the **Line direction** button, which shows the direction the selected connections have
 * (`app.js:152936` in 1.15.0).
 */
const LINE_DIRECTION_ICONS = ['line-horizontal', 'lucide-arrow-right', 'lucide-move-horizontal'] as const;

type CanvasToolbarMenuEventName =
  | typeof CANVAS_ALIGN_MENU_EVENT_NAME
  | typeof CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME
  | typeof CANVAS_LINE_DIRECTION_MENU_EVENT_NAME;

/**
 * Announces the menus of the canvas selection toolbar: **Align**, **Line direction** and a group's background.
 *
 * In catalyst 1.15.0 the toolbar (`app.js:152600`) is kept as `canvas.menu`, and each of its buttons is a
 * `button.clickable-icon` straight inside `canvas.menu.menuEl`, held by nothing but its click listener. The three
 * listeners each fill a `new Menu()` and show it with `setParentElement(button).showAtPosition(...)`
 * (`:152926`, `:152970`, `:153065`), so the anchor is the button. The button carries no label of its own beyond a
 * translated tooltip, so it is told apart by the icon Obsidian rendered into it, an untranslated id that `setIcon`
 * writes as a class of the `svg`.
 *
 * Every menu acts on the canvas's current selection, so each event hands over a copy of it. Only canvas leaves are
 * searched, so a canvas in a hover popover is not announced.
 */
export class CanvasToolbarMenuEventsComponent extends Component implements PositionedMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CanvasToolbarMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces a canvas selection toolbar menu before it opens.
   *
   * @param menu - The menu about to be shown.
   * @param parentEl - The button the menu was anchored to.
   * @returns Whether a canvas toolbar owns the anchor.
   */
  public announcePositionedMenu(menu: Menu, parentEl: HTMLElement): boolean {
    const eventName = getEventName(parentEl);
    if (!eventName) {
      return false;
    }

    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
      // A deferred leaf has no canvas yet.
      const canvas = castTo<Partial<CanvasView>>(leaf.view).canvas;
      if (canvas?.menu.menuEl !== parentEl.parentElement) {
        continue;
      }
      this.app.workspace.trigger(eventName, menu, leaf, getSelection(canvas));
      return true;
    }
    return false;
  }
}

function getEventName(buttonEl: HTMLElement): CanvasToolbarMenuEventName | null {
  const iconClassList = buttonEl.querySelector(':scope > svg')?.classList;
  if (!iconClassList) {
    return null;
  }
  if (iconClassList.contains(ALIGN_ICON)) {
    return CANVAS_ALIGN_MENU_EVENT_NAME;
  }
  if (iconClassList.contains(GROUP_BACKGROUND_ICON)) {
    return CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME;
  }
  return LINE_DIRECTION_ICONS.some((icon) => iconClassList.contains(icon)) ? CANVAS_LINE_DIRECTION_MENU_EVENT_NAME : null;
}
