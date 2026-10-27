import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { WebViewerHistoryMenuItem } from '../../../api.d.ts';

import { WEB_VIEWER_HISTORY_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The history entries the listener was given.
   */
  historyItems: WebViewerHistoryMenuItem[];

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
 * `evt.currentTarget` still being the entry's `selfEl` while Obsidian shows the entry's menu, and on the view
 * keeping its entries in `itemDoms`, which only a real trusted right-click through the real listener proves.
 *
 * The history entry is written straight into the **Web viewer**'s own store rather than by visiting a page,
 * so the suite needs no network. It adds an item from its listener and then reads the menu Obsidian
 * actually put on screen, because the point of a menu event is that the item shows up.
 *
 * Desktop only: the **Web viewer** core plugin exists only on the desktop, and the trusted right-click goes
 * through Electron's `sendInputEvent`.
 */
describe('Web viewer history menu events', () => {
  it('should let a listener add an item to the menu of an entry in the History view', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickHistoryEntry();

    expect(record.subjects).toEqual(['webviewer-history']);
    expect(record.historyItems).toEqual([{ title: 'More Events menu test', url: 'https://example.com/more-events-menu-test' }]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Copy URL');
  });
});

/**
 * Adds an entry to the **Web viewer** history, opens the History view, right-clicks that entry with a
 * trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickHistoryEntry(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      WEB_VIEWER_HISTORY_MENU_EVENT_NAME: webViewerHistoryMenuEventName
    }): Promise<MenuRecord> {
      const {
        clickMouse,
        waitUntil
      } = lib;
      // Four waits at 6 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 6000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const HISTORY_TITLE = 'More Events menu test';
      const HISTORY_URL = 'https://example.com/more-events-menu-test';

      interface StoredHistoryItem {
        readonly title: string;
        readonly url: string;
      }

      interface WebViewerHistoryDatabase {
        readonly addHistoryItem: (url: string, title: string) => Promise<void>;
        // The IndexedDB connection, `null` until the plugin's `onEnable` has opened it.
        // eslint-disable-next-line unicorn/name-replacements -- Obsidian's own property name, which the suite reads.
        readonly db: unknown;
        readonly getHistoryItems: () => Promise<StoredHistoryItem[]>;
        readonly removeHistoryItem: (item: StoredHistoryItem) => Promise<void>;
      }

      interface WebViewerInstance {
        // eslint-disable-next-line unicorn/name-replacements -- Obsidian's own property name, which the suite reads.
        readonly db: WebViewerHistoryDatabase;
      }

      interface WebViewerHistoryViewItem {
        readonly item: StoredHistoryItem;
        readonly selfEl: HTMLElement;
      }

      interface WebViewerHistoryView {
        readonly itemDoms: ReadonlyMap<unknown, WebViewerHistoryViewItem>;
      }

      const webViewerCorePlugin = app.internalPlugins.getPluginById('webviewer');
      if (!webViewerCorePlugin) {
        throw new Error('The Web viewer core plugin was not found.');
      }
      const wasWebViewerEnabled = webViewerCorePlugin.enabled;
      if (!wasWebViewerEnabled) {
        await webViewerCorePlugin.enable(false);
      }
      // A cast through `unknown`, because the plugin's history store is described by no typings at all.
      const untypedInstance: unknown = webViewerCorePlugin.instance;
      const { db: historyDatabase } = untypedInstance as WebViewerInstance;

      const historyItems: WebViewerHistoryMenuItem[] = [];
      const subjects: string[] = [];
      let shownMenu: Menu | null = null;
      const leaf = app.workspace.getLeaf('tab');

      const eventRef = app.workspace.on(webViewerHistoryMenuEventName, (menu, historyLeaf, historyItem) => {
        shownMenu = menu;
        subjects.push(historyLeaf.view.getViewType());
        historyItems.push(historyItem);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      function findSelfEl(): HTMLElement | undefined {
        const untypedView: unknown = leaf.view;
        const view = untypedView as Partial<WebViewerHistoryView>;
        return [...view.itemDoms?.values() ?? []].find((itemDom) => itemDom.item.url === HISTORY_URL)?.selfEl;
      }

      try {
        // `onEnable` starts the connection without awaiting it (`app.js:173542`), and `addHistoryItem` silently
        // does nothing until it is open.
        await waitUntil({
          message: 'the Web viewer history store to open',
          predicate: () => historyDatabase.db !== null,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        await historyDatabase.addHistoryItem(HISTORY_URL, HISTORY_TITLE);
        await leaf.setViewState({ active: true, type: 'webviewer-history' });
        await app.workspace.revealLeaf(leaf);
        if (leaf.view.getViewType() !== 'webviewer-history') {
          throw new Error(`Expected the History view, got ${leaf.view.getViewType()}`);
        }

        await waitUntil({
          message: 'the history entry to be listed',
          predicate: () => {
            const selfEl = findSelfEl();
            return !!selfEl && selfEl.isShown() && selfEl.getBoundingClientRect().width > 0;
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const selfEl = findSelfEl();
        if (!selfEl) {
          throw new Error('The history entry is no longer listed.');
        }
        const rect = selfEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          historyItems,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjects
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        leaf.detach();
        for (const storedItem of await historyDatabase.getHistoryItems()) {
          if (storedItem.url === HISTORY_URL) {
            await historyDatabase.removeHistoryItem(storedItem);
          }
        }
        if (!wasWebViewerEnabled) {
          webViewerCorePlugin.disable(false);
        }
      }
    },
    input: {
      WEB_VIEWER_HISTORY_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
