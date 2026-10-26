import type {
  App,
  Events,
  Menu,
  View
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import { SEARCH_RESULTS_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The event Obsidian itself triggers on `app.workspace` for the **Search** view's results menu, undocumented
 * (`app.js:127757` in 1.15.0).
 */
const OBSIDIAN_SEARCH_RESULTS_MENU_EVENT_NAME = 'search:results-menu';

/**
 * Parameters for the {@link SearchMenuEventsComponent} constructor.
 */
export interface SearchMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the **Search** view's results menu event, as a relay.
 *
 * **It is a relay, and needs no patch.** Obsidian already triggers its own `search:results-menu` with the menu and
 * the **Search** view, when the result count above the results is clicked, but documents and types it nowhere. Its
 * own **Bookmarks** core plugin subscribes to it (`app.js:151696` in 1.15.0), which is why it is stable enough to
 * relay.
 */
export class SearchMenuEventsComponent extends Component {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: SearchMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Subscribes to Obsidian's own event.
   */
  public override onload(): void {
    /*
     * An upcast rather than `app.workspace.on`, because no typings declare the event: `Workspace` redeclares `on` as
     * a closed set of overloads, and the generic `Events.on` is what accepts any name.
     */
    // TODO: Call `app.workspace.on` directly once `obsidian-typings` declares `search:results-menu`.
    const workspaceEvents: Events = this.app.workspace;
    this.registerEvent(workspaceEvents.on(OBSIDIAN_SEARCH_RESULTS_MENU_EVENT_NAME, (menu: unknown, searchView: unknown) => {
      this.app.workspace.trigger(SEARCH_RESULTS_MENU_EVENT_NAME, castTo<Menu>(menu), castTo<View>(searchView));
    }));
  }
}
