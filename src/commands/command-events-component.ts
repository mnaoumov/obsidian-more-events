import type { App } from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';

import { COMMAND_EXECUTED_EVENT_NAME } from '../api/more-events-api.ts';

/**
Parameters for the command announcer.
*/
export interface CommandEventsComponentConstructorParams {
  /**
  The application whose command manager is observed.
  */
  readonly app: App;
}

/**
Announces successful synchronous command dispatch, not asynchronous callback completion.
*/
export class CommandEventsComponent extends MonkeyAroundComponent {
  private readonly app: App;

  /** Creates the announcer.
   * @param params - The application.
   */
  public constructor(params: CommandEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
  Installs the command manager patch.
  */
  public override onload(): void {
    super.onload();
    if (typeof this.app.commands.executeCommand !== 'function') {
      return;
    }
    this.registerMethodPatch({
      $object: this.app.commands,
      methodName: 'executeCommand',
      patchHandler: ({ fallback, originalArguments: [command] }) => {
        const { id, name } = command;
        const isResult = fallback();
        if (isResult) {
          this.app.workspace.trigger(COMMAND_EXECUTED_EVENT_NAME, { id, name });
        }
        return isResult;
      }
    });
  }
}
