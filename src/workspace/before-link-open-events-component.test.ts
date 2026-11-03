import type { App } from 'obsidian';

import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { WorkspaceLeaf } from 'obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { BeforeLinkOpenEventsComponent } from './before-link-open-events-component.ts';

describe('BeforeLinkOpenEventsComponent', () => {
  it('should announce before navigation, preserve arguments and promise, exclude foreign leaves and restore on unload', async () => {
    const order: string[] = [];
    const result = noopAsync();
    const original = WorkspaceLeaf.prototype.openLinkText;
    const fallback = vi.fn(() => {
      order.push('open');
      return result;
    });
    WorkspaceLeaf.prototype.openLinkText = fallback;
    const leaf = castTo<WorkspaceLeaf>(Object.create(WorkspaceLeaf.prototype));
    const foreignLeaf = castTo<WorkspaceLeaf>(Object.create(WorkspaceLeaf.prototype));
    const trigger = vi.fn(() => {
      order.push('event');
    });
    const component = new BeforeLinkOpenEventsComponent({
      app: castTo<App>({
        workspace: {
          iterateAllLeaves: (callback: (value: WorkspaceLeaf) => void) => {
            callback(leaf);
          },
          trigger
        }
      })
    });
    try {
      component.load();
      const options = { active: false };
      expect(leaf.openLinkText('Target#Heading', 'Source.md', options)).toBe(result);
      expect(order).toEqual(['event', 'open']);
      expect(trigger).toHaveBeenCalledExactlyOnceWith('more-events:before-link-open', leaf, { linktext: 'Target#Heading', sourcePath: 'Source.md' });
      expect(fallback).toHaveBeenCalledExactlyOnceWith('Target#Heading', 'Source.md', options);
      await foreignLeaf.openLinkText('Other', '');
      expect(trigger).toHaveBeenCalledTimes(1);
      component.unload();
      expect(WorkspaceLeaf.prototype.openLinkText).toBe(fallback);
      await leaf.openLinkText('After', '');
      expect(trigger).toHaveBeenCalledTimes(1);
    } finally {
      component.unload();
      WorkspaceLeaf.prototype.openLinkText = original;
    }
  });
});
