import type {
  App,
  Menu
} from 'obsidian';

import { Component } from 'obsidian';

import type { PdfOutlineMenuItem } from '../../../api.d.ts';
import type {
  DeferredMenuAnnouncer,
  MenuAnnouncer
} from '../menu-patch-component.ts';

import { PDF_OUTLINE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { getPdfLeafViewers } from './pdf-view.ts';

/**
 * Parameters for the {@link PdfOutlineMenuEventsComponent} constructor.
 */
export interface PdfOutlineMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of an item in the PDF view's outline.
 *
 * **That menu fires nothing, so it is announced through the menu patch, as BOTH kinds of announcer.** Each outline
 * tree item binds one `contextmenu` listener on its `selfEl` when it is built (`app.js:124814`, catalyst 1.15.0). Its
 * `onItemContextMenu` (`:125014`) awaits the item's markdown link, and so its destination and page number, before it
 * shows a menu with **Copy link to section**. The item resolves both when it renders its page label (`:124880`) and
 * caches them, so those awaits normally settle in the microtask checkpoint right after the listener returns, while
 * the event is still being dispatched and `currentTarget` is still the item's `selfEl` (measured in the real app,
 * 2026-10-26): that is the {@link MenuAnnouncer} case. When a right-click comes before they are cached, the menu is
 * shown after the dispatch and is told apart by `selfEl` on the recorded path: the {@link DeferredMenuAnnouncer}
 * case. Either way the item is found by matching that element against the outline's `allItems`. No menu is shown
 * for an item whose page cannot be resolved, so the item's cached page number is set whenever one is.
 */
export class PdfOutlineMenuEventsComponent extends Component implements DeferredMenuAnnouncer, MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PdfOutlineMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of an item in a PDF view's outline, shown after its event's dispatch.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on an outline item of a PDF view.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    return this.announce(menu, (selfEl) => eventPath.includes(selfEl));
  }

  /**
   * Announces the menu of an item in a PDF view's outline, shown during its event's dispatch.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from an outline item's listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const { currentTarget } = mouseEvent;
    return this.announce(menu, (selfEl) => selfEl === currentTarget);
  }

  private announce(menu: Menu, isItemSelfEl: (selfEl: HTMLElement) => boolean): boolean {
    for (const { leaf, pdfJsViewer } of getPdfLeafViewers(this.app)) {
      const outlineTreeItem = pdfJsViewer.pdfOutlineViewer.allItems.find((item) => isItemSelfEl(item.selfEl));
      if (!outlineTreeItem) {
        continue;
      }

      const { pageNumber } = outlineTreeItem;
      if (typeof pageNumber !== 'number') {
        return false;
      }

      const outlineItem: PdfOutlineMenuItem = {
        pageNumber,
        title: outlineTreeItem.item.title
      };
      this.app.workspace.trigger(PDF_OUTLINE_MENU_EVENT_NAME, menu, leaf, outlineItem);
      return true;
    }

    return false;
  }
}
