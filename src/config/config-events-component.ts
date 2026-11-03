import type { App } from 'obsidian';

import { Component } from 'obsidian';

import { CONFIG_CHANGED_EVENT_NAME } from '../api/more-events-api.ts';

/** Parameters for configuration observation. */
export interface ConfigEventsComponentConstructorParams {
  /** The application to observe. */
  readonly app: App;
}

/** Relays native vault configuration changes, without patching setters. */
export class ConfigEventsComponent extends Component {
  private readonly app: App;

  /** Creates the observer.
   * @param params - The application.
   */
  public constructor(params: ConfigEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /** Subscribes until this component unloads. */
  public override onload(): void {
    super.onload();
    this.registerEvent(this.app.vault.on('config-changed', (key) => {
      this.app.workspace.trigger(CONFIG_CHANGED_EVENT_NAME, key);
    }));
  }
}
