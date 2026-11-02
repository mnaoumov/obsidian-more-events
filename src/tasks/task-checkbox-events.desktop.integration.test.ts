import type {
  MarkdownView,
  MarkdownViewModeType,
  TFile,
  WorkspaceLeaf
} from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { TaskCheckboxClick } from '../../api.d.ts';

import { TASK_CHECKBOX_CLICKED_EVENT_NAME } from '../api/more-events-api.ts';

const TEST_TIMEOUT_IN_MS = 120_000;

/*
 * The tasks sit below a heading and a paragraph, so a wrong line would not pass as the right one by accident, and the
 * second one has a custom status, which Obsidian unchecks. The callout holds a task Live Preview renders inside a
 * block widget, the third of Obsidian's three toggling listeners.
 */
const NOTE_CONTENT = `# Tasks

A paragraph before the tasks.

- [ ] Call the bank
- [/] Write the report

> [!note] Inside a callout
> - [ ] Water the plants
`;

/* eslint-disable typescript-dev-toolkit/readonly-interface-members -- The listener fills the record in as the events arrive. */
interface ClickRecord {
  fileMatches: boolean[];
  leafMatches: boolean[];
  noteLineAtEvent: string[];
  tasks: TaskCheckboxClick[];
}
/* eslint-enable typescript-dev-toolkit/readonly-interface-members -- Only the record above is mutable. */

/*
 * The test that can fail for the right reason: the claim is that a REAL click on a REAL checkbox is announced after
 * Obsidian wrote the toggle, in Reading view and in Live Preview, which only trusted clicks on a real Obsidian prove.
 * Each test also reads the note's line from the view at the event, so an announcement before the write would fail.
 *
 * Desktop only: the trusted click goes through Electron's `sendInputEvent`.
 */
describe('Task checkbox events', () => {
  it('should announce a checkbox clicked in Reading view', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickCheckbox('preview', 'li.task-list-item[data-task="/"] > .task-list-item-checkbox');

    expect(record.tasks).toEqual([{
      char: ' ',
      isChecked: false,
      line: 5,
      lineText: '- [ ] Write the report',
      mode: 'preview',
      previousChar: '/'
    }]);
    expect(record.noteLineAtEvent).toEqual(['- [ ] Write the report']);
    expect(record.leafMatches).toEqual([true]);
    expect(record.fileMatches).toEqual([true]);
  });

  it('should announce a task checkbox clicked in Live Preview', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickCheckbox('source', '.cm-line .task-list-label > .task-list-item-checkbox');

    expect(record.tasks).toEqual([{
      char: 'x',
      isChecked: true,
      line: 4,
      lineText: '- [x] Call the bank',
      mode: 'source',
      previousChar: ' '
    }]);
    expect(record.noteLineAtEvent).toEqual(['- [x] Call the bank']);
    expect(record.leafMatches).toEqual([true]);
    expect(record.fileMatches).toEqual([true]);
  });

  it('should announce a task checkbox clicked inside a callout in Live Preview', { timeout: TEST_TIMEOUT_IN_MS }, async () => {
    const record = await clickCheckbox('source', '.cm-callout .task-list-item-checkbox');

    expect(record.tasks).toEqual([{
      char: 'x',
      isChecked: true,
      line: 8,
      lineText: '> - [x] Water the plants',
      mode: 'source',
      previousChar: ' '
    }]);
    expect(record.noteLineAtEvent).toEqual(['> - [x] Water the plants']);
  });
});

/**
 * Opens the note in a mode, clicks one checkbox with a trusted click, and records what the listener saw.
 *
 * @param mode - The mode to open the note in.
 * @param selector - The checkbox to click.
 * @returns What happened.
 */
async function clickCheckbox(mode: MarkdownViewModeType, selector: string): Promise<ClickRecord> {
  return await evalInObsidian({
    async callback({
      app,
      lib,
      mode: modeInput,
      NOTE_CONTENT: noteContent,
      selector: selectorInput,
      TASK_CHECKBOX_CLICKED_EVENT_NAME: eventName
    }): Promise<ClickRecord> {
      const { clickMouse, waitUntil } = lib;
      const WAIT_TIMEOUT_IN_MS = 8000;
      const NOTE_PATH = `task-checkbox-events-${modeInput}-${String(Date.now())}.md`;

      const record: ClickRecord = { fileMatches: [], leafMatches: [], noteLineAtEvent: [], tasks: [] };
      let noteLeaf: null | WorkspaceLeaf = null;
      let noteFile: null | TFile = null;

      const eventRef = app.workspace.on(eventName, (leaf, file, task) => {
        record.tasks.push(task);
        record.leafMatches.push(leaf === noteLeaf);
        record.fileMatches.push(file === noteFile);
        const viewData = (leaf.view as MarkdownView).getViewData();
        record.noteLineAtEvent.push(viewData.split('\n')[task.line] ?? '');
      });

      const file = await app.vault.create(NOTE_PATH, noteContent);
      noteFile = file;
      try {
        const leaf = app.workspace.getLeaf('tab');
        noteLeaf = leaf;
        await leaf.setViewState({
          active: true,
          state: { file: file.path, mode: modeInput, source: false },
          type: 'markdown'
        });

        await waitUntil({
          message: 'the checkbox to render',
          predicate: () => {
            const el = leaf.view.containerEl.querySelector(selectorInput);
            return !!el && el.getBoundingClientRect().width > 0;
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        const checkboxEl = leaf.view.containerEl.querySelector(selectorInput);
        if (!checkboxEl) {
          throw new Error(`No checkbox matches ${selectorInput}`);
        }
        const rect = checkboxEl.getBoundingClientRect();
        await clickMouse({
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2)
        });

        await waitUntil({
          message: 'the task checkbox event to arrive',
          predicate: () => record.tasks.length > 0,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MS
        });
        // A second announcement for the same click would arrive within the same task.
        await sleep(300);

        return record;
      } finally {
        app.workspace.offref(eventRef);
        noteLeaf?.detach();
        await app.fileManager.trashFile(file);
      }

      async function sleep(milliseconds: number): Promise<void> {
        await new Promise((resolve) => {
          window.setTimeout(resolve, milliseconds);
        });
      }
    },
    input: {
      mode,
      NOTE_CONTENT,
      selector,
      TASK_CHECKBOX_CLICKED_EVENT_NAME
    },
    vaultPath: getTemporaryVault().path
  });
}
