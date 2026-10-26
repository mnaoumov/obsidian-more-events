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

import type { HistoryMenuDirection } from '../api.d.ts';

import { HISTORY_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The directions the listener was given.
   */
  directions: HistoryMenuDirection[];

  /**
   * Whether each leaf the listener was given was the one whose button was right-clicked.
   */
  leafMatches: boolean[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];
}

/**
 * A view, as far as reaching its history buttons needs it.
 */
interface ViewWithHistoryButtons {
  readonly backButtonEl: HTMLElement;
  readonly forwardButtonEl: HTMLElement;
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. The button's listener shows its
 * menu with `showAtPosition` and no event, so the announcement rests on the patch seeing that call while the
 * button's `contextmenu` event is still being dispatched, which only a real trusted right-click through the real
 * listener proves.
 *
 * It opens two notes one after the other in one leaf, so each direction has exactly one page, named after the
 * note it goes to, and the menu on screen shows which page it listed.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('History menu events', () => {
  it('should let a listener add an item to the back button\'s history menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickHistoryButton('back');

    expect(record.directions).toEqual(['back']);
    expect(record.leafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('history-menu-events-first');
  });

  it('should let a listener add an item to the forward button\'s history menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickHistoryButton('forward');

    expect(record.directions).toEqual(['forward']);
    expect(record.leafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('history-menu-events-second');
  });
});

/**
 * Opens two notes in one leaf, goes back once for the forward button, right-clicks the button with a trusted click,
 * and records what the listener saw and what the menu on screen showed.
 *
 * @param direction - Which button to right-click.
 * @returns What happened.
 */
async function rightClickHistoryButton(direction: HistoryMenuDirection): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      DIRECTION: buttonDirection,
      HISTORY_MENU_EVENT_NAME: historyMenuEventName,
      lib
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const FIRST_NOTE_PATH = 'history-menu-events-first.md';
      const SECOND_NOTE_PATH = 'history-menu-events-second.md';

      const directions: HistoryMenuDirection[] = [];
      const leafMatches: boolean[] = [];
      let noteLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(historyMenuEventName, (menu, leaf, menuDirection) => {
        shownMenu = menu;
        directions.push(menuDirection);
        leafMatches.push(leaf === noteLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      const firstFile = await app.vault.create(FIRST_NOTE_PATH, '# First\n');
      const secondFile = await app.vault.create(SECOND_NOTE_PATH, '# Second\n');
      try {
        const leaf = app.workspace.getLeaf('tab');
        noteLeaf = leaf;
        await leaf.openFile(firstFile, { active: true });
        await leaf.openFile(secondFile, { active: true });
        if (buttonDirection === 'forward') {
          await leaf.history.back();
        }

        // Through `unknown`, because the callback runs inside Obsidian, where no import such as `castTo` resolves.
        const untypedView: unknown = leaf.view;
        const view = untypedView as ViewWithHistoryButtons;
        const buttonEl = buttonDirection === 'back' ? view.backButtonEl : view.forwardButtonEl;
        await waitUntil({
          message: 'the history button to be on screen',
          predicate: () => buttonEl.getBoundingClientRect().width > 0,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const buttonRect = buttonEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(buttonRect.left + buttonRect.width / 2),
          y: Math.round(buttonRect.top + buttonRect.height / 2)
        });

        await waitUntil({
          message: 'the history menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          directions,
          leafMatches,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        noteLeaf?.detach();
        await app.fileManager.trashFile(firstFile);
        await app.fileManager.trashFile(secondFile);
      }
    },
    input: {
      DIRECTION: direction,
      HISTORY_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
