import type { MetadataEditor } from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { PropertyMenuItem } from '../../../api.d.ts';
import type { MenuAnnouncer } from '../menu-patch-component.ts';

import { PROPERTY_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The view types whose view shows a note's properties: the Markdown view and the **Properties** view.
 */
const PROPERTIES_EDITOR_VIEW_TYPES = ['markdown', 'file-properties'] as const;

/**
 * Parameters for the {@link PropertyMenuEventsComponent} constructor.
 */
export interface PropertyMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * A view that shows a note's properties, as far as finding the property an icon belongs to needs it.
 */
interface MetadataEditorViewLike {
  /**
   * The view's properties editor.
   */
  readonly metadataEditor: MetadataEditor;
}

/**
 * Publishes the event of a property's own menu, the one its icon opens in the properties editor.
 *
 * **That menu fires nothing, so it is announced through {@link MenuAnnouncer}.** Each property row binds one
 * `contextmenu` listener and one `click` listener on its `iconEl` when it is rendered (`app.js:107336`), and both
 * reach `showPropertyMenu`, which builds a `new Menu()` with the property type submenu, the clipboard items and
 * **Remove**, and shows it with `showAtMouseEvent` synchronously (`:107585`). So the event's `currentTarget` is the
 * icon, which is matched against the `iconEl` of each row of a view's `metadataEditor.rendered`. The icon element
 * carries no back-reference to its property, which is why the rows are walked.
 *
 * Only Markdown and **Properties** leaves are searched, so a properties editor outside every leaf, such as a hover
 * popover's, is not announced.
 */
export class PropertyMenuEventsComponent extends Component implements MenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PropertyMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a property.
   *
   * @param menu - The menu about to be shown.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu is shown from the icon of a property in a leaf's properties editor.
   */
  public announceMenu(menu: Menu, mouseEvent: MouseEvent): boolean {
    const { currentTarget } = mouseEvent;
    if (!currentTarget) {
      return false;
    }

    for (const viewType of PROPERTIES_EDITOR_VIEW_TYPES) {
      for (const leaf of this.app.workspace.getLeavesOfType(viewType)) {
        // `Partial`, because a deferred leaf reports the view type before its real view, and its editor, exist.
        const { metadataEditor } = castTo<Partial<MetadataEditorViewLike>>(leaf.view);
        const property = metadataEditor?.rendered.find((renderedProperty) => renderedProperty.iconEl === currentTarget);
        if (!property) {
          continue;
        }

        const propertyItem: PropertyMenuItem = {
          key: property.entry.key
        };
        this.app.workspace.trigger(PROPERTY_MENU_EVENT_NAME, menu, leaf, propertyItem);
        return true;
      }
    }

    return false;
  }
}
