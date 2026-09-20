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
  isUserInitiated: boolean;
}

interface RecordedEvents {
  disabled: CorePluginEventRecord[];
  enabled: CorePluginEventRecord[];
}

/*
 * The tests that can fail for the right reason. Everything else in this repo is checked against mocks, and
 * this plugin's whole premise is a claim about the REAL app: that Obsidian triggers `change` on
 * `app.internalPlugins` at the end of `InternalPlugin.enable()` and `.disable()`, and that the argument
 * those two take is still readable from a patch on the prototype they live on. That was read out of the
 * unminified `app.js` rather than guessed at, but a reading is not a run — if it ever stops being true, or
 * an Obsidian release moves the trigger or drops the argument, this is what notices.
 *
 * **Two tests rather than one, and the split is what the payload now claims.** `enable(true)` is what the
 * toggle in **Settings -> Core plugins** calls, measured at `app.js:225422`; `enable(false)` is what a
 * plugin enabling something for itself calls. Both raise the identical `change`, so a diff on its own
 * cannot tell them apart and `isUserInitiated` is the only thing in the payload that can be wrong here.
 *
 * They are separate `it`s rather than four toggles in one closure, because the waits are declared per
 * closure: three at 8 s is 24 s, under the 30 s a desktop closure gets, while six would be 48 s in one
 * transport call.
 *
 * Desktop only, and deliberately so: the component reads `app.internalPlugins` and triggers on
 * `app.workspace`, neither of which differs by platform, and `plugin.android.integration.test.ts` already
 * proves the plugin loads there. An Android leg would buy an emulator run and no coverage.
 */
describe('Core plugin events', () => {
  it('should fire for a core plugin the user toggled, and say so', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const recordedEvents = await toggleDemoCorePlugin(true);

    // Exactly one of each, naming the plugin that actually moved — not a redraw signal the listener has to
    // interpret, which is the whole difference between this and what Obsidian emits.
    expect(recordedEvents.disabled).toEqual([{
      corePluginId: DEMO_CORE_PLUGIN_ID,
      corePluginName: 'Canvas',
      isUserInitiated: true
    }]);
    expect(recordedEvents.enabled).toEqual([{
      corePluginId: DEMO_CORE_PLUGIN_ID,
      corePluginName: 'Canvas',
      isUserInitiated: true
    }]);
  });

  it('should fire for a core plugin toggled programmatically, and say that too', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const recordedEvents = await toggleDemoCorePlugin(false);

    expect(recordedEvents.disabled).toEqual([{
      corePluginId: DEMO_CORE_PLUGIN_ID,
      corePluginName: 'Canvas',
      isUserInitiated: false
    }]);
    expect(recordedEvents.enabled).toEqual([{
      corePluginId: DEMO_CORE_PLUGIN_ID,
      corePluginName: 'Canvas',
      isUserInitiated: false
    }]);
  });
});

/**
 * Turns Canvas off and on again inside a real Obsidian, recording every core-plugin event it produces.
 *
 * @param isUserInitiated - The argument to pass `disable` / `enable`, which is the whole point of the run.
 * @returns The events recorded while the toggle happened.
 */
async function toggleDemoCorePlugin(isUserInitiated: boolean): Promise<RecordedEvents> {
  return await evalInObsidian({
    async callback({
      app,
      CORE_PLUGIN_DISABLED_EVENT_NAME: disabledEventName,
      CORE_PLUGIN_ENABLED_EVENT_NAME: enabledEventName,
      DEMO_CORE_PLUGIN_ID: corePluginId,
      isUserInitiated: isUserInitiatedInput,
      lib
    }): Promise<RecordedEvents> {
      // Three waits at 8 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 8000;

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

        /*
         * The harness's vault leaves Canvas on, but the previous test in this file has just left it on
         * too — so this is a guard rather than a step, and anything it does announce is dropped.
         */
        if (!corePlugin.enabled) {
          await corePlugin.enable(isUserInitiatedInput);
          await lib.waitUntil({
            message: 'the core plugin to be enabled before the test starts',
            predicate: () => corePlugin.enabled,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
          });
          enabled.length = 0;
        }

        corePlugin.disable(isUserInitiatedInput);
        await lib.waitUntil({
          message: 'the disabled event to arrive',
          predicate: () => disabled.length > 0,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        await corePlugin.enable(isUserInitiatedInput);
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
      DEMO_CORE_PLUGIN_ID,
      isUserInitiated
    },
    vaultPath: getTemporaryVault().path
  });
}
