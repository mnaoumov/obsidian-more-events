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
 * The half of a {@link PluginEventsComponentBase} a patch needs, and nothing else.
 *
 * A patch component is handed this rather than the component itself, so it can record what it intercepted
 * without being able to reach the diff, the snapshot or the events.
 */
export interface UserInitiationRecorder {
  /**
   * Records what Obsidian was told about one plugin's transition.
   *
   * @param pluginId - The plugin's id.
   * @param isUserInitiated - Whether Obsidian was told the transition came from the user.
   */
  readonly recordUserInitiation: (pluginId: string, isUserInitiated: boolean) => void;
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
 * **The one thing a diff cannot recover is who did it**, and for that each subclass installs a patch as a
 * `MonkeyAroundComponent`. Obsidian already knows — it takes an `isEnabledByUser` argument on the core side
 * and an `isUserEnabled` one on the community side, and uses each to decide whether the plugin's own
 * `onUserEnable` hook runs — and then drops the answer when it triggers the signal this plugin listens to.
 * The patch reads that argument as the call goes past, records it against the plugin's id, and
 * {@link PluginEventsComponentBase.handleChange} consumes it when it publishes the matching event.
 *
 * **Patching here is the opposite of self-defeating, and the stance it replaces had the argument
 * backwards.** The hazard `obsidian-dev-utils` names is N plugins each patching one shared prototype, which
 * is why a global patch belongs in a plugin rather than in a library every consumer bundles its own copy
 * of. This plugin existing is what collapses N to 1: one patch, in one place, installed once per vault, so
 * every consumer gets the context and none of them patches anything.
 *
 * **The patch supplements the diff rather than replacing it.** What is patched is the transition, not the
 * signal, so the events stay per-plugin and stay correct when several transitions collapse into one
 * debounced signal — which is what the diff, and only the diff, delivers.
 *
 * **Record-then-consume, because the two signals differ in timing.** The core `change` is triggered
 * synchronously inside `enable` / `disable`, while the community `changed` is debounced and lands on a
 * later task, so a patch can neither hand the flag straight to the handler nor clear it once the
 * intercepted call has returned. It writes into a map, and the diff deletes as it reads. That is sound
 * precisely because every transition passes through a patched method, so the last thing written for a
 * plugin is always the one the next event for it belongs to.
 */
export abstract class PluginEventsComponentBase extends ComponentEx implements UserInitiationRecorder {
  protected readonly app: App;
  private enabledPluginNamesById = new Map<string, string>();
  private readonly userInitiationByPluginId = new Map<string, boolean>();

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
   * Takes the baseline snapshot, installs the patch that recovers who did it, then subscribes to
   * Obsidian's signal.
   *
   * The snapshot is taken BEFORE subscribing, so the first signal is diffed against the state as it was
   * when this plugin loaded rather than against an empty set — which would announce every already-enabled
   * plugin as newly enabled. The patch goes in before the subscription for the same kind of reason: a
   * signal can then never arrive without the thing that explains it already being in place.
   */
  public override onload(): void {
    super.onload();
    this.enabledPluginNamesById = this.readEnabledPlugins();
    this.installUserInitiationPatch();
    this.registerEvent(this.subscribeToChanges(this.handleChange.bind(this)));
  }

  /**
   * Records what Obsidian was told about one plugin's transition.
   *
   * Called by this component's own patch as the intercepted call goes past, and read once by the event
   * that transition produces. Public because the patch is a separate component holding a
   * {@link UserInitiationRecorder}, which is this method and nothing else of this class.
   *
   * @param pluginId - The plugin's id.
   * @param isUserInitiated - Whether Obsidian was told the transition came from the user.
   */
  public recordUserInitiation(pluginId: string, isUserInitiated: boolean): void {
    this.userInitiationByPluginId.set(pluginId, isUserInitiated);
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
   * Adds the child component that patches this manager's transition seam.
   *
   * Each subclass patches a different object, so only it knows what to install; the
   * {@link UserInitiationRecorder} it hands over is this component.
   */
  protected abstract installUserInitiationPatch(): void;

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
   * @param isUserInitiated - Whether Obsidian was told the transition came from the user.
   */
  protected abstract triggerDisabled(pluginId: string, pluginName: string, isUserInitiated: boolean): void;

  /**
   * Publishes one plugin having been enabled.
   *
   * @param pluginId - The plugin's id.
   * @param pluginName - The plugin's display name.
   * @param isUserInitiated - Whether Obsidian was told the transition came from the user.
   */
  protected abstract triggerEnabled(pluginId: string, pluginName: string, isUserInitiated: boolean): void;

  private consumeUserInitiation(pluginId: string): boolean {
    const isUserInitiated = this.userInitiationByPluginId.get(pluginId) ?? false;
    this.userInitiationByPluginId.delete(pluginId);
    return isUserInitiated;
  }

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
        this.triggerDisabled(pluginId, pluginName, this.consumeUserInitiation(pluginId));
      }
    }

    for (const [pluginId, pluginName] of currentEnabledPluginNamesById) {
      if (!previousEnabledPluginNamesById.has(pluginId)) {
        this.triggerEnabled(pluginId, pluginName, this.consumeUserInitiation(pluginId));
      }
    }
  }
}
