import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  COMMUNITY_PLUGIN_DISABLED_EVENT_NAME,
  COMMUNITY_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';

const TEST_COMMUNITY_PLUGIN_ID = 'more-events-integration-test-plugin';
const TEST_COMMUNITY_PLUGIN_NAME = 'More Events Integration Test Plugin';
const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The smallest thing Obsidian will accept as a community plugin. `loadPlugin` evaluates this file as
 * `(function anonymous(require, module, exports) { … })` and then requires `module.exports` (or its
 * `default`) to be a subclass of `Plugin`, so a bare class export is the whole contract.
 */
const TEST_COMMUNITY_PLUGIN_MAIN_JS = `const { Plugin } = require('obsidian');
module.exports = class extends Plugin {};
`;

const TEST_COMMUNITY_PLUGIN_MANIFEST_JSON = JSON.stringify(
  {
    author: 'More Events integration tests',
    description: 'A throwaway plugin that exists only to be enabled and disabled by an integration test.',
    id: TEST_COMMUNITY_PLUGIN_ID,
    isDesktopOnly: false,
    minAppVersion: '0.15.0',
    name: TEST_COMMUNITY_PLUGIN_NAME,
    version: '1.0.0'
  },
  null,
  2
);

interface CommunityPluginEventRecord {
  communityPluginId: string;
  communityPluginName: string;
}

interface RecordedEvents {
  disabled: CommunityPluginEventRecord[];
  enabled: CommunityPluginEventRecord[];
}

/*
 * The community-plugin counterpart of `core-plugin-events.desktop.integration.test.ts`, and it earns its
 * place for the same reason: everything else in this repo is checked against mocks, while this plugin's
 * premise is a claim about the REAL app. Here the claim is larger than the core one, because more of it was
 * read rather than run — that `app.plugins` triggers a payload-free `changed`, that the trigger is debounced
 * so the diff is the only correct answer, and above all that `app.plugins.plugins` is the set that moves
 * when a plugin is enabled and disabled. If any of that stops being true, this is what notices.
 *
 * It installs its OWN throwaway plugin rather than toggling one that happens to be in the vault. Toggling
 * More Events itself would unload the component under test; toggling the harness's own plugins would make
 * the suite depend on what else the run installed. A two-line plugin written into the vault depends on
 * nothing and is the honest third-party case these events exist for — the one `obsidian-dev-utils`'
 * `plugin-loaded` broadcast cannot see.
 *
 * Everything happens inside the closure, including writing and removing the plugin, because the vault is
 * shared with the rest of the run: the config folder's real name comes from `app.vault.configDir` rather
 * than being assumed to be `.obsidian`, and the folder is removed in the same `finally` that drops the
 * subscriptions, so a failed assertion cannot leave the plugin behind for a later suite to trip over.
 *
 * Desktop only, deliberately: the component reads `app.plugins` and triggers on `app.workspace`, neither of
 * which differs by platform, and `plugin.android.integration.test.ts` already proves the plugin loads there.
 */
describe('Community plugin events', () => {
  it('should fire for a community plugin being enabled and disabled again', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const vaultPath = getTemporaryVault().path;

    const recordedEvents = await evalInObsidian({
      async callback({
        app,
        COMMUNITY_PLUGIN_DISABLED_EVENT_NAME: disabledEventName,
        COMMUNITY_PLUGIN_ENABLED_EVENT_NAME: enabledEventName,
        lib,
        TEST_COMMUNITY_PLUGIN_ID: communityPluginId,
        TEST_COMMUNITY_PLUGIN_MAIN_JS: mainJs,
        TEST_COMMUNITY_PLUGIN_MANIFEST_JSON: manifestJson
      }): Promise<RecordedEvents> {
        const WAIT_TIMEOUT_IN_MS = 10_000;

        const disabled: CommunityPluginEventRecord[] = [];
        const enabled: CommunityPluginEventRecord[] = [];
        const communityPluginFolderPath = `${app.vault.configDir}/plugins/${communityPluginId}`;

        const disabledRef = app.workspace.on(disabledEventName, (payload: CommunityPluginEventRecord) => {
          disabled.push(payload);
        });
        const enabledRef = app.workspace.on(enabledEventName, (payload: CommunityPluginEventRecord) => {
          enabled.push(payload);
        });

        try {
          await app.vault.adapter.mkdir(communityPluginFolderPath);
          await app.vault.adapter.write(`${communityPluginFolderPath}/manifest.json`, manifestJson);
          await app.vault.adapter.write(`${communityPluginFolderPath}/main.js`, mainJs);

          /*
           * Obsidian only reads the plugins folder at startup and on its own file watcher, so the manifest
           * written a moment ago is not known yet. This is also an assertion of the suite, silently:
           * `loadManifests` triggers `changed` itself, and nothing has been loaded or unloaded, so a
           * correct diff announces nothing for it.
           */
          await app.plugins.loadManifests();
          if (!Object.hasOwn(app.plugins.manifests, communityPluginId)) {
            throw new Error(`Test plugin ${communityPluginId} was not picked up by loadManifests()`);
          }

          await app.plugins.enablePluginAndSave(communityPluginId);
          await lib.waitUntil({
            message: 'the enabled event to arrive',
            predicate: () => enabled.length > 0,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
          });

          await app.plugins.disablePluginAndSave(communityPluginId);
          await lib.waitUntil({
            message: 'the disabled event to arrive',
            predicate: () => disabled.length > 0,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
          });

          return { disabled, enabled };
        } finally {
          app.workspace.offref(disabledRef);
          app.workspace.offref(enabledRef);

          if (await app.vault.adapter.exists(communityPluginFolderPath)) {
            await app.vault.adapter.rmdir(communityPluginFolderPath, true);
            // So Obsidian forgets the manifest too, rather than keeping one for a folder that is gone.
            await app.plugins.loadManifests();
          }
        }
      },
      input: {
        COMMUNITY_PLUGIN_DISABLED_EVENT_NAME,
        COMMUNITY_PLUGIN_ENABLED_EVENT_NAME,
        TEST_COMMUNITY_PLUGIN_ID,
        TEST_COMMUNITY_PLUGIN_MAIN_JS,
        TEST_COMMUNITY_PLUGIN_MANIFEST_JSON
      },
      vaultPath
    });

    // Exactly one of each, naming the plugin that actually moved — not the payload-free `changed` signal a
    // listener would otherwise have to diff for itself, which is the whole point of this plugin.
    expect(recordedEvents.enabled).toEqual([{
      communityPluginId: TEST_COMMUNITY_PLUGIN_ID,
      communityPluginName: TEST_COMMUNITY_PLUGIN_NAME
    }]);
    expect(recordedEvents.disabled).toEqual([{
      communityPluginId: TEST_COMMUNITY_PLUGIN_ID,
      communityPluginName: TEST_COMMUNITY_PLUGIN_NAME
    }]);
  });
});
