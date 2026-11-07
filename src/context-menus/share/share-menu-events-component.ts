import type {
  App,
  Events,
  Menu,
  TFile
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import {
  RECEIVE_FILES_MENU_EVENT_NAME,
  RECEIVE_TEXT_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

/**
 * The event Obsidian itself triggers on `app.workspace` for the menu of text shared to it, undocumented
 * (`app.js:145778` in 1.15.0).
 */
const OBSIDIAN_RECEIVE_TEXT_MENU_EVENT_NAME = 'receive-text-menu';

/**
 * The event Obsidian itself triggers on `app.workspace` for the menu shown once shared files are imported,
 * undocumented (`app.js:145865` in 1.15.0).
 */
const OBSIDIAN_RECEIVE_FILES_MENU_EVENT_NAME = 'receive-files-menu';

/**
 * Parameters for the {@link ShareMenuEventsComponent} constructor.
 */
export interface ShareMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the share-sheet menu events, as relays.
 *
 * **They are relays, and need no patch.** On mobile, Obsidian listens for the operating system's share intent
 * (`appShareIntent`, `app.js:145685` in 1.15.0). Shared text gets a menu built with `new Menu()`, for which it
 * triggers its own `receive-text-menu` with the menu and the text before showing it with `showAtPosition`
 * (`:145759`). Shared files get an **Import into vault** menu first; once that import has created the vault files,
 * Obsidian triggers its own `receive-files-menu` with a second menu and those files (`:145817`). Neither event is in
 * `obsidian.d.ts` or `obsidian-typings`, and Obsidian's own **Daily notes** core plugin subscribes to both
 * (`:159304`, `:159321`), which is why they are stable enough to relay.
 */
export class ShareMenuEventsComponent extends Component {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: ShareMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Subscribes to Obsidian's own events.
   */
  public override onload(): void {
    /*
     * An upcast rather than `app.workspace.on`, because no typings declare the events: `Workspace` redeclares `on` as
     * a closed set of overloads, and the generic `Events.on` is what accepts any name.
     */
    // TODO: Call `app.workspace.on` directly once `obsidian-typings` declares `receive-text-menu` and `receive-files-menu`.
    const workspaceEvents: Events = this.app.workspace;
    this.registerEvent(workspaceEvents.on(OBSIDIAN_RECEIVE_TEXT_MENU_EVENT_NAME, (menu: unknown, text: unknown) => {
      this.app.workspace.trigger(RECEIVE_TEXT_MENU_EVENT_NAME, castTo<Menu>(menu), castTo<string>(text));
    }));
    this.registerEvent(workspaceEvents.on(OBSIDIAN_RECEIVE_FILES_MENU_EVENT_NAME, (menu: unknown, files: unknown) => {
      this.app.workspace.trigger(RECEIVE_FILES_MENU_EVENT_NAME, castTo<Menu>(menu), castTo<TFile[]>(files));
    }));
  }
}
