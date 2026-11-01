import type {
  App as AppOriginal,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CANVAS_CONTENT_CHANGED_EVENT_NAME,
  CANVAS_NODE_EDITING_CHANGED_EVENT_NAME,
  CANVAS_READ_ONLY_CHANGED_EVENT_NAME,
  CANVAS_SELECTION_CHANGED_EVENT_NAME,
  CANVAS_TOOLBAR_RENDERED_EVENT_NAME
} from '../api/more-events-api.ts';
import { CanvasPatchComponent } from './canvas-patch-component.ts';

interface FakeCanvasView {
  readonly canvas: FakeCanvas;
  readonly leaf: WorkspaceLeaf;
}

interface FakeData {
  readonly edges?: readonly FakeItemData[];
  readonly nodes?: readonly FakeItemData[];
}

interface FakeItemData {
  readonly id: string;
  readonly x?: number;
}

class FakeCanvas {
  public readonly animationFrames: (() => void)[] = [];
  public readonly canvasEl = {
    win: {
      requestAnimationFrame: (callback: () => void): number => {
        this.animationFrames.push(callback);
        return this.animationFrames.length;
      }
    }
  };

  public data: FakeData = {};
  public readonly edges = new Map<string>();
  public readonly menu: FakeToolbar;
  public readonly nodes = new Map<string, FakeNode>();
  public readonly = false;
  public readonly selection = new Set<unknown>();
  public readonly view: FakeCanvasView;

  public constructor(leaf: WorkspaceLeaf) {
    this.view = { canvas: this, leaf };
    this.menu = new FakeToolbar(this);
  }

  public addNode(node: FakeNode): void {
    this.nodes.set(node.id, node);
  }

  public applyHistory(data: FakeData): void {
    this.data = data;
  }

  public clear(): void {
    this.data = {};
  }

  public overrideHistory(): void {
    this.data = this.getData();
  }

  public requestSave(): void {
    this.data = this.getData();
  }

  public runAnimationFrames(): void {
    for (const callback of this.animationFrames.splice(0)) {
      callback();
    }
  }

  public setData(data: FakeData): void {
    this.data = data;
  }

  public setReadonly(isReadOnly: boolean): void {
    this.readonly = isReadOnly;
  }

  public updateSelection(update: () => void): void {
    update();
  }

  private getData(): FakeData {
    return { edges: [], nodes: Array.from(this.nodes.values(), (node) => node.getData()) };
  }
}

/*
 * Stand-ins for Obsidian's unexported canvas classes, with the members the patch reads. Each test builds its own
 * canvas, but the classes are shared, so a patch left behind by one test would show in the next; `afterEach` unloads
 * the component, which removes them.
 */
class FakeNode {
  public isEditing = false;
  public x = 0;

  public constructor(public readonly canvas: FakeCanvas, public readonly id: string) {}

  public getData(): FakeItemData {
    return { id: this.id, x: this.x };
  }

  public setIsEditing(isEditing: boolean): void {
    this.isEditing = isEditing;
  }
}

class FakeTextNode extends FakeNode {}

class FakeToolbar {
  public readonly menuEl = { childElementCount: 0 };

  public constructor(public readonly canvas: FakeCanvas) {}

  public render(shouldRebuild?: boolean): void {
    if (!shouldRebuild) {
      return;
    }
    this.menuEl.childElementCount = this.canvas.selection.size === 0 ? 0 : 3;
  }
}

describe('CanvasPatchComponent', () => {
  let app: AppOriginal;
  let canvas: FakeCanvas;
  let component: CanvasPatchComponent;
  let leaf: WorkspaceLeaf;
  let leaves: WorkspaceLeaf[];
  let triggered: unknown[][];

  beforeEach(() => {
    const mockApp = App.createConfigured__();
    mockApp.workspace.setLayoutReady__();
    app = castTo<AppOriginal>(mockApp);
    leaf = castTo<WorkspaceLeaf>({});
    canvas = useCanvas(new FakeCanvas(leaf));
    leaves = [leaf];
    vi.spyOn(app.workspace, 'getLeavesOfType').mockImplementation((viewType) => viewType === 'canvas' ? leaves : []);
    triggered = [];
    const originalTrigger = app.workspace.trigger.bind(app.workspace);
    vi.spyOn(app.workspace, 'trigger').mockImplementation((name: string, ...data: unknown[]) => {
      if (name.startsWith('more-events:')) {
        triggered.push([name, ...data]);
      }
      originalTrigger(name, ...data);
    });
    component = new CanvasPatchComponent({ app });
  });

  afterEach(() => {
    component.unload();
  });

  describe('installing the patch', () => {
    it('should patch nothing while no canvas is open', () => {
      leaves = [];
      const originalUpdateSelection = FakeCanvas.prototype.updateSelection;
      component.load();

      expect(FakeCanvas.prototype.updateSelection).toBe(originalUpdateSelection);
    });

    it('should patch once a canvas leaf opens', () => {
      leaves = [];
      component.load();
      leaves = [leaf];
      app.workspace.trigger('layout-change');

      selectNode(canvas, addNode(canvas, 'n1'));

      expect(triggered.map(([name]) => name)).toEqual([CANVAS_SELECTION_CHANGED_EVENT_NAME]);
    });

    it('should patch only once however often the layout changes', () => {
      component.load();
      app.workspace.trigger('layout-change');
      app.workspace.trigger('active-leaf-change', leaf);

      canvas.setReadonly(true);

      expect(triggered).toEqual([[CANVAS_READ_ONLY_CHANGED_EVENT_NAME, leaf, true]]);
    });

    it('should patch again when loaded again after an unload', () => {
      component.load();
      component.unload();
      component.load();

      canvas.setReadonly(true);

      expect(triggered).toEqual([[CANVAS_READ_ONLY_CHANGED_EVENT_NAME, leaf, true]]);
    });

    it('should skip a deferred leaf with no canvas', () => {
      const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
      leaves = [deferredLeaf, leaf];
      component.load();

      selectNode(canvas, addNode(canvas, 'n1'));

      expect(triggered).toHaveLength(1);
    });

    it('should restore every method on unload', () => {
      const originalRender = FakeToolbar.prototype.render;
      const originalSetIsEditing = FakeNode.prototype.setIsEditing;
      const originalSetReadonly = FakeCanvas.prototype.setReadonly;
      canvas.addNode(new FakeTextNode(canvas, 'n1'));
      component.load();
      component.unload();

      expect(FakeToolbar.prototype.render).toBe(originalRender);
      expect(FakeNode.prototype.setIsEditing).toBe(originalSetIsEditing);
      expect(FakeCanvas.prototype.setReadonly).toBe(originalSetReadonly);
    });
  });

  describe('selection', () => {
    it('should announce one change per gesture, after the frame', () => {
      component.load();
      const first = addNode(canvas, 'n1');
      const second = addNode(canvas, 'n2');

      canvas.updateSelection(() => {
        canvas.selection.add(first);
      });
      canvas.updateSelection(() => {
        canvas.selection.add(second);
      });
      expect(triggered).toEqual([]);

      canvas.runAnimationFrames();

      expect(triggered).toEqual([
        [CANVAS_SELECTION_CHANGED_EVENT_NAME, leaf, { edges: [], nodes: [{ id: 'n1', x: 0 }, { id: 'n2', x: 0 }] }]
      ]);
    });

    it('should announce nothing for a gesture that ends where it started', () => {
      component.load();
      const node = addNode(canvas, 'n1');

      canvas.updateSelection(() => {
        canvas.selection.add(node);
      });
      canvas.updateSelection(() => {
        canvas.selection.delete(node);
      });
      canvas.runAnimationFrames();

      expect(triggered).toEqual([]);
    });

    it('should announce a swap of one item for another', () => {
      component.load();
      const first = addNode(canvas, 'n1');
      const second = addNode(canvas, 'n2');
      selectNode(canvas, first);
      triggered.length = 0;

      canvas.updateSelection(() => {
        canvas.selection.clear();
        canvas.selection.add(second);
      });
      canvas.runAnimationFrames();

      expect(triggered).toEqual([[CANVAS_SELECTION_CHANGED_EVENT_NAME, leaf, { edges: [], nodes: [{ id: 'n2', x: 0 }] }]]);
    });

    it('should announce nothing once unloaded before the frame', () => {
      component.load();
      const node = addNode(canvas, 'n1');

      canvas.updateSelection(() => {
        canvas.selection.add(node);
      });
      component.unload();
      canvas.runAnimationFrames();

      expect(triggered).toEqual([]);
    });
  });

  describe('content', () => {
    it('should announce the added, changed and removed ids of an edit', () => {
      canvas.data = { edges: [{ id: 'e1' }], nodes: [{ id: 'n1', x: 0 }, { id: 'n2', x: 0 }] };
      component.load();

      canvas.setData({ edges: [{ id: 'e2' }], nodes: [{ id: 'n1', x: 10 }, { id: 'n3', x: 0 }] });

      expect(triggered).toEqual([
        [
          CANVAS_CONTENT_CHANGED_EVENT_NAME,
          leaf,
          {
            edges: { added: ['e2'], changed: [], removed: ['e1'] },
            nodes: { added: ['n3'], changed: ['n1'], removed: ['n2'] }
          }
        ]
      ]);
    });

    it('should announce a save, an undo and an overridden history', () => {
      component.load();
      const node = addNode(canvas, 'n1');

      canvas.requestSave();
      node.x = 5;
      canvas.overrideHistory();
      canvas.applyHistory({ nodes: [] });

      expect(triggered.map(([, , change]) => change)).toEqual([
        { edges: { added: [], changed: [], removed: [] }, nodes: { added: ['n1'], changed: [], removed: [] } },
        { edges: { added: [], changed: [], removed: [] }, nodes: { added: [], changed: ['n1'], removed: [] } },
        { edges: { added: [], changed: [], removed: [] }, nodes: { added: [], changed: [], removed: ['n1'] } }
      ]);
    });

    it('should not take a node whose keys the save reordered for a changed one', () => {
      canvas.data = { edges: [{ id: 'e1' }], nodes: [castTo<FakeItemData>({ id: 'n1', nested: { a: [2, 1], b: 1 }, x: 0 })] };
      component.load();

      canvas.setData({ edges: [{ id: 'e1' }], nodes: [castTo<FakeItemData>({ id: 'n1', nested: { a: [2, 1], b: 1 }, x: 0 })] });

      expect(triggered).toEqual([]);
    });

    it('should not announce a save that changed nothing', () => {
      component.load();
      addNode(canvas, 'n1');
      canvas.requestSave();
      triggered.length = 0;

      canvas.requestSave();

      expect(triggered).toEqual([]);
    });

    it('should not announce the canvas loading its file', () => {
      component.load();

      canvas.clear();
      canvas.setData({ nodes: [{ id: 'n1' }] });

      expect(triggered).toEqual([]);
    });

    it('should announce once for nested writers', () => {
      class NestingCanvas extends FakeCanvas {
        public override applyHistory(data: FakeData): void {
          super.applyHistory(data);
          this.requestSave();
        }
      }
      const nestingCanvas = useCanvas(new NestingCanvas(leaf));
      component.load();
      addNode(nestingCanvas, 'n1');

      nestingCanvas.applyHistory({ nodes: [] });

      expect(triggered).toEqual([
        [
          CANVAS_CONTENT_CHANGED_EVENT_NAME,
          leaf,
          { edges: { added: [], changed: [], removed: [] }, nodes: { added: ['n1'], changed: [], removed: [] } }
        ]
      ]);
    });

    it('should pass a writer\'s error on and announce nothing', () => {
      const error = new Error('failed');
      class ThrowingCanvas extends FakeCanvas {
        public override setData(data: FakeData): void {
          super.setData(data);
          throw error;
        }
      }
      const throwingCanvas = useCanvas(new ThrowingCanvas(leaf));
      throwingCanvas.data = { nodes: [] };
      component.load();

      expect(() => {
        throwingCanvas.setData({ nodes: [{ id: 'n1' }] });
      }).toThrow(error);
      throwingCanvas.setReadonly(true);
      expect(triggered).toEqual([[CANVAS_READ_ONLY_CHANGED_EVENT_NAME, leaf, true]]);
    });
  });
  describe('read-only', () => {
    it('should announce a real transition only', () => {
      component.load();

      canvas.setReadonly(false);
      canvas.setReadonly(true);
      canvas.setReadonly(true);
      canvas.setReadonly(false);

      expect(triggered).toEqual([
        [CANVAS_READ_ONLY_CHANGED_EVENT_NAME, leaf, true],
        [CANVAS_READ_ONLY_CHANGED_EVENT_NAME, leaf, false]
      ]);
    });
  });

  describe('card editing', () => {
    it('should reach the node class from a node the canvas already holds', () => {
      const node = new FakeTextNode(canvas, 'n1');
      canvas.addNode(node);
      component.load();

      node.setIsEditing(true);
      node.setIsEditing(true);
      node.setIsEditing(false);

      expect(triggered).toEqual([
        [CANVAS_NODE_EDITING_CHANGED_EVENT_NAME, leaf, 'n1', true],
        [CANVAS_NODE_EDITING_CHANGED_EVENT_NAME, leaf, 'n1', false]
      ]);
    });

    it('should reach the node class from the first node added to an empty canvas', () => {
      component.load();
      const node = addNode(canvas, 'n1');

      node.setIsEditing(true);

      expect(triggered).toEqual([[CANVAS_NODE_EDITING_CHANGED_EVENT_NAME, leaf, 'n1', true]]);
    });

    it('should patch nothing on a node whose class declares no setIsEditing', () => {
      component.load();
      const bareNode = castTo<FakeNode>(Object.create(null));

      expect(() => {
        canvas.addNode(bareNode);
      }).not.toThrow();
    });
  });

  describe('toolbar', () => {
    it('should announce a rebuild with buttons, with the toolbar and the selection', () => {
      component.load();
      const node = addNode(canvas, 'n1');
      canvas.selection.add(node);

      canvas.menu.render(true);

      expect(triggered).toEqual([
        [CANVAS_TOOLBAR_RENDERED_EVENT_NAME, leaf, canvas.menu.menuEl, { edges: [], nodes: [{ id: 'n1', x: 0 }] }]
      ]);
    });

    it('should not announce a render that rebuilt nothing', () => {
      component.load();
      canvas.selection.add(addNode(canvas, 'n1'));

      canvas.menu.render(false);
      canvas.selection.clear();
      canvas.menu.render(true);

      expect(triggered).toEqual([]);
    });
  });
});

function addNode(canvas: FakeCanvas, id: string): FakeNode {
  const node = new FakeTextNode(canvas, id);
  canvas.addNode(node);
  return node;
}

function selectNode(canvas: FakeCanvas, node: FakeNode): void {
  canvas.updateSelection(() => {
    canvas.selection.add(node);
  });
  canvas.runAnimationFrames();
}

function useCanvas<T extends FakeCanvas>(canvas: T): T {
  Object.assign(canvas.view.leaf, { view: canvas.view });
  return canvas;
}
