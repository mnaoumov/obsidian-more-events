import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import { PDF_PAGE_MENU_EVENT_NAME } from './more-events-api.ts';
import { getPdfLeafViewers } from './pdf-view.ts';

/**
 * The class of a page's element in PDF.js's viewer.
 */
const PAGE_CLASS = 'page';

/**
 * Parameters for the {@link PdfPageMenuEventsComponent} constructor.
 */
export interface PdfPageMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of a page in the PDF view.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** The viewer binds one
 * `contextmenu` listener on its viewer container when it is built (`app.js:125542`, catalyst 1.15.0). On the desktop
 * app its `onContextMenu` (`:125855`) awaits Electron's context-menu parameters and, on an annotation, the annotated
 * text, before it shows a menu with the selection and annotation items, so by then the event has finished
 * dispatching. The menu is recognized by the viewer container being on the event's recorded path, and the page by
 * the `.page` element on that path, whose `data-page-number` is what Obsidian reads too.
 */
export class PdfPageMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PdfPageMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a page in a PDF view.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a page of a PDF view.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    for (const { leaf, pdfJsViewer } of getPdfLeafViewers(this.app)) {
      if (!eventPath.includes(pdfJsViewer.dom.viewerContainerEl)) {
        continue;
      }

      const pageEl = eventPath.find(isPageEl);
      const pageNumber = parseInt(pageEl?.dataset['pageNumber'] ?? '', 10);
      if (Number.isNaN(pageNumber)) {
        return false;
      }

      this.app.workspace.trigger(PDF_PAGE_MENU_EVENT_NAME, menu, leaf, pageNumber);
      return true;
    }

    return false;
  }
}

function isPageEl(eventTarget: EventTarget): eventTarget is HTMLElement {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  return castTo<Partial<HTMLElement>>(eventTarget).classList?.contains(PAGE_CLASS) ?? false;
}
