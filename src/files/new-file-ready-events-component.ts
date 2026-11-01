import type {
  App,
  ObsidianProtocolData,
  ObsidianProtocolHandler,
  TAbstractFile
} from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { TFile } from 'obsidian';

import { NEW_FILE_READY_EVENT_NAME } from '../api/more-events-api.ts';

/**
 * Parameters for the {@link NewFileReadyEventsComponent} constructor.
 */
export interface NewFileReadyEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The files created while one `obsidian://` action was running.
 */
type UriActionRun = Set<TFile>;

/**
 * Announces `more-events:new-file-ready` once a newly created file has its initial content.
 *
 * Obsidian's `create` is too early for a file an `obsidian://` action writes: the `new` action (what Web Clipper
 * and every `obsidian://new?content=` link use) creates the file EMPTY with `fileManager.createNewFile`, which fires
 * `create`, and only then writes the content with `vault.modify` or `fileManager.insertIntoFile`; `unique` and
 * `daily` do the same with their own note. Nothing announces the end of that write, so a listener on `create`
 * reads an empty file and has to guess how long to wait.
 *
 * **So every `obsidian://` handler is wrapped, and a file created while one runs is held until its returned
 * promise settles.** A file created with no action running is announced straight from its `create`, since
 * `vault.create` writes the content before it fires. The handlers live in `app.workspace.protocolHandler.handlers`;
 * `dispatch` calls them and drops the promise, and on the desktop app it is reached through `window.OBS_ACT`, which
 * holds a copy bound when the app started, so neither `dispatch` nor that global is a seam. The map entries are:
 * this component wraps the ones already there, and `register` / `unregister` are patched so a handler registered
 * later (**Daily notes** and **Unique note creator** register theirs when enabled, a plugin when it loads) is wrapped
 * too and can still be unregistered by the function its owner holds.
 */
export class NewFileReadyEventsComponent extends MonkeyAroundComponent {
  private readonly activeRuns = new Set<UriActionRun>();
  private readonly app: App;
  private isActive = false;
  private readonly originalHandlers = new WeakMap<ObsidianProtocolHandler, ObsidianProtocolHandler>();
  private readonly wrappedHandlers = new WeakMap<ObsidianProtocolHandler, ObsidianProtocolHandler>();

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: NewFileReadyEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Wraps the protocol handlers and, once the layout is ready, starts announcing created files.
   */
  public override onload(): void {
    super.onload();
    this.isActive = true;

    const { protocolHandler } = this.app.workspace;
    for (const [action, handler] of protocolHandler.handlers) {
      protocolHandler.handlers.set(action, this.wrapHandler(handler));
    }

    this.registerMethodPatch({
      $object: protocolHandler,
      methodName: 'register',
      patchHandler: ({
        originalArguments: [action, handler],
        originalMethodBound
      }) => {
        originalMethodBound(action, this.wrapHandler(handler));
      }
    });

    this.registerMethodPatch({
      $object: protocolHandler,
      methodName: 'unregister',
      patchHandler: ({
        fallback,
        originalArguments: [action, handler],
        originalMethodBound
      }) => {
        const wrappedHandler = handler && this.wrappedHandlers.get(handler);
        if (wrappedHandler && protocolHandler.handlers.get(action) === wrappedHandler) {
          originalMethodBound(action, wrappedHandler);
          return;
        }
        fallback();
      }
    });

    this.register(() => {
      this.isActive = false;
      this.activeRuns.clear();
      for (const [action, handler] of protocolHandler.handlers) {
        const originalHandler = this.originalHandlers.get(handler);
        if (originalHandler) {
          protocolHandler.handlers.set(action, originalHandler);
        }
      }
    });

    // Obsidian fires `create` for every file in the vault while it loads, before the layout is ready.
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on('create', this.handleCreate.bind(this)));
    });
  }

  private announce(file: TFile): void {
    this.app.workspace.trigger(NEW_FILE_READY_EVENT_NAME, file);
  }

  private createWrappedHandler(handler: ObsidianProtocolHandler): ObsidianProtocolHandler {
    const runUriAction = this.runUriAction.bind(this);
    // A `function` rather than an arrow, to keep the `this` Obsidian calls the handler with.
    return function wrappedHandler(this: unknown, params: ObsidianProtocolData): unknown {
      return runUriAction(handler, this, params);
    };
  }

  private endRun(run: UriActionRun): void {
    if (!this.activeRuns.delete(run)) {
      return;
    }

    for (const file of run) {
      if (this.isHeld(file)) {
        continue;
      }
      // Deleted while it was held: there is nothing left to announce.
      if (this.app.vault.getAbstractFileByPath(file.path) !== file) {
        continue;
      }
      this.announce(file);
    }
  }

  private handleCreate(file: TAbstractFile): void {
    if (!(file instanceof TFile)) {
      return;
    }

    if (this.activeRuns.size === 0) {
      this.announce(file);
      return;
    }

    for (const run of this.activeRuns) {
      run.add(file);
    }
  }

  private isHeld(file: TFile): boolean {
    for (const run of this.activeRuns) {
      if (run.has(file)) {
        return true;
      }
    }
    return false;
  }

  private runUriAction(handler: ObsidianProtocolHandler, thisArgument: unknown, params: ObsidianProtocolData): unknown {
    if (!this.isActive) {
      return handler.call(thisArgument, params);
    }

    const run: UriActionRun = new Set<TFile>();
    this.activeRuns.add(run);

    let result: unknown;
    try {
      result = handler.call(thisArgument, params);
    } catch (error) {
      this.endRun(run);
      throw error;
    }

    if (result instanceof Promise) {
      const endRun = (): void => {
        this.endRun(run);
      };
      // The handler's own promise is returned untouched, so a rejection still reaches whoever it reached before.
      result.then(endRun).catch(endRun);
    } else {
      this.endRun(run);
    }

    return result;
  }

  private wrapHandler(handler: ObsidianProtocolHandler): ObsidianProtocolHandler {
    if (this.originalHandlers.has(handler)) {
      return handler;
    }

    let wrappedHandler = this.wrappedHandlers.get(handler);
    if (!wrappedHandler) {
      wrappedHandler = this.createWrappedHandler(handler);
      this.wrappedHandlers.set(handler, wrappedHandler);
      this.originalHandlers.set(wrappedHandler, handler);
    }
    return wrappedHandler;
  }
}
