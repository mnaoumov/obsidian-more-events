/**
 * @file
 *
 * More Events' public surface, as a consumer sees it.
 *
 * Hand-written and self-contained on purpose: it imports from `obsidian` and nothing else, so a plugin that
 * has never heard of `obsidian-dev-utils` can copy this file, or reference it, and depend on More Events
 * with no build-time dependency on this repo at all.
 *
 * Two things live here. The **events** — a `Workspace.on` overload plus the payload they carry — which are
 * what most consumers want, and the **API** reached through the `obsidian-dev-utils` plugin registry, which
 * answers the question the events cannot: what is enabled *right now*, before anything has changed.
 *
 * The event NAMES are a wire contract and are spelled out as literal types rather than exported as
 * constants, because a declaration file has no runtime values to export: a consumer hardcodes the two
 * strings, exactly as `obsidian-dev-utils` tells third parties to hardcode its own broadcast's names. The
 * payload is plain data for the same reason it is in that library — it crosses between plugins that share
 * no code.
 */

import type { EventRef } from 'obsidian';

/**
 * The name of the event triggered after a core plugin has been disabled.
 */
export type CorePluginDisabledEventName = 'more-events:core-plugin-disabled';

/**
 * The name of the event triggered after a core plugin has been enabled.
 */
export type CorePluginEnabledEventName = 'more-events:core-plugin-enabled';

/**
 * Either core-plugin event name.
 */
export type CorePluginEventName = CorePluginDisabledEventName | CorePluginEnabledEventName;

/**
 * The payload both core-plugin events carry.
 *
 * Plain data, and additive only: a new member may be added, none may change meaning or be removed, because
 * a consumer compiled against an older copy of this file is still passed the same object.
 */
export interface CorePluginEventPayload {
  /**
   * The core plugin's id — `backlink`, `canvas`, `file-explorer` and so on. The same string
   * `app.internalPlugins.getPluginById` takes.
   */
  readonly corePluginId: string;

  /**
   * The core plugin's display name, as Obsidian shows it in **Settings -> Core plugins**. Present so a
   * consumer can name the plugin in a notice without reaching into `app.internalPlugins` for it.
   */
  readonly corePluginName: string;
}

/**
 * More Events' API, published through the `obsidian-dev-utils` plugin registry.
 *
 * The events say when something changed; this says what the state is. A consumer needs both — it has to
 * reconcile once when it loads, and again on each event, and the load-time answer is the one no event can
 * give it.
 */
export interface MoreEventsApi {
  /**
   * The ids of the core plugins enabled right now.
   *
   * A fresh array on each call, so writing to it changes nothing here.
   *
   * @returns The enabled core plugin ids.
   */
  getEnabledCorePluginIds(): string[];

  /**
   * Whether the named core plugin is enabled right now.
   *
   * @param corePluginId - The core plugin's id, as {@link CorePluginEventPayload.corePluginId} carries it.
   * @returns `true` when it is enabled.
   */
  isCorePluginEnabled(corePluginId: string): boolean;
}

declare module 'obsidian' {
  interface Workspace {
    /**
     * Subscribes to a core plugin being enabled or disabled.
     *
     * Triggered after the change has happened, so `getEnabledCorePluginIds()` already reflects it. Nothing
     * is triggered for the core plugins that were already enabled when More Events loaded — read those
     * from the API instead.
     *
     * @param name - Should be `'more-events:core-plugin-enabled'` or `'more-events:core-plugin-disabled'`.
     * @param callback - The callback receiving the core plugin's payload.
     * @param context - The context passed as `this` to the `callback` function.
     * @returns The event reference.
     */
    /*
     * An augmentation of an EXISTING overload set has to stay a method signature. A property member does not
     * merge into `Workspace.on`'s overloads, and the failure surfaces at every call site rather than here.
     */
    // eslint-disable-next-line @typescript-eslint/method-signature-style -- A property member does not merge into an existing overload set. See above.
    on(name: CorePluginEventName, callback: (payload: CorePluginEventPayload) => unknown, context?: unknown): EventRef;
  }
}
