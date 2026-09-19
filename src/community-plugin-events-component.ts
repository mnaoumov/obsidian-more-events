import type { EventRef } from 'obsidian';

import {
  COMMUNITY_PLUGIN_DISABLED_EVENT_NAME,
  COMMUNITY_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';
import { PluginEventsComponentBase } from './plugin-events-component-base.ts';

/**
 * Turns Obsidian's own coarse community-plugin signal into the two named events this plugin publishes.
 *
 * The community-plugin manager's signal is strictly poorer than the core one. `app.plugins.didChange` is
 * `debounce(() => this.trigger('changed'), 0)`, fired from enabling, disabling, unloading, the manifest
 * load and the uninstall path alike, and it **carries no payload at all** — not the plugin, not an id, not
 * a direction. Even the name is different: `changed`, past tense, where the core manager's is `change`. So
 * the diff in {@link PluginEventsComponentBase} is the whole of the answer, and the `0` ms debounce makes
 * it load-bearing rather than defensive: several transitions really do collapse into one signal, and the
 * events then arrive as a batch.
 *
 * **Enabled here means LOADED, and that is a decision rather than a shorthand.** The obvious-looking source
 * is `app.plugins.enabledPlugins`, a `Set<string>` — but that set is the persisted **config**, what the user
 * has ticked, and `obsidian-typings` warns in its own remark that its ids *"aren't guaranteed to be either
 * active (in `app.plugins.plugins`) or installed (in `app.plugins.manifests`)"*. Measured in the unminified
 * `app.js`, the divergence is not hypothetical: switching **Community plugins** off in Settings calls
 * `setEnable(false)`, which `disablePlugin`s every entry of `app.plugins.plugins` and never touches
 * `enabledPlugins`. Reading the set would announce NOTHING while every consumer's dependency was unloaded
 * underneath it, and a missed event is the worst failure an event bus has. Starting in restricted mode
 * leaves the same gap the other way round.
 *
 * So this reads `app.plugins.plugins` — *"Mapping of plugin ID to active plugin instance"*, and what
 * `app.plugins.getPlugin` itself answers from. It is also the exact analogue of what the core half reads,
 * since `InternalPlugin.enabled` is a running state and not a config flag, which keeps the two pairs of
 * events meaning the same thing.
 */
export class CommunityPluginEventsComponent extends PluginEventsComponentBase {
  /**
   * The ids of the community plugins that are loaded right now.
   *
   * @returns The enabled community plugin ids.
   */
  public getEnabledCommunityPluginIds(): string[] {
    return this.getEnabledPluginIds();
  }

  /**
   * Whether the named community plugin is loaded right now.
   *
   * @param communityPluginId - The community plugin's id.
   * @returns `true` when it is enabled.
   */
  public isCommunityPluginEnabled(communityPluginId: string): boolean {
    return this.isPluginEnabled(communityPluginId);
  }

  /**
   * Reads the loaded community plugins straight from Obsidian, id to display name.
   *
   * The name comes from each instance's OWN `manifest`, not from `app.plugins.manifests[id]`: the manifests
   * record is re-read from disk whenever `loadManifests()` runs, so after an update it can already describe
   * a version that is not the one running. The instance carries the manifest it was actually constructed
   * with, which is the honest answer for a plugin that is loaded.
   *
   * @returns The display name of every loaded community plugin, keyed by its id.
   */
  protected override readEnabledPlugins(): Map<string, string> {
    const enabledCommunityPluginNamesById = new Map<string, string>();

    for (const [communityPluginId, communityPlugin] of Object.entries(this.app.plugins.plugins)) {
      enabledCommunityPluginNamesById.set(communityPluginId, communityPlugin.manifest.name);
    }

    return enabledCommunityPluginNamesById;
  }

  /**
   * Subscribes to Obsidian's `changed` signal on `app.plugins`.
   *
   * @param handleChange - The callback to run on each signal.
   * @returns The event reference.
   */
  protected override subscribeToChanges(handleChange: () => void): EventRef {
    return this.app.plugins.on('changed', handleChange);
  }

  /**
   * Publishes one community plugin having been disabled.
   *
   * @param communityPluginId - The community plugin's id.
   * @param communityPluginName - The community plugin's display name.
   */
  protected override triggerDisabled(communityPluginId: string, communityPluginName: string): void {
    this.app.workspace.trigger(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, {
      communityPluginId,
      communityPluginName
    });
  }

  /**
   * Publishes one community plugin having been enabled.
   *
   * @param communityPluginId - The community plugin's id.
   * @param communityPluginName - The community plugin's display name.
   */
  protected override triggerEnabled(communityPluginId: string, communityPluginName: string): void {
    this.app.workspace.trigger(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, {
      communityPluginId,
      communityPluginName
    });
  }
}
