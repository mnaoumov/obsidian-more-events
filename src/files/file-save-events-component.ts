import type { App } from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { noop } from '@mnaoumov/typescript-lib/function';

import {
  AFTER_SAVE_EVENT_NAME,
  BEFORE_SAVE_EVENT_NAME
} from '../api/more-events-api.ts';

/**
Parameters for the file save announcer.
*/
export interface FileSaveEventsComponentConstructorParams {
  /**
  The application whose text writes are announced.
  */
  readonly app: App;
}

/**
Announces text saves through Vault.modify, including manual saves, autosaves and plugin writes.
*/
export class FileSaveEventsComponent extends MonkeyAroundComponent {
  private readonly app: App;
  private isActive = false;

  /** Creates the announcer.
   * @param params - The application.
   */
  public constructor(params: FileSaveEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
  Installs the shared text-write patch.
  */
  public override onload(): void {
    super.onload();
    this.isActive = true;
    this.register(() => {
      this.isActive = false;
    });
    this.registerMethodPatch({
      $object: this.app.vault,
      methodName: 'modify',
      patchHandler: ({ fallback, originalArguments: [file, content] }) => {
        this.app.workspace.trigger(BEFORE_SAVE_EVENT_NAME, file, { content });
        const result = fallback();
        // Observe completion without replacing the promise or swallowing the caller's rejection.
        result.then(() => {
          if (this.isActive) {
            this.app.workspace.trigger(AFTER_SAVE_EVENT_NAME, file, { content });
          }
        }).catch(noop);
        return result;
      }
    });
  }
}
