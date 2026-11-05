import type {
  App as AppOriginal,
  Menu as MenuOriginal
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { SYNC_FILES_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { SyncFilesMenuEventsComponent } from './sync-files-menu-events-component.ts';

interface TestFile {
  readonly path: string;
}

interface TestItem {
  readonly selfEl: HTMLElement;
  readonly sFile?: TestFile;
}

describe('SyncFilesMenuEventsComponent', () => {
  it('should announce the menu of a file that is one of several selected, with every selected path', () => {
    const { a, app, b, selectedDoms } = createApp();
    selectedDoms.add(b).add(a);
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [a.selfEl.createSpan(), a.selfEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(SYNC_FILES_MENU_EVENT_NAME, menu, ['b.md', 'a.md']);
  });

  it('should skip a selected item with no file', () => {
    const { a, app, b, selectedDoms } = createApp();
    selectedDoms.add(a).add(b).add({ selfEl: createDiv() });
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [a.selfEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(SYNC_FILES_MENU_EVENT_NAME, menu, ['a.md', 'b.md']);
  });

  it('should leave a single file\'s menu to file-menu', () => {
    const { a, app, selectedDoms } = createApp();
    selectedDoms.add(a);

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [a.selfEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave the menu of a file outside a multiple selection alone', () => {
    const { a, app, b, c, selectedDoms } = createApp();
    selectedDoms.add(a).add(b);

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [c.selfEl, window])).toBe(false);
  });

  it('should leave a menu shown on no file item alone', () => {
    const { app } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [createDiv(), window])).toBe(false);
  });

  it('should pass over a sync view that has no tree yet', () => {
    const { a, app, b, selectedDoms } = createApp({ shouldAddViewWithoutTree: true });
    selectedDoms.add(a).add(b);

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [a.selfEl, window])).toBe(true);
  });
});

interface CreateAppOptions {
  readonly shouldAddViewWithoutTree?: boolean;
}

interface TestApp {
  readonly a: TestItem;
  readonly app: AppOriginal;
  readonly b: TestItem;
  readonly c: TestItem;
  readonly selectedDoms: Set<TestItem>;
}

function createApp(options: CreateAppOptions = {}): TestApp {
  const a = createItem('a.md');
  const b = createItem('b.md');
  const c = createItem('c.md');
  const selectedDoms = new Set<TestItem>();
  const leaves = [{ view: { fileItems: { 'a.md': a, 'b.md': b, 'c.md': c }, tree: { selectedDoms } } }];
  if (options.shouldAddViewWithoutTree) {
    leaves.unshift(castTo<typeof leaves[number]>({ view: {} }));
  }
  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (type: string): unknown[] => type === 'sync' ? leaves : [],
      trigger: vi.fn()
    }
  });
  return { a, app, b, c, selectedDoms };
}

function createItem(path: string): TestItem {
  return { selfEl: createDiv(), sFile: { path } };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new SyncFilesMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
