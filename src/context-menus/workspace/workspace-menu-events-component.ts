import type {
  App,
  Events,
  Menu,
  WorkspaceLeaf,
  WorkspaceTabs
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import {
  LEAF_MENU_EVENT_NAME,
  TAB_GROUP_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

/**
 * The event Obsidian itself triggers on `app.workspace` for a leaf's menu, undocumented: a tab header's right-click
 * (`app.js:77507` in 1.15.0) and the view's **More options** button (`:65063`).
 */
const OBSIDIAN_LEAF_MENU_EVENT_NAME = 'leaf-menu';

/**
 * The event Obsidian itself triggers on `app.workspace` for a tab group's tab list menu, undocumented (`app.js:76493`
 * in 1.15.0).
 */
const OBSIDIAN_TAB_GROUP_MENU_EVENT_NAME = 'tab-group-menu';

/**
 * Parameters for the {@link WorkspaceMenuEventsComponent} constructor.
 */
export interface WorkspaceMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the leaf menu and tab group menu events, as relays.
 *
 * **Both are relays, and need no patch.** Obsidian already triggers its own `leaf-menu` and `tab-group-menu` with the
 * menu and its subject, but documents and types neither. Its own **Bookmarks** core plugin subscribes to both
 * (`app.js:151702` in 1.15.0), which is why they are stable enough to relay. This component re-publishes them under
 * `more-events:` names, so a consumer has one typed name to depend on and this plugin is the one place that has to
 * follow Obsidian if it ever renames its own.
 */
export class WorkspaceMenuEventsComponent extends Component {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: WorkspaceMenuEventsComponentConstructorParams) {
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
    // TODO: Call `app.workspace.on` directly once `obsidian-typings` declares `leaf-menu` and `tab-group-menu`.
    const workspaceEvents: Events = this.app.workspace;
    this.registerEvent(workspaceEvents.on(OBSIDIAN_LEAF_MENU_EVENT_NAME, (menu: unknown, leaf: unknown) => {
      this.app.workspace.trigger(LEAF_MENU_EVENT_NAME, castTo<Menu>(menu), castTo<WorkspaceLeaf>(leaf));
    }));
    this.registerEvent(workspaceEvents.on(OBSIDIAN_TAB_GROUP_MENU_EVENT_NAME, (menu: unknown, tabGroup: unknown) => {
      this.app.workspace.trigger(TAB_GROUP_MENU_EVENT_NAME, castTo<Menu>(menu), castTo<WorkspaceTabs>(tabGroup));
    }));
  }
}
