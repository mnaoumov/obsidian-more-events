import type {
  PublishPluginInstance,
  SyncPluginInstance
} from '@obsidian-typings/obsidian-public-latest';
import type {
  Menu,
  View
} from 'obsidian';
import type { CdpConnection } from 'obsidian-integration-testing';

import { getRootFolder } from '@mnaoumov/typescript-dev-toolkit/root';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { connectToCdp } from 'obsidian-integration-testing';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import {
  PUBLISH_FILE_MENU_EVENT_NAME,
  SYNC_FILES_MENU_EVENT_NAME,
  SYNC_STATUS_MENU_EVENT_NAME
} from '../api/more-events-api.ts';

/*
 * The menus of the core **Sync** and **Publish** plugins exist only in a vault that is connected to a remote vault
 * and to a Publish site, which needs an Obsidian account. So this suite runs on a persistent, signed-in profile
 * (`obsidian-integration-testing`'s `persistentUserDataDirectory`), against a vault opened in place, named by:
 *
 * - `MORE_EVENTS_ACCOUNT_PROFILE`: the profile, signed in by a person once, with the vault connected to Sync and
 *   Publish.
 * - `MORE_EVENTS_ACCOUNT_VAULT`: the vault. It must be a throwaway test vault: the suite writes, syncs and deletes its
 *   own notes in it, and loads this plugin there for the run.
 * - `MORE_EVENTS_ACCOUNT_OBSIDIAN_VERSION` (optional): the Obsidian version to run instead of the installed one.
 *
 * It is its own project (`*.desktop-account.`), run by `npm run test:integration:desktop-account`, so the standard
 * desktop run, which has no account, never collects it.
 */
const PROFILE_PATH = process.env['MORE_EVENTS_ACCOUNT_PROFILE'] ?? '';
const VAULT_PATH = process.env['MORE_EVENTS_ACCOUNT_VAULT'] ?? '';
const OBSIDIAN_VERSION = process.env['MORE_EVENTS_ACCOUNT_OBSIDIAN_VERSION'] ?? '';

const PLUGIN_ID = 'more-events';
const TEST_TIMEOUT_IN_MS = 180_000;
const SYNC_NOTE_PATHS = ['more-events-sync-a.md', 'more-events-sync-b.md'];
const PUBLISH_NOTE_PATH = 'more-events-publish.md';

interface MenuRecord {
  /**
   * What each listener call was handed after the menu.
   */
  readonly payloads: unknown[];

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

/**
 * The **Publish changes** dialog, as far as this suite drives it.
 */
interface PublishTestModal {
  readonly close: () => void;
  readonly reviewChangesSection: null | PublishTestReviewChangesSection;
}

/**
 * The core **Publish** plugin's instance, as far as this suite drives it.
 */
// TODO: Drop these members once `obsidian-typings` declares them on `PublishPluginInstance`.
interface PublishTestPluginInstance extends PublishPluginInstance {
  readonly modal: null | PublishTestModal;
  readonly openModal: () => void;
}

/**
 * The dialog's list of files the site does not have yet.
 */
interface PublishTestReviewChangesSection {
  readonly sectionNew: PublishTestSection;
}

/**
 * One of the dialog's file lists, with its rows by path.
 */
interface PublishTestSection {
  readonly files: Record<string, TestTreeItem | undefined>;
}

interface SyncStatusRecord extends MenuRecord {
  /**
   * What the **Sync** plugin's own `getStatus()` answered when the menu opened.
   */
  readonly expectedStatus: string;
}

/**
 * The core **Sync** plugin's instance, as far as this suite drives it.
 */
// TODO: Drop these members once `obsidian-typings` declares them on `SyncPluginInstance`.
interface SyncTestPluginInstance extends SyncPluginInstance {
  readonly getStatus: () => string;
  readonly serverFiles: Record<string, SyncTestServerFile | undefined>;
  readonly statusIconEl: HTMLElement | null;
}

/**
 * A file the Sync server holds.
 */
interface SyncTestServerFile {
  readonly deleted?: boolean;
}

/**
 * The **Sync history** view's tree, as far as this suite drives it.
 */
interface SyncTestTree {
  readonly clearSelectedDoms: () => void;
}

/**
 * The **Sync history** view, as far as this suite drives it.
 */
interface SyncTestView extends View {
  readonly fileItems: Record<string, TestTreeItem | undefined>;
  readonly tree: SyncTestTree;
  readonly updateRecentChanges: () => Promise<void>;
}

/**
 * An item of a tree the suite clicks.
 */
interface TestTreeItem {
  readonly selfEl: HTMLElement;
}

interface VaultCleanup {
  readonly communityPluginsConfigPath: string;
  readonly pluginFolderPath: string;
  readonly pluginsFolderPath: string;
  readonly shouldKeepCommunityPluginsConfig: boolean;
}

let connection: CdpConnection | undefined;
let vaultCleanup: undefined | VaultCleanup;

describe('Sync and Publish menu events', () => {
  beforeAll(async () => {
    if (!PROFILE_PATH || !VAULT_PATH) {
      throw new Error('Set MORE_EVENTS_ACCOUNT_PROFILE and MORE_EVENTS_ACCOUNT_VAULT to a signed-in profile and its test vault.');
    }

    connection = await connectToCdp({
      ...(OBSIDIAN_VERSION && { obsidianVersion: OBSIDIAN_VERSION }),
      persistentUserDataDirectory: PROFILE_PATH,
      vault: VAULT_PATH
    });

    const configDirectory = await connection.evalInObsidian({
      callback({ app }): string {
        return app.vault.configDir;
      }
    });
    const pluginsFolderPath = join(VAULT_PATH, configDirectory, 'plugins');
    const communityPluginsConfigPath = join(VAULT_PATH, configDirectory, 'community-plugins.json');
    // What the suite finds is what it leaves: Obsidian writes an empty plugin list when a plugin is disabled.
    vaultCleanup = {
      communityPluginsConfigPath,
      pluginFolderPath: join(pluginsFolderPath, PLUGIN_ID),
      pluginsFolderPath,
      shouldKeepCommunityPluginsConfig: existsSync(communityPluginsConfigPath)
    };

    const buildFolderPath = join(getRootFolder() ?? process.cwd(), 'dist', 'build');
    mkdirSync(vaultCleanup.pluginFolderPath, { recursive: true });
    for (const fileName of ['main.js', 'manifest.json']) {
      cpSync(join(buildFolderPath, fileName), join(vaultCleanup.pluginFolderPath, fileName));
    }

    await connection.evalInObsidian({
      async callback({ app, lib, pluginId, syncNotePaths }): Promise<void> {
        const { waitUntil } = lib;
        // Loaded, not saved: `enablePlugin` leaves the vault's `community-plugins.json` alone.
        await app.plugins.loadManifests();
        if (!await app.plugins.enablePlugin(pluginId)) {
          throw new Error(`Could not load ${pluginId} in the test vault`);
        }

        const sync = app.internalPlugins.getEnabledPluginById('sync') as null | SyncTestPluginInstance;
        if (!sync) {
          throw new Error('The Sync core plugin is not enabled in the test vault');
        }
        await waitUntil({
          message: 'Sync to be connected and idle',
          predicate: () => sync.getStatus() === 'synced',
          timeoutInMilliseconds: 60_000
        });

        for (const path of syncNotePaths) {
          if (!app.vault.getFileByPath(path)) {
            await app.vault.create(path, `Written by the More Events account suite: ${path}`);
          }
        }
      },
      input: { pluginId: PLUGIN_ID, syncNotePaths: SYNC_NOTE_PATHS }
    });
  }, TEST_TIMEOUT_IN_MS);

  afterAll(async () => {
    if (!connection) {
      return;
    }
    try {
      await connection.evalInObsidian({
        async callback({ app, lib, notePaths, pluginId }): Promise<void> {
          const { waitUntil } = lib;
          for (const path of notePaths) {
            const file = app.vault.getFileByPath(path);
            if (file) {
              await app.fileManager.trashFile(file);
            }
          }
          await app.plugins.disablePlugin(pluginId);
          const sync = app.internalPlugins.getEnabledPluginById('sync') as null | SyncTestPluginInstance;
          // The deletions reach the remote vault before the instance goes away.
          await waitUntil({
            message: 'Sync to upload the cleanup',
            predicate: () => !!sync && sync.getStatus() === 'synced' && notePaths.every((path) => sync.serverFiles[path]?.deleted ?? true),
            timeoutInMilliseconds: 60_000
          });
        },
        input: { notePaths: [...SYNC_NOTE_PATHS, PUBLISH_NOTE_PATH], pluginId: PLUGIN_ID }
      });
    } finally {
      await connection.dispose();
      if (vaultCleanup) {
        rmSync(vaultCleanup.pluginFolderPath, { force: true, recursive: true });
        // Obsidian makes the folder at startup, before the suite can look, so an empty one is left by nobody else.
        if (existsSync(vaultCleanup.pluginsFolderPath) && readdirSync(vaultCleanup.pluginsFolderPath).length === 0) {
          rmSync(vaultCleanup.pluginsFolderPath, { recursive: true });
        }
        if (!vaultCleanup.shouldKeepCommunityPluginsConfig) {
          rmSync(vaultCleanup.communityPluginsConfigPath, { force: true });
        }
      }
    }
  }, TEST_TIMEOUT_IN_MS);

  it('should let a listener add an item to the Sync status menu opened by a click', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openSyncStatusMenu('left');

    expect(record.payloads).toEqual([record.expectedStatus]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Version history');
  });

  it('should let a listener add an item to the Sync status menu opened by a right-click', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await openSyncStatusMenu('right');

    expect(record.payloads).toEqual([record.expectedStatus]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Version history');
  });

  it('should let a listener add an item to the Sync history menu of several selected files', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickSyncSelection();

    expect(record.payloads).toEqual([SYNC_NOTE_PATHS]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    // Obsidian's own item for a multiple selection.
    expect(record.shownItemTitles).toContain('Delete');
  });

  it('should let a listener add an item to the menu of a file row in the Publish changes dialog', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await rightClickPublishRow();

    expect(record.payloads).toEqual([{ path: PUBLISH_NOTE_PATH, type: 'new' }]);
    expect(record.shownItemTitles).toContain('Added by a listener');
    expect(record.shownItemTitles).toContain('Open file');
  });
});

/**
 * Returns the connection the suite opened.
 *
 * @returns The connection.
 */
function getConnection(): CdpConnection {
  if (!connection) {
    throw new Error('The suite did not connect');
  }
  return connection;
}

/**
 * Clicks or right-clicks the **Sync** status icon in the status bar with a trusted click.
 *
 * @param button - The mouse button.
 * @returns What happened.
 */
async function openSyncStatusMenu(button: 'left' | 'right'): Promise<SyncStatusRecord> {
  return await getConnection().evalInObsidian({
    async callback({ app, button: mouseButton, lib, SYNC_STATUS_MENU_EVENT_NAME: eventName }): Promise<SyncStatusRecord> {
      const { clickMouse, waitUntil } = lib;
      const sync = app.internalPlugins.getEnabledPluginById('sync') as null | SyncTestPluginInstance;
      const statusIconEl = sync?.statusIconEl;
      if (!sync || !statusIconEl) {
        throw new Error('No Sync status icon');
      }

      const payloads: unknown[] = [];
      let shownMenu: Menu | null = null;
      let expectedStatus = '';
      const eventRef = app.workspace.on(eventName, (menu, status) => {
        shownMenu = menu;
        expectedStatus = sync.getStatus();
        payloads.push(status);
        menu.addItem((item) => item.setTitle('Added by a listener'));
      });

      try {
        const rect = statusIconEl.getBoundingClientRect();
        await clickMouse({ button: mouseButton, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        await waitUntil({
          message: 'the Sync status menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: 8000
        });
        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          expectedStatus,
          payloads,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
      }
    },
    input: { button, SYNC_STATUS_MENU_EVENT_NAME }
  });
}

/**
 * Writes a note the site does not have, opens the **Publish changes** dialog, and right-clicks the note's row with a
 * trusted click.
 *
 * @returns What happened.
 */
async function rightClickPublishRow(): Promise<MenuRecord> {
  return await getConnection().evalInObsidian({
    async callback({ app, lib, notePath, PUBLISH_FILE_MENU_EVENT_NAME: eventName }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 60_000;
      const publish = app.internalPlugins.getEnabledPluginById('publish') as null | PublishTestPluginInstance;
      if (!publish) {
        throw new Error('The Publish core plugin is not enabled');
      }
      if (!app.vault.getFileByPath(notePath)) {
        await app.vault.create(notePath, 'Written by the More Events account suite; never published.');
      }

      publish.openModal();
      await waitUntil({
        message: 'the suite\'s note to be listed as new in the Publish changes dialog',
        predicate: () => (publish.modal?.reviewChangesSection?.sectionNew.files[notePath]?.selfEl.getBoundingClientRect().height ?? 0) > 0,
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
      });

      const payloads: unknown[] = [];
      let shownMenu: Menu | null = null;
      const eventRef = app.workspace.on(eventName, (menu, item) => {
        shownMenu = menu;
        payloads.push(item);
        menu.addItem((menuItem) => menuItem.setTitle('Added by a listener'));
      });

      try {
        const rect = publish.modal?.reviewChangesSection?.sectionNew.files[notePath]?.selfEl.getBoundingClientRect();
        if (!rect) {
          throw new Error('The note\'s row disappeared');
        }
        await clickMouse({ button: 'right', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        // The menu waits for the Publish server before it is shown.
        await waitUntil({
          message: 'the Publish file menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          payloads,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        publish.modal?.close();
      }
    },
    input: { notePath: PUBLISH_NOTE_PATH, PUBLISH_FILE_MENU_EVENT_NAME }
  });
}

/**
 * Opens the **Sync history** view, selects the suite's two notes with two Alt+clicks (Obsidian's tree toggles an
 * item's selection on Alt, `app.js:73801` in 1.15.0), and right-clicks the second, all with trusted input.
 *
 * @returns What happened.
 */
async function rightClickSyncSelection(): Promise<MenuRecord> {
  return await getConnection().evalInObsidian({
    async callback({ app, lib, notePaths, SYNC_FILES_MENU_EVENT_NAME: eventName }): Promise<MenuRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 90_000;
      const sync = app.internalPlugins.getEnabledPluginById('sync') as null | SyncTestPluginInstance;
      if (!sync) {
        throw new Error('The Sync core plugin is not enabled');
      }
      await waitUntil({
        message: 'Sync to upload the suite\'s notes',
        predicate: () => sync.getStatus() === 'synced' && notePaths.every((path) => sync.serverFiles[path] !== undefined && !sync.serverFiles[path].deleted),
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
      });

      const leaf = app.workspace.getRightLeaf(false);
      if (!leaf) {
        throw new Error('No right sidebar leaf');
      }
      await leaf.setViewState({ active: true, type: 'sync' });
      await app.workspace.revealLeaf(leaf);
      const view = leaf.view as SyncTestView;
      await view.updateRecentChanges();
      await waitUntil({
        message: 'the suite\'s notes to be on screen in the Sync history view',
        predicate: () => notePaths.every((path) => (view.fileItems[path]?.selfEl.getBoundingClientRect().height ?? 0) > 0),
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
      });

      const payloads: unknown[] = [];
      let shownMenu: Menu | null = null;
      const eventRef = app.workspace.on(eventName, (menu, paths) => {
        shownMenu = menu;
        payloads.push(paths);
        menu.addItem((item) => item.setTitle('Added by a listener'));
      });

      async function clickItem(path: string, button: 'left' | 'right', modifiers: 'Alt'[] = []): Promise<void> {
        const rect = view.fileItems[path]?.selfEl.getBoundingClientRect();
        if (!rect) {
          throw new Error(`No Sync history item for ${path}`);
        }
        await clickMouse({ button, modifiers, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }

      try {
        view.tree.clearSelectedDoms();
        const [firstPath = '', secondPath = ''] = notePaths;
        await clickItem(firstPath, 'left', ['Alt']);
        await clickItem(secondPath, 'left', ['Alt']);
        await clickItem(secondPath, 'right');
        await waitUntil({
          message: 'the Sync history menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: 8000
        });
        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          payloads,
          shownItemTitles: Array.from(menuEl?.querySelectorAll('.menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        view.tree.clearSelectedDoms();
        leaf.detach();
      }
    },
    input: { notePaths: SYNC_NOTE_PATHS, SYNC_FILES_MENU_EVENT_NAME }
  });
}
