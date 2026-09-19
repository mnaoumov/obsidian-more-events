import {
  describe,
  expect,
  it
} from 'vitest';

import {
  COMMUNITY_PLUGIN_DISABLED_EVENT_NAME,
  COMMUNITY_PLUGIN_ENABLED_EVENT_NAME,
  CORE_PLUGIN_DISABLED_EVENT_NAME,
  CORE_PLUGIN_ENABLED_EVENT_NAME,
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './more-events-api.ts';

/*
 * These values are a WIRE CONTRACT: a consumer hardcodes the event names rather than importing them, and
 * negotiates against the version. So the test asserts the literals themselves — a rename that compiles
 * everywhere in this repo still breaks every plugin already listening, and this is the only thing that
 * notices.
 */
describe('the published contract', () => {
  it('should keep the event names it published', () => {
    expect(CORE_PLUGIN_ENABLED_EVENT_NAME).toBe('more-events:core-plugin-enabled');
    expect(CORE_PLUGIN_DISABLED_EVENT_NAME).toBe('more-events:core-plugin-disabled');
    expect(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME).toBe('more-events:community-plugin-enabled');
    expect(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME).toBe('more-events:community-plugin-disabled');
  });

  it('should declare every member of the api in the contract', () => {
    expect(Object.keys(PLUGIN_API_CONTRACT).sort()).toEqual([
      'getEnabledCommunityPluginIds',
      'getEnabledCorePluginIds',
      'isCommunityPluginEnabled',
      'isCorePluginEnabled'
    ]);
  });

  it('should publish a contract version independent of the plugin version', () => {
    expect(PLUGIN_API_VERSION).toBe('1.1.0');
  });
});
