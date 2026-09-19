/**
 * @file
 *
 * Produces the desktop screenshots the community-store listing needs, driving a real Obsidian and writing
 * `images/screenshots/screenshot-desktop-N.png`.
 *
 * **This plugin renders nothing**, so what a screenshot can honestly show was a question before it was a
 * capture chore. It has no settings tab, no modal, no view, no ribbon icon and no command but the shared
 * **Open demo vault** one. The answer these two shots take: photograph the screen where the change
 * actually happens — **Settings -> Core plugins**, then **Settings -> Community plugins** — with a
 * listener's notice on it. Cause and effect are then in one frame, and the frame needs no invented note
 * text to explain itself.
 *
 * **The notice is raised by a listener this suite registers, not by the plugin.** That is the honest
 * picture of what the plugin does — it publishes an event, and something else reacts — and it is the same
 * two `app.workspace.on(...)` calls the README's snippet and the demo vault's buttons make. The captions
 * say so: they credit the listening plugin, never a UI this one does not have. A DevTools console showing
 * the events arrive was the other candidate and cannot be photographed, since `captureObsidianScreenshot`
 * photographs the Obsidian window and DevTools is a separate one.
 *
 * **The notices are raised with duration `0`.** A capture is not a demonstration: the default 5s notice
 * can expire between the toggle and the frame, which would silently produce a picture of an ordinary
 * settings tab. Each shot clears the notice container before it stages its own, so one shot's notice can
 * never drift into the next one's frame.
 *
 * **The core shot has to disable Canvas BEFORE it subscribes.** The harness's vault has Canvas on, so
 * subscribing first and then toggling twice would stack a `Disabled:` notice under the `Enabled:` one and
 * photograph both.
 *
 * The community shot brings its own throwaway plugin, exactly as
 * `community-plugin-events.desktop.integration.test.ts` does and for the same reason: toggling More Events
 * itself would unload the component doing the publishing, and toggling whatever else the harness installed
 * would make the frame depend on the run. `enablePluginAndSave` rather than `enablePlugin`, because the
 * row's toggle in the photographed tab reads from the persisted list.
 *
 * **Every shot hides the vault name first, and that is what makes a re-run produce the same bytes.** The
 * harness opens a temporary vault called `temp-vault-<random>`, Obsidian prints that name in the
 * vault-switcher row at the bottom of the left sidedock, and the caption band drawn over that strip is
 * near-opaque rather than opaque — so the random suffix bled through at about 6 % brightness and made
 * `images/screenshots/screenshot-desktop-1.png` differ on every capture. Invisible to a reader, but it
 * meant `npm run capture:screenshots` always left a dirty tree and no reviewer could tell a real change
 * from noise. Measured as 349 differing pixels in one box, `x:153-197 y:774-783`, which is exactly the
 * width of the six random characters.
 */

import type { InternalPluginNameType } from '@obsidian-typings/obsidian-public-latest';

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import {
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
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

const WIDTH_IN_PIXELS = 1200;
const HEIGHT_IN_PIXELS = 800;

const TEST_TIMEOUT_IN_MILLISECONDS = 120_000;

/*
 * A cast rather than `InternalPluginName.Canvas`, for the reason
 * `core-plugin-events.desktop.integration.test.ts` records: that enum is a VALUE, and importing it pulls
 * `@obsidian-typings/.../implementations` into the Node-side process, where `obsidian` does not resolve.
 */
const DEMO_CORE_PLUGIN_ID = 'canvas' as InternalPluginNameType;
const CORE_PLUGINS_SETTING_TAB_ID = 'plugins';
const COMMUNITY_PLUGINS_SETTING_TAB_ID = 'community-plugins';

/*
 * The id lands in the notice the shot is of — `Enabled: Meeting Notes (meeting-notes)` — so it has to read
 * like any plugin's, not like a fixture of this repo's. `community-plugin-events.desktop.integration.test.ts`
 * namespaces its own throwaway for collision safety; here the vault is a fresh temporary one holding exactly
 * this plugin, so there is nothing to collide with and the frame is what the name has to serve.
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
    async callback({ app }) {
      const SETTLE_DELAY_IN_MILLISECONDS = 1000;

      app.changeTheme('obsidian');

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);
    },
    vaultPath: vaultPath()
  });
});

describe('desktop store screenshots', () => {
  it('1 - a core plugin comes back, and a listener is told', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    const noticeTexts = await stageCorePluginEvent();

    expect(noticeTexts).toStrictEqual(['Enabled: Canvas (canvas)']);
    await shoot(1, 'Canvas enabled in Settings — a listening plugin is told');
  });

  it('2 - the same for community plugins', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    const noticeTexts = await stageCommunityPluginEvent();

    expect(noticeTexts).toStrictEqual([
      `Enabled: ${SCREENSHOT_COMMUNITY_PLUGIN_NAME} (${SCREENSHOT_COMMUNITY_PLUGIN_ID})`
    ]);
    await shoot(2, 'Any community plugin too, named the moment it loads');
  });
});

/**
 * Hides every element that displays the vault's name, so the frame does not depend on the random suffix
 * of the harness's temporary vault.
 *
 * Keyed on `app.vault.getName()` rather than on a class of Obsidian's chrome, deliberately: the varying
 * thing is the DATA, and the row that renders it has moved between Obsidian versions before. Obsidian's
 * own `hide()` rather than an inline `style.visibility` or an injected stylesheet, because those are what
 * `obsidianmd/no-static-styles-assignment` and `obsidianmd/no-forbidden-elements` respectively refuse; the
 * row it collapses sits under the caption band either way, so nothing a reader sees moves.
 *
 * Re-applied before every shot rather than once in `beforeAll`, because a re-render of the sidedock
 * between the two shots would otherwise put the name back. Hiding leaves the text in place, so the second
 * call still finds what the first one hid.
 *
 * @returns The number of elements hidden. The caller asserts it is non-zero: an Obsidian that renames or
 * relocates the row should fail this suite loudly, not quietly go back to rewriting the PNGs.
 */
async function hideVaultName(): Promise<number> {
  return await evalInObsidian({
    callback({ app }): number {
      const vaultName = app.vault.getName();
      const vaultNameEls = [...document.querySelectorAll('*')]
        .filter((el): el is HTMLElement => el.instanceOf(HTMLElement) && el.childElementCount === 0 && el.textContent === vaultName);

      for (const vaultNameEl of vaultNameEls) {
        vaultNameEl.hide();
      }

      return vaultNameEls.length;
    },
    vaultPath: vaultPath()
  });
}

/**
 * Captures the window, captions it, and writes it as
 * `images/screenshots/screenshot-desktop-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  expect(await hideVaultName()).toBeGreaterThan(0);

  const bytes = await captureObsidianScreenshot({
    heightInPixels: HEIGHT_IN_PIXELS,
    vaultPath: vaultPath(),
    widthInPixels: WIDTH_IN_PIXELS
  });

  const labeled = await labelScreenshot(bytes, { text: caption });

  expect(readPngDimensions(labeled)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-desktop-${String(index)}.png`), labeled);
}

/**
 * Installs a throwaway community plugin, opens **Settings -> Community plugins**, subscribes, and enables
 * it — so the frame holds the tab, the plugin's row and the notice its enabling produced.
 *
 * @returns The text of every notice on screen when the staging finished.
 */
async function stageCommunityPluginEvent(): Promise<string[]> {
  return await evalInObsidian({
    async callback({
      app,
      COMMUNITY_PLUGIN_ENABLED_EVENT_NAME: enabledEventName,
      COMMUNITY_PLUGINS_SETTING_TAB_ID: settingTabId,
      lib,
      SCREENSHOT_COMMUNITY_PLUGIN_ID: communityPluginId,
      SCREENSHOT_COMMUNITY_PLUGIN_MAIN_JS: mainJs,
      SCREENSHOT_COMMUNITY_PLUGIN_MANIFEST_JSON: manifestJson
    }): Promise<string[]> {
      const WAIT_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1200;
      const STICKY_NOTICE_DURATION_IN_MILLISECONDS = 0;

      for (const noticeEl of document.querySelectorAll('.notice')) {
        noticeEl.detach();
      }

      const communityPluginFolderPath = `${app.vault.configDir}/plugins/${communityPluginId}`;
      await app.vault.adapter.mkdir(communityPluginFolderPath);
      await app.vault.adapter.write(`${communityPluginFolderPath}/manifest.json`, manifestJson);
      await app.vault.adapter.write(`${communityPluginFolderPath}/main.js`, mainJs);
      // Obsidian reads the plugins folder at startup, so a manifest written a moment ago is not known yet.
      await app.plugins.loadManifests();

      app.setting.open();
      app.setting.openTabById(settingTabId);

      await lib.waitUntil({
        message: 'the Community plugins tab to list the installed plugins',
        predicate: () => document.querySelectorAll('.setting-item[data-plugin-id]').length > 0,
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
      });

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
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
        });

        await sleep(SETTLE_DELAY_IN_MILLISECONDS);

        return [...document.querySelectorAll('.notice')].map((noticeEl) => noticeEl.textContent);
      } finally {
        app.workspace.offref(enabledRef);
      }
    },
    input: {
      COMMUNITY_PLUGIN_ENABLED_EVENT_NAME,
      COMMUNITY_PLUGINS_SETTING_TAB_ID,
      SCREENSHOT_COMMUNITY_PLUGIN_ID,
      SCREENSHOT_COMMUNITY_PLUGIN_MAIN_JS,
      SCREENSHOT_COMMUNITY_PLUGIN_MANIFEST_JSON
    },
    vaultPath: vaultPath()
  });
}

/**
 * Opens **Settings -> Core plugins**, subscribes, and turns Canvas back on — so the frame holds the tab,
 * its toggles and the notice the enabling produced.
 *
 * @returns The text of every notice on screen when the staging finished.
 */
async function stageCorePluginEvent(): Promise<string[]> {
  return await evalInObsidian({
    async callback({
      app,
      CORE_PLUGIN_ENABLED_EVENT_NAME: enabledEventName,
      CORE_PLUGINS_SETTING_TAB_ID: settingTabId,
      DEMO_CORE_PLUGIN_ID: corePluginId,
      lib
    }): Promise<string[]> {
      const WAIT_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1200;
      const STICKY_NOTICE_DURATION_IN_MILLISECONDS = 0;

      for (const noticeEl of document.querySelectorAll('.notice')) {
        noticeEl.detach();
      }

      const corePlugin = app.internalPlugins.getPluginById(corePluginId);
      if (!corePlugin) {
        throw new Error(`Core plugin ${corePluginId} not found`);
      }

      // Before subscribing, so the disabling this shot does not need is never announced into the frame.
      if (corePlugin.enabled) {
        corePlugin.disable(true);
      }

      app.setting.open();
      app.setting.openTabById(settingTabId);

      await lib.waitUntil({
        message: 'the Core plugins tab to render its toggles',
        predicate: () => document.querySelectorAll('.setting-item .checkbox-container').length > 0,
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
      });

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
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
        });

        await sleep(SETTLE_DELAY_IN_MILLISECONDS);

        return [...document.querySelectorAll('.notice')].map((noticeEl) => noticeEl.textContent);
      } finally {
        app.workspace.offref(enabledRef);
      }
    },
    input: {
      CORE_PLUGIN_ENABLED_EVENT_NAME,
      CORE_PLUGINS_SETTING_TAB_ID,
      DEMO_CORE_PLUGIN_ID
    },
    vaultPath: vaultPath()
  });
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
