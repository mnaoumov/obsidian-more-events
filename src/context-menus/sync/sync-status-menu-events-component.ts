import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { SyncStatus } from '../../api/more-events-api.ts';
import type {
  DeferredMenuAnnouncer,
  PositionedMenuAnnouncer
} from '../menu-patch-component.ts';

import { SYNC_STATUS_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The id of the core **Sync** plugin.
 */
const SYNC_PLUGIN_ID = 'sync';

/**
 * Parameters for the {@link SyncStatusMenuEventsComponent} constructor.
 */
export interface SyncStatusMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The app, as far as reaching the core **Sync** plugin needs it.
 */
interface AppWithInternalPlugins {
  readonly internalPlugins: InternalPlugins;
}

/**
 * The core plugin manager, as far as reaching the **Sync** plugin needs it.
 */
interface InternalPlugins {
  readonly getEnabledPluginById: (id: string) => null | SyncPluginInstance;
}

/**
 * A menu, as far as telling the status menu apart needs it.
 */
interface MenuWithParentEl {
  /**
   * The element `setParentElement` anchored the menu to, if any.
   */
  readonly parentEl?: HTMLElement | null;
}

/**
 * The core **Sync** plugin's instance, as far as this menu needs it.
 */
interface SyncPluginInstance {
  /**
   * The vault's sync state (`app.js:171065` in 1.15.0).
   */
  readonly getStatus: () => SyncStatus;

  /**
   * The status icon, built once the plugin is enabled (`app.js:170394`, `:170408` in 1.15.0).
   */
  readonly statusIconEl: HTMLElement | null;
}

/**
 * Publishes the menu of the core **Sync** plugin's status icon.
 *
 * **That menu fires nothing.** On desktop the plugin adds a status bar item holding the icon, and binds `click` and
 * `contextmenu` listeners on the item; on mobile it adds a header button to the right sidebar, with the same two
 * listeners (`app.js:170392`-`:170415` in 1.15.0). Both call `openStatusIconMenu` (`:170630`), which fills
 * `Menu.forEvent(evt)` and anchors it with `setParentElement(this.statusIconEl)`. `Menu.forEvent` shows the menu on a
 * later task, so a right-click reaches the {@link DeferredMenuAnnouncer}s and a click, whose path is not recorded,
 * reaches the {@link PositionedMenuAnnouncer}s. Either way the menu is anchored to the icon, which names it.
 *
 * The payload is the plugin's own `getStatus()`, the state the icon shows, not the translated text of the menu's
 * label.
 */
export class SyncStatusMenuEventsComponent extends Component implements DeferredMenuAnnouncer, PositionedMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: SyncStatusMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the status menu opened by a right-click.
   *
   * @param menu - The menu about to be shown.
   * @returns `true` when the menu is anchored to the **Sync** status icon.
   */
  public announceDeferredMenu(menu: Menu): boolean {
    const { parentEl } = castTo<MenuWithParentEl>(menu);
    return !!parentEl && this.announcePositionedMenu(menu, parentEl);
  }

  /**
   * Announces the status menu opened by a click.
   *
   * @param menu - The menu about to be shown.
   * @param parentEl - The element the menu was anchored to.
   * @returns `true` when the menu is anchored to the **Sync** status icon.
   */
  public announcePositionedMenu(menu: Menu, parentEl: HTMLElement): boolean {
    const sync = castTo<AppWithInternalPlugins>(this.app).internalPlugins.getEnabledPluginById(SYNC_PLUGIN_ID);
    if (!sync?.statusIconEl || sync.statusIconEl !== parentEl) {
      return false;
    }

    this.app.workspace.trigger(SYNC_STATUS_MENU_EVENT_NAME, menu, sync.getStatus());
    return true;
  }
}
