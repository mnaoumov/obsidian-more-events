import type {
  App,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';

/**
 * The view type of the PDF view.
 */
const PDF_VIEW_TYPE = 'pdf';

/**
 * PDF.js's own viewer application, as far as telling the PDF view's menus apart needs it. The public typings and
 * `obsidian-typings` describe none of it.
 */
export interface PdfJsViewer {
  /**
   * The elements it was built on.
   */
  readonly dom: PdfViewerDom;

  /**
   * The outline in the sidebar (`app.js:125585`, catalyst 1.15.0).
   */
  readonly pdfOutlineViewer: PdfOutlineViewer;
}

/**
 * One PDF leaf and PDF.js's viewer inside it.
 */
export interface PdfLeafViewer {
  /**
   * The leaf holding the PDF view.
   */
  readonly leaf: WorkspaceLeaf;

  /**
   * PDF.js's viewer.
   */
  readonly pdfJsViewer: PdfJsViewer;
}

/**
 * One item of the outline tree.
 */
export interface PdfOutlineTreeItem {
  /**
   * The outline entry PDF.js read from the document.
   */
  readonly item: PdfOutlineTreeItemData;

  /**
   * The page the item points to, once it has been resolved. The item's menu awaits that before it is shown.
   */
  readonly pageNumber?: null | number;

  /**
   * The element its `contextmenu` listener is bound on.
   */
  readonly selfEl: HTMLElement;
}

/**
 * The outline entry PDF.js read from the document.
 */
export interface PdfOutlineTreeItemData {
  /**
   * The entry's title.
   */
  readonly title: string;
}

/**
 * The outline in the PDF view's sidebar.
 */
export interface PdfOutlineViewer {
  /**
   * Every item of the outline tree, nested ones included (`app.js:124969`).
   */
  readonly allItems: readonly PdfOutlineTreeItem[];
}

/**
 * The elements PDF.js was handed when the viewer was built (`app.js:125560`).
 */
export interface PdfViewerDom {
  /**
   * The element the thumbnail `contextmenu` listener is bound on.
   */
  readonly sidebarContainerEl: HTMLElement;

  /**
   * The element the page `contextmenu` listener is bound on.
   */
  readonly viewerContainerEl: HTMLElement;
}

/**
 * The PDF view, as far as reaching PDF.js's viewer needs it.
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
 * Lists the PDF leaves whose viewer has been built, each with PDF.js's viewer. Only PDF leaves are searched, so a
 * PDF embedded in a note is not among them.
 *
 * @param app - The Obsidian application instance.
 * @returns The PDF leaves and their viewers.
 */
export function getPdfLeafViewers(app: App): PdfLeafViewer[] {
  const pdfLeafViewers: PdfLeafViewer[] = [];
  for (const leaf of app.workspace.getLeavesOfType(PDF_VIEW_TYPE)) {
    // `Partial`, because a deferred leaf reports the view type before its real view, and its viewer, exist.
    const pdfJsViewer = castTo<Partial<PdfView>>(leaf.view).viewer?.child?.pdfViewer;
    if (pdfJsViewer) {
      pdfLeafViewers.push({ leaf, pdfJsViewer });
    }
  }
  return pdfLeafViewers;
}
