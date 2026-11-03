import type { App } from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { WorkspaceLeaf } from 'obsidian';

import { BEFORE_LINK_OPEN_EVENT_NAME } from '../api/more-events-api.ts';

/** Parameters for internal-link observation. */
export interface BeforeLinkOpenEventsComponentConstructorParams {
  /** The application to observe. */
  readonly app: App;
}

/** Announces internal link requests before resolution, creation or navigation. */
export class BeforeLinkOpenEventsComponent extends MonkeyAroundComponent {
  private readonly app: App;

  /** Creates the observer.
   * @param params - The application.
   */
  public constructor(params: BeforeLinkOpenEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /** Installs one shared leaf patch, restored on unload. */
  public override onload(): void {
    super.onload();
    this.registerMethodPatch({
      $object: WorkspaceLeaf.prototype,
      methodName: 'openLinkText',
      patchHandler: ({ fallback, originalArguments: [linktext, sourcePath], originalThis: leaf }) => {
        let isOurs = false;
        this.app.workspace.iterateAllLeaves((candidate) => {
          if (candidate === leaf) {
            isOurs = true;
          }
        });
        if (isOurs) {
          this.app.workspace.trigger(BEFORE_LINK_OPEN_EVENT_NAME, leaf, { linktext, sourcePath });
        }
        return fallback();
      }
    });
  }
}
