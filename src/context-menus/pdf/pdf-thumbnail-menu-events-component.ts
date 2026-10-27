import type {
  App,
  Menu
} from 'obsidian';

import { Component } from 'obsidian';

import type { MenuAnnouncer } from '../menu-patch-component.ts';

import { PDF_THUMBNAIL_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { getPdfLeafViewers } from './pdf-view.ts';

/**
 * Parameters for the {@link PdfThumbnailMenuEventsComponent} constructor.
 */
export interface PdfThumbnailMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of a page thumbnail in the PDF view's sidebar.
 *
 * **That menu fires nothing, so it is announced through {@link MenuAnnouncer}.** The viewer binds one
 * `contextmenu` listener on its sidebar container when it is built (`app.js:154187`). It shows a menu with
 * **Copy link to page** straight from that listener when the click's target is a thumbnail (`:154802`).
 * That menu is recognized by the listener's element, which is still `evt.currentTarget` while it is shown,
 * and the page by the thumbnail's `data-page-number`, which is what Obsidian reads too.
 */
export class PdfThumbnailMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PdfThumbnailMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a page thumbnail in the PDF view.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from a PDF view's thumbnail listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const {
      currentTarget,
      target
    } = mouseEvent;
    for (const { leaf, pdfJsViewer } of getPdfLeafViewers(this.app)) {
      if (pdfJsViewer.dom.sidebarContainerEl !== currentTarget) {
        continue;
      }

      const pageNumber = target instanceof HTMLElement ? parseInt(target.dataset['pageNumber'] ?? '', 10) : NaN;
      if (Number.isNaN(pageNumber)) {
        return false;
      }

      this.app.workspace.trigger(PDF_THUMBNAIL_MENU_EVENT_NAME, menu, leaf, pageNumber);
      return true;
    }

    return false;
  }
}
