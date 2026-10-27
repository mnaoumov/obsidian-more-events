import type {
  App as AppOriginal,
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

import { BASES_COLUMN_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { BasesColumnMenuEventsComponent } from './bases-column-menu-events-component.ts';

describe('BasesColumnMenuEventsComponent', () => {
  it('should announce the menu of a column header, with the column\'s property and the base\'s view', () => {
    const { app, headerCellEl, headerEl, leaf } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const nameEl = headerCellEl.createDiv();

    expect(isAnnounced(app, menu, [nameEl, headerCellEl, headerEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(BASES_COLUMN_MENU_EVENT_NAME, menu, leaf, {
      propertyId: 'note.status',
      viewName: 'Table'
    });
  });

  it('should leave a body cell\'s menu alone', () => {
    const { app, bodyCellEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [bodyCellEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu shown on no cell alone', () => {
    const { app, headerEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [headerEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a header cell of no open Bases table alone', () => {
    const { app } = createApp();
    const strayHeaderEl = createDiv({ cls: 'bases-thead' });
    const strayCellEl = strayHeaderEl.createDiv({ cls: 'bases-td' });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [strayCellEl, strayHeaderEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

/**
 * A Bases table cell, as far as the component reads one.
 */
interface TableCellLike {
  // eslint-disable-next-line unicorn/name-replacements -- Obsidian's own property name, which the component reads.
  readonly prop: string;
}

interface TestApp {
  readonly app: AppOriginal;
  readonly bodyCellEl: HTMLElement;
  readonly headerCellEl: HTMLElement;
  readonly headerEl: HTMLElement;
  readonly leaf: WorkspaceLeaf;
}

function createApp(): TestApp {
  const headerEl = createDiv({ cls: 'bases-thead' });
  const headerCellEl = headerEl.createDiv({ cls: 'bases-td' });
  const bodyCellEl = createDiv({ cls: 'bases-td' });
  const headerCell: TableCellLike = {
    // eslint-disable-next-line unicorn/name-replacements -- Obsidian's own property name, which the component reads.
    prop: 'note.status'
  };

  const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
  // A base showing a view that is not a table: its view has no `getCellFromDom`.
  const cardsLeaf = castTo<WorkspaceLeaf>({ view: { controller: { view: {}, viewName: 'Cards' } } });
  const leaf = castTo<WorkspaceLeaf>({
    view: {
      controller: {
        view: {
          getCellFromDom: (el: HTMLElement): null | TableCellLike => el === headerCellEl ? headerCell : null
        },
        viewName: 'Table'
      }
    }
  });

  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): WorkspaceLeaf[] => viewType === 'bases' ? [deferredLeaf, cardsLeaf, leaf] : [],
      trigger: vi.fn()
    }
  });
  return { app, bodyCellEl, headerCellEl, headerEl, leaf };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new BasesColumnMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
