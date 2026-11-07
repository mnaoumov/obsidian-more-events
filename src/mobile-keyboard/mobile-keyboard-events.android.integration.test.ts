/**
 * @file
 *
 * Proves the four mobile keyboard events against the real soft keyboard on an Android emulator.
 *
 * Nothing synthetic is dispatched: the keyboard is raised by a real `adb shell input tap` on a field, through the
 * harness's `raiseSoftKeyboard`, and put down by `KEYCODE_BACK`, so every event reaching the listener came from
 * Obsidian's native Capacitor keyboard plugin through its bridge. The suite also records the native window events
 * themselves, so a missing announcement can be told apart from a keyboard that never moved.
 *
 * The field is a `SuggestModal`'s `.prompt-input`, the bottom-anchored shape the harness proves its raise on.
 */

import type { SuggestModal } from 'obsidian';

import { setTimeout as sleep } from 'node:timers/promises';
import {
  ContextId,
  evalInObsidian,
  raiseSoftKeyboard,
  resolveEmulatorDeviceId,
  runAdbText,
  withSoftKeyboardEnabled
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import type { MobileKeyboardState } from '../api/more-events-api.ts';

interface KeyboardContext {
  readonly announced: KeyboardRecord[];
  readonly modal: null | SuggestModal<string>;
  readonly native: string[];
  readonly offs: (() => void)[];
}

interface KeyboardLog {
  readonly announced: KeyboardRecord[];
  readonly native: string[];
}

interface KeyboardRecord {
  readonly name: string;
  readonly state: MobileKeyboardState;
}

const AVD_NAME = 'obsidian_test';
const PLUGIN_ID = 'more-events';
const PROBE_INPUT_CLASS = 'more-events-keyboard-probe-input';
const TEST_TIMEOUT_IN_MILLISECONDS = 240_000;
const EVENT_TIMEOUT_IN_MILLISECONDS = 15_000;
const POLL_INTERVAL_IN_MILLISECONDS = 250;
/**
 * How long a disabled plugin is watched for an announcement after the native events arrived.
 */
const SILENCE_WINDOW_IN_MILLISECONDS = 1500;

const SHOW_SEQUENCE = ['more-events:mobile-keyboard-will-show', 'more-events:mobile-keyboard-shown'];
const HIDE_SEQUENCE = ['more-events:mobile-keyboard-will-hide', 'more-events:mobile-keyboard-hidden'];

let deviceId = '';
const contextId = new ContextId<KeyboardContext>();

beforeAll(async () => {
  deviceId = await resolveEmulatorDeviceId({ avdName: AVD_NAME });
}, TEST_TIMEOUT_IN_MILLISECONDS);

describe('Mobile keyboard events', () => {
  it('should announce the real soft keyboard going up and down, with its height', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    await withSoftKeyboardEnabled({
      async callback() {
        await startRecording();
        try {
          await openProbeModal();
          await raise();
          const shown = await waitForLog((log) => log.native.includes('keyboardDidShow') && hasSequence(log, SHOW_SEQUENCE));
          await lowerKeyboard();
          const hidden = await waitForLog((log) => log.native.includes('keyboardDidHide') && hasSequence(log, HIDE_SEQUENCE));

          const shownState = shown.announced.find((record) => record.name === 'more-events:mobile-keyboard-shown')?.state;
          expect(shownState?.keyboardHeight).toBeGreaterThan(0);
          expect(shownState?.screenHeight).toBeGreaterThan(shownState?.keyboardHeight ?? 0);
          expect(typeof shownState?.hasPhysicalKeyboard).toBe('boolean');
          const hiddenState = hidden.announced.find((record) => record.name === 'more-events:mobile-keyboard-hidden')?.state;
          expect(hiddenState?.keyboardHeight).toBe(0);
          expect(hiddenState?.screenHeight).toBe(shownState?.screenHeight);
          // One announcement per native event, in the native order.
          expect(hidden.announced.map((record) => record.name)).toEqual(hidden.native.map((nativeName) => toAnnouncedName(nativeName)));
        } finally {
          await stopRecording();
        }
      },
      deviceId
    });
  });

  it('should announce nothing once the plugin is disabled', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    await withSoftKeyboardEnabled({
      async callback() {
        await setPluginEnabled(false);
        await startRecording();
        try {
          await openProbeModal();
          await raise();
          await waitForLog((log) => log.native.includes('keyboardDidShow'));
          await lowerKeyboard();
          await waitForLog((log) => log.native.includes('keyboardDidHide'));
          await sleep(SILENCE_WINDOW_IN_MILLISECONDS);
          const log = await readLog();
          expect(log.native).toEqual(expect.arrayContaining(['keyboardWillShow', 'keyboardDidShow', 'keyboardWillHide', 'keyboardDidHide']));
          expect(log.announced).toEqual([]);
        } finally {
          await stopRecording();
          await setPluginEnabled(true);
        }
      },
      deviceId
    });
  });
});

function hasSequence(log: KeyboardLog, sequence: readonly string[]): boolean {
  const names = log.announced.map((record) => record.name);
  let from = 0;
  for (const name of sequence) {
    const index = names.indexOf(name, from);
    if (index === -1) {
      return false;
    }
    from = index + 1;
  }
  return true;
}

/**
 * Puts the keyboard down the way a person does, with the Back key. With the IME showing, Android consumes the key to
 * retract it, so the modal stays open.
 */
async function lowerKeyboard(): Promise<void> {
  await runAdbText({ commandArguments: ['shell', 'input', 'keyevent', 'KEYCODE_BACK'], deviceId });
}

async function openProbeModal(): Promise<void> {
  await evalInObsidian({
    callback({ app, context, inputClass, obsidianModule }): void {
      class ProbeModal extends obsidianModule.SuggestModal<string> {
        public override getSuggestions(query: string): string[] {
          return ['alpha', 'beta'].filter((suggestion) => suggestion.includes(query));
        }

        public override onChooseSuggestion(): void {
          // Never chosen; the modal only holds the field.
        }

        public override renderSuggestion(suggestion: string, el: HTMLElement): void {
          el.setText(suggestion);
        }
      }

      const modal = new ProbeModal(app);
      modal.open();
      modal.inputEl.addClass(inputClass);
      Object.assign(context, { modal });
    },
    contextId,
    input: { inputClass: PROBE_INPUT_CLASS },
    vaultPath: vaultPath()
  });
}

async function raise(): Promise<void> {
  await raiseSoftKeyboard({
    deviceId,
    inputSelector: `.${PROBE_INPUT_CLASS}`,
    vaultPath: vaultPath()
  });
}

async function readLog(): Promise<KeyboardLog> {
  return await evalInObsidian({
    callback({ context }): KeyboardLog {
      return { announced: [...context.announced], native: [...context.native] };
    },
    contextId,
    vaultPath: vaultPath()
  });
}

async function setPluginEnabled(isEnabled: boolean): Promise<void> {
  await evalInObsidian({
    async callback({ app, isEnabled: shouldEnable, pluginId }): Promise<void> {
      if (shouldEnable) {
        await app.plugins.enablePlugin(pluginId);
      } else {
        await app.plugins.disablePlugin(pluginId);
      }
    },
    input: { isEnabled, pluginId: PLUGIN_ID },
    vaultPath: vaultPath()
  });
}

async function startRecording(): Promise<void> {
  await evalInObsidian({
    callback({ app, context }): void {
      Object.assign(context, { announced: [], modal: null, native: [], offs: [] });
      for (const nativeName of ['keyboardWillShow', 'keyboardDidShow', 'keyboardWillHide', 'keyboardDidHide']) {
        function listener(): void {
          context.native.push(nativeName);
        }
        // Capture phase, so the native order is recorded before the plugin's own bubble-phase listener relays it.
        window.addEventListener(nativeName, listener, { capture: true });
        context.offs.push(() => {
          window.removeEventListener(nativeName, listener, { capture: true });
        });
      }
      const refs = [
        app.workspace.on('more-events:mobile-keyboard-will-show', (state) => {
          context.announced.push({ name: 'more-events:mobile-keyboard-will-show', state });
        }),
        app.workspace.on('more-events:mobile-keyboard-shown', (state) => {
          context.announced.push({ name: 'more-events:mobile-keyboard-shown', state });
        }),
        app.workspace.on('more-events:mobile-keyboard-will-hide', (state) => {
          context.announced.push({ name: 'more-events:mobile-keyboard-will-hide', state });
        }),
        app.workspace.on('more-events:mobile-keyboard-hidden', (state) => {
          context.announced.push({ name: 'more-events:mobile-keyboard-hidden', state });
        })
      ];
      for (const ref of refs) {
        context.offs.push(() => {
          app.workspace.offref(ref);
        });
      }
    },
    contextId,
    vaultPath: vaultPath()
  });
}

async function stopRecording(): Promise<void> {
  await evalInObsidian({
    callback({ context }): void {
      for (const off of context.offs) {
        off();
      }
      context.modal?.close();
      Object.assign(context, { modal: null, offs: [] });
    },
    contextId,
    vaultPath: vaultPath()
  });
}

function toAnnouncedName(nativeName: string): string {
  switch (nativeName) {
    case 'keyboardDidHide': {
      return 'more-events:mobile-keyboard-hidden';
    }
    case 'keyboardDidShow': {
      return 'more-events:mobile-keyboard-shown';
    }
    case 'keyboardWillHide': {
      return 'more-events:mobile-keyboard-will-hide';
    }
    default: {
      return 'more-events:mobile-keyboard-will-show';
    }
  }
}

function vaultPath(): string {
  return getTemporaryVault().path;
}

async function waitForLog(isDone: (log: KeyboardLog) => boolean): Promise<KeyboardLog> {
  const deadline = performance.now() + EVENT_TIMEOUT_IN_MILLISECONDS;
  let log = await readLog();
  while (!isDone(log)) {
    if (performance.now() > deadline) {
      throw new Error(`Timed out waiting for the keyboard events; native: ${JSON.stringify(log.native)}, announced: ${JSON.stringify(log.announced)}`);
    }
    await sleep(POLL_INTERVAL_IN_MILLISECONDS);
    log = await readLog();
  }
  return log;
}
