import type {
  App,
  Menu
} from 'obsidian';

import { Component } from 'obsidian';

import type { PositionedMenuAnnouncer } from '../menu-patch-component.ts';

import {
  PDF_DISPLAY_MENU_EVENT_NAME,
  PDF_SIDEBAR_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

/**
Parameters for the {@link PdfToolbarMenuEventsComponent} constructor.
*/
export interface PdfToolbarMenuEventsComponentConstructorParams {
  readonly app: App;
}

/**
The kept buttons that identify the toolbar's options menus.
*/
interface PdfToolbar {
  readonly sidebarOptionsEl?: HTMLElement;
  readonly zoomInEl?: HTMLElement;
}

/**
The PDF view's viewer, as far as reaching its toolbar needs it.
*/
interface PdfView {
  readonly viewer?: PdfViewerComponent;
}

/**
The loaded document's toolbar owner.
*/
interface PdfViewerChild {
  readonly toolbar?: PdfToolbar;
}

/**
The viewer component before and after a document has loaded.
*/
interface PdfViewerComponent {
  readonly child: null | PdfViewerChild;
}

/**
 * Announces the PDF toolbar's sidebar and display options menus through their anchors.
 *
 * In catalyst 1.15.0, the sidebar options button is kept as `toolbar.sidebarOptionsEl` (`app.js:125166`).
 * The display options button is the next sibling of `toolbar.zoomInEl` (`:125239`); neither its label nor
 * its icon is used to identify it. Both click listeners anchor their menus before `showAtPosition`.
 * Only PDF leaves are searched, so embedded PDF toolbars are not announced.
 */
export class PdfToolbarMenuEventsComponent extends Component implements PositionedMenuAnnouncer {
  private readonly app: App;

  /**
  Creates the component.
  */
  public constructor(params: PdfToolbarMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces a PDF toolbar menu before it opens.
   *
   * @param menu - The menu about to be shown.
   * @param parentEl - The button the menu was anchored to.
   * @returns Whether a PDF toolbar owns the anchor.
   */
  public announcePositionedMenu(menu: Menu, parentEl: HTMLElement): boolean {
    for (const leaf of this.app.workspace.getLeavesOfType('pdf')) {
      // The PDF view has no public typings. A deferred leaf has no viewer yet.
      const view: unknown = leaf.view;
      const toolbar = (view as PdfView).viewer?.child?.toolbar;
      if (!toolbar) {
        continue;
      }
      if (parentEl === toolbar.sidebarOptionsEl) {
        this.app.workspace.trigger(PDF_SIDEBAR_MENU_EVENT_NAME, menu, leaf);
        return true;
      }
      if (parentEl === toolbar.zoomInEl?.nextElementSibling) {
        this.app.workspace.trigger(PDF_DISPLAY_MENU_EVENT_NAME, menu, leaf);
        return true;
      }
    }
    return false;
  }
}
