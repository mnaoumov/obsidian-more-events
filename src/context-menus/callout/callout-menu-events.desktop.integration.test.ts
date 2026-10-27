import type {
  Menu,
  WorkspaceLeaf
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { CalloutMenuItem } from '../../../api.d.ts';

import { CALLOUT_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The callout sits below a heading and a paragraph, so a wrong line would not pass as the right one by
 * accident, and its type is written in mixed case, so a lowered type would not either.
 */
const NOTE_CONTENT = `# Callout menu

A paragraph before the callout.

> [!Warning] Mind the gap
> The body of the callout.

A paragraph after it.
`;

const CALLOUT_HEADER_LINE = 4;

interface MenuRecord {
  /**
   * The callouts the listener was given.
   */
  readonly callouts: CalloutMenuItem[];

  /**
   * Whether the listener was given the leaf the note is open in, once per call.
   */
  readonly noteLeafMatches: boolean[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement
 * rests on the path the plugin recorded during the dispatch, and the callout's line on CodeMirror mapping the
 * rendered widget back to the document, which only a real trusted right-click on a real Live Preview editor
 * proves.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Callout menu events', () => {
  it('should let a listener add an item to a callout\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickCallout();

    expect(record.callouts).toEqual([{ line: CALLOUT_HEADER_LINE, type: 'Warning' }]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Edit');
  });
});

/**
 * Opens a note with a callout in Live Preview, right-clicks the rendered callout with a trusted click, and
 * records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickCallout(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      CALLOUT_MENU_EVENT_NAME: calloutMenuEventName,
      lib,
      NOTE_CONTENT: noteContent
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'callout-menu-events.md';

      const callouts: CalloutMenuItem[] = [];
      const noteLeafMatches: boolean[] = [];
      let noteLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(calloutMenuEventName, (menu, leaf, callout) => {
        shownMenu = menu;
        callouts.push(callout);
        noteLeafMatches.push(leaf === noteLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      const file = await app.vault.create(NOTE_PATH, noteContent);
      try {
        const leaf = app.workspace.getLeaf('tab');
        noteLeaf = leaf;
        await leaf.setViewState({
          active: true,
          state: { file: file.path, mode: 'source', source: false },
          type: 'markdown'
        });

        const selector = '.cm-embed-block.cm-callout';
        await waitUntil({
          message: 'the callout to render',
          predicate: () => !!leaf.view.containerEl.querySelector(selector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const calloutEl = leaf.view.containerEl.querySelector(selector);
        if (!calloutEl) {
          throw new Error('No rendered callout');
        }
        const calloutRect = calloutEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(calloutRect.left + calloutRect.width / 3),
          y: Math.round(calloutRect.top + calloutRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          callouts,
          noteLeafMatches,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        noteLeaf?.detach();
        await app.fileManager.trashFile(file);
      }
    },
    input: {
      CALLOUT_MENU_EVENT_NAME,
      NOTE_CONTENT
    },
    vaultPath: getTemporaryVault().path
  });
}
