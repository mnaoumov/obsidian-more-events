/**
 * @file
 *
 * The runtime half of this plugin's published contract: the event names, the registry contract and its
 * version.
 *
 * The TYPES are not declared here. They live in the repo-root `api.d.ts`, which is the file a consumer
 * reads, and are imported from it so there is exactly one declaration of each and nothing to drift.
 */

import type { PluginApiContract } from 'obsidian-dev-utils/obsidian/plugin/plugin-api';

import type {
  CommunityPluginDisabledEventName,
  CommunityPluginEnabledEventName,
  CorePluginDisabledEventName,
  CorePluginEnabledEventName
} from '../api.d.ts';

export type {
  CommunityPluginDisabledEventName,
  CommunityPluginEnabledEventName,
  CommunityPluginEventName,
  CommunityPluginEventPayload,
  CorePluginDisabledEventName,
  CorePluginEnabledEventName,
  CorePluginEventName,
  CorePluginEventPayload,
  MoreEventsApi
} from '../api.d.ts';

/**
 * Triggered on `app.workspace` after a community plugin has been disabled.
 */
export const COMMUNITY_PLUGIN_DISABLED_EVENT_NAME: CommunityPluginDisabledEventName = 'more-events:community-plugin-disabled';

/**
 * Triggered on `app.workspace` after a community plugin has been enabled.
 */
export const COMMUNITY_PLUGIN_ENABLED_EVENT_NAME: CommunityPluginEnabledEventName = 'more-events:community-plugin-enabled';

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
  getEnabledCommunityPluginIds: {},
  getEnabledCorePluginIds: {},
  isCommunityPluginEnabled: {},
  isCorePluginEnabled: {}
};

/**
 * The version of the contract above — independent of the plugin's own version, so a consumer asks for
 * `'^1'` and keeps working across releases that change nothing it depends on.
 *
 * `1.2.0` rather than `2.0.0`, for the same reason `1.1.0` was: `isUserInitiated` was ADDED to both
 * payloads and nothing already published changed its meaning, so a consumer written against `1.0.0` or
 * `1.1.0` compiles and runs unaltered. The payloads are declared additive-only in `api.d.ts` precisely so
 * this stays a minor.
 *
 * The history: `1.0.0` was the core-plugin pair, `1.1.0` added the community-plugin pair, `1.2.0` added
 * `isUserInitiated` to both.
 */
export const PLUGIN_API_VERSION = '1.2.0';
