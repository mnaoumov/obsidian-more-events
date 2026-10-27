import type { App as AppOriginal } from 'obsidian';

import {
  App,
  Menu
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CANVAS_EDGE_MENU_EVENT_NAME,
  CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME,
  CANVAS_NODE_MENU_EVENT_NAME,
  CANVAS_SELECTION_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import { CanvasObjectMenuEventsComponent } from './canvas-object-menu-events-component.ts';

interface FakeCanvas {
  readonly edges: Map<string, FakeCanvasItem>;
  readonly nodes: Map<string, FakeCanvasItem>;
  readonly selection: Set<FakeCanvasItem>;
  readonly view: FakeCanvasView;
}

interface FakeCanvasItem {
  readonly canvas: FakeCanvas;
  readonly getData: () => object;
  readonly id: string;
}

interface FakeCanvasView {
  readonly leaf: object;
}

describe('CanvasObjectMenuEventsComponent', () => {
  let app: AppOriginal;
  let canvas: FakeCanvas;
  let component: CanvasObjectMenuEventsComponent;
  let leaf: object;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    leaf = {};
    canvas = {
      edges: new Map(),
      nodes: new Map(),
      selection: new Set(),
      view: { leaf }
    };
    component = new CanvasObjectMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
  });

  function createItem(id: string, data: object): FakeCanvasItem {
    return {
      canvas,
      getData: () => data,
      id
    };
  }

  it('should relay Obsidian\'s own canvas node menu event with the leaf and a copy of the node', () => {
    const handler = vi.fn();
    app.workspace.on(CANVAS_NODE_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const nodeData = { id: 'n1', text: 'Card', type: 'text' };

    app.workspace.trigger('canvas:node-menu', menu, createItem('n1', nodeData));

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, nodeData);
  });

  it('should relay Obsidian\'s own canvas edge menu event with the leaf and a copy of the edge', () => {
    const handler = vi.fn();
    app.workspace.on(CANVAS_EDGE_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const edgeData = { fromNode: 'n1', id: 'e1', toNode: 'n2' };

    app.workspace.trigger('canvas:edge-menu', menu, createItem('e1', edgeData));

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, edgeData);
  });

  it('should relay Obsidian\'s own canvas selection menu event with the selected nodes and edges apart', () => {
    const handler = vi.fn();
    app.workspace.on(CANVAS_SELECTION_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const node1Data = { id: 'n1' };
    const node2Data = { id: 'n2' };
    const edgeData = { id: 'e1' };
    const node1 = createItem('n1', node1Data);
    const node2 = createItem('n2', node2Data);
    const edge = createItem('e1', edgeData);
    canvas.nodes.set('n1', node1);
    canvas.nodes.set('n2', node2);
    canvas.edges.set('e1', edge);
    canvas.selection.add(node1);
    canvas.selection.add(edge);
    canvas.selection.add(node2);
    // An item no longer on the canvas, as a selection being torn down could hold, is neither.
    canvas.selection.add(createItem('n1', { id: 'stale' }));

    app.workspace.trigger('canvas:selection-menu', menu, canvas);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, {
      edges: [edgeData],
      nodes: [node1Data, node2Data]
    });
  });

  it('should relay Obsidian\'s own connection drop menu event with the leaf, a copy of the node and the drop', () => {
    const handler = vi.fn();
    app.workspace.on(CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const nodeData = { id: 'n1', text: 'Card', type: 'text' };
    const fromNode = createItem('n1', nodeData);
    // The connection ends at a temporary node of no size that the drag moved to the drop point.
    const edge = {
      from: { node: fromNode, side: 'right' },
      to: { node: { height: 0, width: 0, x: 150, y: -20 }, side: 'left' }
    };

    app.workspace.trigger('canvas:node-connection-drop-menu', menu, fromNode, edge);

    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, nodeData, {
      fromSide: 'right',
      position: { x: 150, y: -20 },
      toSide: 'left'
    });
  });

  it('should stop relaying once unloaded', () => {
    const handler = vi.fn();
    app.workspace.on(CANVAS_NODE_MENU_EVENT_NAME, handler);
    app.workspace.on(CANVAS_EDGE_MENU_EVENT_NAME, handler);
    app.workspace.on(CANVAS_SELECTION_MENU_EVENT_NAME, handler);
    app.workspace.on(CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME, handler);
    component.unload();

    app.workspace.trigger('canvas:node-menu', Menu.create2__().asOriginalType2__(), createItem('n1', {}));
    app.workspace.trigger('canvas:edge-menu', Menu.create2__().asOriginalType2__(), createItem('e1', {}));
    app.workspace.trigger('canvas:selection-menu', Menu.create2__().asOriginalType2__(), canvas);
    app.workspace.trigger('canvas:node-connection-drop-menu', Menu.create2__().asOriginalType2__(), createItem('n1', {}), {});

    expect(handler).not.toHaveBeenCalled();
  });
});
