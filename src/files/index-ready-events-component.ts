import type { App } from 'obsidian';

import { Component } from 'obsidian';

import { INDEX_READY_EVENT_NAME } from '../api/more-events-api.ts';

/**
Parameters for initial index observation.
*/
export interface IndexReadyEventsComponentConstructorParams {
  /**
  The application to observe.
  */
  readonly app: App;
}

/**
Announces the first clean metadata cache after each component load.
*/
export class IndexReadyEventsComponent extends Component {
  private readonly app: App;

  /** Creates the observer.
   * @param params - The application.
   */
  public constructor(params: IndexReadyEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
  Waits for parsing and link resolution without retaining an unloaded installation.
  */
  public override onload(): void {
    super.onload();
    let isActive = true;
    this.register(() => {
      isActive = false;
    });
    this.app.metadataCache.onCleanCache(() => {
      // Keep even an already-clean cache asynchronous, so listeners can subscribe during plugin load.
      queueMicrotask(() => {
        if (isActive) {
          this.app.workspace.trigger(INDEX_READY_EVENT_NAME);
        }
      });
    });
  }
}
