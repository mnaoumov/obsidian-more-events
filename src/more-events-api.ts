/**
 * @file
 *
 * The runtime half of this plugin's published contract: the two event names, the registry contract and its
 * version.
 *
 * The TYPES are not declared here. They live in the repo-root `api.d.ts`, which is the file a consumer
 * reads, and are imported from it so there is exactly one declaration of each and nothing to drift.
 */

import type { PluginApiContract } from 'obsidian-dev-utils/obsidian/plugin/plugin-api';

import type {
  CorePluginDisabledEventName,
  CorePluginEnabledEventName
} from '../api.d.ts';

export type {
  CorePluginDisabledEventName,
  CorePluginEnabledEventName,
  CorePluginEventName,
  CorePluginEventPayload,
  MoreEventsApi
} from '../api.d.ts';

/**
 * Triggered on `app.workspace` after a core plugin has been disabled.
 */
export const CORE_PLUGIN_DISABLED_EVENT_NAME: CorePluginDisabledEventName = 'more-events:core-plugin-disabled';

/**
 * Triggered on `app.workspace` after a core plugin has been enabled.
 */
export const CORE_PLUGIN_ENABLED_EVENT_NAME: CorePluginEnabledEventName = 'more-events:core-plugin-enabled';

/**
 * The contract this plugin publishes. It declares the method names; a consumer that wants schema
 * validation at the boundary supplies its own contract to `watchPluginApi`, and the consumer's wins.
 */
export const PLUGIN_API_CONTRACT: PluginApiContract = {
  getEnabledCorePluginIds: {},
  isCorePluginEnabled: {}
};

/**
 * The version of the contract above — independent of the plugin's own version, so a consumer asks for
 * `'^1'` and keeps working across releases that change nothing it depends on.
 */
export const PLUGIN_API_VERSION = '1.0.0';
