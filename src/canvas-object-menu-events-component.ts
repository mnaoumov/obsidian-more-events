import type {
  CanvasViewCanvas,
  CanvasViewCanvasEdge,
  CanvasViewCanvasNode
} from '@obsidian-typings/obsidian-public-latest';
import type {
  App,
  Events,
  Menu
} from 'obsidian';
import type {
  AllCanvasNodeData,
  CanvasEdgeData
} from 'obsidian/canvas.d.ts';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { CanvasMenuSelection } from '../api.d.ts';

import {
  CANVAS_EDGE_MENU_EVENT_NAME,
  CANVAS_NODE_MENU_EVENT_NAME,
  CANVAS_SELECTION_MENU_EVENT_NAME
} from './more-events-api.ts';

/**
 * The event Obsidian itself triggers on `app.workspace` for a single canvas node's menu, undocumented (`app.js:156385`
 * in 1.15.0).
 */
const OBSIDIAN_CANVAS_NODE_MENU_EVENT_NAME = 'canvas:node-menu';

/**
 * The event Obsidian itself triggers on `app.workspace` for a single canvas connection's menu, undocumented
 * (`app.js:158066` in 1.15.0).
 */
const OBSIDIAN_CANVAS_EDGE_MENU_EVENT_NAME = 'canvas:edge-menu';

/**
 * The event Obsidian itself triggers on `app.workspace` for a canvas selection's menu, undocumented (`app.js:155496`
 * in 1.15.0).
 */
const OBSIDIAN_CANVAS_SELECTION_MENU_EVENT_NAME = 'canvas:selection-menu';

/**
 * Parameters for the {@link CanvasObjectMenuEventsComponent} constructor.
 */
export interface CanvasObjectMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Publishes the context-menu events of a canvas node, a canvas connection and a canvas selection, as relays.
 *
 * **They are relays, and need no patch.** Obsidian already triggers its own `canvas:node-menu`, `canvas:edge-menu` and
 * `canvas:selection-menu` with the menu and the node, the connection or the canvas, but documents and types none of
 * them.
 *
 * **What is handed over is plain data, not Obsidian's objects.** The node, the connection and the canvas are not
 * public `obsidian` types, while what the canvas file stores of them is (`obsidian/canvas`), so each relay hands over
 * the leaf holding the **Canvas** view and `getData()` copies. The leaf is the canvas's own `view.leaf`, so a canvas
 * in a hover popover is announced too.
 */
export class CanvasObjectMenuEventsComponent extends Component {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CanvasObjectMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Subscribes to Obsidian's own events.
   */
  public override onload(): void {
    /*
     * An upcast rather than `app.workspace.on`, because no typings declare the events: `Workspace` redeclares `on` as
     * a closed set of overloads, and the generic `Events.on` is what accepts any name.
     */
    // TODO: Call `app.workspace.on` directly once `obsidian-typings` declares the three `canvas:*-menu` events.
    const workspaceEvents: Events = this.app.workspace;
    this.registerEvent(workspaceEvents.on(OBSIDIAN_CANVAS_NODE_MENU_EVENT_NAME, (menu: unknown, node: unknown) => {
      const canvasNode = castTo<CanvasViewCanvasNode>(node);
      this.app.workspace.trigger(CANVAS_NODE_MENU_EVENT_NAME, castTo<Menu>(menu), canvasNode.canvas.view.leaf, getNodeData(canvasNode));
    }));
    this.registerEvent(workspaceEvents.on(OBSIDIAN_CANVAS_EDGE_MENU_EVENT_NAME, (menu: unknown, edge: unknown) => {
      const canvasEdge = castTo<CanvasViewCanvasEdge>(edge);
      this.app.workspace.trigger(CANVAS_EDGE_MENU_EVENT_NAME, castTo<Menu>(menu), canvasEdge.canvas.view.leaf, getEdgeData(canvasEdge));
    }));
    this.registerEvent(workspaceEvents.on(OBSIDIAN_CANVAS_SELECTION_MENU_EVENT_NAME, (menu: unknown, canvas: unknown) => {
      const viewCanvas = castTo<CanvasViewCanvas>(canvas);
      this.app.workspace.trigger(CANVAS_SELECTION_MENU_EVENT_NAME, castTo<Menu>(menu), viewCanvas.view.leaf, getSelection(viewCanvas));
    }));
  }
}

function getEdgeData(edge: CanvasViewCanvasEdge): CanvasEdgeData {
  return castTo<CanvasEdgeData>(edge.getData());
}

function getNodeData(node: CanvasViewCanvasNode): AllCanvasNodeData {
  return castTo<AllCanvasNodeData>(node.getData());
}

/**
 * Copies what is selected on a canvas.
 *
 * The selection holds nodes and connections alike, with no kind on either, so each item is told apart by which of
 * the canvas's two maps holds it under its id.
 *
 * @param canvas - The canvas.
 * @returns The selected nodes and connections, as the canvas file stores them.
 */
function getSelection(canvas: CanvasViewCanvas): CanvasMenuSelection {
  const edges: CanvasEdgeData[] = [];
  const nodes: AllCanvasNodeData[] = [];
  for (const item of castTo<Iterable<CanvasViewCanvasEdge | CanvasViewCanvasNode>>(canvas.selection)) {
    if (canvas.nodes.get(item.id) === item) {
      nodes.push(getNodeData(castTo<CanvasViewCanvasNode>(item)));
    } else if (canvas.edges.get(item.id) === item) {
      edges.push(getEdgeData(castTo<CanvasViewCanvasEdge>(item)));
    }
  }

  return { edges, nodes };
}
