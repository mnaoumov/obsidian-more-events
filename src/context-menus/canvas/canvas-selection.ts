import type {
  CanvasViewCanvas,
  CanvasViewCanvasEdge,
  CanvasViewCanvasNode
} from '@obsidian-typings/obsidian-public-latest';
import type {
  AllCanvasNodeData,
  CanvasEdgeData
} from 'obsidian/canvas.d.ts';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';

import type { CanvasMenuSelection } from '../../../api.d.ts';

/**
 * Copies a canvas connection as the canvas file stores it.
 *
 * @param edge - The connection.
 * @returns The copy.
 */
export function getEdgeData(edge: CanvasViewCanvasEdge): CanvasEdgeData {
  return castTo<CanvasEdgeData>(edge.getData());
}

/**
 * Copies a canvas node as the canvas file stores it.
 *
 * @param node - The node.
 * @returns The copy.
 */
export function getNodeData(node: CanvasViewCanvasNode): AllCanvasNodeData {
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
export function getSelection(canvas: CanvasViewCanvas): CanvasMenuSelection {
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
