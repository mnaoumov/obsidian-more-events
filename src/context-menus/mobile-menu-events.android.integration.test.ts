import type {
  EventRef,
  Menu
} from 'obsidian';

import {
  evalInObsidian,
  resolveEmulatorDeviceId,
  runAdbText
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import {
  RECEIVE_FILES_MENU_EVENT_NAME,
  RECEIVE_TEXT_MENU_EVENT_NAME,
  TAB_SWITCHER_MENU_EVENT_NAME
} from '../api/more-events-api.ts';

/**
 * The AVD the standard Android project boots (`@mnaoumov/obsidian-dev-toolkit`'s Android project).
 */
const AVD_NAME = 'obsidian_test';

const TEST_TIMEOUT_IN_MS = 120_000;

const ADDED_ITEM_TITLE = 'Added by a listener';

/**
 * The text the suite shares to Obsidian, with a space in it so the device shell's quoting is exercised too.
 */
const SHARED_TEXT = 'Shared by More Events';

/**
 * The file the suite shares, in the emulator's public Downloads folder.
 */
const SHARED_FILE_NAME = 'more-events-shared.txt';
const SHARED_FILE_DEVICE_PATH = `/sdcard/Download/${SHARED_FILE_NAME}`;

/**
 * Where the listener of a share test leaves what it saw, between the closure that registers it and the one that reads it.
 */
const SHARE_RECORD_KEY = 'moreEventsShareRecord';

interface ShareRecord {
  /**
   * The vault paths of the files the listener was given.
   */
  readonly filePaths: string[];

  /**
   * How many times the listener was called.
   */
  readonly listenerCallCount: number;

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];

  /**
   * The text the listener was given.
   */
  readonly texts: string[];
}

/* eslint-disable typescript-dev-toolkit/readonly-interface-members -- The listener fills this record in as the share menu reaches it. */
interface ShareState {
  eventRef: EventRef | null;
  filePaths: string[];
  listenerCallCount: number;
  menu: Menu | null;
  texts: string[];
}
/* eslint-enable typescript-dev-toolkit/readonly-interface-members -- Back to the default after the mutable record. */

interface TabMenuRecord {
  /**
   * Whether the listener was given the leaf `getMostRecentLeaf()` answers.
   */
  readonly isMostRecentLeaf: boolean;

  /**
   * How many times the listener was called.
   */
  readonly listenerCallCount: number;

  /**
   * The titles of the items in the menu that opened on screen.
   */
  readonly shownItemTitles: string[];
}

let deviceId = '';

/*
 * The tests that can fail for the right reason: the claims are about the REAL mobile app. The tab button's menu is
 * shown by `Menu.forEvent` on a later task, so its announcement rests on the path the plugin recorded during a real
 * long-press's `contextmenu` dispatch. The share-sheet menus are shown only for the operating system's share
 * intent, so each test sends a real `android.intent.action.SEND` to the app through `adb`, never a synthetic call.
 *
 * Android only: the navigation bar and the share intent exist on mobile alone.
 */
describe('Mobile menu events', () => {
  beforeAll(async () => {
    deviceId = await resolveEmulatorDeviceId({ avdName: AVD_NAME });
  });

  it('should let a listener add an item to the navigation bar\'s tab button menu', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await longPressTabButton();

    expect(record.listenerCallCount).toBe(1);
    expect(record.isMostRecentLeaf).toBe(true);
    expect(record.shownItemTitles).toContain(ADDED_ITEM_TITLE);
    // The menu is Obsidian's own, with the item added to it, rather than a second menu of this plugin's.
    expect(record.shownItemTitles).toContain('New tab');
  });

  it('should let a listener add an item to the menu for shared text, and give it the text', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    await startRecordingShare(RECEIVE_TEXT_MENU_EVENT_NAME);
    await runAdbText({
      commandArguments: [
        'shell',
        'am',
        'start',
        '-a',
        'android.intent.action.SEND',
        '-t',
        'text/plain',
        '--es',
        'android.intent.extra.TEXT',
        `"${SHARED_TEXT}"`,
        '-p',
        'md.obsidian'
      ],
      deviceId
    });
    const record = await readShareRecord();

    expect(record.listenerCallCount).toBe(1);
    expect(record.texts).toEqual([SHARED_TEXT]);
    expect(record.shownItemTitles).toContain(ADDED_ITEM_TITLE);
    expect(record.shownItemTitles).toContain('Cancel');
  });

  it('should let a listener add an item to the menu shown once shared files are imported, and give it the files', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    await runAdbText({ commandArguments: ['shell', 'sh', '-c', `"echo shared > ${SHARED_FILE_DEVICE_PATH}"`], deviceId });
    await startRecordingShare(RECEIVE_FILES_MENU_EVENT_NAME);
    try {
      await runAdbText({
        commandArguments: [
          'shell',
          'am',
          'start',
          '-a',
          'android.intent.action.SEND',
          '-t',
          'text/plain',
          '--eu',
          'android.intent.extra.STREAM',
          `file://${SHARED_FILE_DEVICE_PATH}`,
          '--grant-read-uri-permission',
          '-p',
          'md.obsidian'
        ],
        deviceId
      });
      await tapImportIntoVault();
      const record = await readShareRecord();

      expect(record.listenerCallCount).toBe(1);
      expect(record.filePaths).toHaveLength(1);
      expect(record.filePaths[0]).toMatch(/more-events-shared(?: \d+)?\.txt$/);
      expect(record.shownItemTitles).toContain(ADDED_ITEM_TITLE);
      expect(record.shownItemTitles).toContain('Done');
    } finally {
      await runAdbText({ commandArguments: ['shell', 'rm', '-f', SHARED_FILE_DEVICE_PATH], deviceId });
    }
  });
});

/**
 * Long-presses the navigation bar's tab button with trusted input, and records what the listener saw and what the
 * menu on screen showed.
 *
 * @returns What happened.
 */
async function longPressTabButton(): Promise<TabMenuRecord> {
  return await evalInObsidian({
    async callback({
      ADDED_ITEM_TITLE: addedItemTitle,
      app,
      lib: { clickElement, pressKey, waitUntil },
      TAB_SWITCHER_MENU_EVENT_NAME: tabSwitcherMenuEventName
    }): Promise<TabMenuRecord> {
      const WAIT_TIMEOUT_IN_MS = 8000;
      let listenerCallCount = 0;
      let isMostRecentLeaf = false;
      let shownMenu: Menu | null = null;

      const eventRef = app.workspace.on(tabSwitcherMenuEventName, (menu, leaf) => {
        shownMenu = menu;
        listenerCallCount++;
        isMostRecentLeaf = leaf !== null && leaf === app.workspace.getMostRecentLeaf();
        menu.addItem((item) => item.setTitle(addedItemTitle));
      });

      try {
        const tabsButtonEl = activeDocument.querySelector<HTMLElement>('.mobile-navbar-action-tabs');
        if (!tabsButtonEl) {
          throw new Error('No tab button in the navigation bar');
        }
        // On mobile the right button is the long-press that raises `contextmenu`.
        await clickElement({ button: 'right', element: tabsButtonEl });
        await waitUntil({
          message: 'the tab button\'s menu to open',
          predicate: () => !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          isMostRecentLeaf,
          listenerCallCount,
          shownItemTitles: Array.from(menuEl?.querySelectorAll(':scope .menu-item-title') ?? [], (titleEl) => titleEl.textContent)
        };
      } finally {
        app.workspace.offref(eventRef);
        // The `null` initializer narrows the closure-assigned variable to `never` for the checker.
        (shownMenu as Menu | null)?.hide();
        if (activeDocument.body.querySelector('.menu')) {
          // With the announcer unplugged nothing holds the menu, and a menu left open swallows the next test's tap.
          await pressKey({ key: 'Escape' });
        }
      }
    },
    input: {
      ADDED_ITEM_TITLE,
      TAB_SWITCHER_MENU_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Reads what the share listener saw once its menu is on screen, then closes the menu and unsubscribes.
 *
 * @returns What happened.
 */
async function readShareRecord(): Promise<ShareRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib: { pressKey, waitUntil },
      SHARE_RECORD_KEY: shareRecordKey
    }): Promise<ShareRecord> {
      const WAIT_TIMEOUT_IN_MS = 15_000;
      const state = Reflect.get(window, shareRecordKey) as ShareState | undefined;
      if (!state) {
        throw new Error('The share listener was never registered');
      }
      try {
        await waitUntil({
          message: 'the share listener to be called',
          predicate: () => state.listenerCallCount > 0 && !!activeDocument.body.querySelector('.menu'),
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const menuEl = activeDocument.body.querySelector('.menu');
        return {
          filePaths: state.filePaths,
          listenerCallCount: state.listenerCallCount,
          shownItemTitles: Array.from(menuEl?.querySelectorAll(':scope .menu-item-title') ?? [], (titleEl) => titleEl.textContent),
          texts: state.texts
        };
      } catch (error) {
        const menus = Array.from(activeDocument.body.querySelectorAll('.menu'), (el) => el.textContent).join(' | ');
        const notices = Array.from(activeDocument.body.querySelectorAll('.notice'), (el) => el.textContent).join(' | ');
        throw new Error(`No share menu reached the listener. Menus: ${menus}. Notices: ${notices}.`, { cause: error });
      } finally {
        if (state.eventRef) {
          app.workspace.offref(state.eventRef);
        }
        state.menu?.hide();
        if (activeDocument.body.querySelector('.menu')) {
          await pressKey({ key: 'Escape' });
        }
        for (const path of state.filePaths) {
          const file = app.vault.getFileByPath(path);
          if (file) {
            await app.fileManager.trashFile(file);
          }
        }
        Reflect.deleteProperty(window, shareRecordKey);
      }
    },
    input: {
      SHARE_RECORD_KEY
    },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Subscribes a listener to one of the two share-sheet events, which records what it is given on `window`.
 *
 * @param eventName - The event to listen to.
 */
async function startRecordingShare(eventName: typeof RECEIVE_FILES_MENU_EVENT_NAME | typeof RECEIVE_TEXT_MENU_EVENT_NAME): Promise<void> {
  await evalInObsidian({
    callback({
      ADDED_ITEM_TITLE: addedItemTitle,
      app,
      eventName: eventNameInObsidian,
      RECEIVE_FILES_MENU_EVENT_NAME: receiveFilesMenuEventName,
      RECEIVE_TEXT_MENU_EVENT_NAME: receiveTextMenuEventName,
      SHARE_RECORD_KEY: shareRecordKey
    }): void {
      const state: ShareState = { eventRef: null, filePaths: [], listenerCallCount: 0, menu: null, texts: [] };
      state.eventRef = eventNameInObsidian === receiveTextMenuEventName
        ? app.workspace.on(receiveTextMenuEventName, (menu, text) => {
          state.listenerCallCount++;
          state.menu = menu;
          state.texts.push(text);
          menu.addItem((item) => item.setTitle(addedItemTitle));
        })
        : app.workspace.on(receiveFilesMenuEventName, (menu, files) => {
          state.listenerCallCount++;
          state.menu = menu;
          state.filePaths.push(...files.map((file) => file.path));
          menu.addItem((item) => item.setTitle(addedItemTitle));
        });
      Reflect.set(window, shareRecordKey, state);
    },
    input: {
      ADDED_ITEM_TITLE,
      eventName,
      RECEIVE_FILES_MENU_EVENT_NAME,
      RECEIVE_TEXT_MENU_EVENT_NAME,
      SHARE_RECORD_KEY
    },
    vaultPath: getTemporaryVault().path
  });
}

/**
 * Taps **Import into vault** in the menu Obsidian shows for shared files, with trusted input.
 */
async function tapImportIntoVault(): Promise<void> {
  await evalInObsidian({
    async callback({ lib: { clickElement, waitUntil } }): Promise<void> {
      const WAIT_TIMEOUT_IN_MS = 15_000;
      const IMPORT_ITEM_TITLE = 'Import into vault';
      function findImportItem(): HTMLElement | null {
        return [...activeDocument.body.querySelectorAll<HTMLElement>(':scope .menu .menu-item')]
          .find((itemEl) => itemEl.querySelector(':scope .menu-item-title')?.textContent === IMPORT_ITEM_TITLE) ?? null;
      }
      await waitUntil({
        message: `the ${IMPORT_ITEM_TITLE} item to be on screen`,
        predicate: () => (findImportItem()?.getBoundingClientRect().height ?? 0) > 0,
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
      });
      const importItemEl = findImportItem();
      if (!importItemEl) {
        throw new Error(`No ${IMPORT_ITEM_TITLE} item`);
      }
      await clickElement({ element: importItemEl });
    },
    vaultPath: getTemporaryVault().path
  });
}
