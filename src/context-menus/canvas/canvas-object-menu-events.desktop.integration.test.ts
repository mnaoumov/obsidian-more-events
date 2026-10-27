import type { CanvasView } from '@obsidian-typings/obsidian-public-latest';
import type {
  Events,
  Menu
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  CANVAS_EDGE_MENU_EVENT_NAME,
  CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME,
  CANVAS_NODE_MENU_EVENT_NAME,
  CANVAS_SELECTION_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

type CanvasTarget = 'edge' | 'node' | 'selection';

interface MenuRecord {
  /**
   * What each of the three listeners was given, one entry per call: the event's last word and the ids it named.
   */
  readonly calls: string[];

  /**
   * The view types of the leaves the listeners were given.
   */
  readonly leafViewTypes: string[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. Each relay rests on Obsidian still
 * triggering its own undocumented `canvas:node-menu`, `canvas:edge-menu`, `canvas:selection-menu` and
 * `canvas:node-connection-drop-menu` under those names, with those subjects, before the menu is shown, which only real
 * trusted input proves.
 *
 * Each test adds an item from its listener and then reads the menu Obsidian actually put on screen, because the point
 * of a menu event is that the item shows up. Each right-click test also asserts that the other two events stayed
 * silent, so a menu claimed by the wrong relay fails.
 *
 * Each test also listens to Obsidian's own events, and closes the menu it is handed there, so a broken relay leaves
 * no menu open to swallow the next test's click.
 *
 * The connection-drop menu is opened by a trusted DRAG instead: a connection dragged out of a card's handle onto empty
 * canvas, which is the only way Obsidian shows it.
 *
 * Desktop only: the trusted right-click and drag go through Electron's `sendInputEvent`.
 */
describe('Canvas object menu events', () => {
  it('should let a listener add an item to a canvas node\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickCanvas('node');

    expect(record.calls).toEqual(['node:n1']);
    expect(record.leafViewTypes).toEqual(['canvas']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Zoom to selection');
  });

  it('should let a listener add an item to a canvas connection\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickCanvas('edge');

    expect(record.calls).toEqual(['edge:e1:n1>n2']);
    expect(record.leafViewTypes).toEqual(['canvas']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Follow connection');
  });

  it('should let a listener add an item to a canvas selection\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickCanvas('selection');

    expect(record.calls).toEqual(['selection:n1,n2:e1']);
    expect(record.leafViewTypes).toEqual(['canvas']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Create group');
  });

  it('should let a listener add an item to the menu of a connection dropped onto empty canvas', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await dropConnection();

    expect(record.calls).toEqual(['drop:n1:bottom>top']);
    expect(record.leafViewTypes).toEqual(['canvas']);
    // The card spans x 0 to 240 and y 0 to 120, and the connection was dragged straight down out of it.
    expect(record.isDropBelowCard).toBe(true);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Add card');
  });
});

interface DropRecord extends MenuRecord {
  /**
   * Whether the drop point the listener was given lies below the card and within its width, in canvas coordinates.
   */
  readonly isDropBelowCard: boolean;
}

/**
 * Opens a canvas holding one card, drags a connection out of the card's bottom handle onto empty canvas with a
 * trusted drag, and records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function dropConnection(): Promise<DropRecord> {
  return await evalInObsidian({
    async callback({
      app,
      CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME: canvasNodeConnectionDropMenuEventName,
      lib
    }): Promise<DropRecord> {
      const {
        dragMouse,
        moveMouse,
        waitUntil
      } = lib;
      // Three waits at 8 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const CANVAS_PATH = 'Canvas connection drop test.canvas';
      const CARD_HEIGHT = 120;
      const CARD_WIDTH = 240;
      const DROP_DISTANCE_IN_PIXELS = 120;
      // Canvas pans when a drag nears its edge (30px), so the drop stays well clear of it.
      const EDGE_CLEARANCE_IN_PIXELS = 60;
      const CANVAS_CONTENT = JSON.stringify({
        edges: [],
        nodes: [{ height: CARD_HEIGHT, id: 'n1', text: 'First card', type: 'text', width: CARD_WIDTH, x: 0, y: 0 }]
      });

      // See `rightClickCanvas` for why Canvas is turned on first.
      const canvasCorePlugin = app.internalPlugins.getPluginById('canvas');
      if (!canvasCorePlugin) {
        throw new Error('The Canvas core plugin was not found.');
      }
      const wasCanvasEnabled = canvasCorePlugin.enabled;
      if (!wasCanvasEnabled) {
        await canvasCorePlugin.enable(false);
      }

      const existingFile = app.vault.getFileByPath(CANVAS_PATH);
      if (existingFile) {
        await app.vault.modify(existingFile, CANVAS_CONTENT);
      }
      const file = existingFile ?? await app.vault.create(CANVAS_PATH, CANVAS_CONTENT);
      const leaf = app.workspace.getLeaf('tab');
      await leaf.openFile(file);
      await app.workspace.revealLeaf(leaf);
      if (leaf.view.getViewType() !== 'canvas') {
        throw new Error(`Expected a canvas view, got ${leaf.view.getViewType()}`);
      }
      // A cast, because `getViewType()` does not narrow `leaf.view`.
      const { canvas } = leaf.view as CanvasView;

      const calls: string[] = [];
      const leafViewTypes: string[] = [];
      let isDropBelowCard = false;
      let shownMenu: Menu | null = null;
      let obsidianMenu: Menu | null = null;

      const eventRef = app.workspace.on(canvasNodeConnectionDropMenuEventName, (menu, canvasLeaf, fromNode, drop) => {
        shownMenu = menu;
        calls.push(`drop:${fromNode.id}:${drop.fromSide}>${drop.toSide}`);
        leafViewTypes.push(canvasLeaf.view.getViewType());
        isDropBelowCard = drop.position.y > CARD_HEIGHT && drop.position.x >= 0 && drop.position.x <= CARD_WIDTH;
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });
      // An upcast, because no typings declare Obsidian's own event: the generic `Events.on` accepts any name.
      const workspaceEvents: Events = app.workspace;
      const obsidianEventRef = workspaceEvents.on('canvas:node-connection-drop-menu', (menu: unknown) => {
        obsidianMenu = menu as Menu;
      });

      try {
        await waitUntil({
          message: 'the canvas to render the card',
          predicate: () => {
            const node = canvas.nodes.get('n1');
            return !!node && node.nodeEl.isShown() && node.nodeEl.getBoundingClientRect().width > 0;
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const node = canvas.nodes.get('n1');
        if (!node) {
          throw new Error('The canvas did not load its card.');
        }
        canvas.deselectAll();

        // The connection handles belong to the node under the pointer, so the pointer goes there first.
        const nodeRect = node.nodeEl.getBoundingClientRect();
        await moveMouse({ x: Math.round(nodeRect.left + nodeRect.width / 2), y: Math.round(nodeRect.top + nodeRect.height / 2) });

        const handleSelector = '.canvas-node-connection-point[data-side="bottom"]';
        function findHandle(): HTMLElement | null {
          const handleEl = leaf.view.containerEl.querySelector<HTMLElement>(handleSelector);
          return handleEl && handleEl.getBoundingClientRect().width > 0 ? handleEl : null;
        }
        await waitUntil({
          message: 'the bottom connection handle to be laid out',
          predicate: () => findHandle() !== null,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const handleEl = findHandle();
        if (!handleEl) {
          throw new Error('The canvas rendered no bottom connection handle.');
        }

        const handleRect = handleEl.getBoundingClientRect();
        const wrapperRect = canvas.wrapperEl.getBoundingClientRect();
        const from = { x: Math.round(handleRect.left + handleRect.width / 2), y: Math.round(handleRect.top + handleRect.height / 2) };
        const room = wrapperRect.bottom - from.y - EDGE_CLEARANCE_IN_PIXELS;
        if (room < DROP_DISTANCE_IN_PIXELS) {
          throw new Error(`The canvas has only ${String(room)}px of empty space below the card to drop on.`);
        }
        await dragMouse({ from, to: { x: from.x, y: from.y + DROP_DISTANCE_IN_PIXELS } });

        await waitUntil({
          message: 'the connection-drop menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          calls,
          isDropBelowCard,
          leafViewTypes,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        app.workspace.offref(obsidianEventRef);
        // The `null` initializers narrow the closure-assigned variables to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        (obsidianMenu as Menu | null)?.hide();
        leaf.detach();
        if (!wasCanvasEnabled) {
          canvasCorePlugin.disable(false);
        }
      }
    },
    input: {
      CANVAS_NODE_CONNECTION_DROP_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Opens a canvas holding two cards joined by one connection, right-clicks the target with a trusted click, and
 * records what the listeners saw and what the menu on screen showed.
 *
 * @param target - What to right-click: the first card alone, the connection, or the first card while both cards and
 * the connection are selected.
 * @returns What happened.
 */
async function rightClickCanvas(target: CanvasTarget): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      CANVAS_EDGE_MENU_EVENT_NAME: canvasEdgeMenuEventName,
      CANVAS_NODE_MENU_EVENT_NAME: canvasNodeMenuEventName,
      CANVAS_SELECTION_MENU_EVENT_NAME: canvasSelectionMenuEventName,
      lib,
      target: canvasTarget
    }): Promise<MenuRecord> {
      const {
        clickMouse,
        waitUntil
      } = lib;
      // Two waits at 8 s declare 16 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const CANVAS_PATH = 'Canvas object menu test.canvas';
      // Side by side at one height, so the connection between them is a straight horizontal line.
      const CANVAS_CONTENT = JSON.stringify({
        edges: [{ fromNode: 'n1', fromSide: 'right', id: 'e1', toNode: 'n2', toSide: 'left' }],
        nodes: [
          { height: 120, id: 'n1', text: 'First card', type: 'text', width: 240, x: 0, y: 0 },
          { height: 120, id: 'n2', text: 'Second card', type: 'text', width: 240, x: 480, y: 0 }
        ]
      });

      // With Canvas off, `openFile` hands a `.canvas` to the operating system's default app, which pops a
      // dialog on the desktop before any check below could object. The core-plugin suite toggles Canvas in
      // this same vault, so one that failed midway can leave it off.
      const canvasCorePlugin = app.internalPlugins.getPluginById('canvas');
      if (!canvasCorePlugin) {
        throw new Error('The Canvas core plugin was not found.');
      }
      const wasCanvasEnabled = canvasCorePlugin.enabled;
      if (!wasCanvasEnabled) {
        await canvasCorePlugin.enable(false);
      }

      const existingFile = app.vault.getFileByPath(CANVAS_PATH);
      if (existingFile) {
        await app.vault.modify(existingFile, CANVAS_CONTENT);
      }
      const file = existingFile ?? await app.vault.create(CANVAS_PATH, CANVAS_CONTENT);
      const leaf = app.workspace.getLeaf('tab');
      await leaf.openFile(file);
      await app.workspace.revealLeaf(leaf);
      if (leaf.view.getViewType() !== 'canvas') {
        throw new Error(`Expected a canvas view, got ${leaf.view.getViewType()}`);
      }
      // A cast, because `getViewType()` does not narrow `leaf.view`.
      const { canvas } = leaf.view as CanvasView;

      const calls: string[] = [];
      const leafViewTypes: string[] = [];
      let shownMenu: Menu | null = null;
      let obsidianMenu: Menu | null = null;

      function record(menu: Menu, canvasLeaf: typeof leaf, call: string): void {
        shownMenu = menu;
        calls.push(call);
        leafViewTypes.push(canvasLeaf.view.getViewType());
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      }

      const eventRefs = [
        app.workspace.on(canvasNodeMenuEventName, (menu, canvasLeaf, node) => {
          record(menu, canvasLeaf, `node:${node.id}`);
        }),
        app.workspace.on(canvasEdgeMenuEventName, (menu, canvasLeaf, edge) => {
          record(menu, canvasLeaf, `edge:${edge.id}:${edge.fromNode}>${edge.toNode}`);
        }),
        app.workspace.on(canvasSelectionMenuEventName, (menu, canvasLeaf, selection) => {
          const nodeIds = selection.nodes.map((node) => node.id).sort().join(',');
          const edgeIds = selection.edges.map((edge) => edge.id).sort().join(',');
          record(menu, canvasLeaf, `selection:${nodeIds}:${edgeIds}`);
        })
      ];
      // An upcast, because no typings declare Obsidian's own events: the generic `Events.on` accepts any name.
      const workspaceEvents: Events = app.workspace;
      const obsidianEventRefs = ['canvas:node-menu', 'canvas:edge-menu', 'canvas:selection-menu'].map((name) =>
        workspaceEvents.on(name, (menu: unknown) => {
          obsidianMenu = menu as Menu;
        })
      );

      try {
        await waitUntil({
          message: 'the canvas to render both cards and the connection',
          predicate: () => {
            const firstNode = canvas.nodes.get('n1');
            const edge = canvas.edges.get('e1');
            return !!firstNode && !!edge && firstNode.nodeEl.isShown() && firstNode.nodeEl.getBoundingClientRect().width > 0
              && edge.path.interaction.getBoundingClientRect().width > 0;
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const firstNode = canvas.nodes.get('n1');
        const secondNode = canvas.nodes.get('n2');
        const edge = canvas.edges.get('e1');
        if (!firstNode || !secondNode || !edge) {
          throw new Error('The canvas did not load its cards and connection.');
        }

        canvas.deselectAll();
        if (canvasTarget === 'selection') {
          // Setting up what is selected is not the input under test: the right-click below is.
          canvas.select(firstNode);
          canvas.select(secondNode);
          canvas.select(edge);
        }

        const targetEl = canvasTarget === 'edge' ? edge.path.interaction : firstNode.nodeEl;
        const targetRect = targetEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(targetRect.left + targetRect.width / 2),
          y: Math.round(targetRect.top + targetRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          calls,
          leafViewTypes,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        for (const eventRef of [...eventRefs, ...obsidianEventRefs]) {
          app.workspace.offref(eventRef);
        }
        // The `null` initializers narrow the closure-assigned variables to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        (obsidianMenu as Menu | null)?.hide();
        leaf.detach();
        if (!wasCanvasEnabled) {
          canvasCorePlugin.disable(false);
        }
      }
    },
    input: {
      CANVAS_EDGE_MENU_EVENT_NAME,
      CANVAS_NODE_MENU_EVENT_NAME,
      CANVAS_SELECTION_MENU_EVENT_NAME,
      target
    },
    vaultPath: getTemporaryVault().path
  });
}
