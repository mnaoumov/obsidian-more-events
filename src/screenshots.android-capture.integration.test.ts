/**
 * @file
 *
 * Produces the mobile screenshots the community-store listing needs, driving a real Obsidian Mobile on an
 * Android emulator and writing `images/screenshots/screenshot-mobile-N.png`.
 *
 * The mobile half of the pair `screenshots.desktop-capture.integration.test.ts` takes, and the same two
 * frames for the same reason: **Settings -> Core plugins**, then **Settings -> Community plugins**, each
 * with a listener's notice on it. Read that file for why those are the screens — this plugin renders
 * nothing, so the only honest shot is of the screen where the change it reports actually happens.
 *
 * **They are not a narrower copy of the desktop pair.** The events are the plugin's whole product and
 * they are platform-neutral, so what a phone adds is the answer to the question a mobile reader is
 * actually asking: does this work on my phone, and does it want anything from me there? Two frames of the
 * stock Settings screens, unchanged but for a notice, say *yes* and *no* better than a sentence can.
 *
 * There is no mobile equivalent of the desktop viewport override, so the capture is always the device's
 * own framebuffer, and the AVD is built at exactly the 900x1600 the store asks for — see
 * `SCREENSHOT_AVD_NAME` in `scripts/vitest-config.ts`.
 *
 * **Opening the settings modal takes one extra step on mobile, and without it nothing renders.**
 * `app.setting` exists from startup but its `containerEl` is NOT in the document, and `open()` returns
 * without attaching it, so the modal builds into a detached tree and the captured frame stays empty.
 * `containerEl` is appended to `document.body` BEFORE `open()` is called; appending afterwards is too
 * late, because the default tab has already been rendered into the detached container.
 *
 * **The staging is split across several short closures, and the waiting for the tab happens in NODE.**
 * One `evalInObsidian` is one `execute/sync`, which Android caps at
 * `DEFAULT_EVAL_CAP_IN_MILLISECONDS`; a settings tab rendering on a cold-booted AVD can take longer than
 * that on its own. `pollInObsidian` spends that time as a series of short evals instead. What stays
 * inside one closure is only the toggle and the notice it produces, which is a sub-second event with a
 * deliberately small ceiling over it.
 *
 * Excluded from `npm run test:integration` by its file name — see the `capture-screenshots:android`
 * project in `scripts/vitest-config.ts`. Capturing is an explicit operation
 * (`npm run capture:screenshots`), not something every test run does.
 */

import type { InternalPluginNameType } from '@obsidian-typings/obsidian-public-latest';

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as sleepInNode } from 'node:timers/promises';
import {
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  pollInObsidian,
  readPngDimensions
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import {
  COMMUNITY_PLUGIN_ENABLED_EVENT_NAME,
  CORE_PLUGIN_ENABLED_EVENT_NAME
} from './more-events-api.ts';

/**
 * Obsidian's settings modal, reduced to the container `obsidian-typings` does not declare.
 */
interface SettingsModalWithContainer {
  containerEl: HTMLElement;
}

const WIDTH_IN_PIXELS = 900;
const HEIGHT_IN_PIXELS = 1600;

/**
 * A cold-booted AVD renders its first settings tab far more slowly than a warm desktop does, and this
 * budget is spent in Node as short polls rather than inside one closure.
 */
const RENDER_TIMEOUT_IN_MILLISECONDS = 120_000;

/**
 * Generous because the emulator is: the work itself is a boot, two tab renders and two toggles.
 */
const TEST_TIMEOUT_IN_MILLISECONDS = 600_000;

const POLL_INTERVAL_IN_MILLISECONDS = 500;

const THEME_SETTLE_DELAY_IN_MILLISECONDS = 1000;

/*
 * A cast rather than `InternalPluginName.Canvas`, for the reason
 * `core-plugin-events.desktop.integration.test.ts` records: that enum is a VALUE, and importing it pulls
 * `@obsidian-typings/.../implementations` into the Node-side process, where `obsidian` does not resolve.
 */
const DEMO_CORE_PLUGIN_ID = 'canvas' as InternalPluginNameType;
const CORE_PLUGINS_SETTING_TAB_ID = 'plugins';
const COMMUNITY_PLUGINS_SETTING_TAB_ID = 'community-plugins';

/*
 * The id lands in the notice the shot is of — `Enabled: Meeting Notes (meeting-notes)` — so it has to
 * read like any plugin's, not like a fixture of this repo's. The same stand-in the desktop pair uses, so
 * the two halves of the set show one story rather than two.
 */
const SCREENSHOT_COMMUNITY_PLUGIN_ID = 'meeting-notes';
const SCREENSHOT_COMMUNITY_PLUGIN_NAME = 'Meeting Notes';

/*
 * The smallest thing Obsidian accepts as a community plugin: `loadPlugin` evaluates the file and requires
 * `module.exports` to be a `Plugin` subclass.
 */
const SCREENSHOT_COMMUNITY_PLUGIN_MAIN_JS = 'const { Plugin } = require(\'obsidian\');\nmodule.exports = class extends Plugin {};\n';

const SCREENSHOT_COMMUNITY_PLUGIN_MANIFEST_JSON = JSON.stringify(
  {
    author: 'More Events screenshots',
    description: 'A stand-in for any community plugin in your vault. It does nothing, and it has never heard of More Events.',
    id: SCREENSHOT_COMMUNITY_PLUGIN_ID,
    isDesktopOnly: false,
    minAppVersion: '0.15.0',
    name: SCREENSHOT_COMMUNITY_PLUGIN_NAME,
    version: '1.0.0'
  },
  null,
  2
);

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

beforeAll(async () => {
  await evalInObsidian({
    callback({ app }) {
      app.changeTheme('obsidian');
    },
    vaultPath: vaultPath()
  });

  await sleepInNode(THEME_SETTLE_DELAY_IN_MILLISECONDS);
}, TEST_TIMEOUT_IN_MILLISECONDS);

describe('mobile store screenshots', () => {
  it('1 - a core plugin comes back, and a listener is told', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    await openCorePluginsTab();
    const noticeTexts = await announceCorePluginEnabled();

    expect(noticeTexts).toStrictEqual(['Enabled: Canvas (canvas)']);
    await shoot(1, 'Canvas enabled in Settings — a listening plugin is told');
  });

  it('2 - the same for community plugins', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    await openCommunityPluginsTab();
    const noticeTexts = await announceCommunityPluginEnabled();

    expect(noticeTexts).toStrictEqual([
      `Enabled: ${SCREENSHOT_COMMUNITY_PLUGIN_NAME} (${SCREENSHOT_COMMUNITY_PLUGIN_ID})`
    ]);
    await shoot(2, 'Any community plugin too, named the moment it loads');
  });
});

/**
 * Subscribes, enables the throwaway community plugin, and leaves the notice its enabling produced on
 * screen for the capture.
 *
 * `enablePluginAndSave` rather than `enablePlugin`, because the row's toggle in the photographed tab
 * reads from the persisted list.
 *
 * @returns The text of every notice on screen when the staging finished.
 */
async function announceCommunityPluginEnabled(): Promise<string[]> {
  return await evalInObsidian({
    async callback({
      app,
      COMMUNITY_PLUGIN_ENABLED_EVENT_NAME: enabledEventName,
      lib,
      SCREENSHOT_COMMUNITY_PLUGIN_ID: communityPluginId
    }): Promise<string[]> {
      const NOTICE_TIMEOUT_IN_MILLISECONDS = 10_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1200;
      const STICKY_NOTICE_DURATION_IN_MILLISECONDS = 0;

      const enabledRef = app.workspace.on(
        enabledEventName,
        ({ communityPluginId: id, communityPluginName: name }) => {
          new Notice(`Enabled: ${name} (${id})`, STICKY_NOTICE_DURATION_IN_MILLISECONDS);
        }
      );

      try {
        await app.plugins.enablePluginAndSave(communityPluginId);

        await lib.waitUntil({
          message: 'the notice the enabled event produced',
          predicate: () => document.querySelectorAll('.notice').length > 0,
          timeoutInMilliseconds: NOTICE_TIMEOUT_IN_MILLISECONDS
        });

        /*
         * A phone shows far less at once than the desktop window does, and the installed-plugins list
         * starts below the fold — so without this the frame holds the notice naming a plugin and not
         * the row it names. The notice lives in its own container and does not move with the scroll.
         */
        document
          .querySelector(`.setting-item[data-plugin-id="${CSS.escape(communityPluginId)}"]`)
          ?.scrollIntoView({ block: 'center' });

        await sleep(SETTLE_DELAY_IN_MILLISECONDS);

        return [...document.querySelectorAll('.notice')].map((noticeEl) => noticeEl.textContent);
      } finally {
        app.workspace.offref(enabledRef);
      }
    },
    input: {
      COMMUNITY_PLUGIN_ENABLED_EVENT_NAME,
      SCREENSHOT_COMMUNITY_PLUGIN_ID
    },
    vaultPath: vaultPath()
  });
}

/**
 * Subscribes and turns Canvas back on, leaving the notice its enabling produced on screen for the
 * capture.
 *
 * @returns The text of every notice on screen when the staging finished.
 */
async function announceCorePluginEnabled(): Promise<string[]> {
  return await evalInObsidian({
    async callback({
      app,
      CORE_PLUGIN_ENABLED_EVENT_NAME: enabledEventName,
      DEMO_CORE_PLUGIN_ID: corePluginId,
      lib
    }): Promise<string[]> {
      const NOTICE_TIMEOUT_IN_MILLISECONDS = 10_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1200;
      const STICKY_NOTICE_DURATION_IN_MILLISECONDS = 0;

      const corePlugin = app.internalPlugins.getPluginById(corePluginId);
      if (!corePlugin) {
        throw new Error(`Core plugin ${corePluginId} not found`);
      }

      const enabledRef = app.workspace.on(
        enabledEventName,
        ({ corePluginId: id, corePluginName: name }) => {
          new Notice(`Enabled: ${name} (${id})`, STICKY_NOTICE_DURATION_IN_MILLISECONDS);
        }
      );

      try {
        await corePlugin.enable(true);

        await lib.waitUntil({
          message: 'the notice the enabled event produced',
          predicate: () => document.querySelectorAll('.notice').length > 0,
          timeoutInMilliseconds: NOTICE_TIMEOUT_IN_MILLISECONDS
        });

        await sleep(SETTLE_DELAY_IN_MILLISECONDS);

        return [...document.querySelectorAll('.notice')].map((noticeEl) => noticeEl.textContent);
      } finally {
        app.workspace.offref(enabledRef);
      }
    },
    input: {
      CORE_PLUGIN_ENABLED_EVENT_NAME,
      DEMO_CORE_PLUGIN_ID
    },
    vaultPath: vaultPath()
  });
}

/**
 * Installs the throwaway community plugin and opens **Settings -> Community plugins** on it, waiting in
 * Node until the tab has listed its rows.
 */
async function openCommunityPluginsTab(): Promise<void> {
  await pollInObsidian({
    input: {
      COMMUNITY_PLUGINS_SETTING_TAB_ID,
      SCREENSHOT_COMMUNITY_PLUGIN_ID,
      SCREENSHOT_COMMUNITY_PLUGIN_MAIN_JS,
      SCREENSHOT_COMMUNITY_PLUGIN_MANIFEST_JSON
    },
    intervalInMilliseconds: POLL_INTERVAL_IN_MILLISECONDS,
    poll(): boolean {
      return document.querySelectorAll('.setting-item[data-plugin-id]').length > 0;
    },
    async start({
      app,
      COMMUNITY_PLUGINS_SETTING_TAB_ID: settingTabId,
      SCREENSHOT_COMMUNITY_PLUGIN_ID: communityPluginId,
      SCREENSHOT_COMMUNITY_PLUGIN_MAIN_JS: mainJs,
      SCREENSHOT_COMMUNITY_PLUGIN_MANIFEST_JSON: manifestJson
    }): Promise<void> {
      const OPEN_DELAY_IN_MILLISECONDS = 500;

      // Each shot stages its own notice, so one shot's can never drift into the next one's frame.
      for (const noticeEl of document.querySelectorAll('.notice')) {
        noticeEl.detach();
      }

      const communityPluginFolderPath = `${app.vault.configDir}/plugins/${communityPluginId}`;
      await app.vault.adapter.mkdir(communityPluginFolderPath);
      await app.vault.adapter.write(`${communityPluginFolderPath}/manifest.json`, manifestJson);
      await app.vault.adapter.write(`${communityPluginFolderPath}/main.js`, mainJs);
      // Obsidian reads the plugins folder at startup, so a manifest written a moment ago is not known yet.
      await app.plugins.loadManifests();

      const settingsModal: unknown = app.setting;
      const containerEl = (settingsModal as SettingsModalWithContainer).containerEl;
      if (!document.body.contains(containerEl)) {
        document.body.append(containerEl);
      }

      app.setting.open();
      await sleep(OPEN_DELAY_IN_MILLISECONDS);
      app.setting.openTabById(settingTabId);
    },
    timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS,
    timeoutMessage: 'the Community plugins tab never listed the installed plugins',
    until: (areRowsRendered: boolean): boolean => areRowsRendered,
    vaultPath: vaultPath()
  });
}

/**
 * Opens **Settings -> Core plugins**, waiting in Node until the tab has drawn its toggles.
 *
 * Canvas is disabled here rather than in {@link announceCorePluginEnabled}, so the disabling this shot
 * does not need happens long before anything is subscribed and can never be announced into the frame.
 */
async function openCorePluginsTab(): Promise<void> {
  await pollInObsidian({
    input: {
      CORE_PLUGINS_SETTING_TAB_ID,
      DEMO_CORE_PLUGIN_ID
    },
    intervalInMilliseconds: POLL_INTERVAL_IN_MILLISECONDS,
    poll(): boolean {
      return document.querySelectorAll('.setting-item .checkbox-container').length > 0;
    },
    async start({
      app,
      CORE_PLUGINS_SETTING_TAB_ID: settingTabId,
      DEMO_CORE_PLUGIN_ID: corePluginId
    }): Promise<void> {
      const OPEN_DELAY_IN_MILLISECONDS = 500;

      // Each shot stages its own notice, so one shot's can never drift into the next one's frame.
      for (const noticeEl of document.querySelectorAll('.notice')) {
        noticeEl.detach();
      }

      const corePlugin = app.internalPlugins.getPluginById(corePluginId);
      if (!corePlugin) {
        throw new Error(`Core plugin ${corePluginId} not found`);
      }

      if (corePlugin.enabled) {
        corePlugin.disable(true);
      }

      const settingsModal: unknown = app.setting;
      const containerEl = (settingsModal as SettingsModalWithContainer).containerEl;
      if (!document.body.contains(containerEl)) {
        document.body.append(containerEl);
      }

      app.setting.open();
      await sleep(OPEN_DELAY_IN_MILLISECONDS);
      app.setting.openTabById(settingTabId);
    },
    timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS,
    timeoutMessage: 'the Core plugins tab never rendered its toggles',
    until: (areTogglesRendered: boolean): boolean => areTogglesRendered,
    vaultPath: vaultPath()
  });
}

/**
 * Captures the device framebuffer, captions it, and writes it as
 * `images/screenshots/screenshot-mobile-<index>.png`.
 *
 * The AVD is 900x1600, so the device frame IS the store's size. Asserting it here is what keeps that
 * true: run this against any other AVD and it fails loudly instead of quietly shipping an off-spec image.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const bytes = await captureObsidianScreenshot({ vaultPath: vaultPath() });

  expect(readPngDimensions(bytes)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  // Captioned AFTER capture, so the frame stays an untouched device screenshot and rewording a label
  // needs no re-shoot.
  const labeled = await labelScreenshot(bytes, { text: caption });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-mobile-${String(index)}.png`), labeled);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
