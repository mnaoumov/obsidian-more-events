import type {
  App,
  MarkdownSubView,
  TFile
} from 'obsidian';

import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  MarkdownPreviewView,
  MarkdownView,
  WorkspaceLeaf
} from 'obsidian';
import { Events } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { WorkspaceEventsComponent } from './workspace-events-component.ts';

describe('WorkspaceEventsComponent', () => {
  it('should preserve exact patch results, capture the file, filter foreign leaves and restore prototypes', async () => {
    let mode: 'preview' | 'source' = 'source';
    let isVisible = false;
    const result = noopAsync();
    const originalSetMode = vi.fn((_mode: MarkdownSubView) => {
      mode = 'preview';
      return result;
    });
    const originalDetach = vi.fn();
    const originalRender = vi.fn(() => 'render result');
    const restores = [
      replaceMethod(WorkspaceLeaf.prototype, 'detach', originalDetach),
      replaceMethod(MarkdownView.prototype, 'setMode', originalSetMode),
      replaceMethod(MarkdownPreviewView.prototype, 'onRenderComplete', originalRender)
    ];
    const file = castTo<TFile>({ path: 'alpha.md' });
    const renderer = { lastText: 'note', rendered: castTo<(() => void)[] | null>(null), text: 'note' };
    const preview = castTo<MarkdownPreviewView>(Object.assign(Object.create(MarkdownPreviewView.prototype), { renderer }));
    const view = castTo<MarkdownView>(Object.assign(Object.create(MarkdownView.prototype), { file, getMode: () => mode, previewMode: preview }));
    const leaf = castTo<WorkspaceLeaf>(Object.assign(Object.create(WorkspaceLeaf.prototype), { isVisible: () => isVisible, view }));
    view.leaf = leaf;
    const leaves = [leaf];
    const workspace = Object.assign(new Events(), {
      iterateAllLeaves: (callback: (item: WorkspaceLeaf) => void): void => {
        for (const item of leaves) {
          callback(item);
        }
      }
    });
    const trigger = vi.spyOn(workspace, 'trigger');
    const component = new WorkspaceEventsComponent({ app: castTo<App>({ workspace }) });
    component.load();
    try {
      expect(trigger).not.toHaveBeenCalled();
      isVisible = true;
      workspace.trigger('resize');
      workspace.trigger('layout-change');
      isVisible = false;
      workspace.trigger('active-leaf-change');
      expect(trigger.mock.calls.filter(([name]) => name === 'more-events:leaf-visibility-changed')).toEqual([
        ['more-events:leaf-visibility-changed', leaf, true],
        ['more-events:leaf-visibility-changed', leaf, false]
      ]);
      const promise = view.setMode(castTo<MarkdownSubView>({ type: 'preview' }));
      expect(promise).toBe(result);
      await promise;
      expect(trigger).toHaveBeenCalledWith('more-events:markdown-mode-changed', leaf, 'preview');
      await view.setMode(castTo<MarkdownSubView>({ type: 'preview' }));
      expect(trigger.mock.calls.filter(([name]) => name === 'more-events:markdown-mode-changed')).toHaveLength(1);
      expect(preview.onRenderComplete()).toBe('render result');
      expect(trigger).toHaveBeenCalledWith('more-events:markdown-preview-rendered', leaf, file);
      renderer.lastText = 'stale';
      preview.onRenderComplete();
      renderer.lastText = renderer.text;
      renderer.rendered = [];
      preview.onRenderComplete();
      renderer.rendered = null;
      mode = 'source';
      preview.onRenderComplete();
      expect(trigger.mock.calls.filter(([name]) => name === 'more-events:markdown-preview-rendered')).toHaveLength(1);
      const newLeaf = castTo<WorkspaceLeaf>(Object.assign(Object.create(WorkspaceLeaf.prototype), { isVisible: () => false, view: {} }));
      leaves.push(newLeaf);
      workspace.trigger('resize');
      newLeaf.isVisible = (): boolean => true;
      workspace.trigger('resize');
      expect(trigger).toHaveBeenCalledWith('more-events:leaf-visibility-changed', newLeaf, true);
      newLeaf.detach();
      expect(trigger).toHaveBeenCalledWith('more-events:leaf-closed', newLeaf, null);
      leaf.detach();
      expect(trigger).toHaveBeenCalledWith('more-events:leaf-closed', leaf, file);
      workspace.trigger('resize');
      leaves.length = 0;
      workspace.trigger('resize');
      trigger.mockClear();
      leaf.detach();
      mode = 'source';
      await view.setMode(castTo<MarkdownSubView>({ type: 'preview' }));
      preview.onRenderComplete();
      expect(trigger).not.toHaveBeenCalled();
      leaves.push(leaf);
      mode = 'source';
      const pending = view.setMode(castTo<MarkdownSubView>({ type: 'preview' }));
      component.unload();
      await pending;
      expect(trigger).not.toHaveBeenCalled();
    } finally {
      component.unload();
      expect(WorkspaceLeaf.prototype.detach).toBe(originalDetach);
      expect(MarkdownView.prototype.setMode).toBe(originalSetMode);
      for (const restore of restores) {
        restore();
      }
    }
  });
});

function replaceMethod(target: object, key: string, value: unknown): () => void {
  const previous = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, value, writable: true });
  return () => {
    if (previous) {
      Object.defineProperty(target, key, previous);
    } else {
      Reflect.deleteProperty(target, key);
    }
  };
}
