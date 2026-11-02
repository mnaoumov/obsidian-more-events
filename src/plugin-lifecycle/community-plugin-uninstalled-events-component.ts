import type { App } from 'obsidian';

import { invokeAsyncSafely } from '@mnaoumov/typescript-lib/async';
import { Component } from 'obsidian';

import { COMMUNITY_PLUGIN_UNINSTALLED_EVENT_NAME } from '../api/more-events-api.ts';

/**
Parameters for installed-plugin observation.
*/
export interface CommunityPluginUninstalledEventsComponentConstructorParams {
  /**
  The application to observe.
  */
  readonly app: App;
}

interface InstalledPluginSnapshot {
  readonly directory: string | undefined;
  readonly name: string;
}

/**
Diffs installed manifests, independently of whether each plugin is enabled.
*/
export class CommunityPluginUninstalledEventsComponent extends Component {
  private readonly app: App;
  private readonly installed = new Map<string, InstalledPluginSnapshot>();
  private isActive = false;

  /** Creates the observer.
   * @param params - The application.
   */
  public constructor(params: CommunityPluginUninstalledEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
  Establishes the installed baseline before subscribing to the manager's debounced change.
  */
  public override onload(): void {
    super.onload();
    this.isActive = true;
    this.refreshInstalled();
    this.register(() => {
      this.isActive = false;
      this.installed.clear();
    });
    this.registerEvent(this.app.plugins.on('changed', () => {
      invokeAsyncSafely(() => this.checkRemoved());
    }));
  }

  private async checkRemoved(): Promise<void> {
    this.refreshInstalled();
    // Fix this pass's candidates before awaiting, so another refresh cannot extend it indefinitely.
    const candidates = [...this.installed];
    for (const [communityPluginId, snapshot] of candidates) {
      if (Object.hasOwn(this.app.plugins.manifests, communityPluginId) || !snapshot.directory) {
        continue;
      }
      // loadManifests clears its map BEFORE asynchronous reads. A concurrent change is not removal.
      if (await this.app.vault.adapter.exists(snapshot.directory)) {
        continue;
      }
      // Another signal may have reinstalled it, announced it, or unloaded us during the filesystem read.
      if (!this.isActive || this.installed.get(communityPluginId) !== snapshot || Object.hasOwn(this.app.plugins.manifests, communityPluginId)) {
        continue;
      }
      this.installed.delete(communityPluginId);
      this.app.workspace.trigger(COMMUNITY_PLUGIN_UNINSTALLED_EVENT_NAME, { communityPluginId, communityPluginName: snapshot.name });
    }
  }

  private refreshInstalled(): void {
    for (const [id, manifest] of Object.entries(this.app.plugins.manifests)) {
      this.installed.set(id, { directory: manifest.dir, name: manifest.name });
    }
  }
}
