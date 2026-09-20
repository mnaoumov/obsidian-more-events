import type {
  InternalPlugin,
  InternalPluginInstance
} from '@obsidian-typings/obsidian-public-latest';
import type { EventRef } from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';

import {
  CORE_PLUGIN_DISABLED_EVENT_NAME,
  CORE_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';
import { InternalPluginPatchComponent } from './patches/internal-plugin-patch-component.ts';
import { PluginEventsComponentBase } from './plugin-events-component-base.ts';

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
 * why the settings tab answers it by redrawing the whole list. The diff that makes it per-plugin lives in
 * {@link PluginEventsComponentBase}, which the community-plugin half shares.
 *
 * **Who did it is the one thing the diff cannot work out, so it is patched for.**
 * {@link InternalPluginPatchComponent} intercepts `enable` / `disable` on the shared prototype and keeps
 * the `isEnabledByUser` / `isDisabledByUser` argument Obsidian drops when it triggers `change`, which is
 * what puts `isUserInitiated` in both payloads. That distinction is not academic: the patch this plugin
 * was built to replace — Backlink Cache's and Backlink Full Path's `onUserEnable` patch — is a patch of
 * the USER-initiated hook specifically, so without the flag these events are a near-replacement rather
 * than a replacement.
 */
export class CorePluginEventsComponent extends PluginEventsComponentBase {
  /**
   * The ids of the core plugins enabled right now.
   *
   * @returns The enabled core plugin ids.
   */
  public getEnabledCorePluginIds(): string[] {
    return this.getEnabledPluginIds();
  }

  /**
   * Whether the named core plugin is enabled right now.
   *
   * @param corePluginId - The core plugin's id.
   * @returns `true` when it is enabled.
   */
  public isCorePluginEnabled(corePluginId: string): boolean {
    return this.isPluginEnabled(corePluginId);
  }

  /**
   * Adds the patch that keeps the argument `InternalPlugin.enable` / `.disable` is given.
   */
  protected override installUserInitiationPatch(): void {
    this.addChild(
      new InternalPluginPatchComponent({
        app: this.app,
        userInitiationRecorder: this
      })
    );
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
  protected override readEnabledPlugins(): Map<string, string> {
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

  /**
   * Subscribes to Obsidian's `change` signal on `app.internalPlugins`.
   *
   * @param handleChange - The callback to run on each signal.
   * @returns The event reference.
   */
  protected override subscribeToChanges(handleChange: () => void): EventRef {
    return this.app.internalPlugins.on('change', handleChange);
  }

  /**
   * Publishes one core plugin having been disabled.
   *
   * @param corePluginId - The core plugin's id.
   * @param corePluginName - The core plugin's display name.
   * @param isUserInitiated - Whether Obsidian was told the transition came from the user.
   */
  protected override triggerDisabled(corePluginId: string, corePluginName: string, isUserInitiated: boolean): void {
    this.app.workspace.trigger(CORE_PLUGIN_DISABLED_EVENT_NAME, {
      corePluginId,
      corePluginName,
      isUserInitiated
    });
  }

  /**
   * Publishes one core plugin having been enabled.
   *
   * @param corePluginId - The core plugin's id.
   * @param corePluginName - The core plugin's display name.
   * @param isUserInitiated - Whether Obsidian was told the transition came from the user.
   */
  protected override triggerEnabled(corePluginId: string, corePluginName: string, isUserInitiated: boolean): void {
    this.app.workspace.trigger(CORE_PLUGIN_ENABLED_EVENT_NAME, {
      corePluginId,
      corePluginName,
      isUserInitiated
    });
  }
}
