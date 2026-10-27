import type { CanvasView } from '@obsidian-typings/obsidian-public-latest';
import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { CanvasMenuPosition } from '../../../api.d.ts';

import { CANVAS_VIEW_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The canvas positions the listener was given.
   */
  positions: CanvasMenuPosition[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * The view types of the leaves the listener was given.
   */
  subjects: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. The announcement rests on
 * `evt.currentTarget` still being the canvas's `wrapperEl` while Obsidian shows the background menu, which
 * only a real trusted right-click through the real listener proves.
 *
 * It adds an item from its listener and then reads the menu Obsidian actually put on screen, because the
 * point of a menu event is that the item shows up: an event that fired after the menu was built would pass a
 * payload check and still be useless.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Canvas menu events', () => {
  it('should let a listener add an item to the canvas view\'s empty-background menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickCanvasBackground();

    expect(record.subjects).toEqual(['canvas']);
    expect(record.positions).toHaveLength(1);
    expect(Number.isFinite(record.positions[0]?.x)).toBe(true);
    expect(Number.isFinite(record.positions[0]?.y)).toBe(true);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Add card');
  });
});

/**
 * Opens an empty canvas, right-clicks the middle of its background with a trusted click, and records what
 * the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickCanvasBackground(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      CANVAS_VIEW_MENU_EVENT_NAME: canvasViewMenuEventName,
      lib
    }): Promise<MenuRecord> {
      const {
        clickMouse,
        waitUntil
      } = lib;
      // Two waits at 8 s declare 16 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const CANVAS_PATH = 'Menu test.canvas';

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

      const file = app.vault.getFileByPath(CANVAS_PATH) ?? await app.vault.create(CANVAS_PATH, '{"nodes":[],"edges":[]}');
      const leaf = app.workspace.getLeaf('tab');
      await leaf.openFile(file);
      await app.workspace.revealLeaf(leaf);
      if (leaf.view.getViewType() !== 'canvas') {
        throw new Error(`Expected a canvas view, got ${leaf.view.getViewType()}`);
      }
      // A cast, because `getViewType()` does not narrow `leaf.view`.
      const { wrapperEl } = (leaf.view as CanvasView).canvas;

      const positions: CanvasMenuPosition[] = [];
      const subjects: string[] = [];
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(canvasViewMenuEventName, (menu, canvasLeaf, position) => {
        shownMenu = menu;
        subjects.push(canvasLeaf.view.getViewType());
        positions.push(position);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      try {
        await waitUntil({
          message: 'the canvas to be laid out',
          predicate: () => wrapperEl.isShown() && wrapperEl.getBoundingClientRect().width > 0,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        // The middle of an empty canvas: the background layers above the wrapper take no pointer events.
        const wrapperRect = wrapperEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(wrapperRect.left + wrapperRect.width / 2),
          y: Math.round(wrapperRect.top + wrapperRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          positions,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjects
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        leaf.detach();
        if (!wasCanvasEnabled) {
          canvasCorePlugin.disable(false);
        }
      }
    },
    input: {
      CANVAS_VIEW_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
