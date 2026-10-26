import type {
  App,
  Events,
  MarkdownView,
  MarkdownViewModeType,
  Menu,
  TFile
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import {
  MARKDOWN_PROPERTIES_MENU_EVENT_NAME,
  MARKDOWN_VIEWPORT_MENU_EVENT_NAME
} from './more-events-api.ts';

/**
 * The event Obsidian itself triggers on `app.workspace` for a note's viewport menu, undocumented: a right-click in
 * the Reading view's margin (`app.js:100283` in 1.15.0), and in the editor's margin or gutter (`:143856`).
 */
const OBSIDIAN_MARKDOWN_VIEWPORT_MENU_EVENT_NAME = 'markdown-viewport-menu';

/**
 * The event Obsidian itself triggers on `app.workspace` for the menu of a note's **Properties** heading,
 * undocumented (`app.js:90735` in 1.15.0).
 */
const OBSIDIAN_MARKDOWN_PROPERTIES_MENU_EVENT_NAME = 'markdown-properties-menu';

/**
 * Parameters for the {@link MarkdownMenuEventsComponent} constructor.
 */
export interface MarkdownMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes a note's viewport menu and **Properties** heading menu events, as relays.
 *
 * **Both are relays, and need no patch.** Obsidian already triggers its own `markdown-viewport-menu` and
 * `markdown-properties-menu`, but documents and types neither. Obsidian itself adds the viewport menu's
 * **Readable line length**, **Line numbers** and **Inline title** items from a listener on its own event
 * (`app.js:135663` in 1.15.0), which is why it is stable enough to relay.
 *
 * Obsidian passes the viewport menu a fourth argument, the part of the view that was clicked, and it is `'gutter'` at
 * every call site; it is not relayed, so a later value can still be appended as a new argument with a meaning.
 */
export class MarkdownMenuEventsComponent extends Component {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: MarkdownMenuEventsComponentConstructorParams) {
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
    // TODO: Call `app.workspace.on` directly once `obsidian-typings` declares `markdown-viewport-menu` and `markdown-properties-menu`.
    const workspaceEvents: Events = this.app.workspace;
    this.registerEvent(workspaceEvents.on(OBSIDIAN_MARKDOWN_VIEWPORT_MENU_EVENT_NAME, (menu: unknown, view: unknown, mode: unknown) => {
      this.app.workspace.trigger(
        MARKDOWN_VIEWPORT_MENU_EVENT_NAME,
        castTo<Menu>(menu),
        castTo<MarkdownView>(view),
        castTo<MarkdownViewModeType>(mode)
      );
    }));
    this.registerEvent(workspaceEvents.on(OBSIDIAN_MARKDOWN_PROPERTIES_MENU_EVENT_NAME, (menu: unknown, file: unknown) => {
      this.app.workspace.trigger(MARKDOWN_PROPERTIES_MENU_EVENT_NAME, castTo<Menu>(menu), castTo<null | TFile>(file));
    }));
  }
}
