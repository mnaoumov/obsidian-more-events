import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { MenuAnnouncer } from './patches/menu-patch-component.ts';

import { PDF_THUMBNAIL_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The view type of the PDF view.
 */
const PDF_VIEW_TYPE = 'pdf';

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
 * PDF.js's own viewer application.
 */
interface PdfJsViewer {
  /**
   * The elements it was built on.
   */
  readonly dom: PdfViewerDom;
}

/**
 * The PDF view, as far as telling its thumbnail menus apart needs it. The public typings and
 * `obsidian-typings` describe none of it.
 */
interface PdfView {
  /**
   * The viewer component.
   */
  readonly viewer: PdfViewerComponent;
}

/**
 * The loaded document's viewer.
 */
interface PdfViewerChild {
  /**
   * PDF.js's own viewer application, `null` before it is built.
   */
  readonly pdfViewer: null | PdfJsViewer;
}

/**
 * The PDF view's viewer component.
 */
interface PdfViewerComponent {
  /**
   * The loaded document's viewer, `null` before one has loaded.
   */
  readonly child: null | PdfViewerChild;
}

/**
 * The elements PDF.js was handed when the viewer was built (`app.js:154198`).
 */
interface PdfViewerDom {
  /**
   * The element the thumbnail `contextmenu` listener is bound on (`app.js:154187`).
   */
  readonly sidebarContainerEl: HTMLElement;
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
    for (const leaf of this.app.workspace.getLeavesOfType(PDF_VIEW_TYPE)) {
      // `Partial`, because a deferred leaf reports the view type before its real view, and its viewer, exist.
      const { viewer } = castTo<Partial<PdfView>>(leaf.view);
      if (viewer?.child?.pdfViewer?.dom.sidebarContainerEl !== currentTarget) {
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
