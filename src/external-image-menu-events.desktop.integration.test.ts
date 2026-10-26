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

import type { ExternalImageMenuItem } from '../api.d.ts';

import { EXTERNAL_IMAGE_MENU_EVENT_NAME } from './more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The image sits below a heading and a paragraph, so a wrong line would not pass as the right one by accident.
 */
const IMAGE_LINE = 4;

type ImageKind = 'external' | 'vault';

interface MenuRecord {
  /**
   * The URL the external image was embedded with, a `data:` URL the suite drew, so the suite needs no network.
   */
  externalUrl: string;

  /**
   * Whether `file-menu` fired for the menu, which is how Obsidian already announces an image from the vault.
   */
  hasFileMenuFired: boolean;

  /**
   * The images the listener was given.
   */
  images: ExternalImageMenuItem[];

  /**
   * Whether the listener was given the leaf the note is open in, once per call.
   */
  noteLeafMatches: boolean[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  shownItemTitles: string[];
}

/*
 * The test that can fail for the right reason: the claim is about the REAL app. This menu is shown by
 * `Menu.forEvent`, on a later task, when the event's `currentTarget` is already `null`, so the announcement
 * rests on the path the plugin recorded during the dispatch, and the image's line on CodeMirror mapping the
 * rendered widget back to the document, which only a real trusted right-click on a real Live Preview editor
 * proves. An image from the vault goes through the same listener, and the second test proves it is left to
 * Obsidian's own `file-menu`.
 *
 * Desktop only: the trusted right-click goes through Electron's `sendInputEvent`.
 */
describe('External image menu events', () => {
  /*
   * First, so it does not depend on the other: with the announcer unplugged, the external image's menu reaches no
   * listener, so nothing the suite holds can close it, and a menu left open swallows the next right-click.
   */
  it('should leave an image from the vault to Obsidian\'s own file-menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickImage('vault');

    expect(record.images).toEqual([]);
    expect(record.hasFileMenuFired).toBe(true);
    expect(record.shownItemTitles).toContain('Copy image');
  });

  it('should let a listener add an item to an external image\'s menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickImage('external');

    expect(record.images).toEqual([{ line: IMAGE_LINE, url: record.externalUrl }]);
    expect(record.noteLeafMatches).toEqual([true]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('Copy image');
  });
});

/**
 * Opens a note with an image in Live Preview, right-clicks the rendered image with a trusted click, and records
 * what the listener saw and what the menu on screen showed.
 *
 * @param imageKind - Whether the note embeds the image from a URL or from the vault.
 * @returns What happened.
 */
async function rightClickImage(imageKind: ImageKind): Promise<MenuRecord> {
  return await evalInObsidian({
    async callback({
      app,
      EXTERNAL_IMAGE_MENU_EVENT_NAME: externalImageMenuEventName,
      IMAGE_KIND: kind,
      lib
    }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const ADDED_ITEM_TITLE = 'Added by a listener';
      const IMAGE_PATH = 'external-image-menu-events.png';
      const NOTE_PATH = 'external-image-menu-events.md';

      // Drawn here rather than fetched, so the suite needs no network; large enough to right-click its middle.
      const canvasEl = createEl('canvas', { attr: { height: '120', width: '200' } });
      const context = canvasEl.getContext('2d');
      if (!context) {
        throw new Error('No 2D canvas context');
      }
      context.fillStyle = '#4a90d9';
      context.fillRect(0, 0, canvasEl.width, canvasEl.height);
      const externalUrl = canvasEl.toDataURL('image/png');

      const images: ExternalImageMenuItem[] = [];
      const noteLeafMatches: boolean[] = [];
      let noteLeaf: null | WorkspaceLeaf = null;
      let shownMenu: Menu | null = null;
      let hasFileMenuFired = false;

      const eventRef = app.workspace.on(externalImageMenuEventName, (menu, leaf, image) => {
        shownMenu = menu;
        images.push(image);
        noteLeafMatches.push(leaf === noteLeaf);
        menu.addItem((item) => item.setTitle(ADDED_ITEM_TITLE));
      });
      const fileMenuEventRef = app.workspace.on('file-menu', (menu) => {
        shownMenu = menu;
        hasFileMenuFired = true;
      });

      // The vault's image is the same picture, decoded from the `data:` URL's base64 payload.
      const imageBase64 = externalUrl.slice(externalUrl.indexOf(',') + 1);
      const imageBytes = Uint8Array.from(atob(imageBase64), (char) => char.codePointAt(0) ?? 0);
      const imageFile = kind === 'vault' ? await app.vault.createBinary(IMAGE_PATH, imageBytes.buffer) : null;
      const embed = kind === 'vault' ? `![[${IMAGE_PATH}]]` : `![](${externalUrl})`;
      const file = await app.vault.create(NOTE_PATH, `# Image menu\n\nA paragraph before the image.\n\n${embed}\n\nA paragraph after it.\n`);
      try {
        const leaf = app.workspace.getLeaf('tab');
        noteLeaf = leaf;
        await leaf.setViewState({
          active: true,
          state: { file: file.path, mode: 'source', source: false },
          type: 'markdown'
        });

        const selector = '.cm-content .image-embed .image-wrapper img';
        function findImageEl(): HTMLElement | null {
          const imageEl = leaf.view.containerEl.querySelector<HTMLElement>(selector);
          return imageEl && imageEl.getBoundingClientRect().height > 0 ? imageEl : null;
        }
        await waitUntil({
          message: 'the image to render',
          predicate: () => !!findImageEl(),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const imageEl = findImageEl();
        if (!imageEl) {
          throw new Error('No rendered image');
        }
        const imageRect = imageEl.getBoundingClientRect();
        await clickMouse({
          button: 'right',
          x: Math.round(imageRect.left + imageRect.width / 2),
          y: Math.round(imageRect.top + imageRect.height / 2)
        });

        await waitUntil({
          message: 'the context menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          externalUrl,
          hasFileMenuFired,
          images,
          noteLeafMatches,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        app.workspace.offref(fileMenuEventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        noteLeaf?.detach();
        await app.fileManager.trashFile(file);
        if (imageFile) {
          await app.fileManager.trashFile(imageFile);
        }
      }
    },
    input: {
      EXTERNAL_IMAGE_MENU_EVENT_NAME,
      IMAGE_KIND: imageKind
    },
    vaultPath: getTemporaryVault().path
  });
}
