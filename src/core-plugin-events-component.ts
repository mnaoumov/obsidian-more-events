import type {
  InternalPlugin,
  InternalPluginInstance
} from '@obsidian-typings/obsidian-public-latest';
import type { App } from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';

import {
  CORE_PLUGIN_DISABLED_EVENT_NAME,
  CORE_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';

/**
 * Parameters for the {@link CorePluginEventsComponent} constructor.
 */
export interface CorePluginEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * A core plugin read generically — the shape every entry of `app.internalPlugins.plugins` has, with the
 * per-plugin instance type widened away because this component never looks inside one.
 */
type CorePlugin = InternalPlugin<InternalPluginInstance<unknown>>;

/**
 * Turns Obsidian's own coarse core-plugin signal into the two named events this plugin publishes.
 *
 * Obsidian already triggers `change` on `app.internalPlugins` at the end of both `InternalPlugin.enable()`
 * and `InternalPlugin.disable()` — its own **Core plugins** settings tab subscribes to it. What it does
 * not do is say WHICH plugin changed or in which direction: the event is a signal to re-read, which is
 * why the settings tab answers it by redrawing the whole list. So this component keeps the last known
 * enabled set and diffs against it, which is both what makes the events per-plugin and what makes them
 * correct when a single `change` follows more than one transition.
 *
 * NOTHING IS PATCHED. The two seams that would carry more information — `InternalPlugin.prototype.enable`
 * / `disable`, for the `isEnabledByUser` argument, and the per-instance `onUserEnable` / `onUserDisable` —
 * are both monkey-patches on a prototype every plugin in the vault shares, and a vault with two plugins
 * patching them has two patches. That is the whole reason this plugin exists rather than the patch living
 * in a library, so installing one here would defeat it.
 *
 * Consequently the events do not distinguish a user toggling a core plugin from anything else enabling
 * one, because `change` does not. Neither consumer needs the distinction: what they do when a core plugin
 * comes back does not depend on who brought it back.
 */
export class CorePluginEventsComponent extends ComponentEx {
  private readonly app: App;
  private enabledCorePluginNamesById = new Map<string, string>();

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CorePluginEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * The ids of the core plugins enabled right now.
   *
   * @returns The enabled core plugin ids.
   */
  public getEnabledCorePluginIds(): string[] {
    return [...this.enabledCorePluginNamesById.keys()];
  }

  /**
   * Whether the named core plugin is enabled right now.
   *
   * @param corePluginId - The core plugin's id.
   * @returns `true` when it is enabled.
   */
  public isCorePluginEnabled(corePluginId: string): boolean {
    return this.enabledCorePluginNamesById.has(corePluginId);
  }

  /**
   * Takes the baseline snapshot and subscribes to Obsidian's `change` signal.
   *
   * The snapshot is taken BEFORE subscribing, so the first `change` is diffed against the state as it was
   * when this plugin loaded rather than against an empty set — which would announce every already-enabled
   * core plugin as newly enabled.
   */
  public override onload(): void {
    super.onload();
    this.enabledCorePluginNamesById = this.readEnabledCorePlugins();
    this.registerEvent(this.app.internalPlugins.on('change', this.handleInternalPluginsChange.bind(this)));
  }

  private handleInternalPluginsChange(): void {
    const previousEnabledCorePluginNamesById = this.enabledCorePluginNamesById;
    const currentEnabledCorePluginNamesById = this.readEnabledCorePlugins();
    this.enabledCorePluginNamesById = currentEnabledCorePluginNamesById;

    for (const [corePluginId, corePluginName] of previousEnabledCorePluginNamesById) {
      if (!currentEnabledCorePluginNamesById.has(corePluginId)) {
        this.app.workspace.trigger(CORE_PLUGIN_DISABLED_EVENT_NAME, {
          corePluginId,
          corePluginName
        });
      }
    }

    for (const [corePluginId, corePluginName] of currentEnabledCorePluginNamesById) {
      if (!previousEnabledCorePluginNamesById.has(corePluginId)) {
        this.app.workspace.trigger(CORE_PLUGIN_ENABLED_EVENT_NAME, {
          corePluginId,
          corePluginName
        });
      }
    }
  }

  /**
   * Reads the enabled core plugins straight from Obsidian, id to display name.
   *
   * `app.internalPlugins.plugins` rather than `getEnabledPlugins()`: the record is keyed by the id, which
   * is the half of the payload a caller is most likely to match on, and reading it here keeps the id and
   * the name coming from one place.
   *
   * @returns The display name of every enabled core plugin, keyed by its id.
   */
  private readEnabledCorePlugins(): Map<string, string> {
    const enabledCorePluginNamesById = new Map<string, string>();

    /*
     * `InternalPluginNamePluginsMapping` is a mapped type with one concrete plugin type per known id and no
     * index signature, so `Object.entries` over it infers `unknown` values. Widening to the base shape is
     * what the iteration needs and is also honest about what this loop reads: `enabled` and the instance's
     * `name`, which every entry has.
     */
    const corePluginsById = castTo<Record<string, CorePlugin>>(this.app.internalPlugins.plugins);

    for (const [corePluginId, corePlugin] of Object.entries(corePluginsById)) {
      if (corePlugin.enabled) {
        enabledCorePluginNamesById.set(corePluginId, corePlugin.instance.name);
      }
    }

    return enabledCorePluginNamesById;
  }
}
