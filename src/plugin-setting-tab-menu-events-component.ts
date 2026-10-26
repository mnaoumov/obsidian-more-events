import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import {
  COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
  CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME
} from './more-events-api.ts';

/**
 * Parameters for the {@link PluginSettingTabMenuEventsComponent} constructor.
 */
export interface PluginSettingTabMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The Settings modal, as far as finding its plugin tabs needs it.
 */
interface AppSetting {
  /**
   * The settings tabs of core and community plugins, listed under the sidebar's plugin sections.
   */
  readonly pluginTabs: readonly PluginSettingTabEntry[];
}

/**
 * The app, as far as telling a plugin settings tab's menu apart needs it.
 */
interface AppWithSetting {
  readonly internalPlugins: CorePlugins;
  readonly setting?: AppSetting;
}

/**
 * The core plugin manager, as far as telling a core plugin's tab from a community plugin's needs it.
 */
interface CorePlugins {
  readonly plugins: Readonly<Record<string, unknown>>;
}

/**
 * One plugin settings tab.
 */
interface PluginSettingTabEntry {
  /**
   * The plugin's id: a core plugin's or a community plugin's (`app.js:171529`, `:171496`).
   */
  readonly id: string;

  /**
   * The tab's item in the Settings sidebar, created when the tab is added (`app.js:226974`).
   */
  readonly navEl?: HTMLElement;

  /**
   * The plugin the tab belongs to: a core plugin's entry of `app.internalPlugins.plugins`, or a community
   * plugin's instance.
   */
  readonly plugin: unknown;
}

/**
 * Publishes the context-menu events of a core or community plugin's tab in the Settings sidebar.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** The Settings modal
 * binds one `contextmenu` listener on a plugin tab's `navEl` when the tab is added (`app.js:227004`), which
 * fills `Menu.forEvent(evt)` with **Reveal in plugin list**. `Menu.forEvent` shows the menu on a later task, so
 * it is recognized by a plugin tab's `navEl` being on the event's recorded path.
 *
 * A core plugin's tab holds that plugin's entry of `app.internalPlugins.plugins` (`:171527`), and a community
 * plugin's tab holds the plugin instance (`:171494`), which is how the two events are told apart; Obsidian
 * itself asks the tab's class (`:227006`), which is not exported.
 */
export class PluginSettingTabMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PluginSettingTabMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a plugin settings tab.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a plugin's tab in the Settings sidebar.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const app = castTo<AppWithSetting>(this.app);
    const pluginTab = app.setting?.pluginTabs.find((tab) => !!tab.navEl && eventPath.includes(tab.navEl));
    if (!pluginTab) {
      return false;
    }

    const isCorePluginTab = app.internalPlugins.plugins[pluginTab.id] === pluginTab.plugin;
    this.app.workspace.trigger(
      isCorePluginTab ? CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME : COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
      menu,
      pluginTab.id
    );
    return true;
  }
}
