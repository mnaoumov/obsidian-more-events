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

import type { PropertyValueMenuItem } from '../../../api.d.ts';

import { PROPERTY_VALUE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The list holds three values and the second is right-clicked, so a wrong index would not pass as the right one
 * by accident. The key is written in mixed case, so the row's lowered `data-property-key` would not either, and a
 * second list property comes first, so a wrong row would not.
 */
const NOTE_CONTENT = `---
aliases:
  - First alias
Topics:
  - alpha
  - Beta
  - gamma
---

# Property value menu
`;

interface MenuRecord {
  /**
   * Whether the listener was given the leaf the note is open in, once per call.
   */
  noteLeafMatches: boolean[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];

  /**
   * The values the listener was given.
   */
  values: PropertyValueMenuItem[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement rests
 * on the path the plugin recorded during the dispatch, and the key and value on the properties editor's own
 * rows, which only a real trusted right-click on a real rendered pill proves.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('Property value menu events', () => {
  it('should let a listener add an item to a list property value\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickPropertyValue();

    expect(record.values).toEqual([{ index: 1, key: 'Topics', value: 'Beta' }]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Remove from list');
  });
});

/**
 * Opens a note with a list property in Live Preview, right-clicks its second value with a trusted click, and
 * records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickPropertyValue(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      NOTE_CONTENT: noteContent,
      PROPERTY_VALUE_MENU_EVENT_NAME: propertyValueMenuEventName
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'property-value-menu-events.md';

      const values: PropertyValueMenuItem[] = [];
      const noteLeafMatches: boolean[] = [];
      let noteLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(propertyValueMenuEventName, (menu, leaf, value) => {
        shownMenu = menu;
        values.push(value);
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

        const selector = '.metadata-property[data-property-key="topics"] .multi-select-pill';
        await waitUntil({
          message: 'the property values to render',
          predicate: () => leaf.view.containerEl.querySelectorAll(selector).length === 3,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const pillEl = leaf.view.containerEl.querySelectorAll(selector)[1];
        if (!pillEl) {
          throw new Error('No rendered property value');
        }
        const pillRect = pillEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(pillRect.left + pillRect.width / 3),
          y: Math.round(pillRect.top + pillRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          noteLeafMatches,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          values
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
      NOTE_CONTENT,
      PROPERTY_VALUE_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
