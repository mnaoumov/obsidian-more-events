import type {
  Events,
  MarkdownViewModeType,
  Menu,
  TFile,
  View
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  MARKDOWN_PROPERTIES_MENU_EVENT_NAME,
  MARKDOWN_VIEWPORT_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

const NOTE_CONTENT = `---
aliases:
  - First alias
---

# Markdown menu

A short note, so its margins are empty.
`;

type MenuKind = 'properties' | MarkdownViewModeType;

interface MenuRecord {
  /**
   * The modes the viewport listener was given, once per call.
   */
  readonly modes: MarkdownViewModeType[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];

  /**
   * Whether the listener was given the subject the suite opened the menu for, once per call.
   */
  readonly subjectMatches: boolean[];
}

/*
 * The test that can fail for the right reason: a relay is only as good as the name of the Obsidian event it listens
 * to, and that name is undocumented, so only the real app can say it is still the one Obsidian triggers. Each test
 * opens the menu with a trusted right-click, which the viewport menu requires (`isTrusted`), and reads the menu
 * Obsidian actually put on screen.
 *
 * Each test also listens to Obsidian's own event, and closes the menu it is handed there, so a broken relay leaves
 * no menu open to swallow the next test's click.
 *
 * Desktop only: the trusted clicks go through Electron's `sendInputEvent`.
 */
describe('Markdown menu events', () => {
  it('should let a listener add an item to the menu of a note\'s Properties heading', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openMenu('properties');

    expect(record.subjectMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Add file property');
  });

  it('should let a listener add an item to the viewport menu of a note\'s editor', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openMenu('source');

    expect(record.subjectMatches).toEqual([true]);
    expect(record.modes).toEqual(['source']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Readable line length');
  });

  it('should let a listener add an item to the viewport menu of a note\'s Reading view', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openMenu('preview');

    expect(record.subjectMatches).toEqual([true]);
    expect(record.modes).toEqual(['preview']);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Readable line length');
  });
});

/**
 * Opens a note with properties, in Live Preview or in Reading view, right-clicks its **Properties** heading or its
 * left margin with a trusted click, and records what the listener saw and what the menu on screen showed.
 *
 * @param menuKind - Which menu to open: `'properties'`, or the viewport menu of the given mode.
 * @returns What happened.
 */
async function openMenu(menuKind: MenuKind): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      MARKDOWN_PROPERTIES_MENU_EVENT_NAME: propertiesMenuEventName,
      MARKDOWN_VIEWPORT_MENU_EVENT_NAME: viewportMenuEventName,
      MENU_KIND: kind,
      NOTE_CONTENT: noteContent
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const NOTE_PATH = 'markdown-menu-events.md';
      const MIN_MARGIN_IN_PIXELS = 20;

      const modes: MarkdownViewModeType[] = [];
      const subjectMatches: boolean[] = [];
      let noteFile: null | TFile = null;
      let noteView: null | View = null;
      const shownMenus = new Set<Menu>();

      const eventRef = kind === 'properties'
        ? app.workspace.on(propertiesMenuEventName, (menu, file) => {
          subjectMatches.push(file === noteFile);
          menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
        })
        : app.workspace.on(viewportMenuEventName, (menu, view, mode) => {
          subjectMatches.push(view === noteView);
          modes.push(mode);
          menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
        });
      // Obsidian's own event, so the menu can be closed even when the relay is broken.
      const workspaceEvents: Events = app.workspace;
      const obsidianEventRef = workspaceEvents.on(kind === 'properties' ? 'markdown-properties-menu' : 'markdown-viewport-menu', (menu: unknown) => {
        shownMenus.add(menu as Menu);
      });

      /*
       * Readable line length is what leaves an empty margin beside the text, and the sidebars are closed to widen it.
       * The Properties heading needs neither.
       */
      const isViewport = kind !== 'properties';
      const wasReadableLineLength = app.vault.getConfig('readableLineLength');
      const wasLeftSplitCollapsed = app.workspace.leftSplit.collapsed;
      const wasRightSplitCollapsed = app.workspace.rightSplit.collapsed;
      if (isViewport) {
        app.vault.setConfig('readableLineLength', true);
        app.workspace.leftSplit.collapse();
        app.workspace.rightSplit.collapse();
      }

      const file = await app.vault.create(NOTE_PATH, noteContent);
      noteFile = file;
      const leaf = app.workspace.getLeaf('tab');
      try {
        await leaf.setViewState({
          active: true,
          state: { file: file.path, mode: kind === 'preview' ? 'preview' : 'source', source: false },
          type: 'markdown'
        });
        noteView = leaf.view;

        let x: number;
        let y: number;
        if (kind === 'properties') {
          const selector = '.markdown-source-view .metadata-properties-heading';
          await waitUntil({
            message: 'the Properties heading to render',
            predicate: () => (leaf.view.containerEl.querySelector(selector)?.getBoundingClientRect().width ?? 0) > 0,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
          });
          const headingEl = leaf.view.containerEl.querySelector(selector);
          if (!headingEl) {
            throw new Error('No rendered Properties heading');
          }
          const headingRect = headingEl.getBoundingClientRect();
          x = Math.round(headingRect.left + headingRect.width / 2);
          y = Math.round(headingRect.top + headingRect.height / 2);
        } else {
          const scrollerSelector = kind === 'source' ? '.markdown-source-view .cm-scroller' : '.markdown-reading-view .markdown-preview-view';
          const sizerSelector = kind === 'source' ? '.markdown-source-view .cm-sizer' : '.markdown-reading-view .markdown-preview-sizer';
          // The sidebars animate as they close, so the text is still moving until its position holds between two polls.
          let lastSizerLeft = NaN;
          await waitUntil({
            message: 'the note to render and hold still',
            predicate: () => {
              const sizerRect = leaf.view.containerEl.querySelector(sizerSelector)?.getBoundingClientRect();
              if (!sizerRect || sizerRect.width === 0) {
                return false;
              }
              const isStill = sizerRect.left === lastSizerLeft;
              lastSizerLeft = sizerRect.left;
              return isStill;
            },
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
          });
          const scrollerEl = leaf.view.containerEl.querySelector(scrollerSelector);
          const sizerEl = leaf.view.containerEl.querySelector(sizerSelector);
          if (!scrollerEl || !sizerEl) {
            throw new Error('No rendered note');
          }
          const scrollerRect = scrollerEl.getBoundingClientRect();
          const sizerRect = sizerEl.getBoundingClientRect();
          if (sizerRect.left - scrollerRect.left < MIN_MARGIN_IN_PIXELS) {
            throw new Error(`The note has no left margin to click: its text starts at ${String(sizerRect.left)}, its view at ${String(scrollerRect.left)}`);
          }
          x = Math.round((scrollerRect.left + sizerRect.left) / 2);
          y = Math.round(sizerRect.top + Math.min(sizerRect.height, scrollerRect.height) / 2);
        }

        await clickMouse({ button: 'right', x, y });

        await waitUntil({
          message: 'the menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          modes,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          subjectMatches
        };
      } finally {
        app.workspace.offref(eventRef);
        workspaceEvents.offref(obsidianEventRef);
        for (const menu of shownMenus) {
          menu.hide();
        }
        leaf.detach();
        await app.fileManager.trashFile(file);
        if (isViewport) {
          app.vault.setConfig('readableLineLength', wasReadableLineLength);
          if (!wasLeftSplitCollapsed) {
            app.workspace.leftSplit.expand();
          }
          if (!wasRightSplitCollapsed) {
            app.workspace.rightSplit.expand();
          }
        }
      }
    },
    input: {
      MARKDOWN_PROPERTIES_MENU_EVENT_NAME,
      MARKDOWN_VIEWPORT_MENU_EVENT_NAME,
      MENU_KIND: menuKind,
      NOTE_CONTENT
    },
    vaultPath: getTemporaryVault().path
  });
}
