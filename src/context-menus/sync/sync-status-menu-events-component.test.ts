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

import { SYNC_STATUS_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { SyncStatusMenuEventsComponent } from './sync-status-menu-events-component.ts';

describe('SyncStatusMenuEventsComponent', () => {
  it('should announce a menu clicked open from the status icon, with the plugin\'s status', () => {
    const { app, statusIconEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new SyncStatusMenuEventsComponent({ app }).announcePositionedMenu(menu, statusIconEl)).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(SYNC_STATUS_MENU_EVENT_NAME, menu, 'synced');
  });

  it('should announce a menu right-clicked open from the status icon, by its anchor', () => {
    const { app, statusIconEl } = createApp();
    const menu = createAnchoredMenu(statusIconEl);

    expect(new SyncStatusMenuEventsComponent({ app }).announceDeferredMenu(menu)).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(SYNC_STATUS_MENU_EVENT_NAME, menu, 'synced');
  });

  it('should leave a deferred menu anchored to nothing alone', () => {
    const { app } = createApp();

    expect(new SyncStatusMenuEventsComponent({ app }).announceDeferredMenu(createAnchoredMenu(null))).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu anchored elsewhere alone', () => {
    const { app } = createApp();
    const menu = createAnchoredMenu(createDiv());

    const component = new SyncStatusMenuEventsComponent({ app });
    expect(component.announceDeferredMenu(menu)).toBe(false);
    expect(component.announcePositionedMenu(menu, createDiv())).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave every menu alone while Sync is disabled or has no icon yet', () => {
    const disabledApp = castTo<AppOriginal>({ internalPlugins: { getEnabledPluginById: () => null }, workspace: { trigger: vi.fn() } });
    expect(new SyncStatusMenuEventsComponent({ app: disabledApp }).announcePositionedMenu(Menu.create2__().asOriginalType2__(), createDiv())).toBe(false);

    const appWithoutIcon = castTo<AppOriginal>({
      internalPlugins: { getEnabledPluginById: (): TestSync => ({ getStatus: (): string => 'uninitialized', statusIconEl: null }) },
      workspace: { trigger: vi.fn() }
    });
    expect(new SyncStatusMenuEventsComponent({ app: appWithoutIcon }).announcePositionedMenu(Menu.create2__().asOriginalType2__(), createDiv())).toBe(false);
  });
});

interface TestAnchoredMenu {
  readonly parentEl: HTMLElement | null;
}

interface TestApp {
  readonly app: AppOriginal;
  readonly statusIconEl: HTMLElement;
}

interface TestSync {
  readonly getStatus: () => string;
  readonly statusIconEl: HTMLElement | null;
}

function createAnchoredMenu(parentEl: HTMLElement | null): MenuOriginal {
  const menu = Menu.create2__().asOriginalType2__();
  Object.assign(castTo<TestAnchoredMenu>(menu), { parentEl });
  return menu;
}

function createApp(): TestApp {
  const statusIconEl = createSpan();
  const sync: TestSync = { getStatus: (): string => 'synced', statusIconEl };
  const app = castTo<AppOriginal>({
    internalPlugins: {
      getEnabledPluginById: (id: string): null | TestSync => id === 'sync' ? sync : null
    },
    workspace: { trigger: vi.fn() }
  });
  return { app, statusIconEl };
}
