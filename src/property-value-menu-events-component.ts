import type { MetadataEditor } from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { PropertyValueMenuItem } from '../api.d.ts';
import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import { PROPERTY_VALUE_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The class Obsidian gives each value pill of a multi-select component (`app.js:106548`).
 */
const PILL_CLASS = 'multi-select-pill';

/**
 * The view types whose view shows a note's properties: the Markdown view and the **Properties** view.
 */
const PROPERTIES_EDITOR_VIEW_TYPES = ['markdown', 'file-properties'] as const;

/**
 * Parameters for the {@link PropertyValueMenuEventsComponent} constructor.
 */
export interface PropertyValueMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * A view that shows a note's properties, as far as finding the property a pill belongs to needs it.
 */
interface MetadataEditorViewLike {
  /**
   * The view's properties editor.
   */
  readonly metadataEditor: MetadataEditor;
}

/**
 * Publishes the context-menu event of one value of a list or tags property, shown as a pill in the properties
 * editor.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** Each pill of the
 * multi-select component binds one `contextmenu` listener on its own element when it is rendered
 * (`app.js:106560`), which fills `Menu.forEvent(evt)` with **Edit**, **Copy** and **Remove from list**.
 * `Menu.forEvent` shows the menu on a later task, so it is recognized by a pill being on the event's recorded
 * path.
 *
 * The multi-select component is generic and knows nothing of properties, so a pill is claimed only when it is
 * inside a row of a view's properties editor: a Markdown view's, or the **Properties** view's in the sidebar.
 * That row's entry gives the key as written, which the row's `data-property-key` does not (it is lowercased,
 * `:107288`). A properties editor outside every leaf, such as a hover popover's, is not announced.
 */
export class PropertyValueMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PropertyValueMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a property value pill.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a value pill of a property in a leaf's properties editor.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const pillEl = eventPath.find(isPillEl);
    if (!pillEl) {
      return false;
    }

    for (const viewType of PROPERTIES_EDITOR_VIEW_TYPES) {
      for (const leaf of this.app.workspace.getLeavesOfType(viewType)) {
        // `Partial`, because a deferred leaf reports the view type before its real view, and its editor, exist.
        const { metadataEditor } = castTo<Partial<MetadataEditorViewLike>>(leaf.view);
        const property = metadataEditor?.rendered.find((renderedProperty) => renderedProperty.valueEl.contains(pillEl));
        if (!property) {
          continue;
        }

        // A pill inside a row's value element has a parent: at worst that value element itself.
        const index = [...castTo<HTMLElement>(pillEl.parentElement).children].filter(isPillEl).indexOf(pillEl);
        const { key, value } = property.entry;
        const propertyValue: PropertyValueMenuItem = {
          index,
          key,
          // Obsidian's own **Copy** item copies `String(value)` (`app.js:106589`).
          value: Array.isArray(value) ? String(value[index]) : pillEl.textContent
        };
        this.app.workspace.trigger(PROPERTY_VALUE_MENU_EVENT_NAME, menu, leaf, propertyValue);
        return true;
      }
    }

    return false;
  }
}

function isPillEl(eventTarget: EventTarget): eventTarget is HTMLElement {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  return castTo<Partial<HTMLElement>>(eventTarget).classList?.contains(PILL_CLASS) ?? false;
}
