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

import type { PropertyMenuItem } from '../../../api.d.ts';

import { PROPERTY_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The key is written in mixed case, so the row's lowered `data-property-key` would not pass as the key, and a
 * second property comes first, so a wrong row would not either.
 */
const NOTE_CONTENT = `---
aliases:
  - First alias
Topics:
  - alpha
---

# Property menu
`;

interface MenuRecord {
  /**
   * Whether the listener was given the leaf the note is open in, once per call.
   */
  readonly noteLeafMatches: boolean[];

  /**
   * The properties the listener was given.
   */
  readonly properties: PropertyMenuItem[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

type MouseButton = 'left' | 'right';

/*
 * The test that can fail for the right reason: the claim is about the REAL app. The menu is told apart by the
 * listener's own element, the icon, being the event's `currentTarget`, and the property by the properties
 * editor's own rows, which only a real trusted click on a real rendered icon proves. Both the right-click and the
 * click open the menu, so both are driven.
 *
 * Desktop only: the trusted click goes through Electron's `sendInputEvent`.
 */
describe('Property menu events', () => {
  it('should let a listener add an item to the menu a property\'s icon opens on a right-click', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickPropertyIcon('right');

    expect(record.properties).toEqual([{ key: 'Topics' }]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Remove');
  });

  it('should let a listener add an item to the menu a property\'s icon opens on a click', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickPropertyIcon('left');

    expect(record.properties).toEqual([{ key: 'Topics' }]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Remove');
  });
});

/**
 * Opens a note with properties in Live Preview, clicks the icon of its second property with a trusted click, and
 * records what the listener saw and what the menu on screen showed.
 *
 * @param button - The mouse button to click with.
 * @returns What happened.
 */
async function clickPropertyIcon(button: MouseButton): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      button: mouseButton,
      lib,
      NOTE_CONTENT: noteContent,
      PROPERTY_MENU_EVENT_NAME: propertyMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'property-menu-events.md';

      const properties: PropertyMenuItem[] = [];
      const noteLeafMatches: boolean[] = [];
      let noteLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(propertyMenuEventName, (menu, leaf, property) => {
        shownMenu = menu;
        properties.push(property);
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

        const selector = '.metadata-property[data-property-key="topics"] .metadata-property-icon';
        await waitUntil({
          message: 'the property to render',
          predicate: () => !!leaf.view.containerEl.querySelector(selector),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const iconEl = leaf.view.containerEl.querySelector(selector);
        if (!iconEl) {
          throw new Error('No rendered property icon');
        }
        const iconRect = iconEl.getBoundingClientRect();
        await clickMouse({
          button: mouseButton,
          x: Math.round(iconRect.left + iconRect.width / 2),
          y: Math.round(iconRect.top + iconRect.height / 2)
        });

        await waitUntil({
          message: 'the menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          noteLeafMatches,
          properties,
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
      button,
      NOTE_CONTENT,
      PROPERTY_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
