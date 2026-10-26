import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { CalloutMenuItem } from '../api.d.ts';
import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import { findMarkdownEditorLeaf } from './markdown-editor-leaf.ts';
import { CALLOUT_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The class Obsidian gives a callout widget's element (`app.js:176450`).
 */
const CALLOUT_WIDGET_CLASS = 'cm-callout';

/**
 * Parameters for the {@link CalloutMenuEventsComponent} constructor.
 */
export interface CalloutMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of a callout in a Live Preview editor.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** The callout widget
 * binds one `contextmenu` listener on its own element (`.cm-embed-block.cm-callout`, `app.js:176387`) when it
 * is rendered (`:176538`), which fills `Menu.forEvent(evt)` with **Edit**, a **Callout type** submenu and the
 * clipboard and delete items. `Menu.forEvent` shows the menu on a later task, so it is recognized by a callout
 * widget being on the event's recorded path, inside a Markdown view's editor.
 *
 * The widget object itself is out of reach (Obsidian keeps it in a private map), so the callout's header line
 * comes from CodeMirror's `posAtDOM` on the element, and its type is read from that line the way Obsidian's own
 * `getType` reads it (`:176460`). A callout in an editor that is not a Markdown view's, such as a canvas card's,
 * is not announced.
 */
export class CalloutMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CalloutMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a callout.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a callout in a Markdown view's Live Preview editor.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const calloutEl = eventPath.find(isCalloutWidgetEl);
    if (!calloutEl) {
      return false;
    }

    const markdownEditorLeaf = findMarkdownEditorLeaf(this.app, calloutEl);
    if (!markdownEditorLeaf) {
      return false;
    }

    const { editor, leaf } = markdownEditorLeaf;
    const { line } = editor.offsetToPos(editor.cm.posAtDOM(calloutEl));
    const callout: CalloutMenuItem = {
      line,
      type: getCalloutType(editor.getLine(line))
    };
    this.app.workspace.trigger(CALLOUT_MENU_EVENT_NAME, menu, leaf, callout);
    return true;
  }
}

/**
 * Reads a callout's type from its header line, the way Obsidian's own `getType` does (`app.js:176460`).
 *
 * @param headerLine - The callout's first line, such as `> [!note] Title`.
 * @returns The type, such as `note`, as written.
 */
function getCalloutType(headerLine: string): string {
  const typeStart = headerLine.indexOf('[!') + '[!'.length;
  return headerLine.slice(typeStart, headerLine.indexOf(']', typeStart));
}

function isCalloutWidgetEl(eventTarget: EventTarget): eventTarget is HTMLElement {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  return castTo<Partial<HTMLElement>>(eventTarget).classList?.contains(CALLOUT_WIDGET_CLASS) ?? false;
}
