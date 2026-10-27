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

import { WEB_VIEWER_HISTORY_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { WebViewerHistoryMenuEventsComponent } from './web-viewer-history-menu-events-component.ts';

interface StoredHistoryItem {
  readonly accessTs: number;
  readonly id: number;
  readonly title: string;
  readonly url: string;
}

interface ViewItem {
  readonly item: StoredHistoryItem;
  readonly selfEl: HTMLElement;
}

describe('WebViewerHistoryMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: WebViewerHistoryMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new WebViewerHistoryMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  it('should announce the menu of a history entry with a plain copy of its title and url', () => {
    const entry = mockItem(2, 'Example', 'https://example.com/');
    const otherLeaf = mockHistoryLeaf([mockItem(1, 'Other', 'https://other.example/')]);
    const leaf = mockHistoryLeaf([mockItem(3, 'Third', 'https://third.example/'), entry]);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([otherLeaf, leaf]);
    const handler = vi.fn();
    app.workspace.on(WEB_VIEWER_HISTORY_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, mouseEventWithCurrentTarget(entry.selfEl))).toBe(true);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('webviewer-history');
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, { title: 'Example', url: 'https://example.com/' });
    expect(handler.mock.calls[0]?.[2]).not.toBe(entry.item);
  });

  it('should leave a menu shown from any other listener alone', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockHistoryLeaf([mockItem(1, 'Example', 'https://example.com/')])]);
    const handler = vi.fn();
    app.workspace.on(WEB_VIEWER_HISTORY_MENU_EVENT_NAME, handler);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(createDiv()))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should skip a deferred leaf, which has no entries yet', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([castTo<WorkspaceLeaf>({ view: {} })]);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(createDiv()))).toBe(false);
  });
});

function mockHistoryLeaf(items: readonly ViewItem[]): WorkspaceLeaf {
  return castTo<WorkspaceLeaf>({
    view: {
      itemDoms: new Map(items.map((viewItem) => [viewItem.item.id, viewItem]))
    }
  });
}

function mockItem(id: number, title: string, url: string): ViewItem {
  return {
    item: {
      accessTs: id,
      id,
      title,
      url
    },
    selfEl: createDiv()
  };
}

/**
 * A right-click as a listener on `currentTarget` sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function mouseEventWithCurrentTarget(currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}
