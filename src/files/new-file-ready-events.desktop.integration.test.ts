import type {
  ObsidianProtocolData,
  TFile
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { NEW_FILE_READY_EVENT_NAME } from '../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/* eslint-disable typescript-dev-toolkit/readonly-interface-members -- The listeners fill the record in as the events arrive. */
interface CreatedFileRecord {
  readyCount: number;
  sizeAtCreate: number;
  sizeAtReady: number;
}
/* eslint-enable typescript-dev-toolkit/readonly-interface-members -- Only the record above is mutable. */

/*
 * `create` fires for an `obsidian://new` file before its content is written: the `new` handler creates the file
 * empty and writes the content afterwards. This suite drives that handler through Obsidian's own `dispatch`, the
 * method a real `obsidian://` link reaches, and reads the file's size both at `create` and at the event: the first must
 * be empty and the second must hold the content, or the event is no better than `create`. A file created with its
 * content by `vault.create` must be announced too, with no `obsidian://` action involved.
 */
describe('New file ready events', () => {
  it('should wait for obsidian://new to write the content', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await createFile('uri');

    expect(record).toEqual({
      readyCount: 1,
      sizeAtCreate: 0,
      sizeAtReady: 'Written by obsidian://new'.length
    });
  });

  it('should announce a file vault.create writes with its content', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await createFile('vault');

    expect(record).toEqual({
      readyCount: 1,
      sizeAtCreate: 'Written by vault.create'.length,
      sizeAtReady: 'Written by vault.create'.length
    });
  });
});

/**
 * Creates one file, either through `obsidian://new` or `vault.create`, and records what it held at `create` and at
 * the event.
 *
 * @param mode - How the file is created.
 * @returns What was recorded.
 */
async function createFile(mode: 'uri' | 'vault'): Promise<CreatedFileRecord> {
  const path = `new-file-ready-${mode}.md`;
  const content = mode === 'uri' ? 'Written by obsidian://new' : 'Written by vault.create';
  return await evalInObsidian({
    async callback({
      app,
      content: contentInput,
      lib,
      mode: modeInput,
      NEW_FILE_READY_EVENT_NAME: eventName,
      path: pathInput,
      protocolData
    }): Promise<CreatedFileRecord> {
      const WAIT_TIMEOUT_IN_MS = 10_000;

      const record: CreatedFileRecord = { readyCount: 0, sizeAtCreate: -1, sizeAtReady: -1 };

      // Both sizes are read synchronously, because what matters is what the file held when each event fired.
      const createRef = app.vault.on('create', (file) => {
        if (file.path === pathInput) {
          record.sizeAtCreate = app.vault.getFileByPath(pathInput)?.stat.size ?? -1;
        }
      });
      const readyRef = app.workspace.on(eventName, (file: TFile) => {
        if (file.path !== pathInput) {
          return;
        }
        record.readyCount++;
        record.sizeAtReady = file.stat.size;
      });

      try {
        if (modeInput === 'uri') {
          // What a real `obsidian://new?file=...&content=...&silent=true` link reaches.
          app.workspace.protocolHandler.dispatch(protocolData);
        } else {
          await app.vault.create(pathInput, contentInput);
        }

        await lib.waitUntil({
          message: 'the new file ready event to arrive',
          predicate: () => record.readyCount > 0,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });

        return record;
      } finally {
        app.vault.offref(createRef);
        app.workspace.offref(readyRef);
        const file = app.vault.getFileByPath(pathInput);
        if (file) {
          await app.fileManager.trashFile(file);
        }
      }
    },
    input: {
      content,
      mode,
      NEW_FILE_READY_EVENT_NAME,
      path,
      protocolData: castTo<ObsidianProtocolData>({ action: 'new', content, file: path, silent: 'true' })
    },
    vaultPath: getTemporaryVault().path
  });
}
