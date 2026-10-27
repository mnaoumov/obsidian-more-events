import type {
  App,
  Menu
} from 'obsidian';

import { Component } from 'obsidian';

import type { DeferredMenuAnnouncer } from '../menu-patch-component.ts';

import { VAULT_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The class of the vault name's row at the bottom of the left sidebar, the element whose listener builds the menu.
 */
const VAULT_SWITCHER_CLASS = 'workspace-drawer-vault-switcher';

/**
 * Parameters for the {@link VaultMenuEventsComponent} constructor.
 */
export interface VaultMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of the vault name at the bottom of the left sidebar.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** On the desktop app, the
 * left sidedock builds a vault profile once (`app.js:75653` in 1.15.0), whose `.workspace-drawer-vault-switcher`
 * row binds one `contextmenu` listener (`:75716`) that fills `Menu.forEvent(evt)` with **Show in system explorer**
 * and **Copy path**. `Menu.forEvent` shows the menu on a later task, so it is recognized by that row being on the
 * event's recorded path.
 *
 * The profile object is kept by nobody, so the row is found by its class inside the left split. The row's `click`
 * listener shows the vault switcher through `Menu.forEvent` too, but only `contextmenu` paths are recorded, so that
 * dropdown never reaches this announcer.
 */
export class VaultMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: VaultMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the vault name's menu.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on the vault name.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const leftSplitEl = this.app.workspace.leftSplit.containerEl;
    const isVaultSwitcher = eventPath.some((eventTarget) => eventTarget instanceof HTMLElement && eventTarget.hasClass(VAULT_SWITCHER_CLASS) && leftSplitEl.contains(eventTarget));
    if (!isVaultSwitcher) {
      return false;
    }

    this.app.workspace.trigger(VAULT_MENU_EVENT_NAME, menu);
    return true;
  }
}
