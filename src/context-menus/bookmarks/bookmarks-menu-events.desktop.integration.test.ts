import type {
  BookmarksPluginInstance,
  InternalPluginNameType
} from '@obsidian-typings/obsidian-public-latest';
import type {
  EventRef,
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
  BOOKMARKS_MENU_EVENT_NAME,
  BOOKMARKS_VIEW_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

// A cast rather than `InternalPluginName.Bookmarks`, for the reason `core-plugin-events` gives: the enum is a VALUE.
const BOOKMARKS_PLUGIN_ID = 'bookmarks' as InternalPluginNameType;
const TEST_TIMEOUT_IN_MS = 120_000;

type ClickTarget = 'bookmark' | 'empty-area';

interface MenuRecord {
  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * What the listener was told the menu is for: the paths of the bookmarks for the item menu, or the view
   * type of the leaf for the empty-area menu.
   */
  subjects: string[];
}

/*
 * The tests that can fail for the right reason: both claims are about the REAL app. The item menu relays an
 * event Obsidian triggers but documents nowhere, so a rename in a release silences it and only a run sees
 * that. The empty-area menu rests on `evt.currentTarget` still being the view's `containerEl` while the
 * menu is shown, which only a real trusted right-click through the real listener proves.
 *
 * Each test adds an item from its listener and then reads the menu Obsidian actually put on screen, because
 * the point of a menu event is that the item shows up: an event that fired after the menu was built would
 * pass a payload check and still be useless.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Bookmarks menu events', () => {
  it('should let a listener add an item to a bookmark\'s context menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickInBookmarksView('bookmark');

    expect(record.subjects).toEqual(['Bookmarked note.md']);
    expect(record.shownItemTitles).toContain('Added by a listener');
  });

  it('should let a listener add an item to the bookmarks view\'s empty-area menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickInBookmarksView('empty-area');

    expect(record.subjects).toEqual(['bookmarks']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('New group');
  });
});

/**
 * Opens the **Bookmarks** view with one bookmark in it, right-clicks the bookmark or the empty area below it
 * with a trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @param clickTarget - Where to right-click.
 * @returns What happened.
 */
async function rightClickInBookmarksView(clickTarget: ClickTarget): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      BOOKMARKS_MENU_EVENT_NAME: bookmarksMenuEventName,
      BOOKMARKS_PLUGIN_ID: bookmarksPluginId,
      BOOKMARKS_VIEW_MENU_EVENT_NAME: bookmarksViewMenuEventName,
      clickTarget: clickTargetInput,
      lib
    }): Promise<MenuRecord> {
      const {
        clickElement,
        clickMouse,
        waitUntil
      } = lib;
      // Three waits at 8 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'Bookmarked note.md';
      const EMPTY_AREA_OFFSET_IN_PIXELS = 20;

      /*
       * A cast, because the id crossed the closure widened to the enum: `getEnabledPluginById` can only narrow its
       * return type from a literal.
       */
      const bookmarks = app.internalPlugins.getEnabledPluginById(bookmarksPluginId) as BookmarksPluginInstance | null;
      if (!bookmarks) {
        throw new Error('The Bookmarks core plugin is not enabled');
      }

      if (!app.vault.getFileByPath(NOTE_PATH)) {
        await app.vault.create(NOTE_PATH, '');
      }
      if (bookmarks.items.every((item) => item.path !== NOTE_PATH)) {
        bookmarks.addItem({ ctime: Date.now(), path: NOTE_PATH, title: '', type: 'file' });
      }

      const leaf = await app.workspace.ensureSideLeaf('bookmarks', 'left', { reveal: true });
      const { containerEl } = leaf.view;

      const subjects: string[] = [];
      let shownMenu: Menu | null = null;

      function addTestItem(menu: Menu): void {
        shownMenu = menu;
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      }

      const eventRef: EventRef = clickTargetInput === 'bookmark'
        ? app.workspace.on(bookmarksMenuEventName, (menu, bookmarkItems) => {
          subjects.push(...bookmarkItems.map((bookmarkItem) => bookmarkItem.path ?? ''));
          addTestItem(menu);
        })
        : app.workspace.on(bookmarksViewMenuEventName, (menu, bookmarksLeaf) => {
          subjects.push(bookmarksLeaf.view.getViewType());
          addTestItem(menu);
        });

      try {
        await waitUntil({
          message: 'the bookmark to be rendered in the bookmarks view',
          predicate: () => !!containerEl.querySelector('.tree-item-self.bookmark'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const bookmarkEl = containerEl.querySelector<HTMLElement>('.tree-item-self.bookmark');
        if (clickTargetInput === 'bookmark' && bookmarkEl) {
          await clickElement({ button: 'right', element: bookmarkEl });
        } else {
          // Just above the bottom edge of the view, well below its only bookmark: the empty area.
          const containerRect = containerEl.getBoundingClientRect();
          await clickMouse({
            button: 'right',
            x: Math.round(containerRect.left + containerRect.width / 2),
            y: Math.round(containerRect.bottom - EMPTY_AREA_OFFSET_IN_PIXELS)
          });
        }

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjects
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
      }
    },
    input: {
      BOOKMARKS_MENU_EVENT_NAME,
      BOOKMARKS_PLUGIN_ID,
      BOOKMARKS_VIEW_MENU_EVENT_NAME,
      clickTarget
    },
    vaultPath: getTemporaryVault().path
  });
}
