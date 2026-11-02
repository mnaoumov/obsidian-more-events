import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Index ready event', () => {
  it('should announce readiness once per plugin load after pending metadata is indexed', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { waitUntil } }) {
        await app.plugins.disablePlugin('more-events');
        const file = await app.vault.create('index-ready-events.md', '---\nready: indexed\n---\n[[index-ready-events]]');
        const calls: string[] = [];
        const ref = app.workspace.on('more-events:index-ready', () => {
          calls.push(String(app.metadataCache.getFileCache(file)?.frontmatter?.['ready']));
        });
        try {
          if (!await app.plugins.enablePlugin('more-events')) {
            throw new Error('Could not enable More Events');
          }
          await waitUntil({ message: 'index ready announcement', predicate: () => calls.length > 0 });
          await app.vault.modify(file, '---\nready: changed\n---');
          await waitUntil({ message: 'subsequent indexing', predicate: () => app.metadataCache.getFileCache(file)?.frontmatter?.['ready'] === 'changed' });
          await new Promise<void>((resolve) => {
            app.metadataCache.onCleanCache(resolve);
          });
          return calls;
        } finally {
          app.workspace.offref(ref);
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result).toEqual(['indexed']);
  });
});
