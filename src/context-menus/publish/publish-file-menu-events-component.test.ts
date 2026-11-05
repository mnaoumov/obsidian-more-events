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

import { PUBLISH_FILE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { PublishFileMenuEventsComponent } from './publish-file-menu-events-component.ts';

describe('PublishFileMenuEventsComponent', () => {
  it('should announce the menu of a file row, with a plain copy of its change', () => {
    const { app, newRowEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [newRowEl.createSpan(), newRowEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(PUBLISH_FILE_MENU_EVENT_NAME, menu, { path: 'Notes/New.md', type: 'new' });
  });

  it('should find a row in any of the three file lists', () => {
    const { app, changedRowEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [changedRowEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(PUBLISH_FILE_MENU_EVENT_NAME, menu, { path: 'Changed.md', type: 'changed' });
  });

  it('should leave a menu shown on no file row alone', () => {
    const { app } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [createDiv(), window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave every menu alone while Publish is disabled or its dialog was never opened', () => {
    const menu = Menu.create2__().asOriginalType2__();
    for (const publish of [null, {}, { modal: null }, { modal: {} }]) {
      const app = castTo<AppOriginal>({ internalPlugins: { getEnabledPluginById: () => publish }, workspace: { trigger: vi.fn() } });
      expect(isAnnounced(app, menu, [createDiv(), window])).toBe(false);
    }
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly changedRowEl: HTMLElement;
  readonly newRowEl: HTMLElement;
}

function createApp(): TestApp {
  const newRowEl = createDiv();
  const changedRowEl = createDiv();
  const publish = {
    modal: {
      reviewChangesSection: {
        sectionChanged: { files: { 'Changed.md': { diff: { checked: true, path: 'Changed.md', type: 'changed' }, selfEl: changedRowEl } } },
        sectionNew: { files: { 'Notes/New.md': { diff: { checked: false, path: 'Notes/New.md', type: 'new' }, selfEl: newRowEl } } },
        sectionUnchanged: null
      }
    }
  };
  const app = castTo<AppOriginal>({
    internalPlugins: {
      getEnabledPluginById: (id: string): null | typeof publish => id === 'publish' ? publish : null
    },
    workspace: { trigger: vi.fn() }
  });
  return { app, changedRowEl, newRowEl };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new PublishFileMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
