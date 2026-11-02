import type {
  App,
  TFile
} from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { noop } from '@mnaoumov/typescript-lib/function';
import {
  FileView,
  MarkdownPreviewView,
  MarkdownView,
  WorkspaceLeaf
} from 'obsidian';

import {
  LEAF_CLOSED_EVENT_NAME,
  LEAF_VISIBILITY_CHANGED_EVENT_NAME,
  MARKDOWN_MODE_CHANGED_EVENT_NAME,
  MARKDOWN_PREVIEW_RENDERED_EVENT_NAME
} from '../api/more-events-api.ts';

/**
Parameters for workspace observation.
*/
export interface WorkspaceEventsComponentConstructorParams {
  /**
  The application to observe.
  */
  readonly app: App;
}

/**
Announces exact close, mode and preview seams, and observed workspace visibility changes.
*/
export class WorkspaceEventsComponent extends MonkeyAroundComponent {
  private readonly app: App;
  private isActive = false;
  private readonly visibility = new Map<WorkspaceLeaf, boolean>();

  /** Creates the observer.
   * @param params - The application.
   */
  public constructor(params: WorkspaceEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
  Installs the shared prototype observers and workspace subscriptions.
  */
  public override onload(): void {
    super.onload();
    this.isActive = true;
    this.readVisibility(false);
    this.register(() => {
      this.isActive = false;
      this.visibility.clear();
    });
    this.registerEvent(this.app.workspace.on('layout-change', () => {
      this.readVisibility(true);
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.readVisibility(true);
    }));
    this.registerEvent(this.app.workspace.on('resize', () => {
      this.readVisibility(true);
    }));
    this.registerMethodPatch({
      $object: WorkspaceLeaf.prototype,
      methodName: 'detach',
      patchHandler: ({ fallback, originalThis: leaf }) => {
        const isOurs = this.containsLeaf(leaf);
        const file: null | TFile = leaf.view instanceof FileView ? leaf.view.file : null;
        fallback();
        if (!isOurs) {
          return;
        }

        this.visibility.delete(leaf);
        this.app.workspace.trigger(LEAF_CLOSED_EVENT_NAME, leaf, file);
      }
    });
    this.registerMethodPatch({
      $object: MarkdownView.prototype,
      methodName: 'setMode',
      patchHandler: ({ fallback, originalThis: view }) => {
        const previous = view.getMode();
        const result = fallback();
        result.then(() => {
          if (this.isActive && this.containsLeaf(view.leaf) && previous !== view.getMode()) {
            this.app.workspace.trigger(MARKDOWN_MODE_CHANGED_EVENT_NAME, view.leaf, view.getMode());
          }
        }).catch(noop);
        return result;
      }
    });
    this.registerMethodPatch({
      $object: MarkdownPreviewView.prototype,
      methodName: 'onRenderComplete',
      patchHandler: ({ fallback, originalThis: preview }) => {
        const result = fallback();
        // `clear()` also calls this hook, before there is any parsed text. It is not a completed pass.
        const renderer = preview.renderer;
        if (renderer.lastText !== renderer.text || renderer.rendered !== null) {
          return result;
        }
        this.app.workspace.iterateAllLeaves((leaf) => {
          if (leaf.view instanceof MarkdownView && leaf.view.previewMode === preview && leaf.view.file && leaf.view.getMode() === 'preview') {
            this.app.workspace.trigger(MARKDOWN_PREVIEW_RENDERED_EVENT_NAME, leaf, leaf.view.file);
          }
        });
        return result;
      }
    });
  }

  private containsLeaf(candidate: WorkspaceLeaf): boolean {
    let isFound = false;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf === candidate) {
        isFound = true;
      }
    });
    return isFound;
  }

  private readVisibility(shouldAnnounce: boolean): void {
    const current = new Set<WorkspaceLeaf>();
    this.app.workspace.iterateAllLeaves((leaf) => {
      current.add(leaf);
      const isVisible = leaf.isVisible();
      const previous = this.visibility.get(leaf);
      this.visibility.set(leaf, isVisible);
      if (shouldAnnounce && previous !== isVisible && (previous !== undefined || isVisible)) {
        this.app.workspace.trigger(LEAF_VISIBILITY_CHANGED_EVENT_NAME, leaf, isVisible);
      }
    });
    for (const leaf of this.visibility.keys()) {
      if (!current.has(leaf)) {
        this.visibility.delete(leaf);
      }
    }
  }
}
