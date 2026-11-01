import type { CanvasView } from '@obsidian-typings/obsidian-public-latest';
import type {
  EventRef,
  WorkspaceLeaf
} from 'obsidian';

import {
  ContextId,
  evalInObsidian
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import type { CanvasItemChanges } from '../api/more-events-api.ts';

import {
  CANVAS_CONTENT_CHANGED_EVENT_NAME,
  CANVAS_NODE_EDITING_CHANGED_EVENT_NAME,
  CANVAS_READ_ONLY_CHANGED_EVENT_NAME,
  CANVAS_SELECTION_CHANGED_EVENT_NAME,
  CANVAS_TOOLBAR_RENDERED_EVENT_NAME
} from '../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;
const ADDED_BUTTON_LABEL = 'Added by a listener';

/**
 * What the suite keeps in Obsidian between its short closures.
 */
interface CanvasEventsContext {
  /**
   * What each event was handed, one entry per call, in the order they came.
   */
  readonly calls: string[];

  /**
   * The listeners to remove when the canvas is closed.
   */
  readonly eventRefs: EventRef[];

  /**
   * The leaf the canvas is open in.
   */
  readonly leaf: WorkspaceLeaf;

  /**
   * Whether each event was handed {@link leaf}.
   */
  readonly leafMatches: boolean[];

  /**
   * Whether the Canvas core plugin was enabled before the suite turned it on.
   */
  readonly wasCanvasEnabled: boolean;
}

interface CanvasEventsRecord {
  readonly calls: string[];
  readonly hasAddedToolbarButton: boolean;
  readonly leafMatches: boolean[];
}

type ClickTarget = 'edit-button' | 'empty-canvas' | 'first-card' | 'read-only-item' | 'settings-button';

interface IdHolder {
  readonly id: string;
}

/*
 * The tests that can fail for the right reason: each drives a real canvas with trusted input, the way a person does,
 * so an event whose seam Obsidian stopped calling fails here on a short call list.
 *
 * Every test listens to all five events, so an event that fires where it should not fails the test on its calls, and
 * opening the canvas, which is no event at all, is checked by every test. The toolbar event records in its own test
 * only, since selecting a card rebuilds the toolbar in all of them. Every test writes its own canvas file, because the
 * read-only state is stored per file. Each step is its own short closure, sharing state through a context, so no
 * closure comes near the transport's 30 s cap.
 *
 * Desktop only: the trusted clicks and keys go through Electron's `sendInputEvent`.
 */
describe('Canvas events', () => {
  let contextId: ContextId<CanvasEventsContext>;

  beforeEach(() => {
    contextId = new ContextId<CanvasEventsContext>();
  });

  afterEach(async () => {
    await closeCanvas(contextId);
    await contextId.dispose(getTemporaryVault().path);
  });

  it('should announce a card being selected and the selection being cleared', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    await openCanvas(contextId, 'selection');
    await click(contextId, 'first-card');
    await waitForCalls(contextId, 1);
    await click(contextId, 'empty-canvas');
    await waitForCalls(contextId, 2);

    const record = await readRecord(contextId);
    expect(record.calls).toEqual(['selection:n1:', 'selection::']);
    expect(record.leafMatches).toEqual([true, true]);
  });

  it('should let a listener add a button to the selection toolbar', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    await openCanvas(contextId, 'toolbar');
    await click(contextId, 'first-card');
    await waitForCalls(contextId, 2);

    const record = await readRecord(contextId);
    // The toolbar is rebuilt in the canvas's own frame, and the selection is announced on the frame after it.
    expect(record.calls).toEqual(['toolbar:n1:', 'selection:n1:']);
    expect(record.hasAddedToolbarButton).toBe(true);
    expect(record.leafMatches).toEqual([true, true]);
  });

  it('should announce a card starting and stopping being edited', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    await openCanvas(contextId, 'editing');
    await click(contextId, 'first-card');
    await waitForCalls(contextId, 1);
    await click(contextId, 'edit-button');
    await waitForCalls(contextId, 2);
    await click(contextId, 'empty-canvas');
    await waitForCalls(contextId, 4);

    const record = await readRecord(contextId);
    expect(record.calls).toEqual(['selection:n1:', 'editing:n1:true', 'editing:n1:false', 'selection::']);
    expect(record.leafMatches).toEqual([true, true, true, true]);
  });

  it('should announce the canvas being made read-only and editable again', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    await openCanvas(contextId, 'read-only');
    await click(contextId, 'settings-button');
    await click(contextId, 'read-only-item');
    await waitForCalls(contextId, 1);
    // While the canvas is read-only, the same button makes it editable with one click.
    await click(contextId, 'settings-button');
    await waitForCalls(contextId, 2);

    const record = await readRecord(contextId);
    expect(record.calls).toEqual(['read-only:true', 'read-only:false']);
    expect(record.leafMatches).toEqual([true, true]);
  });

  it('should announce a deleted card and the file changing on disk, but not the file opening', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    await openCanvas(contextId, 'content');
    await click(contextId, 'first-card');
    await waitForCalls(contextId, 1);
    await pressDelete(contextId);
    await waitForCalls(contextId, 3);
    await changeCanvasOnDisk(contextId);
    await waitForCalls(contextId, 4);

    const record = await readRecord(contextId);
    expect(record.calls).toEqual([
      'selection:n1:',
      'content:nodes(+|~|-n1):edges(+|~|-e1)',
      'selection::',
      'content:nodes(+n3|~n2|-):edges(+|~|-)'
    ]);
    expect(record.leafMatches).toEqual([true, true, true, true]);
  });
});

/**
 * Waits for the canvas's own save of what the test did, then rewrites the canvas file on disk, the way Sync or
 * another editor would.
 *
 * @param contextId - The context the canvas lives in.
 * @returns A {@link Promise} that resolves once the file is written.
 */
async function changeCanvasOnDisk(contextId: ContextId<CanvasEventsContext>): Promise<void> {
  await evalInObsidian({
    async callback({ app, context, lib }): Promise<void> {
      const { file } = context.leaf.view as CanvasView;
      if (!file) {
        throw new Error('The canvas leaf shows no file.');
      }
      // Without the wait, the canvas's pending save could overwrite the write below, or race it.
      await lib.waitUntil({
        message: 'the deletion to be saved',
        predicate: async () => {
          const content = await app.vault.read(file);
          return !content.includes('"n1"');
        },
        timeoutInMilliseconds: 10_000
      });
      await app.vault.modify(
        file,
        JSON.stringify({
          edges: [],
          nodes: [
            { height: 120, id: 'n2', text: 'Second card, changed on disk', type: 'text', width: 240, x: 480, y: 0 },
            { height: 120, id: 'n3', text: 'Third card', type: 'text', width: 240, x: 480, y: 300 }
          ]
        })
      );
    },
    contextId,
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Clicks one thing on the open canvas with a trusted click, once it shows.
 *
 * @param contextId - The context the canvas lives in.
 * @param target - What to click.
 * @returns A {@link Promise} that resolves once the click has been injected.
 */
async function click(contextId: ContextId<CanvasEventsContext>, target: ClickTarget): Promise<void> {
  await evalInObsidian({
    async callback({ context, lib, target: clickTarget }): Promise<void> {
      const { canvas } = context.leaf.view as CanvasView;

      function findTarget(): Element | null {
        switch (clickTarget) {
          case 'edit-button': {
            return canvas.menu.menuEl.querySelector(':scope > button[aria-label="Edit"]');
          }
          case 'empty-canvas': {
            return canvas.wrapperEl;
          }
          case 'first-card': {
            return canvas.nodes.get('n1')?.nodeEl ?? null;
          }
          case 'read-only-item': {
            return [...activeDocument.body.querySelectorAll(':scope > .menu .menu-item')]
              .find((itemEl) => itemEl.querySelector(':scope > .menu-item-title')?.textContent === 'Read-only') ?? null;
          }
          case 'settings-button': {
            return canvas.wrapperEl.querySelector(':scope .canvas-control-item:has(> .lucide-settings, > .lucide-lock)');
          }
          default: {
            return null;
          }
        }
      }

      await lib.waitUntil({
        message: `the ${clickTarget} to show`,
        predicate: () => !!findTarget(),
        timeoutInMilliseconds: 10_000
      });
      const targetEl = findTarget();
      if (!targetEl) {
        throw new Error(`The ${clickTarget} is not there.`);
      }
      const rect = targetEl.getBoundingClientRect();
      if (clickTarget === 'empty-canvas') {
        // The bottom left corner: the cards are zoomed to fit in the middle, and the controls are on the right.
        await lib.clickMouse({ x: Math.round(rect.left + 40), y: Math.round(rect.bottom - 40) });
        return;
      }
      await lib.clickMouse({ x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) });
    },
    contextId,
    input: { target },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Removes the listeners, closes the canvas and restores the Canvas core plugin.
 *
 * @param contextId - The context the canvas lives in.
 * @returns A {@link Promise} that resolves once everything is back.
 */
async function closeCanvas(contextId: ContextId<CanvasEventsContext>): Promise<void> {
  await evalInObsidian({
    async callback({ app, context, lib }): Promise<void> {
      // `openCanvas` may have failed before it filled the context, so every member may be missing.
      const partialContext = context as Partial<CanvasEventsContext>;
      for (const eventRef of partialContext.eventRefs ?? []) {
        app.workspace.offref(eventRef);
      }
      await lib.pressKey({ key: 'Escape' });
      partialContext.leaf?.detach();
      if (partialContext.wasCanvasEnabled === false) {
        app.internalPlugins.getPluginById('canvas')?.disable(false);
      }
    },
    contextId,
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Writes a canvas holding two cards joined by a connection, listens to every canvas event, opens it, and waits until
 * its cards stop moving.
 *
 * @param contextId - The context to keep the canvas in.
 * @param name - The test's name, which names its canvas file.
 * @returns A {@link Promise} that resolves once the canvas is ready for input.
 */
async function openCanvas(contextId: ContextId<CanvasEventsContext>, name: string): Promise<void> {
  await evalInObsidian({
    async callback({
      ADDED_BUTTON_LABEL: addedButtonLabel,
      app,
      CANVAS_CONTENT_CHANGED_EVENT_NAME: canvasContentChangedEventName,
      CANVAS_NODE_EDITING_CHANGED_EVENT_NAME: canvasNodeEditingChangedEventName,
      CANVAS_READ_ONLY_CHANGED_EVENT_NAME: canvasReadOnlyChangedEventName,
      CANVAS_SELECTION_CHANGED_EVENT_NAME: canvasSelectionChangedEventName,
      CANVAS_TOOLBAR_RENDERED_EVENT_NAME: canvasToolbarRenderedEventName,
      context,
      lib,
      name: testName
    }): Promise<void> {
      const canvasPath = `Canvas events test ${testName}.canvas`;
      const canvasContent = JSON.stringify({
        edges: [{ fromNode: 'n1', fromSide: 'right', id: 'e1', toNode: 'n2', toSide: 'left' }],
        nodes: [
          { height: 120, id: 'n1', text: 'First card', type: 'text', width: 240, x: 0, y: 0 },
          { height: 120, id: 'n2', text: 'Second card', type: 'text', width: 240, x: 480, y: 0 }
        ]
      });

      // See `rightClickCanvas` in the canvas object suite for why Canvas is turned on first.
      const canvasCorePlugin = app.internalPlugins.getPluginById('canvas');
      if (!canvasCorePlugin) {
        throw new Error('The Canvas core plugin was not found.');
      }
      Object.assign(context, { wasCanvasEnabled: canvasCorePlugin.enabled });
      if (!canvasCorePlugin.enabled) {
        await canvasCorePlugin.enable(false);
      }

      const existingFile = app.vault.getFileByPath(canvasPath);
      if (existingFile) {
        await app.vault.modify(existingFile, canvasContent);
      }
      const file = existingFile ?? await app.vault.create(canvasPath, canvasContent);

      const calls: string[] = [];
      const leafMatches: boolean[] = [];
      const leaf = app.workspace.getLeaf('tab');
      Object.assign(context, { calls, leaf, leafMatches });

      function record(call: string, canvasLeaf: WorkspaceLeaf): void {
        calls.push(call);
        leafMatches.push(canvasLeaf === leaf);
      }

      function ids(items: readonly IdHolder[]): string {
        return items.map((item) => item.id).sort().join(',');
      }

      function describeChanges(changes: CanvasItemChanges): string {
        return `+${changes.added.join(',')}|~${changes.changed.join(',')}|-${changes.removed.join(',')}`;
      }

      const eventRefs = [
        app.workspace.on(canvasSelectionChangedEventName, (canvasLeaf, selection) => {
          record(`selection:${ids(selection.nodes)}:${ids(selection.edges)}`, canvasLeaf);
        }),
        app.workspace.on(canvasContentChangedEventName, (canvasLeaf, change) => {
          record(`content:nodes(${describeChanges(change.nodes)}):edges(${describeChanges(change.edges)})`, canvasLeaf);
        }),
        app.workspace.on(canvasReadOnlyChangedEventName, (canvasLeaf, isReadOnly) => {
          record(`read-only:${String(isReadOnly)}`, canvasLeaf);
        }),
        app.workspace.on(canvasNodeEditingChangedEventName, (canvasLeaf, nodeId, isEditing) => {
          record(`editing:${nodeId}:${String(isEditing)}`, canvasLeaf);
        }),
        app.workspace.on(canvasToolbarRenderedEventName, (canvasLeaf, toolbarEl, selection) => {
          toolbarEl.createEl('button', { attr: { 'aria-label': addedButtonLabel }, cls: 'clickable-icon' });
          if (testName === 'toolbar') {
            record(`toolbar:${ids(selection.nodes)}:${ids(selection.edges)}`, canvasLeaf);
          }
        })
      ];
      Object.assign(context, { eventRefs });

      await leaf.openFile(file);
      await app.workspace.revealLeaf(leaf);
      if (leaf.view.getViewType() !== 'canvas') {
        throw new Error(`Expected a canvas view, got ${leaf.view.getViewType()}`);
      }
      // A cast, because `getViewType()` does not narrow `leaf.view`.
      const { canvas } = leaf.view as CanvasView;

      // The canvas zooms to fit on open, so the cards move until the animation ends.
      let lastRectKey = '';
      await lib.waitUntil({
        message: 'the canvas to render its cards and stop moving',
        predicate: () => {
          const rect = canvas.nodes.get('n1')?.nodeEl.getBoundingClientRect();
          if (!rect || rect.width === 0) {
            return false;
          }
          const rectKey = `${String(rect.left)},${String(rect.top)},${String(rect.width)}`;
          const isStill = rectKey === lastRectKey;
          lastRectKey = rectKey;
          return isStill;
        },
        timeoutInMilliseconds: 10_000
      });
    },
    contextId,
    input: {
      ADDED_BUTTON_LABEL,
      CANVAS_CONTENT_CHANGED_EVENT_NAME,
      CANVAS_NODE_EDITING_CHANGED_EVENT_NAME,
      CANVAS_READ_ONLY_CHANGED_EVENT_NAME,
      CANVAS_SELECTION_CHANGED_EVENT_NAME,
      CANVAS_TOOLBAR_RENDERED_EVENT_NAME,
      name
    },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Presses Delete with a trusted key press, which removes the selected card from the canvas.
 *
 * @param contextId - The context the canvas lives in.
 * @returns A {@link Promise} that resolves once the key has been injected.
 */
async function pressDelete(contextId: ContextId<CanvasEventsContext>): Promise<void> {
  await evalInObsidian({
    async callback({ lib }): Promise<void> {
      await lib.pressKey({ key: 'Delete' });
    },
    contextId,
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Reads what the listeners saw, and whether the toolbar holds the button its listener added.
 *
 * @param contextId - The context the canvas lives in.
 * @returns The record.
 */
async function readRecord(contextId: ContextId<CanvasEventsContext>): Promise<CanvasEventsRecord> {
  return await evalInObsidian({
    callback({ ADDED_BUTTON_LABEL: addedButtonLabel, context }): CanvasEventsRecord {
      const { canvas } = context.leaf.view as CanvasView;
      return {
        calls: [...context.calls],
        hasAddedToolbarButton: !!canvas.menu.menuEl.querySelector(`:scope > button[aria-label="${CSS.escape(addedButtonLabel)}"]`),
        leafMatches: [...context.leafMatches]
      };
    },
    contextId,
    input: { ADDED_BUTTON_LABEL },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Waits until the listeners have seen at least `count` events, and then a little longer, so an extra event shows in
 * the call list rather than after the test has read it.
 *
 * @param contextId - The context the canvas lives in.
 * @param count - How many events to wait for.
 * @returns A {@link Promise} that resolves once they have come.
 */
async function waitForCalls(contextId: ContextId<CanvasEventsContext>, count: number): Promise<void> {
  await evalInObsidian({
    async callback({ context, count: expectedCount, lib }): Promise<void> {
      await lib.waitUntil({
        message: `${String(expectedCount)} canvas event(s), having seen ${context.calls.join(' | ')}`,
        predicate: () => context.calls.length >= expectedCount,
        timeoutInMilliseconds: 10_000
      });
      await sleep(300);
    },
    contextId,
    input: { count },
    vaultPath: getTemporaryVault().path
  });
}
