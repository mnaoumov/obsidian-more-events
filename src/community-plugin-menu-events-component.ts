import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type {
  DeferredMenuAnnouncer,
  PositionedMenuAnnouncer
} from './patches/menu-patch-component.ts';

import { COMMUNITY_PLUGIN_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The id of the **Community plugins** settings tab (`app.js:223879`).
 */
const COMMUNITY_PLUGINS_SETTING_TAB_ID = 'community-plugins';

/**
 * The rows the tab's delegated `contextmenu` listener answers for (`app.js:223890`).
 */
const COMMUNITY_PLUGIN_ROW_SELECTOR = '.setting-item[data-plugin-id]';

/**
 * Parameters for the {@link CommunityPluginMenuEventsComponent} constructor.
 */
export interface CommunityPluginMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The Settings modal, as far as finding its **Community plugins** tab needs it.
 */
interface AppSetting {
  /**
   * Obsidian's own settings tabs, built when the modal is (`app.js:226609`).
   */
  readonly settingTabs: readonly SettingTabEntry[];
}

/**
 * The app, as far as telling a community plugin's row menu apart needs it.
 */
interface AppWithSetting {
  readonly plugins: CommunityPlugins;
  readonly setting?: AppSetting;
}

/**
 * The community plugin manager, as far as knowing which plugins are installed needs it.
 */
interface CommunityPlugins {
  readonly manifests: Readonly<Record<string, unknown>>;
}

/**
 * One settings tab.
 */
interface SettingTabEntry {
  readonly containerEl: HTMLElement;
  readonly id: string;
}

/**
 * Publishes the context-menu event of an installed community plugin's row in **Settings -> Community plugins**.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** The tab binds one
 * delegated `contextmenu` listener on its `containerEl` for `.setting-item[data-plugin-id]` (`app.js:223888`),
 * which fills `Menu.forEvent(evt)` through `buildPluginActionsMenu` (`:223893`, `:224540`) for a plugin whose
 * manifest is known. `Menu.forEvent` shows the menu on a later task, so it is recognized by the tab's
 * `containerEl` and one of its plugin rows being on the event's recorded path, and the plugin by the row's
 * `data-plugin-id`, which is what Obsidian reads too.
 *
 * **The row's More options button opens the same menu, and is announced through {@link PositionedMenuAnnouncer}.**
 * Its `click` listener builds a `new Menu()` through the same `buildPluginActionsMenu` and shows it with
 * `setParentElement(extraSettingsEl).showAtPosition(...)` and no event (`app.js:174684` in 1.15.0), so it is
 * recognized by that button sitting in one of the tab's plugin rows.
 */
export class CommunityPluginMenuEventsComponent extends Component implements DeferredMenuAnnouncer, PositionedMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CommunityPluginMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a community plugin's row.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on an installed community plugin's row in its settings tab.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    return this.announceRowMenu(menu, (tabEl, rowEls) => eventPath.includes(tabEl) ? rowEls.find((el) => eventPath.includes(el)) : undefined);
  }

  /**
   * Announces the menu of a community plugin's **More options** button.
   *
   * @param menu - The menu about to be shown.
   * @param parentEl - The element the menu was anchored to.
   * @returns `true` when the menu was anchored to a button in an installed community plugin's row in its settings tab.
   */
  public announcePositionedMenu(menu: Menu, parentEl: HTMLElement): boolean {
    return this.announceRowMenu(menu, (_tabEl, rowEls) => rowEls.find((el) => el.contains(parentEl)));
  }

  private announceRowMenu(menu: Menu, findRowEl: (tabEl: HTMLElement, rowEls: HTMLElement[]) => HTMLElement | undefined): boolean {
    const app = castTo<AppWithSetting>(this.app);
    const tab = app.setting?.settingTabs.find((settingTab) => settingTab.id === COMMUNITY_PLUGINS_SETTING_TAB_ID);
    if (!tab) {
      return false;
    }

    const rowEl = findRowEl(tab.containerEl, [...tab.containerEl.querySelectorAll<HTMLElement>(COMMUNITY_PLUGIN_ROW_SELECTOR)]);
    const communityPluginId = rowEl?.dataset['pluginId'];
    if (!communityPluginId || !Object.hasOwn(app.plugins.manifests, communityPluginId)) {
      return false;
    }

    this.app.workspace.trigger(COMMUNITY_PLUGIN_MENU_EVENT_NAME, menu, communityPluginId);
    return true;
  }
}
