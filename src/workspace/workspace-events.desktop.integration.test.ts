import type { MarkdownPostProcessorContext } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Workspace events', () => {
  it('should announce a closed leaf with the file captured before it lost its view', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { clickElement, waitUntil } }) {
        const file = await app.vault.create('leaf-close-events.md', 'Leaf close');
        const leaf = app.workspace.getLeaf(true);
        await leaf.openFile(file);
        await app.workspace.revealLeaf(leaf);
        const calls: string[] = [];
        const ref = app.workspace.on('more-events:leaf-closed', (closed, closedFile) => {
          if (closed === leaf) {
            calls.push(closedFile?.path ?? 'no file');
          }
        });
        try {
          if (!leaf.tabHeaderCloseEl) {
            throw new Error('Missing tab close button');
          }
          await clickElement({ element: leaf.tabHeaderCloseEl });
          await waitUntil({ message: 'closed leaf announcement', predicate: () => calls.length > 0 });
          return calls;
        } finally {
          app.workspace.offref(ref);
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result).toEqual(['leaf-close-events.md']);
  });

  it('should announce a leaf becoming visible again without treating focus as visibility', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { clickElement, waitUntil } }) {
        const first = app.workspace.getLeaf(true);
        await first.openFile(await app.vault.create('visible-events-first.md', 'First'));
        await app.workspace.revealLeaf(first);
        const calls: string[] = [];
        const ref = app.workspace.on('more-events:leaf-visibility-changed', (leaf, isVisible) => {
          if (leaf === first) {
            calls.push(String(isVisible));
          }
        });
        const second = app.workspace.getLeaf(true);
        try {
          await second.openFile(await app.vault.create('visible-events-second.md', 'Second'));
          await app.workspace.revealLeaf(second);
          await waitUntil({ message: 'first leaf observed hidden', predicate: () => calls.includes('false') });
          calls.length = 0;
          await clickElement({ element: first.tabHeaderEl });
          await waitUntil({ message: 'visible leaf announcement', predicate: () => calls.includes('true') });
          await clickElement({ element: first.tabHeaderEl });
          await clickElement({ element: second.tabHeaderEl });
          await waitUntil({ message: 'hidden leaf announcement', predicate: () => calls.includes('false') });
          return calls;
        } finally {
          app.workspace.offref(ref);
          first.detach();
          second.detach();
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result).toEqual(['true', 'false']);
  });

  it('should announce Reading mode after it changes and a completed preview containing the note', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { waitUntil }, obsidianModule }) {
        const file = await app.vault.create('mode-render-events.md', '# Completed preview\n\n**Visible content**');
        const leaf = app.workspace.getLeaf(true);
        await leaf.openFile(file, { state: { mode: 'source' } });
        await app.workspace.revealLeaf(leaf);
        const view = leaf.view;
        if (!(view instanceof obsidianModule.MarkdownView)) {
          throw new TypeError('Expected Markdown view');
        }
        const modes: string[] = [];
        const previews: string[] = [];
        let finishPostProcessing: (() => void) | undefined;
        let hasPostProcessingStarted = false;
        const pendingPostProcessing = new Promise<void>((resolve) => {
          finishPostProcessing = resolve;
        });
        async function processor(element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
          if (!(context.sourcePath === file.path && element.querySelector('strong'))) {
            return;
          }

          hasPostProcessingStarted = true;
          await pendingPostProcessing;
        }
        obsidianModule.MarkdownPreviewRenderer.registerPostProcessor(processor);
        const modeRef = app.workspace.on('more-events:markdown-mode-changed', (changedLeaf, mode) => {
          if (changedLeaf === leaf) {
            modes.push(`${mode}:${view.getMode()}`);
          }
        });
        const previewRef = app.workspace.on('more-events:markdown-preview-rendered', (renderedLeaf, renderedFile) => {
          if (renderedLeaf === leaf && view.previewMode.containerEl.querySelector('strong')?.textContent === 'Visible content') {
            previews.push(renderedFile.path);
          }
        });
        try {
          app.commands.executeCommandById('markdown:toggle-preview');
          await waitUntil({ message: 'pending preview postprocessor and completed mode switch', predicate: () => hasPostProcessingStarted && modes.length > 0 });
          const beforePostProcessingFinished = previews.length;
          finishPostProcessing?.();
          await waitUntil({ message: 'mode and preview announcements', predicate: () => modes.length > 0 && previews.length > 0 });
          return { beforePostProcessingFinished, modes, previews };
        } finally {
          finishPostProcessing?.();
          obsidianModule.MarkdownPreviewRenderer.unregisterPostProcessor(processor);
          app.workspace.offref(modeRef);
          app.workspace.offref(previewRef);
          leaf.detach();
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result.beforePostProcessingFinished).toBe(0);
    expect(result.modes).toEqual(['preview:preview']);
    expect(result.previews).toContain('mode-render-events.md');
  });
});
