import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { FrontmatterChange } from '../../api.d.ts';

describe('Frontmatter change events', () => {
  it('should report old and new indexed properties, retain the baseline on rename and ignore body edits', { timeout: 120_000 }, async () => {
    const changes = await evalInObsidian({
      async callback({ app, lib }) {
        const file = await app.vault.create('frontmatter-events-alpha.md', '---\nstatus: alpha\nnested:\n  value: 1\n---\nBody');
        await lib.waitUntil({ predicate: () => app.metadataCache.getFileCache(file)?.frontmatter?.['status'] === 'alpha', timeoutInMilliseconds: 10_000 });
        const calls: FrontmatterChange[] = [];
        let indexed = 0;
        const indexRef = app.metadataCache.on('changed', (changed) => {
          if (changed === file) {
            indexed++;
          }
        });
        const ref = app.workspace.on('more-events:frontmatter-changed', (changed, change) => {
          if (changed === file) {
            calls.push(change);
          }
        });
        try {
          await app.vault.modify(file, '---\nstatus: alpha\nnested:\n  value: 1\n---\nChanged body');
          await lib.waitUntil({ predicate: () => indexed > 0, timeoutInMilliseconds: 10_000 });
          if (calls.length > 0) {
            throw new Error('Body-only edit produced a frontmatter event');
          }
          await app.fileManager.renameFile(file, 'frontmatter-events-bravo.md');
          await app.fileManager.processFrontMatter(file, (frontmatter) => {
            if (typeof frontmatter !== 'object' || frontmatter === null) {
              throw new TypeError('Expected frontmatter object');
            }
            Object.assign(frontmatter, { added: ['charlie'], nested: { value: 2 }, status: 'bravo' });
          });
          await lib.waitUntil({ predicate: () => calls.length === 1, timeoutInMilliseconds: 10_000 });
          await app.vault.modify(file, 'No properties');
          await lib.waitUntil({ predicate: () => calls.length === 2, timeoutInMilliseconds: 10_000 });
          return calls;
        } finally {
          app.metadataCache.offref(indexRef);
          app.workspace.offref(ref);
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(changes).toEqual([
      { changedKeys: ['added', 'nested', 'status'], newValues: { added: ['charlie'], nested: { value: 2 }, status: 'bravo' }, oldValues: { nested: { value: 1 }, status: 'alpha' } },
      { changedKeys: ['added', 'nested', 'status'], newValues: {}, oldValues: { added: ['charlie'], nested: { value: 2 }, status: 'bravo' } }
    ]);
  });
});
