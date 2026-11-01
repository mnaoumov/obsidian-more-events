import type { CanvasViewCanvas } from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  WorkspaceLeaf
} from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';

import type {
  CanvasContentChange,
  CanvasItemChanges
} from '../../api.d.ts';

import {
  CANVAS_CONTENT_CHANGED_EVENT_NAME,
  CANVAS_NODE_EDITING_CHANGED_EVENT_NAME,
  CANVAS_READ_ONLY_CHANGED_EVENT_NAME,
  CANVAS_SELECTION_CHANGED_EVENT_NAME,
  CANVAS_TOOLBAR_RENDERED_EVENT_NAME
} from '../api/more-events-api.ts';
import { getSelection } from '../context-menus/canvas/canvas-selection.ts';

/**
 * Parameters for the {@link CanvasPatchComponent} constructor.
 */
export interface CanvasPatchComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * What the canvas file stores, as `canvas.data` holds it: `{}` until a file has been read into the canvas.
 */
interface CanvasDataSeam {
  readonly edges?: readonly CanvasItemSeam[];
  readonly nodes?: readonly CanvasItemSeam[];
}

/**
 * One node or connection, as the canvas file stores it.
 */
interface CanvasItemSeam {
  readonly id: string;
}

/**
 * The members of a node's base class (`app.js:156237` in 1.15.0) the patch reads and wraps.
 */
interface CanvasNodeSeam {
  readonly canvas: CanvasSeam;
  readonly id: string;
  readonly isEditing?: boolean;
  readonly setIsEditing: (isEditing: boolean) => void;
}

/**
 * The members of the `Canvas` class (`JP`, `app.js:153588` in 1.15.0) the patch reads and wraps.
 */
interface CanvasSeam {
  readonly addNode: (node: CanvasNodeSeam) => void;
  readonly applyHistory: (data: CanvasDataSeam) => void;
  readonly canvasEl: HTMLElement;
  readonly data: CanvasDataSeam;
  readonly menu: CanvasToolbarSeam;
  readonly nodes: Map<string, CanvasNodeSeam>;
  readonly overrideHistory: () => void;
  readonly readonly?: boolean;
  readonly requestSave: (shouldPushHistory?: boolean) => void;
  readonly selection: Set<unknown>;
  readonly setData: (data: CanvasDataSeam) => void;
  readonly setReadonly: (isReadOnly: boolean) => void;
  readonly updateSelection: (update: () => void) => void;
  readonly view: CanvasViewSeam;
}

/**
 * The members of the canvas selection toolbar class (`KP`, `app.js:152600` in 1.15.0) the patch reads and wraps.
 */
interface CanvasToolbarSeam {
  readonly canvas: CanvasSeam;
  readonly menuEl: HTMLElement;
  readonly render: (shouldRebuild?: boolean) => void;
}

interface CanvasViewSeam {
  readonly canvas?: CanvasSeam;
  readonly leaf: WorkspaceLeaf;
}

/**
 * The methods that write `canvas.data`, each the only way an edit, an undo or a redo, or a read of the file reaches it.
 */
type ContentWriterName = 'applyHistory' | 'overrideHistory' | 'requestSave' | 'setData';

const CONTENT_WRITER_NAMES: readonly ContentWriterName[] = ['applyHistory', 'overrideHistory', 'requestSave', 'setData'];

/**
 * A content write in progress on one canvas: the data before it, kept as JSON by id, and how deep the writers nest.
 */
interface ContentWrite {
  readonly before: ItemSnapshot;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- The nesting depth is counted up and down as the writers enter and leave.
  depth: number;
  readonly isLoad: boolean;
}

/**
 * Every node and every connection of a canvas's data, by id, as JSON.
 */
interface ItemSnapshot {
  readonly edges: Map<string, string>;
  readonly nodes: Map<string, string>;
}

/**
 * Announces what happens to a canvas: its selection, its content, its read-only state, a card's editing state, and
 * the selection toolbar being rebuilt.
 *
 * **Obsidian raises none of these, and the classes involved are not exported**, so every canvas plugin that wants one
 * patches the same `Canvas` prototype today. This is that patch, once, for everybody, the way the `Menu` patch is for
 * menus. Measured in catalyst 1.15.0:
 *
 * - **Selection.** Every `select`, `deselect`, `toggleSelect`, `selectOnly`, `selectAll` and `deselectAll` goes through
 *   `updateSelection(fn)` (`app.js:154367`), which keeps the selection it started from and requests a frame, where the
 *   change is applied to the nodes and the toolbar. So the first call of a gesture keeps the selection before it, and
 *   an animation frame requested after the canvas's own compares; one gesture is one event, and a gesture that ends
 *   where it started is none.
 * - **Content.** `requestSave` (`:154118`), `overrideHistory` (`:154123`), `applyHistory` (`:154138`, undo and redo)
 *   and `setData` (`:154013`, the file read, an external change included) are the only writers of `canvas.data`, so
 *   each is wrapped, and the data before is diffed against the data after by id. A `setData` straight after `clear()`,
 *   whose data is `{}`, is the canvas LOADING a file and is not announced.
 * - **Read-only.** `setReadonly` (`:155256`), announced only for a real transition. Opening a canvas file calls it
 *   from `clear()` and then with the file's own stored state, so switching a leaf between two read-only canvases
 *   announces `false` and then `true`.
 * - **Card editing.** `setIsEditing` (`:156237`) is on the NODE base class, not the canvas, so the canvas patch cannot
 *   reach it. Its prototype is reached from the first node a canvas holds, or the first `addNode` (`:154315`) is
 *   handed, and patched there, once.
 * - **Toolbar rendered.** The toolbar's `render(force)` (`:152617`) is the only writer of its buttons: when `force` is
 *   truthy and something is selected and not being dragged, it empties `menuEl` and rebuilds them. A button added
 *   from the event therefore lasts until the next rebuild, which announces again.
 *
 * The classes are reached from the first canvas leaf that has a canvas, so nothing is patched until one is open.
 */
export class CanvasPatchComponent extends MonkeyAroundComponent {
  private readonly app: App;
  private readonly contentWrites = new WeakMap<CanvasSeam, ContentWrite>();
  private isActive = false;
  private isCanvasPatched = false;
  private isNodePatched = false;
  private readonly selectionsBefore = new WeakMap<CanvasSeam, readonly unknown[]>();

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CanvasPatchComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Patches the canvas classes once a canvas is open.
   */
  public override onload(): void {
    super.onload();
    this.isActive = true;
    this.register(() => {
      this.isActive = false;
      this.isCanvasPatched = false;
      this.isNodePatched = false;
    });

    this.app.workspace.onLayoutReady(() => {
      this.patchOpenCanvas();
      this.registerEvent(this.app.workspace.on('layout-change', this.patchOpenCanvas.bind(this)));
      this.registerEvent(this.app.workspace.on('active-leaf-change', this.patchOpenCanvas.bind(this)));
    });
  }

  private announceContentChange(canvas: CanvasSeam, before: ItemSnapshot): void {
    const after = takeSnapshot(canvas.data);
    const change: CanvasContentChange = {
      edges: diffItems(before.edges, after.edges),
      nodes: diffItems(before.nodes, after.nodes)
    };
    if (isEmptyChange(change.edges) && isEmptyChange(change.nodes)) {
      return;
    }
    this.app.workspace.trigger(CANVAS_CONTENT_CHANGED_EVENT_NAME, canvas.view.leaf, change);
  }

  private announceSelectionChange(canvas: CanvasSeam): void {
    const selectionBefore = this.selectionsBefore.get(canvas);
    this.selectionsBefore.delete(canvas);
    if (!selectionBefore || !this.isActive) {
      return;
    }
    const { selection } = canvas;
    if (selectionBefore.length === selection.size && selectionBefore.every((item) => selection.has(item))) {
      return;
    }
    this.app.workspace.trigger(CANVAS_SELECTION_CHANGED_EVENT_NAME, canvas.view.leaf, getSelection(castTo<CanvasViewCanvas>(canvas)));
  }

  private patchCanvas(canvas: CanvasSeam): void {
    this.isCanvasPatched = true;
    const canvasPrototype = castTo<CanvasSeam>(Object.getPrototypeOf(canvas));

    this.registerMethodPatch({
      $object: canvasPrototype,
      methodName: 'updateSelection',
      patchHandler: ({ fallback, originalThis }) => {
        const isGestureStart = !this.selectionsBefore.has(originalThis);
        if (isGestureStart) {
          this.selectionsBefore.set(originalThis, [...originalThis.selection]);
        }
        fallback();
        if (isGestureStart) {
          // Requested after the canvas's own frame, which applies the change, so it runs after it in the same frame.
          originalThis.canvasEl.win.requestAnimationFrame(() => {
            this.announceSelectionChange(originalThis);
          });
        }
      }
    });

    for (const methodName of CONTENT_WRITER_NAMES) {
      this.registerMethodPatch({
        $object: canvasPrototype,
        methodName,
        patchHandler: ({ fallback, originalThis }) => {
          this.writeContent(originalThis, methodName, fallback);
        }
      });
    }

    this.registerMethodPatch({
      $object: canvasPrototype,
      methodName: 'setReadonly',
      patchHandler: ({ fallback, originalThis }) => {
        const wasReadOnly = !!originalThis.readonly;
        fallback();
        const isReadOnly = !!originalThis.readonly;
        if (wasReadOnly !== isReadOnly) {
          this.app.workspace.trigger(CANVAS_READ_ONLY_CHANGED_EVENT_NAME, originalThis.view.leaf, isReadOnly);
        }
      }
    });

    this.registerMethodPatch({
      $object: canvasPrototype,
      methodName: 'addNode',
      patchHandler: ({ fallback, originalArguments: [node] }) => {
        fallback();
        this.patchNode(node);
      }
    });

    this.registerMethodPatch({
      $object: castTo<CanvasToolbarSeam>(Object.getPrototypeOf(canvas.menu)),
      methodName: 'render',
      patchHandler: ({ fallback, originalArguments: [shouldRebuild], originalThis }) => {
        fallback();
        if (!shouldRebuild || originalThis.menuEl.childElementCount === 0) {
          return;
        }
        const toolbarCanvas = originalThis.canvas;
        this.app.workspace.trigger(
          CANVAS_TOOLBAR_RENDERED_EVENT_NAME,
          toolbarCanvas.view.leaf,
          originalThis.menuEl,
          getSelection(castTo<CanvasViewCanvas>(toolbarCanvas))
        );
      }
    });

    const [firstNode] = canvas.nodes.values();
    if (firstNode) {
      this.patchNode(firstNode);
    }
  }

  private patchNode(node: CanvasNodeSeam): void {
    if (this.isNodePatched) {
      return;
    }
    this.isNodePatched = true;

    // The node subclasses (text, file, link, group) inherit the method; patch the class that declares it.
    let nodePrototype = castTo<CanvasNodeSeam | null>(Object.getPrototypeOf(node));
    while (nodePrototype && !Object.hasOwn(nodePrototype, 'setIsEditing')) {
      nodePrototype = castTo<CanvasNodeSeam | null>(Object.getPrototypeOf(nodePrototype));
    }
    if (!nodePrototype) {
      return;
    }

    this.registerMethodPatch({
      $object: nodePrototype,
      methodName: 'setIsEditing',
      patchHandler: ({ fallback, originalThis }) => {
        const wasEditing = !!originalThis.isEditing;
        fallback();
        const isEditing = !!originalThis.isEditing;
        if (wasEditing !== isEditing) {
          this.app.workspace.trigger(CANVAS_NODE_EDITING_CHANGED_EVENT_NAME, originalThis.canvas.view.leaf, originalThis.id, isEditing);
        }
      }
    });
  }

  private patchOpenCanvas(): void {
    if (this.isCanvasPatched) {
      return;
    }
    for (const leaf of this.app.workspace.getLeavesOfType('canvas')) {
      // A deferred leaf has no canvas yet.
      const canvas = castTo<Partial<CanvasViewSeam>>(leaf.view).canvas;
      if (canvas) {
        this.patchCanvas(canvas);
        return;
      }
    }
  }

  private writeContent(canvas: CanvasSeam, methodName: ContentWriterName, fallback: () => void): void {
    let write = this.contentWrites.get(canvas);
    if (write) {
      write.depth++;
    } else {
      write = {
        before: takeSnapshot(canvas.data),
        depth: 1,
        // `clear()` leaves `{}`, so a read of the file into it is the canvas loading, not its content changing.
        isLoad: methodName === 'setData' && !Array.isArray(canvas.data.nodes)
      };
      this.contentWrites.set(canvas, write);
    }

    try {
      fallback();
    } finally {
      write.depth--;
      if (write.depth === 0) {
        this.contentWrites.delete(canvas);
      }
    }

    if (write.depth === 0 && !write.isLoad && this.isActive) {
      this.announceContentChange(canvas, write.before);
    }
  }
}

function diffItems(before: Map<string, string>, after: Map<string, string>): CanvasItemChanges {
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  for (const [id, json] of after) {
    const jsonBefore = before.get(id);
    if (jsonBefore === undefined) {
      added.push(id);
    } else if (jsonBefore !== json) {
      changed.push(id);
    }
  }
  for (const id of before.keys()) {
    if (!after.has(id)) {
      removed.push(id);
    }
  }
  return { added, changed, removed };
}

function isEmptyChange(changes: CanvasItemChanges): boolean {
  return changes.added.length === 0 && changes.changed.length === 0 && changes.removed.length === 0;
}

function snapshotItems(items: readonly CanvasItemSeam[] | undefined): Map<string, string> {
  const snapshot = new Map<string, string>();
  for (const item of Array.isArray(items) ? items : []) {
    snapshot.set(item.id, toCanonicalJson(item));
  }
  return snapshot;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }
  return typeof value !== 'object' || value === null ? value : Object.fromEntries(
    Object.entries(value)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, nestedValue]) => [key, sortKeys(nestedValue)])
  );
}

function takeSnapshot(data: CanvasDataSeam): ItemSnapshot {
  return {
    edges: snapshotItems(data.edges),
    nodes: snapshotItems(data.nodes)
  };
}

/**
 * Writes a node or a connection as JSON with the keys of every object sorted, so two copies that differ only in key
 * order compare equal. They do in practice: the file holds its nodes as whoever wrote it ordered the keys, while the
 * canvas's own `getData()` orders them its own way, so without this the first save after opening a file would report
 * every node as changed (measured in the real app, 2026-11-01).
 *
 * @param item - The node or the connection.
 * @returns The JSON.
 */
function toCanonicalJson(item: CanvasItemSeam): string {
  return JSON.stringify(castTo<CanvasItemSeam>(sortKeys(item)));
}
