import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Before link open events', () => {
  it('should announce a trusted internal-link click before navigation and a missing target before creation', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { clickElement, waitUntil } }) {
        const source = await app.vault.create('before-link-source.md', '[[before-link-target#Heading]]');
        const target = await app.vault.create('before-link-target.md', '# Heading');
        const leaf = app.workspace.getLeaf(true);
        await leaf.openFile(source, { state: { mode: 'preview' } });
        await app.workspace.revealLeaf(leaf);
        const calls: { current: string | null; exists: boolean; leafMatches: boolean; linktext: string; sourcePath: string }[] = [];
        const ref = app.workspace.on('more-events:before-link-open', (subject, request) => {
          calls.push({ ...request, current: app.workspace.getActiveFile()?.path ?? null, exists: app.vault.getAbstractFileByPath('before-link-missing.md') !== null, leafMatches: subject === leaf });
        });
        try {
          await waitUntil({ message: 'rendered internal link', predicate: () => leaf.view.containerEl.querySelector('a.internal-link') !== null });
          const link = leaf.view.containerEl.querySelector('a.internal-link');
          if (!(link instanceof HTMLElement)) {
            throw new Error('Missing internal link');
          }
          await clickElement({ element: link });
          await waitUntil({ message: 'native link navigation', predicate: () => app.workspace.getActiveFile() === target });
          await leaf.openLinkText('before-link-missing', source.path);
          return { calls, created: app.vault.getAbstractFileByPath('before-link-missing.md') !== null };
        } finally {
          app.workspace.offref(ref);
          leaf.detach();
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result).toEqual({
      calls: [
        { current: 'before-link-source.md', exists: false, leafMatches: true, linktext: 'before-link-target#Heading', sourcePath: 'before-link-source.md' },
        { current: 'before-link-target.md', exists: false, leafMatches: true, linktext: 'before-link-missing', sourcePath: 'before-link-source.md' }
      ],
      created: true
    });
  });
});
