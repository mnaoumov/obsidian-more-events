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

import { PDF_THUMBNAIL_MENU_EVENT_NAME } from './more-events-api.ts';
import { PdfThumbnailMenuEventsComponent } from './pdf-thumbnail-menu-events-component.ts';

describe('PdfThumbnailMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: PdfThumbnailMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new PdfThumbnailMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  it('should announce the menu of a thumbnail with its page number', () => {
    const sidebarContainerEl = createDiv();
    const otherLeaf = mockPdfLeaf(createDiv());
    const leaf = mockPdfLeaf(sidebarContainerEl);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([otherLeaf, leaf]);
    const handler = vi.fn();
    app.workspace.on(PDF_THUMBNAIL_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, rightClick(sidebarContainerEl, thumbnail('3')))).toBe(true);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('pdf');
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, 3);
  });

  it('should leave a menu shown from any other listener alone', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockPdfLeaf(createDiv())]);
    const handler = vi.fn();
    app.workspace.on(PDF_THUMBNAIL_MENU_EVENT_NAME, handler);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), rightClick(createDiv(), thumbnail('1')))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should leave the menu alone when its target carries no page number', () => {
    const sidebarContainerEl = createDiv();
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockPdfLeaf(sidebarContainerEl)]);
    const handler = vi.fn();
    app.workspace.on(PDF_THUMBNAIL_MENU_EVENT_NAME, handler);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), rightClick(sidebarContainerEl, createDiv()))).toBe(false);
    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), rightClick(sidebarContainerEl, null))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should skip a deferred leaf and a viewer with no document loaded', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([
      castTo<WorkspaceLeaf>({ view: {} }),
      castTo<WorkspaceLeaf>({ view: { viewer: { child: null } } }),
      castTo<WorkspaceLeaf>({ view: { viewer: { child: { pdfViewer: null } } } })
    ]);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), rightClick(createDiv(), thumbnail('1')))).toBe(false);
  });
});

function mockPdfLeaf(sidebarContainerEl: HTMLElement): WorkspaceLeaf {
  return castTo<WorkspaceLeaf>({
    view: {
      viewer: {
        child: {
          pdfViewer: {
            dom: { sidebarContainerEl }
          }
        }
      }
    }
  });
}

/**
 * A right-click as the sidebar's listener sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @param target - The element right-clicked.
 * @returns The event.
 */
function rightClick(currentTarget: HTMLElement, target: HTMLElement | null): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperties(event_, {
    currentTarget: { value: currentTarget },
    target: { value: target }
  });
  return event_;
}

function thumbnail(pageNumber: string): HTMLElement {
  const thumbnailEl = createDiv('thumbnail');
  thumbnailEl.dataset['pageNumber'] = pageNumber;
  return thumbnailEl;
}
