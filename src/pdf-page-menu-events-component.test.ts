import type {
  App as AppOriginal,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  App,
  Menu
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PDF_PAGE_MENU_EVENT_NAME } from './more-events-api.ts';
import { PdfPageMenuEventsComponent } from './pdf-page-menu-events-component.ts';

describe('PdfPageMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: PdfPageMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new PdfPageMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  it('should announce the menu of a page with its page number', () => {
    const viewerContainerEl = createDiv();
    const pageEl = page(viewerContainerEl, '2');
    const textEl = pageEl.createSpan();
    const otherLeaf = mockPdfLeaf(createDiv());
    const leaf = mockPdfLeaf(viewerContainerEl);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([otherLeaf, leaf]);
    const handler = vi.fn();
    app.workspace.on(PDF_PAGE_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceDeferredMenu(menu, new MouseEvent('contextmenu'), [textEl, pageEl, viewerContainerEl, window])).toBe(true);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('pdf');
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, 2);
  });

  it('should leave a menu shown anywhere else alone', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockPdfLeaf(createDiv())]);
    const handler = vi.fn();
    app.workspace.on(PDF_PAGE_MENU_EVENT_NAME, handler);

    expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [createDiv(), window])).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should leave the menu alone when no page with a number is on the path', () => {
    const viewerContainerEl = createDiv();
    const pageEl = page(viewerContainerEl, 'x');
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockPdfLeaf(viewerContainerEl)]);
    const handler = vi.fn();
    app.workspace.on(PDF_PAGE_MENU_EVENT_NAME, handler);

    expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [viewerContainerEl, window])).toBe(false);
    expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [pageEl, viewerContainerEl])).toBe(false);
    expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [createDiv('page'), viewerContainerEl])).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

function mockPdfLeaf(viewerContainerEl: HTMLElement): WorkspaceLeaf {
  return castTo<WorkspaceLeaf>({
    view: {
      viewer: {
        child: {
          pdfViewer: {
            dom: { viewerContainerEl }
          }
        }
      }
    }
  });
}

function page(viewerContainerEl: HTMLElement, pageNumber: string): HTMLElement {
  const pageEl = viewerContainerEl.createDiv('page');
  pageEl.dataset['pageNumber'] = pageNumber;
  return pageEl;
}
