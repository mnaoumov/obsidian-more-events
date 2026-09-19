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
  getEnabledCorePluginIds(): string[];
  isCorePluginEnabled(corePluginId: string): boolean;
}

const PLUGIN_ID = 'more-events';
const CORE_PLUGIN_ENABLED_EVENT_NAME = 'more-events:core-plugin-enabled';
const CORE_PLUGIN_DISABLED_EVENT_NAME = 'more-events:core-plugin-disabled';
const DEMO_CORE_PLUGIN_ID = 'canvas';
const NOTICE_DURATION_IN_MILLISECONDS = 8000;

// The subscription the listen button creates, kept here so the stop button can find it again. A real
// plugin has its own `Component` for this and never needs a module-level handle.
let listeningComponent: Component | null = null;

/**
 * Lists the core plugins that are enabled right now, straight from the plugin's API.
 *
 * This is the question the events cannot answer: nothing has changed, so nothing has fired, and a listener
 * that has only just loaded still has to start from somewhere.
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
 * Asks the API whether one named core plugin is enabled — the same answer as the list above, for the one
 * plugin a caller actually cares about.
 *
 * Manual equivalent: find that plugin's row in **Settings -> Core plugins**.
 */
export async function showWhetherCanvasIsEnabled(app: App): Promise<void> {
  const moreEventsApi = await getApi(app);
  const isEnabled = moreEventsApi.isCorePluginEnabled(DEMO_CORE_PLUGIN_ID);
  new Notice(`Canvas is ${isEnabled ? 'enabled' : 'disabled'}.`);
}

/**
 * Subscribes to both events and shows a notice for each one, until the stop button below.
 *
 * Manual equivalent: the same two `app.workspace.on(...)` calls from your own plugin's `onload`.
 */
export function startListening(app: App): void {
  if (listeningComponent) {
    new Notice('Already listening. Toggle a core plugin in Settings -> Core plugins.');
    return;
  }

  const component = new Component();
  component.registerEvent(
    app.workspace.on(CORE_PLUGIN_ENABLED_EVENT_NAME, ({ corePluginId, corePluginName }) => {
      new Notice(`Enabled: ${corePluginName} (${corePluginId})`);
    })
  );
  component.registerEvent(
    app.workspace.on(CORE_PLUGIN_DISABLED_EVENT_NAME, ({ corePluginId, corePluginName }) => {
      new Notice(`Disabled: ${corePluginName} (${corePluginId})`);
    })
  );
  component.load();
  listeningComponent = component;

  new Notice('Listening. Now toggle a core plugin in Settings -> Core plugins.');
}

/**
 * Drops both subscriptions.
 *
 * Manual equivalent: unloading the component that registered them, which a plugin gets for free when it is
 * disabled.
 */
export function stopListening(): void {
  if (!listeningComponent) {
    new Notice('Not listening.');
    return;
  }

  listeningComponent.unload();
  listeningComponent = null;
  new Notice('Stopped listening.');
}

/**
 * Turns the Canvas core plugin off if it is on, and on if it is off — so the events can be seen without
 * leaving this note.
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

async function getApi(app: App): Promise<MoreEventsApi> {
  const moreEventsApiRef = watchPluginApi<MoreEventsApi>({
    apiVersionRange: '^1',
    app,
    component: new Component(),
    pluginId: PLUGIN_ID
  });

  return await moreEventsApiRef.whenAvailable();
}
