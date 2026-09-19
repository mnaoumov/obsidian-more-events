import type { InternalPluginNameType } from '@obsidian-typings/obsidian-public-latest';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  CORE_PLUGIN_DISABLED_EVENT_NAME,
  CORE_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';

/*
 * A cast rather than `InternalPluginName.Canvas`, because that enum is a VALUE: importing it here pulls
 * `@obsidian-typings/.../implementations` into the Node-side test process, where it re-exports `obsidian`
 * and fails to resolve (`Cannot find package 'obsidian'`). The type-only import above is erased and costs
 * nothing, so the id crosses into the closure correctly typed for `getPluginById`.
 */
const DEMO_CORE_PLUGIN_ID = 'canvas' as InternalPluginNameType;
const TEST_TIMEOUT_IN_MS = 120_000;

interface CorePluginEventRecord {
  corePluginId: string;
  corePluginName: string;
}

interface RecordedEvents {
  disabled: CorePluginEventRecord[];
  enabled: CorePluginEventRecord[];
}

/*
 * The one test that can fail for the right reason. Everything else in this repo is checked against mocks,
 * and this plugin's whole premise is a claim about the REAL app: that Obsidian triggers `change` on
 * `app.internalPlugins` at the end of `InternalPlugin.enable()` and `.disable()`. That was read out of the
 * unminified `app.js` rather than guessed at, but a reading is not a run — if it ever stops being true, or
 * an Obsidian release moves the trigger, this is what notices.
 *
 * Desktop only, and deliberately so: the component reads `app.internalPlugins` and triggers on
 * `app.workspace`, neither of which differs by platform, and `plugin.android.integration.test.ts` already
 * proves the plugin loads there. An Android leg would buy an emulator run and no coverage.
 */
describe('Core plugin events', () => {
  it('should fire for a core plugin being disabled and enabled again', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const vaultPath = getTemporaryVault().path;

    const recordedEvents = await evalInObsidian({
      async callback({
        app,
        CORE_PLUGIN_DISABLED_EVENT_NAME: disabledEventName,
        CORE_PLUGIN_ENABLED_EVENT_NAME: enabledEventName,
        DEMO_CORE_PLUGIN_ID: corePluginId,
        lib
      }): Promise<RecordedEvents> {
        const WAIT_TIMEOUT_IN_MS = 10_000;

        const disabled: CorePluginEventRecord[] = [];
        const enabled: CorePluginEventRecord[] = [];

        const disabledRef = app.workspace.on(disabledEventName, (payload: CorePluginEventRecord) => {
          disabled.push(payload);
        });
        const enabledRef = app.workspace.on(enabledEventName, (payload: CorePluginEventRecord) => {
          enabled.push(payload);
        });

        try {
          const corePlugin = app.internalPlugins.getPluginById(corePluginId);
          if (!corePlugin) {
            throw new Error(`Core plugin ${corePluginId} not found`);
          }

          if (!corePlugin.enabled) {
            await corePlugin.enable(true);
            await lib.waitUntil({
              message: 'the core plugin to be enabled before the test starts',
              predicate: () => corePlugin.enabled,
              timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
            });
            enabled.length = 0;
          }

          corePlugin.disable(true);
          await lib.waitUntil({
            message: 'the disabled event to arrive',
            predicate: () => disabled.length > 0,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
          });

          await corePlugin.enable(true);
          await lib.waitUntil({
            message: 'the enabled event to arrive',
            predicate: () => enabled.length > 0,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
          });

          return { disabled, enabled };
        } finally {
          app.workspace.offref(disabledRef);
          app.workspace.offref(enabledRef);
        }
      },
      input: {
        CORE_PLUGIN_DISABLED_EVENT_NAME,
        CORE_PLUGIN_ENABLED_EVENT_NAME,
        DEMO_CORE_PLUGIN_ID
      },
      vaultPath
    });

    // Exactly one of each, naming the plugin that actually moved — not a redraw signal the listener has to
    // interpret, which is the whole difference between this and what Obsidian emits.
    expect(recordedEvents.disabled).toEqual([{ corePluginId: DEMO_CORE_PLUGIN_ID, corePluginName: 'Canvas' }]);
    expect(recordedEvents.enabled).toEqual([{ corePluginId: DEMO_CORE_PLUGIN_ID, corePluginName: 'Canvas' }]);
  });
});
