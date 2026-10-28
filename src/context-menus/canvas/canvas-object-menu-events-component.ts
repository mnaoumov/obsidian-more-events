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
import type { NodeSide } from 'obsidian/canvas.d.ts';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type {
  CanvasMenuPosition,
  CanvasNodeConnectionDrop
} from '../../../api.d.ts';

import {
  CANVAS_EDGE_MENU_EVENT_NAME,
  CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME,
  CANVAS_NODE_MENU_EVENT_NAME,
  CANVAS_SELECTION_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import {
  getEdgeData,
  getNodeData,
  getSelection
} from './canvas-selection.ts';

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
 * The event Obsidian itself triggers on `app.workspace` for the menu shown after a connection is dragged out of a
 * canvas node onto empty canvas, undocumented (`app.js:156620` in 1.15.0).
 */
const OBSIDIAN_CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME = 'canvas:node-connection-drop-menu';

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
 * Publishes the context-menu events of a canvas node, a canvas connection and a canvas selection, and the menu of a
 * connection dropped onto empty canvas, as relays.
 *
 * **They are relays, and need no patch.** Obsidian already triggers its own `canvas:node-menu`, `canvas:edge-menu`,
 * `canvas:selection-menu` and `canvas:node-connection-drop-menu` with the menu and the node, the connection or the
 * canvas, but documents and types none of them.
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
    // TODO: Call `app.workspace.on` directly once `obsidian-typings` declares the four `canvas:*-menu` events.
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
    this.registerEvent(workspaceEvents.on(OBSIDIAN_CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME, (menu: unknown, fromNode: unknown, edge: unknown) => {
      const canvasNode = castTo<CanvasViewCanvasNode>(fromNode);
      this.app.workspace.trigger(
        CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME,
        castTo<Menu>(menu),
        canvasNode.canvas.view.leaf,
        getNodeData(canvasNode),
        getConnectionDrop(castTo<CanvasViewCanvasEdge>(edge))
      );
    }));
  }
}

/**
 * Copies where a dragged connection was dropped.
 *
 * Until an item of the menu picks a node for it, the connection ends at a temporary node of no size that the drag
 * moved to the drop point, which is in no map of the canvas, so its position is the drop point.
 *
 * @param edge - The dragged connection.
 * @returns The drop, as plain data.
 */
function getConnectionDrop(edge: CanvasViewCanvasEdge): CanvasNodeConnectionDrop {
  const dropNode = castTo<CanvasMenuPosition>(edge.to.node);
  return {
    fromSide: castTo<NodeSide>(edge.from.side),
    position: { x: dropNode.x, y: dropNode.y },
    toSide: castTo<NodeSide>(edge.to.side)
  };
}
