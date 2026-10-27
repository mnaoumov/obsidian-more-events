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

import { PROPERTY_VALUE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { PropertyValueMenuEventsComponent } from './property-value-menu-events-component.ts';

describe('PropertyValueMenuEventsComponent', () => {
  it('should announce the menu of a list value pill, with the key as written and the value at its index', () => {
    const { app, markdownLeaf, tagsPillEls } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const pillEl = tagsPillEls[1];
    if (!pillEl) {
      throw new Error('No pill');
    }
    const contentEl = pillEl.createDiv();

    expect(isAnnounced(app, menu, [contentEl, pillEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(PROPERTY_VALUE_MENU_EVENT_NAME, menu, markdownLeaf, {
      index: 1,
      key: 'Aliases',
      value: '42'
    });
  });

  it('should announce a pill of a property whose value is not a list, with the pill\'s text', () => {
    const { app, propertiesLeaf, scalarPillEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [scalarPillEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(PROPERTY_VALUE_MENU_EVENT_NAME, menu, propertiesLeaf, {
      index: 0,
      key: 'tags',
      value: 'draft'
    });
  });

  it('should leave a menu shown on no pill alone', () => {
    const { app } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [createDiv(), window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a pill outside every properties editor alone', () => {
    const { app } = createApp();
    const strayPillEl = createDiv({ cls: 'multi-select-pill' });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [strayPillEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly markdownLeaf: WorkspaceLeaf;
  readonly propertiesLeaf: WorkspaceLeaf;
  readonly scalarPillEl: HTMLElement;
  readonly tagsPillEls: HTMLElement[];
}

function createApp(): TestApp {
  const aliasesValueEl = createDiv();
  const multiSelectEl = aliasesValueEl.createDiv();
  const tagsPillEls = [
    multiSelectEl.createDiv({ cls: 'multi-select-pill' }),
    multiSelectEl.createDiv({ cls: 'multi-select-pill' })
  ];
  multiSelectEl.createEl('input');
  const otherValueEl = createDiv();

  const scalarValueEl = createDiv();
  const scalarPillEl = scalarValueEl.createDiv({ cls: 'multi-select-pill', text: 'draft' });

  const markdownLeaf = castTo<WorkspaceLeaf>({
    view: {
      metadataEditor: {
        rendered: [
          { entry: { key: 'status', value: 'done' }, valueEl: otherValueEl },
          { entry: { key: 'Aliases', value: ['first', 42] }, valueEl: aliasesValueEl }
        ]
      }
    }
  });
  const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
  const propertiesLeaf = castTo<WorkspaceLeaf>({
    view: {
      metadataEditor: {
        rendered: [{ entry: { key: 'tags', value: 'draft' }, valueEl: scalarValueEl }]
      }
    }
  });

  const leavesByType: Record<string, WorkspaceLeaf[]> = {
    'file-properties': [propertiesLeaf],
    'markdown': [deferredLeaf, markdownLeaf]
  };
  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): WorkspaceLeaf[] => leavesByType[viewType] ?? [],
      trigger: vi.fn()
    }
  });
  return { app, markdownLeaf, propertiesLeaf, scalarPillEl, tagsPillEls };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new PropertyValueMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
