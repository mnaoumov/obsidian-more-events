import type { Menu } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { ALL_PROPERTIES_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

interface MenuRecord {
  /**
   * The property names the listener was given, one array per announcement.
   */
  propertyNames: (readonly string[])[];

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
 * `evt.currentTarget` still being the item's `selfEl` while Obsidian shows the item's menu, and on the view
 * keeping its items in `doms`, which only a real trusted right-click through the real listener proves.
 *
 * It adds an item from its listener and then reads the menu Obsidian actually put on screen, because the
 * point of a menu event is that the item shows up.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('All properties menu events', () => {
  it('should let a listener add an item to the menu of a property in the All properties view', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickAllPropertiesItem();

    expect(record.subjects).toEqual(['all-properties']);
    expect(record.propertyNames).toEqual([['more-events-menu-test']]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Rename');
  });
});

/**
 * Writes a note with a property of its own, opens the **All properties** view, right-clicks that property
 * with a trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @returns What happened.
 */
async function rightClickAllPropertiesItem(): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      ALL_PROPERTIES_MENU_EVENT_NAME: allPropertiesMenuEventName,
      app,
      lib
    }): Promise<MenuRecord> {
      const {
        clickMouse,
        waitUntil
      } = lib;
      // Three waits at 8 s declare 24 s in one transport call, under the 30 s a desktop closure gets.
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'All properties menu test.md';
      const PROPERTY_NAME = 'more-events-menu-test';

      interface AllPropertiesViewItem {
        readonly selfEl: HTMLElement;
      }

      interface AllPropertiesView {
        readonly doms: Readonly<Record<string, AllPropertiesViewItem | undefined>>;
      }

      // The **All properties** view belongs to the **Properties view** core plugin.
      const propertiesCorePlugin = app.internalPlugins.getPluginById('properties');
      if (!propertiesCorePlugin) {
        throw new Error('The Properties view core plugin was not found.');
      }
      const wasPropertiesEnabled = propertiesCorePlugin.enabled;
      if (!wasPropertiesEnabled) {
        await propertiesCorePlugin.enable(false);
      }

      const file = app.vault.getFileByPath(NOTE_PATH) ?? await app.vault.create(NOTE_PATH, `---\n${PROPERTY_NAME}: value\n---\n`);
      const leaf = app.workspace.getLeaf('tab');
      await leaf.setViewState({ active: true, type: 'all-properties' });
      await app.workspace.revealLeaf(leaf);
      if (leaf.view.getViewType() !== 'all-properties') {
        throw new Error(`Expected the All properties view, got ${leaf.view.getViewType()}`);
      }
      // A cast through `unknown`, because the view is described by no typings at all.
      const untypedView: unknown = leaf.view;
      const view = untypedView as AllPropertiesView;

      const propertyNames: (readonly string[])[] = [];
      const subjects: string[] = [];
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(allPropertiesMenuEventName, (menu, propertiesLeaf, names) => {
        shownMenu = menu;
        subjects.push(propertiesLeaf.view.getViewType());
        propertyNames.push(names);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });

      try {
        await waitUntil({
          message: 'the property to be listed',
          predicate: () => {
            const selfEl = view.doms[PROPERTY_NAME]?.selfEl;
            return !!selfEl && selfEl.isShown() && selfEl.getBoundingClientRect().width > 0;
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const selfEl = view.doms[PROPERTY_NAME]?.selfEl;
        if (!selfEl) {
          throw new Error('The property is no longer listed.');
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
          propertyNames,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjects
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        leaf.detach();
        await app.fileManager.trashFile(file);
        if (!wasPropertiesEnabled) {
          propertiesCorePlugin.disable(false);
        }
      }
    },
    input: {
      ALL_PROPERTIES_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
