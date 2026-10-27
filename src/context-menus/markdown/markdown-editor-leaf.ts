import type {
  App,
  Editor,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';

/**
 * The view type of the Markdown view.
 */
const MARKDOWN_VIEW_TYPE = 'markdown';

/**
 * A Markdown leaf, with the editor of its view.
 */
export interface MarkdownEditorLeaf {
  /**
   * The view's editor, whose `cm` is its CodeMirror view.
   */
  readonly editor: Editor;

  /**
   * The leaf holding the Markdown view.
   */
  readonly leaf: WorkspaceLeaf;
}

/**
 * The Markdown view, as far as finding the editor an element is rendered in needs it.
 */
interface MarkdownViewLike {
  /**
   * The view's editor, whose `cm` is its CodeMirror view.
   */
  readonly editor: Editor;
}

/**
 * Finds the Markdown leaf whose editor renders an element, such as a Live Preview widget.
 *
 * @param app - The Obsidian application instance.
 * @param el - The element.
 * @returns The leaf and its editor, or `null` when the element is in no Markdown view's editor, such as a canvas
 * card's.
 */
export function findMarkdownEditorLeaf(app: App, el: Node): MarkdownEditorLeaf | null {
  for (const leaf of app.workspace.getLeavesOfType(MARKDOWN_VIEW_TYPE)) {
    // `Partial`, because a deferred leaf reports the view type before its real view, and its editor, exist.
    const { editor } = castTo<Partial<MarkdownViewLike>>(leaf.view);
    if (editor?.cm.dom.contains(el)) {
      return { editor, leaf };
    }
  }

  return null;
}
