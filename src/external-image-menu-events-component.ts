import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { ExternalImageMenuItem } from '../api.d.ts';
import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import { findMarkdownEditorLeaf } from './markdown-editor-leaf.ts';
import { EXTERNAL_IMAGE_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The class Obsidian gives an image embed's element (`app.js:141205`).
 */
const IMAGE_EMBED_CLASS = 'image-embed';

/**
 * The class Obsidian gives the element around an image, which the `contextmenu` listener is bound on
 * (`app.js:141206`).
 */
const IMAGE_WRAPPER_CLASS = 'image-wrapper';

/**
 * The class Obsidian gives an internal embed's element (`app.js:141545`).
 */
const INTERNAL_EMBED_CLASS = 'internal-embed';

/**
 * Parameters for the {@link ExternalImageMenuEventsComponent} constructor.
 */
export interface ExternalImageMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu event of an external image embed in a Live Preview editor.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** The image widget binds
 * one `contextmenu` listener on its `.image-wrapper` when it is rendered (`app.js:141236`), which fills
 * `Menu.forEvent(evt)` with **Copy image**, **Remove image** and **Reset size**. `Menu.forEvent` shows the menu on
 * a later task, so it is recognized by an image wrapper inside an image embed being on the event's recorded path,
 * inside a Markdown view's editor.
 *
 * An image embedded from the vault goes through the same listener, but the listener hands its menu to
 * `handleLinkContextMenu`, which already fires `file-menu` for it, so an image inside an internal embed is left
 * alone. The image's URL is its `src` as written in the note, and its line comes from CodeMirror's `posAtDOM` on
 * the embed. An image in an editor that is not a Markdown view's, such as a canvas card's, is not announced.
 */
export class ExternalImageMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: ExternalImageMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of an external image.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on an external image in a Markdown view's Live Preview editor.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const wrapperIndex = eventPath.findIndex((eventTarget) => hasClass(eventTarget, IMAGE_WRAPPER_CLASS));
    if (wrapperIndex === -1 || eventPath.some((eventTarget) => hasClass(eventTarget, INTERNAL_EMBED_CLASS))) {
      return false;
    }

    const embedEl = eventPath.slice(wrapperIndex + 1).find((eventTarget) => hasClass(eventTarget, IMAGE_EMBED_CLASS));
    const url = castTo<HTMLElement>(eventPath[wrapperIndex]).querySelector('img')?.getAttribute('src');
    if (!embedEl || !url) {
      return false;
    }

    const markdownEditorLeaf = findMarkdownEditorLeaf(this.app, castTo<Node>(embedEl));
    if (!markdownEditorLeaf) {
      return false;
    }

    const { editor, leaf } = markdownEditorLeaf;
    const image: ExternalImageMenuItem = {
      line: editor.offsetToPos(editor.cm.posAtDOM(castTo<Node>(embedEl))).line,
      url
    };
    this.app.workspace.trigger(EXTERNAL_IMAGE_MENU_EVENT_NAME, menu, leaf, image);
    return true;
  }
}

function hasClass(eventTarget: EventTarget, className: string): boolean {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  return castTo<Partial<HTMLElement>>(eventTarget).classList?.contains(className) ?? false;
}
