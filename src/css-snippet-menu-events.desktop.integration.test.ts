import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { CssSnippetMenuItem } from '../api.d.ts';

import { CSS_SNIPPET_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * Two snippets, and the second row is right-clicked, so a wrong row would not pass as the right one by accident.
 */
const FIRST_SNIPPET_NAME = 'more-events-first';
const SECOND_SNIPPET_NAME = 'More Events second';

/**
 * Obsidian's own item in the menu: **Show in system explorer** on Windows and Linux, **Reveal in Finder** on macOS.
 */
const SHOW_IN_FOLDER_TITLE_REG_EXP = /^(?:Show in system explorer|Reveal in Finder)$/u;

interface AppWithCustomCss {
  readonly customCss: CustomCss;
}

interface CustomCss {
  readonly readSnippets: () => Promise<void>;
  readonly snippets: readonly string[];
}

interface MenuRecord {
  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * The snippets the listener was given.
   */
  snippets: CssSnippetMenuItem[];
}

interface SettingTabWithUpdate {
  readonly update: () => void;
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement rests
 * on the path the plugin recorded during the dispatch, and on the row's name text, which only a real trusted
 * right-click on a real rendered snippet row proves.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`, and Obsidian gives the row its
 * menu on the desktop app only.
 */
describe('CSS snippet menu events', () => {
  it('should let a listener add an item to a CSS snippet row\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickSnippetRow();

    expect(record.snippets).toEqual([{ name: SECOND_SNIPPET_NAME }]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles.some((title) => SHOW_IN_FOLDER_TITLE_REG_EXP.test(title))).toBe(true);
  });
});

/**
 * Writes two snippets, opens the **CSS snippets** page of **Settings -> Appearance**, right-clicks the second
 * snippet's row with a trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickSnippetRow(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      CSS_SNIPPET_MENU_EVENT_NAME: cssSnippetMenuEventName,
      FIRST_SNIPPET_NAME: firstSnippetName,
      lib,
      SECOND_SNIPPET_NAME: secondSnippetName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 5000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const SNIPPETS_FOLDER = `${app.vault.configDir}/snippets`;
      const snippetPaths = [firstSnippetName, secondSnippetName].map((name) => `${SNIPPETS_FOLDER}/${name}.css`);

      const snippets: CssSnippetMenuItem[] = [];
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(cssSnippetMenuEventName, (menu, snippet) => {
        shownMenu = menu;
        snippets.push(snippet);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      if (!await app.vault.adapter.exists(SNIPPETS_FOLDER)) {
        await app.vault.adapter.mkdir(SNIPPETS_FOLDER);
      }
      for (const snippetPath of snippetPaths) {
        await app.vault.adapter.write(snippetPath, 'body {}\n');
      }
      // Through `unknown`, because the callback runs inside Obsidian, where no import such as `castTo` resolves.
      const untypedApp: unknown = app;
      const { customCss } = untypedApp as AppWithCustomCss;
      await customCss.readSnippets();

      app.setting.open();
      try {
        app.setting.openTabById('appearance');
        // The tab builds its pages from `getSettingDefinitions` on `update`, so it re-reads the snippet list there.
        const untypedTab: unknown = app.setting.activeTab;
        (untypedTab as SettingTabWithUpdate).update();

        const pageRowEl = await waitForElement(
          () => [...app.setting.modalEl.querySelectorAll<HTMLElement>(':scope .setting-item.mod-navigable')].find((el) => el.textContent.includes('CSS snippets')),
          'the CSS snippets row'
        );
        pageRowEl.click();

        const nameEl = await waitForElement(
          () => [...app.setting.modalEl.querySelectorAll<HTMLElement>(':scope .setting-item .setting-item-name')].find((el) => el.textContent === secondSnippetName),
          'the snippet\'s row to render'
        );
        // The page slides in, so the row is clicked only once it has stopped moving.
        let lastLeft = NaN;
        await waitUntil({
          message: 'the CSS snippets page to stop sliding in',
          predicate: async () => {
            const { left } = nameEl.getBoundingClientRect();
            const isSettled = left === lastLeft;
            lastLeft = left;
            await sleep(100);
            return isSettled;
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const nameRect = nameEl.getBoundingClientRect();
        const hitEl = activeDocument.elementFromPoint(Math.round(nameRect.left + Math.min(nameRect.width / 2, 20)), Math.round(nameRect.top + nameRect.height / 2));
        if (!hitEl || !nameEl.closest('.setting-item')?.contains(hitEl)) {
          throw new Error(`The snippet's row is not under the pointer: ${hitEl?.outerHTML.slice(0, 200) ?? 'nothing'} at ${String(nameRect.left)}, ${String(nameRect.top)}`);
        }
        await clickMouse({
          button: 'right',
          x: Math.round(nameRect.left + Math.min(nameRect.width / 2, 20)),
          y: Math.round(nameRect.top + nameRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          snippets
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        app.setting.close();
        for (const snippetPath of snippetPaths) {
          await app.vault.adapter.remove(snippetPath);
        }
        await customCss.readSnippets();
      }

      async function waitForElement(find: () => HTMLElement | undefined, message: string): Promise<HTMLElement> {
        await waitUntil({
          message,
          predicate: () => !!find(),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const el = find();
        if (!el) {
          throw new Error(`Not found: ${message}`);
        }
        return el;
      }
    },
    input: {
      CSS_SNIPPET_MENU_EVENT_NAME,
      FIRST_SNIPPET_NAME,
      SECOND_SNIPPET_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
