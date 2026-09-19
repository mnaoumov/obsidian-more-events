import type {
  App,
  EventRef
} from 'obsidian';

import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';

/**
 * Parameters for the {@link PluginEventsComponentBase} constructor.
 */
export interface PluginEventsComponentBaseConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The shape both of this plugin's event sources have, with the parts that differ left abstract.
 *
 * Obsidian has two plugin managers and both answer the same way: a coarse, payload-free signal saying that
 * *something* moved, with no plugin, no direction and nothing to act on. `app.internalPlugins` fires
 * `change`; `app.plugins` fires `changed`. Neither says what a listener needs to know, so this plugin
 * answers both the same way — keep the last known enabled set, and diff against it when the signal arrives.
 *
 * The diff is not a convenience. It is what makes the events per-plugin, and it is what makes them correct
 * when a single signal follows more than one transition — which both managers allow, the community one by
 * construction, since its trigger is debounced.
 *
 * NOTHING IS PATCHED, in either subclass. The seams that would carry more information are all monkey-patches
 * on prototypes every plugin in the vault shares, so a vault with two plugins patching them has two patches.
 * That is the whole reason this plugin exists rather than the patch living in a library, so installing one
 * here would defeat it.
 */
export abstract class PluginEventsComponentBase extends ComponentEx {
  protected readonly app: App;
  private enabledPluginNamesById = new Map<string, string>();

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PluginEventsComponentBaseConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Takes the baseline snapshot and subscribes to Obsidian's signal.
   *
   * The snapshot is taken BEFORE subscribing, so the first signal is diffed against the state as it was
   * when this plugin loaded rather than against an empty set — which would announce every already-enabled
   * plugin as newly enabled.
   */
  public override onload(): void {
    super.onload();
    this.enabledPluginNamesById = this.readEnabledPlugins();
    this.registerEvent(this.subscribeToChanges(this.handleChange.bind(this)));
  }

  /**
   * The ids of the plugins enabled right now.
   *
   * Protected rather than public: each subclass republishes it under a name that says which kind of plugin
   * it answers for, and two names for one read on the published surface would be one too many.
   *
   * @returns The enabled plugin ids.
   */
  protected getEnabledPluginIds(): string[] {
    return [...this.enabledPluginNamesById.keys()];
  }

  /**
   * Whether the named plugin is enabled right now.
   *
   * @param pluginId - The plugin's id.
   * @returns `true` when it is enabled.
   */
  protected isPluginEnabled(pluginId: string): boolean {
    return this.enabledPluginNamesById.has(pluginId);
  }

  /**
   * Reads the enabled plugins straight from Obsidian, id to display name.
   *
   * @returns The display name of every enabled plugin, keyed by its id.
   */
  protected abstract readEnabledPlugins(): Map<string, string>;

  /**
   * Subscribes to the manager's own coarse signal.
   *
   * @param handleChange - The callback to run on each signal.
   * @returns The event reference, which the caller registers for disposal.
   */
  protected abstract subscribeToChanges(handleChange: () => void): EventRef;

  /**
   * Publishes one plugin having been disabled.
   *
   * @param pluginId - The plugin's id.
   * @param pluginName - The plugin's display name.
   */
  protected abstract triggerDisabled(pluginId: string, pluginName: string): void;

  /**
   * Publishes one plugin having been enabled.
   *
   * @param pluginId - The plugin's id.
   * @param pluginName - The plugin's display name.
   */
  protected abstract triggerEnabled(pluginId: string, pluginName: string): void;

  private handleChange(): void {
    const previousEnabledPluginNamesById = this.enabledPluginNamesById;
    const currentEnabledPluginNamesById = this.readEnabledPlugins();
    this.enabledPluginNamesById = currentEnabledPluginNamesById;

    /*
     * Disabled first, then enabled, so a consumer watching a plugin being replaced — an update, which
     * unloads and reloads it — sees it leave before it comes back rather than the other way round.
     */
    for (const [pluginId, pluginName] of previousEnabledPluginNamesById) {
      if (!currentEnabledPluginNamesById.has(pluginId)) {
        this.triggerDisabled(pluginId, pluginName);
      }
    }

    for (const [pluginId, pluginName] of currentEnabledPluginNamesById) {
      if (!previousEnabledPluginNamesById.has(pluginId)) {
        this.triggerEnabled(pluginId, pluginName);
      }
    }
  }
}
