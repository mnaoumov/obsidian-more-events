import type {
  Events,
  Menu,
  WorkspaceLeaf,
  WorkspaceTabs
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  LEAF_MENU_EVENT_NAME,
  TAB_GROUP_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

type MenuKind = 'leaf' | 'tab-group';

interface MenuRecord {
  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * Whether the listener was given the subject the suite opened the menu for, once per call.
   */
  subjectMatches: boolean[];
}

/*
 * The test that can fail for the right reason: a relay is only as good as the name of the Obsidian event it listens
 * to, and that name is undocumented, so only the real app can say it is still the one Obsidian triggers. Each test
 * opens the menu with a trusted click and reads the menu Obsidian actually put on screen.
 *
 * Each test also listens to Obsidian's own event, and closes the menu it is handed there, so a broken relay leaves
 * no menu open to swallow the next test's click.
 *
 * Desktop only: the trusted clicks go through Electron's `sendInputEvent`.
 */
describe('Workspace menu events', () => {
  it('should let a listener add an item to a tab header\'s leaf menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openMenu('leaf');

    expect(record.subjectMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Close');
  });

  it('should let a listener add an item to a tab group\'s tab list menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openMenu('tab-group');

    expect(record.subjectMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Close all');
  });
});

/**
 * Opens a note in a new tab, opens its tab header's menu with a trusted right-click or its tab group's tab list menu
 * with a trusted click on the chevron, and records what the listener saw and what the menu on screen showed.
 *
 * @param menuKind - Which menu to open.
 * @returns What happened.
 */
async function openMenu(menuKind: MenuKind): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      LEAF_MENU_EVENT_NAME: leafMenuEventName,
      lib,
      MENU_KIND: kind,
      TAB_GROUP_MENU_EVENT_NAME: tabGroupMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'workspace-menu-events.md';

      const subjectMatches: boolean[] = [];
      let noteLeaf: null | WorkspaceLeaf = null;
      const shownMenus = new Set<Menu>();

      const eventRef = kind === 'leaf'
        ? app.workspace.on(leafMenuEventName, (menu, leaf) => {
          subjectMatches.push(leaf === noteLeaf);
          menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
        })
        : app.workspace.on(tabGroupMenuEventName, (menu, tabGroup) => {
          subjectMatches.push(tabGroup === noteLeaf?.parent);
          menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
        });
      // Obsidian's own event, so the menu can be closed even when the relay is broken.
      const workspaceEvents: Events = app.workspace;
      const obsidianEventRef = workspaceEvents.on(kind === 'leaf' ? 'leaf-menu' : 'tab-group-menu', (menu: unknown) => {
        shownMenus.add(menu as Menu);
      });

      const file = await app.vault.create(NOTE_PATH, '# Workspace menu\n');
      try {
        const leaf = app.workspace.getLeaf('tab');
        noteLeaf = leaf;
        await leaf.setViewState({
          active: true,
          state: { file: file.path, mode: 'source', source: false },
          type: 'markdown'
        });

        const tabGroup = leaf.parent as WorkspaceTabs;
        const targetEl = kind === 'leaf'
          ? leaf.tabHeaderEl
          : tabGroup.containerEl.querySelector<HTMLElement>(':scope .workspace-tab-header-tab-list .clickable-icon');
        if (!targetEl) {
          throw new Error('No tab list button in the tab group');
        }
        await waitUntil({
          message: 'the click target to be on screen',
          predicate: () => targetEl.getBoundingClientRect().width > 0,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const targetRect = targetEl.getBoundingClientRect();
        await clickMouse({
          button: kind === 'leaf' ? 'right' : 'left',
          x: Math.round(targetRect.left + targetRect.width / 2),
          y: Math.round(targetRect.top + targetRect.height / 2)
        });

        await waitUntil({
          message: 'the menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjectMatches
        };
      } finally {
        app.workspace.offref(eventRef);
        workspaceEvents.offref(obsidianEventRef);
        for (const menu of shownMenus) {
          menu.hide();
        }
        noteLeaf?.detach();
        await app.fileManager.trashFile(file);
      }
    },
    input: {
      LEAF_MENU_EVENT_NAME,
      MENU_KIND: menuKind,
      TAB_GROUP_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
