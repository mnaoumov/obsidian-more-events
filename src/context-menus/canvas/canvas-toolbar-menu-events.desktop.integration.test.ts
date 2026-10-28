import type { CanvasView } from '@obsidian-typings/obsidian-public-latest';
import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  CANVAS_ALIGN_MENU_EVENT_NAME,
  CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME,
  CANVAS_LINE_DIRECTION_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * What each of the three listeners was given, one entry per call: the event's last word and the ids it named.
   */
  readonly calls: string[];

  /**
   * Whether each listener was handed the leaf whose toolbar was clicked.
   */
  readonly leafMatches: boolean[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

type ToolbarMenuKind = 'align' | 'background' | 'direction';

/*
 * The test that can fail for the right reason: each toolbar button is found by its English tooltip rather than by
 * the icon the announcer reads, so a button whose icon changed fails here.
 *
 * Each test selects what the button needs, clicks the button with a trusted click, and reads the menu Obsidian put on
 * screen for the item its listener added. Every test listens to all three events, so a menu claimed by the wrong
 * name fails on the calls. Escape closes the menu even when an unplugged announcer handed no listener the menu.
 *
 * Desktop only: the trusted click goes through Electron's `sendInputEvent`.
 */
describe('Canvas toolbar menu events', () => {
  it('should let a listener add an item to the Align menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickToolbarButton('align');

    expect(record.calls).toEqual(['align:n1,n2:']);
    expect(record.leafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Align left');
  });

  it('should let a listener add an item to the Line direction menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickToolbarButton('direction');

    expect(record.calls).toEqual(['line-direction::e1']);
    expect(record.leafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Bidirectional');
  });

  it('should let a listener add an item to a group\'s background menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickToolbarButton('background');

    expect(record.calls).toEqual(['group-background:g1:']);
    expect(record.leafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Remove background');
  });
});

/**
 * Opens a canvas holding two cards joined by a connection and a group with a background image, selects what the
 * button needs, clicks the button with a trusted click, and records what the listeners saw and what the menu on
 * screen showed.
 *
 * @param kind - Which toolbar menu to open.
 * @returns What happened.
 */
async function clickToolbarButton(kind: ToolbarMenuKind): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      CANVAS_ALIGN_MENU_EVENT_NAME: canvasAlignMenuEventName,
      CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME: canvasGroupBackgroundMenuEventName,
      CANVAS_LINE_DIRECTION_MENU_EVENT_NAME: canvasLineDirectionMenuEventName,
      kind: menuKind,
      lib
    }): Promise<MenuRecord> {
      const {
        clickMouse,
        pressKey,
        waitUntil
      } = lib;
      // Three waits at 8 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const CANVAS_PATH = 'Canvas toolbar menu test.canvas';
      const IMAGE_PATH = 'Canvas toolbar menu test.png';
      // A 1x1 transparent PNG: only the group's `background` field matters, not what it shows.
      const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const CANVAS_CONTENT = JSON.stringify({
        edges: [{ fromNode: 'n1', fromSide: 'right', id: 'e1', toNode: 'n2', toSide: 'left' }],
        nodes: [
          { height: 120, id: 'n1', text: 'First card', type: 'text', width: 240, x: 0, y: 0 },
          { height: 120, id: 'n2', text: 'Second card', type: 'text', width: 240, x: 480, y: 0 },
          { background: IMAGE_PATH, height: 200, id: 'g1', label: 'Group', type: 'group', width: 300, x: 0, y: 300 }
        ]
      });

      // See `rightClickCanvas` in the canvas object suite for why Canvas is turned on first.
      const canvasCorePlugin = app.internalPlugins.getPluginById('canvas');
      if (!canvasCorePlugin) {
        throw new Error('The Canvas core plugin was not found.');
      }
      const wasCanvasEnabled = canvasCorePlugin.enabled;
      if (!wasCanvasEnabled) {
        await canvasCorePlugin.enable(false);
      }

      if (!app.vault.getFileByPath(IMAGE_PATH)) {
        await app.vault.createBinary(IMAGE_PATH, Uint8Array.from(atob(PNG_BASE64), (char) => char.codePointAt(0) ?? 0).buffer);
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
      const leafMatches: boolean[] = [];
      let shownMenu: Menu | null = null;

      const eventRefs = ([
        ['align', canvasAlignMenuEventName],
        ['group-background', canvasGroupBackgroundMenuEventName],
        ['line-direction', canvasLineDirectionMenuEventName]
      ] as const).map(([word, eventName]) =>
        app.workspace.on(eventName, (menu, canvasLeaf, selection) => {
          shownMenu = menu;
          const nodeIds = selection.nodes.map((node) => node.id).sort().join(',');
          const edgeIds = selection.edges.map((edge) => edge.id).sort().join(',');
          calls.push(`${word}:${nodeIds}:${edgeIds}`);
          leafMatches.push(canvasLeaf === leaf);
          menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
        })
      );

      try {
        await waitUntil({
          message: 'the canvas to render its cards, connection and group',
          predicate: () => {
            const group = canvas.nodes.get('g1');
            const edge = canvas.edges.get('e1');
            return !!group && !!edge && group.nodeEl.isShown() && group.nodeEl.getBoundingClientRect().width > 0
              && edge.path.interaction.getBoundingClientRect().width > 0;
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const firstNode = canvas.nodes.get('n1');
        const secondNode = canvas.nodes.get('n2');
        const group = canvas.nodes.get('g1');
        const edge = canvas.edges.get('e1');
        if (!firstNode || !secondNode || !group || !edge) {
          throw new Error('The canvas did not load its cards, connection and group.');
        }

        // Setting up what is selected is not the input under test: the click on the toolbar button below is.
        canvas.deselectAll();
        if (menuKind === 'align') {
          canvas.select(firstNode);
          canvas.select(secondNode);
        } else if (menuKind === 'direction') {
          canvas.select(edge);
        } else {
          canvas.select(group);
        }
        canvas.menu.render(true);

        /*
         * The test finds the button by its English tooltip rather than by the icon the announcer reads, so a button
         * whose icon changed fails here instead of passing for the announcer's own reason.
         */
        const LABEL_BY_KIND = {
          align: 'Align',
          background: 'Edit background',
          direction: 'Line direction'
        } as const;
        const buttons = [...canvas.menu.menuEl.querySelectorAll<HTMLElement>(':scope > button')];
        const target = buttons.find((buttonEl) => buttonEl.getAttribute('aria-label') === LABEL_BY_KIND[menuKind]);
        if (!target) {
          const labels = buttons.map((buttonEl) => buttonEl.getAttribute('aria-label')).join(' | ');
          throw new Error(`No canvas toolbar button is labelled "${LABEL_BY_KIND[menuKind]}"; the labels are ${labels}.`);
        }
        const targetRect = target.getBoundingClientRect();
        await clickMouse({ x: Math.round(targetRect.left + targetRect.width / 2), y: Math.round(targetRect.top + targetRect.height / 2) });

        await waitUntil({
          message: 'the toolbar menu to open',
          predicate: () => !!activeDocument.body.querySelector(':scope > .menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector(':scope > .menu');
        return {
          calls,
          leafMatches,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        for (const eventRef of eventRefs) {
          app.workspace.offref(eventRef);
        }
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        await pressKey({ key: 'Escape' });
        leaf.detach();
        if (!wasCanvasEnabled) {
          canvasCorePlugin.disable(false);
        }
      }
    },
    input: {
      CANVAS_ALIGN_MENU_EVENT_NAME,
      CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME,
      CANVAS_LINE_DIRECTION_MENU_EVENT_NAME,
      kind
    },
    vaultPath: getTemporaryVault().path
  });
}
