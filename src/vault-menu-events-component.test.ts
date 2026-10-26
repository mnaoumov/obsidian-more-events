import type { App as AppOriginal } from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { VAULT_MENU_EVENT_NAME } from './more-events-api.ts';
import { VaultMenuEventsComponent } from './vault-menu-events-component.ts';

describe('VaultMenuEventsComponent', () => {
  it('should announce the menu of the vault name in the left sidebar', () => {
    const { app, leftSplitEl } = createApp();
    const vaultSwitcherEl = leftSplitEl.createDiv('workspace-sidedock-vault-profile').createDiv('workspace-drawer-vault-switcher');
    const nameEl = vaultSwitcherEl.createDiv('workspace-drawer-vault-name');
    const menu = Menu.create2__().asOriginalType2__();

    expect(new VaultMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), [nameEl, vaultSwitcherEl, leftSplitEl, window]))
      .toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(VAULT_MENU_EVENT_NAME, menu);
  });

  it('should leave an element of that class outside the left sidebar alone', () => {
    const { app } = createApp();
    const strayEl = createDiv('workspace-drawer-vault-switcher');

    expect(new VaultMenuEventsComponent({ app }).announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [strayEl, window]))
      .toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu for anything else in the left sidebar alone', () => {
    const { app, leftSplitEl } = createApp();
    const otherEl = leftSplitEl.createDiv('workspace-drawer-vault-actions');

    expect(
      new VaultMenuEventsComponent({ app }).announceDeferredMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'), [
        otherEl,
        leftSplitEl,
        window
      ])
    ).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly leftSplitEl: HTMLElement;
}

function createApp(): TestApp {
  const leftSplitEl = createDiv();
  const app = castTo<AppOriginal>({
    workspace: {
      leftSplit: {
        containerEl: leftSplitEl
      },
      trigger: vi.fn()
    }
  });
  return { app, leftSplitEl };
}
