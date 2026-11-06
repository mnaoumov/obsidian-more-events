import type {
  App,
  EventRef
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { SyncStatus } from '../api/more-events-api.ts';

import { SYNC_STATUS_CHANGED_EVENT_NAME } from '../api/more-events-api.ts';

/**
 * The id of the core **Sync** plugin.
 */
const SYNC_PLUGIN_ID = 'sync';

/**
 * Parameters for the {@link SyncStatusEventsComponent} constructor.
 */
export interface SyncStatusEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The app, as far as reaching the core **Sync** plugin needs it.
 */
interface AppWithInternalPlugins {
  readonly internalPlugins: InternalPlugins;
}

/**
 * The core plugin manager, as far as this component needs it.
 */
interface InternalPlugins {
  readonly getPluginById: (id: string) => null | SyncPluginWrapper | undefined;
  readonly on: (name: 'change', callback: (plugin: unknown) => unknown) => EventRef;
}

/**
 * The core **Sync** plugin's instance, as far as this component needs it.
 */
interface SyncPluginInstance {
  /**
   * The vault's sync state (`app.js:171065` in 1.15.0).
   */
  readonly getStatus: () => SyncStatus;

  /**
   * Fired by `setStatus`, `requestSync` and `setDirty` (`app.js:171062`-`:171121`, `:171727` in 1.15.0): for every
   * progress line, not only for a change of state.
   */
  readonly on: (name: 'status-change', callback: () => unknown) => EventRef;
}

/**
 * The core **Sync** plugin's wrapper, which is the same object across a disable and a re-enable.
 */
interface SyncPluginWrapper {
  readonly enabled: boolean;
  readonly instance: SyncPluginInstance;
}

/**
 * Announces every change of the core **Sync** plugin's state, `getStatus()`, with no patch.
 *
 * **The instance's own `status-change` is the signal, and its `getStatus()` is the answer.** Obsidian fires
 * `status-change` for every progress line of a sync (each upload, download and comparison), so the component keeps the
 * last status it saw and announces only when `getStatus()` answers something else. `syncing` to `synced` is the vault
 * going idle.
 *
 * **Silent while the plugin is disabled.** `InternalPlugin.disable` clears `enabled` and fires no `status-change`, and
 * the sync loop under way may still fire one afterwards, so nothing is announced while `enabled` is `false`. The
 * manager's `change` takes a fresh baseline on a re-enable, which is announced from its next real transition.
 */
export class SyncStatusEventsComponent extends Component {
  private readonly app: App;
  private lastStatus: null | SyncStatus = null;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: SyncStatusEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Takes the baseline, then subscribes until this component unloads.
   */
  public override onload(): void {
    super.onload();
    const internalPlugins = castTo<AppWithInternalPlugins>(this.app).internalPlugins;
    const wrapper = internalPlugins.getPluginById(SYNC_PLUGIN_ID);
    if (!wrapper) {
      return;
    }

    this.lastStatus = readStatus(wrapper);
    this.registerEvent(wrapper.instance.on('status-change', () => {
      this.onStatusChange(wrapper);
    }));
    this.registerEvent(internalPlugins.on('change', (plugin) => {
      if (plugin === wrapper) {
        this.lastStatus = readStatus(wrapper);
      }
    }));
  }

  private onStatusChange(wrapper: SyncPluginWrapper): void {
    const status = readStatus(wrapper);
    const previousStatus = this.lastStatus;
    this.lastStatus = status;
    if (status === null || previousStatus === null || status === previousStatus) {
      return;
    }
    this.app.workspace.trigger(SYNC_STATUS_CHANGED_EVENT_NAME, status, previousStatus);
  }
}

/**
 * Reads the plugin's status, or `null` while it is disabled.
 *
 * @param wrapper - The core **Sync** plugin's wrapper.
 * @returns The status.
 */
function readStatus(wrapper: SyncPluginWrapper): null | SyncStatus {
  return wrapper.enabled ? wrapper.instance.getStatus() : null;
}
