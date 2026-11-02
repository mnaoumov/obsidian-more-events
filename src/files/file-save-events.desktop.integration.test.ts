import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('File save events', () => {
  it('should bracket a manual save and an autosave, ignore clean saves and include vault API writes', { timeout: 120_000 }, async () => {
    const result = await evalInObsidian({
      async callback({ app, lib, obsidianModule }) {
        const file = await app.vault.create('save-events-alpha.md', 'alpha');
        const leaf = app.workspace.getLeaf(true);
        await leaf.openFile(file);
        const view = leaf.view;
        if (!(view instanceof obsidianModule.MarkdownView)) {
          throw new TypeError('Expected Markdown view');
        }
        // Its autosave callback was bound before this new installation, as when enabling the plugin later.
        await app.plugins.disablePlugin('more-events');
        if (!await app.plugins.enablePlugin('more-events')) {
          throw new Error('Could not reload More Events');
        }
        const calls: string[] = [];
        const before = app.workspace.on('more-events:before-save', (saved, change) => {
          if (saved === file) {
            calls.push(`before:${change.content}:${String(file.stat.size)}`);
          }
        });
        const after = app.workspace.on('more-events:after-save', (saved, change) => {
          if (saved === file) {
            calls.push(`after:${change.content}:${String(file.stat.size)}`);
          }
        });
        try {
          view.editor.setValue('bravo!');
          app.commands.executeCommandById('editor:save-file');
          await lib.waitUntil({ message: 'manual save events', predicate: () => calls.length === 2, timeoutInMilliseconds: 10_000 });
          await view.save();
          const countAfterCleanSave = calls.length;
          view.editor.setValue('charlie');
          await lib.waitUntil({ message: 'autosave events', predicate: () => calls.length === 4, timeoutInMilliseconds: 10_000 });
          await app.vault.modify(file, 'delta');
          return { calls, countAfterCleanSave };
        } finally {
          app.workspace.offref(before);
          app.workspace.offref(after);
          leaf.detach();
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result).toEqual({
      calls: ['before:bravo!:5', 'after:bravo!:6', 'before:charlie:6', 'after:charlie:7', 'before:delta:7', 'after:delta:5'],
      countAfterCleanSave: 2
    });
  });
});
