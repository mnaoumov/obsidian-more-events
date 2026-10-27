import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { MenuAnnouncer } from '../menu-patch-component.ts';

import { ALL_PROPERTIES_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The view type of the **All properties** view of the **Properties view** core plugin.
 */
const ALL_PROPERTIES_VIEW_TYPE = 'all-properties';

/**
 * Parameters for the {@link AllPropertiesMenuEventsComponent} constructor.
 */
export interface AllPropertiesMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The **All properties** view, as far as telling its item menus apart needs it. The public typings and
 * `obsidian-typings` describe none of it.
 */
interface AllPropertiesView {
  /**
   * The tree item of every property listed, by property name (`app.js:206319`).
   */
  readonly doms: Readonly<Record<string, AllPropertiesViewItem>>;

  readonly tree: AllPropertiesViewTree;
}

/**
 * One property listed in the **All properties** view.
 */
interface AllPropertiesViewItem {
  readonly property: AllPropertiesViewProperty;

  /**
   * The element its `contextmenu` listener is bound on (`app.js:205735`).
   */
  readonly selfEl: HTMLElement;
}

/**
 * The property an **All properties** item lists.
 */
interface AllPropertiesViewProperty {
  readonly name: string;
}

/**
 * The tree of the **All properties** view.
 */
interface AllPropertiesViewTree {
  /**
   * The items selected in the view (`:205762`).
   */
  readonly selectedDoms: ReadonlySet<AllPropertiesViewItem>;
}

/**
 * Publishes the context-menu event of a property in the **All properties** view.
 *
 * **That menu fires nothing, so it is announced through {@link MenuAnnouncer}.** Each item of the view binds
 * one `contextmenu` listener on its `selfEl` at construction (`app.js:205735`) and shows a menu with the
 * property types, **Rename** and **Delete** straight from it (`:205899`). That menu is recognized by the
 * listener's element, which is still `evt.currentTarget` while it is shown.
 *
 * The menu acts on the whole selection when the item is part of a multiple selection, and on that one item
 * otherwise (`:205762-205763`), so the event names the same properties the menu acts on.
 */
export class AllPropertiesMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: AllPropertiesMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a property in the **All properties** view.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is being shown from an **All properties** item's own listener.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const { currentTarget } = mouseEvent;
    for (const leaf of this.app.workspace.getLeavesOfType(ALL_PROPERTIES_VIEW_TYPE)) {
      // `Partial`, because a deferred leaf reports the view type before its real view, and its items, exist.
      const {
        doms,
        tree
      } = castTo<Partial<AllPropertiesView>>(leaf.view);
      const item = Object.values(doms ?? {}).find((dom) => dom.selfEl === currentTarget);
      if (!item) {
        continue;
      }

      const selectedItems = tree?.selectedDoms;
      const items = selectedItems && selectedItems.size > 1 && selectedItems.has(item) ? [...selectedItems] : [item];
      this.app.workspace.trigger(ALL_PROPERTIES_MENU_EVENT_NAME, menu, leaf, items.map((selectedItem) => selectedItem.property.name));
      return true;
    }

    return false;
  }
}
