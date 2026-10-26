import type {
  App as AppOriginal,
  BasesEntryGroup,
  Menu as MenuOriginal,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { BasesKanbanColumnMenuEventsComponent } from './bases-kanban-column-menu-events-component.ts';
import { BASES_KANBAN_COLUMN_MENU_EVENT_NAME } from './more-events-api.ts';

describe('BasesKanbanColumnMenuEventsComponent', () => {
  it('should announce the menu of a column, with its group and the base\'s view', () => {
    const { app, columnEl, leaf } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const innerEl = columnEl.createDiv();

    expect(isAnnounced(app, menu, [innerEl, columnEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(BASES_KANBAN_COLUMN_MENU_EVENT_NAME, menu, leaf, {
      groupKey: 'draft',
      viewName: 'Board'
    });
  });

  it('should announce the column of the entries with no value with a null group key', () => {
    const { app, leaf, noValueColumnEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [noValueColumnEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(BASES_KANBAN_COLUMN_MENU_EVENT_NAME, menu, leaf, {
      groupKey: null,
      viewName: 'Board'
    });
  });

  it.each(['bases-kanban-card', 'bases-kanban-column-create', 'text-icon-button'])('should leave a right-click on a %s in a column alone', (className) => {
    const { app, columnEl } = createApp();
    const refusedEl = columnEl.createDiv({ cls: className });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [refusedEl.createDiv(), refusedEl, columnEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu shown on no column alone', () => {
    const { app } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [createDiv(), window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a column of no open board view alone', () => {
    const { app } = createApp();
    const strayColumnEl = createDiv({ cls: 'bases-kanban-column' });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [strayColumnEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a column not rendered yet alone', () => {
    const { app, unrenderedColumnEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [unrenderedColumnEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly columnEl: HTMLElement;
  readonly leaf: WorkspaceLeaf;
  readonly noValueColumnEl: HTMLElement;
  readonly unrenderedColumnEl: HTMLElement;
}

function createApp(): TestApp {
  const columnEl = createDiv({ cls: 'bases-kanban-column' });
  const noValueColumnEl = createDiv({ cls: 'bases-kanban-column' });
  const unrenderedColumnEl = createDiv({ cls: 'bases-kanban-column' });
  const draftGroup = castTo<BasesEntryGroup>({ hasKey: () => true, key: { toString: (): string => 'draft' } });
  const noValueGroup = castTo<BasesEntryGroup>({ hasKey: () => false, key: { toString: (): string => 'null' } });

  const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
  // A base showing a view that is not a board view: its view has no `columns`.
  const tableLeaf = castTo<WorkspaceLeaf>({ view: { controller: { view: {}, viewName: 'Table' } } });
  const leaf = castTo<WorkspaceLeaf>({
    view: {
      controller: {
        view: {
          columns: [
            { containerEl: columnEl, group: draftGroup },
            { containerEl: noValueColumnEl, group: noValueGroup },
            { containerEl: unrenderedColumnEl, group: null }
          ]
        },
        viewName: 'Board'
      }
    }
  });

  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): WorkspaceLeaf[] => viewType === 'bases' ? [deferredLeaf, tableLeaf, leaf] : [],
      trigger: vi.fn()
    }
  });
  return { app, columnEl, leaf, noValueColumnEl, unrenderedColumnEl };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new BasesKanbanColumnMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
