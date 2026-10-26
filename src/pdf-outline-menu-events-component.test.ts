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

import type { PdfOutlineTreeItem } from './pdf-view.ts';

import { PDF_OUTLINE_MENU_EVENT_NAME } from './more-events-api.ts';
import { PdfOutlineMenuEventsComponent } from './pdf-outline-menu-events-component.ts';

describe('PdfOutlineMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: PdfOutlineMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new PdfOutlineMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  it('should announce the menu of an outline item with its title and page number', () => {
    const firstItem = outlineTreeItem('First', 1);
    const secondItem = outlineTreeItem('Second', 2);
    const otherLeaf = mockPdfLeaf([outlineTreeItem('Other', 1)]);
    const leaf = mockPdfLeaf([firstItem, secondItem]);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([otherLeaf, leaf]);
    const handler = vi.fn();
    app.workspace.on(PDF_OUTLINE_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const innerEl = secondItem.selfEl.createDiv();

    expect(component.announceDeferredMenu(menu, new MouseEvent('contextmenu'), [innerEl, secondItem.selfEl, window])).toBe(true);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('pdf');
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, { pageNumber: 2, title: 'Second' });
  });

  it('should announce the menu of an outline item shown during its event\'s dispatch', () => {
    const item = outlineTreeItem('First', 4);
    const leaf = mockPdfLeaf([item]);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([leaf]);
    const handler = vi.fn();
    app.workspace.on(PDF_OUTLINE_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, rightClick(item.selfEl))).toBe(true);
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, { pageNumber: 4, title: 'First' });
    expect(component.announceMenu(menu, rightClick(createDiv()))).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('should leave a menu shown anywhere else alone', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockPdfLeaf([outlineTreeItem('First', 1)])]);
    const handler = vi.fn();
    app.workspace.on(PDF_OUTLINE_MENU_EVENT_NAME, handler);

    expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [createDiv(), window])).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should leave the menu alone when the item\'s page is not resolved', () => {
    const item = outlineTreeItem('Unresolved', null);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockPdfLeaf([item])]);
    const handler = vi.fn();
    app.workspace.on(PDF_OUTLINE_MENU_EVENT_NAME, handler);

    expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [item.selfEl])).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should skip a deferred leaf and a viewer with no document loaded', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([
      castTo<WorkspaceLeaf>({ view: {} }),
      castTo<WorkspaceLeaf>({ view: { viewer: { child: null } } }),
      castTo<WorkspaceLeaf>({ view: { viewer: { child: { pdfViewer: null } } } })
    ]);

    expect(component.announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [createDiv()])).toBe(false);
  });
});

function mockPdfLeaf(allItems: PdfOutlineTreeItem[]): WorkspaceLeaf {
  return castTo<WorkspaceLeaf>({
    view: {
      viewer: {
        child: {
          pdfViewer: {
            pdfOutlineViewer: { allItems }
          }
        }
      }
    }
  });
}

function outlineTreeItem(title: string, pageNumber: null | number): PdfOutlineTreeItem {
  return {
    item: { title },
    pageNumber,
    selfEl: createDiv()
  };
}

/**
 * A right-click as an outline item's listener sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function rightClick(currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}
