import type { App } from 'obsidian';

import {
  Component,
  Notice
} from 'obsidian';
import { watchPluginApi } from 'obsidian-dev-utils/obsidian/plugin/plugin-api';

/**
 * A copy of the declaration from the plugin's repo-root `api.d.ts`.
 *
 * Copied rather than imported, and that is the point being demonstrated as well as a practicality: this
 * script runs inside the vault, where the repo is not resolvable, and a consumer plugin is in the same
 * position. Copying the declaration is the supported route — it is why that file imports nothing.
 */
interface MoreEventsApi {
  getEnabledCommunityPluginIds(): string[];
  getEnabledCorePluginIds(): string[];
  isCommunityPluginEnabled(communityPluginId: string): boolean;
  isCorePluginEnabled(corePluginId: string): boolean;
}

const PLUGIN_ID = 'more-events';
const COMMUNITY_PLUGIN_DISABLED_EVENT_NAME = 'more-events:community-plugin-disabled';
const COMMUNITY_PLUGIN_ENABLED_EVENT_NAME = 'more-events:community-plugin-enabled';
const CORE_PLUGIN_DISABLED_EVENT_NAME = 'more-events:core-plugin-disabled';
const CORE_PLUGIN_ENABLED_EVENT_NAME = 'more-events:core-plugin-enabled';
const DEMO_CORE_PLUGIN_ID = 'canvas';
const NOTICE_DURATION_IN_MILLISECONDS = 8000;

/**
 * The throwaway community plugin the toggle button below flips.
 *
 * A vault has no community plugin that is safe to toggle for a demonstration — More Events itself publishes
 * the events, CodeScript Toolkit is what runs these buttons — so the demo brings its own. It is written into
 * `.obsidian/plugins/` on first press and does nothing at all; the toggle never persists it to
 * `community-plugins.json`, so pressing these buttons leaves your configuration exactly as it found it.
 */
const DEMO_COMMUNITY_PLUGIN_ID = 'more-events-demo-plugin';
const DEMO_COMMUNITY_PLUGIN_NAME = 'More Events Demo Plugin';

const DEMO_COMMUNITY_PLUGIN_MAIN_JS = `const { Plugin } = require('obsidian');
module.exports = class extends Plugin {};
`;

const DEMO_COMMUNITY_PLUGIN_MANIFEST_JSON = JSON.stringify(
  {
    author: 'More Events demo vault',
    description: 'A do-nothing plugin that exists only so the demo vault has something safe to enable and disable.',
    id: DEMO_COMMUNITY_PLUGIN_ID,
    isDesktopOnly: false,
    minAppVersion: '0.15.0',
    name: DEMO_COMMUNITY_PLUGIN_NAME,
    version: '1.0.0'
  },
  null,
  2
);

// The subscriptions the listen buttons create, kept here so the stop buttons can find them again. A real
// plugin has its own `Component` for this and never needs a module-level handle.
let communityPluginListeningComponent: Component | null = null;
let corePluginListeningComponent: Component | null = null;

/**
 * Lists the community plugins that are loaded right now, straight from the plugin's API.
 *
 * This is the question the events cannot answer: nothing has changed, so nothing has fired, and a listener
 * that has only just loaded still has to start from somewhere.
 *
 * Manual equivalent: open **Settings -> Community plugins** and read the toggles — with the caveat that the
 * API answers for what is actually LOADED, which is not the same list when community plugins are switched
 * off wholesale.
 */
export async function showEnabledCommunityPlugins(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const enabledCommunityPluginIds = moreEventsApi.getEnabledCommunityPluginIds();
  new Notice(
    `${String(enabledCommunityPluginIds.length)} community plugins loaded:\n${enabledCommunityPluginIds.join(', ')}`,
    NOTICE_DURATION_IN_MILLISECONDS
  );
}

/**
 * Lists the core plugins that are enabled right now, straight from the plugin's API.
 *
 * Manual equivalent: open **Settings -> Core plugins** and read the toggles.
 */
export async function showEnabledCorePlugins(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const enabledCorePluginIds = moreEventsApi.getEnabledCorePluginIds();
  new Notice(
    `${String(enabledCorePluginIds.length)} core plugins enabled:\n${enabledCorePluginIds.join(', ')}`,
    NOTICE_DURATION_IN_MILLISECONDS
  );
}

/**
 * Asks the API whether the throwaway demo plugin is loaded — the same answer as the list above, for the one
 * plugin a caller actually cares about.
 *
 * Press the toggle button on **02 Community plugin events** and then press this again: the answer follows
 * immediately, because the API reads live state rather than a cached copy.
 *
 * Manual equivalent: find that plugin's row in **Settings -> Community plugins**.
 */
export async function showWhetherDemoCommunityPluginIsEnabled(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const isEnabled = moreEventsApi.isCommunityPluginEnabled(DEMO_COMMUNITY_PLUGIN_ID);
  new Notice(`${DEMO_COMMUNITY_PLUGIN_NAME} is ${isEnabled ? 'loaded' : 'not loaded'}.`);
}

/**
 * Asks the API whether one named core plugin is enabled.
 *
 * Manual equivalent: find the **Canvas** row in **Settings -> Core plugins**.
 */
export async function showWhetherCanvasIsEnabled(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const isEnabled = moreEventsApi.isCorePluginEnabled(DEMO_CORE_PLUGIN_ID);
  new Notice(`Canvas is ${isEnabled ? 'enabled' : 'disabled'}.`);
}

/**
 * Subscribes to both community-plugin events and shows a notice for each one, until the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToCommunityPlugins(app: App): void {
  if (communityPluginListeningComponent) {
    new Notice('Already listening. Toggle a community plugin in Settings -> Community plugins.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME, ({ communityPluginId, communityPluginName, isUserInitiated }) => {
      new Notice(`Enabled: ${communityPluginName} (${communityPluginId}), ${describeInitiator(isUserInitiated)}`);
    })
  );
  component.registerEvent(
    app.workspace.on(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME, ({ communityPluginId, communityPluginName, isUserInitiated }) => {
      new Notice(`Disabled: ${communityPluginName} (${communityPluginId}), ${describeInitiator(isUserInitiated)}`);
    })
  );
  component.load();
  communityPluginListeningComponent = component;

  new Notice('Listening. Now toggle a community plugin — the button below brings its own.');
}

/**
 * Subscribes to both core-plugin events and shows a notice for each one, until the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListeningToCorePlugins(app: App): void {
  if (corePluginListeningComponent) {
    new Notice('Already listening. Toggle a core plugin in Settings -> Core plugins.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, ({ corePluginId, corePluginName, isUserInitiated }) => {
      new Notice(`Enabled: ${corePluginName} (${corePluginId}), ${describeInitiator(isUserInitiated)}`);
    })
  );
  component.registerEvent(
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, ({ corePluginId, corePluginName, isUserInitiated }) => {
      new Notice(`Disabled: ${corePluginName} (${corePluginId}), ${describeInitiator(isUserInitiated)}`);
    })
  );
  component.load();
  corePluginListeningComponent = component;

  new Notice('Listening. Now toggle a core plugin in Settings -> Core plugins.');
}

/**
 * Drops both community-plugin subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToCommunityPlugins(): void {
  if (!communityPluginListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  communityPluginListeningComponent.unload();
  communityPluginListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Drops both core-plugin subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListeningToCorePlugins(): void {
  if (!corePluginListeningComponent) {
    new Notice('Not listening.');
    return;
  }

  corePluginListeningComponent.unload();
  corePluginListeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Loads the throwaway demo plugin if it is unloaded, and unloads it if it is loaded — so the
 * community-plugin events can be seen without leaving this note.
 *
 * `enablePlugin` / `disablePlugin` rather than their `...AndSave` siblings, on purpose: both raise the same
 * signal, and the plain pair never writes to `community-plugins.json`, so a demo cannot leave a throwaway
 * plugin ticked in your vault's configuration.
 *
 * That choice is also why the notice this produces says *programmatically* rather than *by the user*: the
 * `...AndSave` pair is what the Settings toggle calls and what passes Obsidian's user flag, so this button
 * demonstrates the other side of `isUserInitiated` for free.
 *
 * Manual equivalent: any plugin's toggle in **Settings -> Community plugins**.
 */
export async function toggleDemoCommunityPlugin(app: App): Promise<void> {
  await installDemoCommunityPlugin(app);

  if (app.plugins.getPlugin(DEMO_COMMUNITY_PLUGIN_ID)) {
    await app.plugins.disablePlugin(DEMO_COMMUNITY_PLUGIN_ID);
  } else {
    await app.plugins.enablePlugin(DEMO_COMMUNITY_PLUGIN_ID);
  }
}

/**
 * Turns the Canvas core plugin off if it is on, and on if it is off — so the core-plugin events can be seen
 * without leaving that note.
 *
 * Manual equivalent: the **Canvas** toggle in **Settings -> Core plugins**.
 */
export async function toggleCanvasCorePlugin(app: App): Promise<void> {
  const canvasCorePlugin = app.internalPlugins.getPluginById(DEMO_CORE_PLUGIN_ID);
  if (!canvasCorePlugin) {
    new Notice('Canvas core plugin not found.');
    return;
  }

  if (canvasCorePlugin.enabled) {
    canvasCorePlugin.disable(true);
  } else {
    await canvasCorePlugin.enable(true);
  }

  await app.internalPlugins.saveConfig();
}

/**
 * Puts Obsidian's own user flag into words for a notice.
 *
 * @param isUserInitiated - The payload's `isUserInitiated`.
 * @returns `'by the user'` or `'programmatically'`.
 */
function describeInitiator(isUserInitiated: boolean): string {
  return isUserInitiated ? 'by the user' : 'programmatically';
}

async function getApi(app: App): Promise<MoreEventsApi> {
  const moreEventsApiRef = watchPluginApi<MoreEventsApi>({
    apiVersionRange: '^1',
    app,
    component: new Component(),
    pluginId: PLUGIN_ID
  });

  return await moreEventsApiRef.whenAvailable();
}

async function installDemoCommunityPlugin(app: App): Promise<void> {
  const demoCommunityPluginFolderPath = `${app.vault.configDir}/plugins/${DEMO_COMMUNITY_PLUGIN_ID}`;

  if (!await app.vault.adapter.exists(demoCommunityPluginFolderPath)) {
    await app.vault.adapter.mkdir(demoCommunityPluginFolderPath);
  }

  await app.vault.adapter.write(`${demoCommunityPluginFolderPath}/manifest.json`, DEMO_COMMUNITY_PLUGIN_MANIFEST_JSON);
  await app.vault.adapter.write(`${demoCommunityPluginFolderPath}/main.js`, DEMO_COMMUNITY_PLUGIN_MAIN_JS);

  // Obsidian reads the plugins folder at startup, so a manifest written a moment ago is not known yet.
  await app.plugins.loadManifests();
}
