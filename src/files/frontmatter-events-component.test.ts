import type {
  App,
  CachedMetadata,
  TFile
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Events } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { FrontmatterEventsComponent } from './frontmatter-events-component.ts';

interface MutableChange {
  readonly newValues: NestedValues;
}
interface NestedValue {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Tests mutate the copied payload.
  value: string;
}
interface NestedValues {
  readonly nested: NestedValue;
}

describe('FrontmatterEventsComponent', () => {
  it('should diff properties, ignore body edits, preserve snapshots across rename and detach on unload', () => {
    const file = castTo<TFile>({ path: 'alpha.md' });
    const pendingFile = castTo<TFile>({ path: 'bravo.md' });
    const cache: CachedMetadata = { frontmatter: { nested: { value: 1 }, position: {}, status: 'alpha' } };
    const metadataCache = Object.assign(new Events(), { getFileCache: (candidate: TFile) => candidate === file ? cache : null });
    const vault = Object.assign(new Events(), { getMarkdownFiles: () => [file, pendingFile] });
    const trigger = vi.fn();
    const component = new FrontmatterEventsComponent({ app: castTo<App>({ metadataCache, vault, workspace: { trigger } }) });
    component.load();
    try {
      changed(file, { frontmatter: { nested: { value: 1 }, position: { start: 9 }, status: 'alpha' } });
      expect(trigger).not.toHaveBeenCalled();
      changed(pendingFile, {});
      expect(trigger).not.toHaveBeenCalled();
      changed(pendingFile, { frontmatter: { added: null } });
      expect(trigger.mock.calls[0]).toEqual(['more-events:frontmatter-changed', pendingFile, { changedKeys: ['added'], newValues: { added: null }, oldValues: {} }]);
      file.path = 'renamed.md';
      changed(file, { frontmatter: { added: ['bravo'], nested: { value: 2 } } });
      expect(trigger.mock.calls[1]).toEqual(['more-events:frontmatter-changed', file, {
        changedKeys: ['added', 'nested', 'status'],
        newValues: { added: ['bravo'], nested: { value: 2 } },
        oldValues: { nested: { value: 1 }, status: 'alpha' }
      }]);
      changed(file, {});
      expect(trigger.mock.calls[2]?.[2]).toEqual({ changedKeys: ['added', 'nested'], newValues: {}, oldValues: { added: ['bravo'], nested: { value: 2 } } });
      vault.trigger('delete', file);
      changed(file, { frontmatter: { recreated: true } });
      expect(trigger).toHaveBeenCalledTimes(3);
    } finally {
      component.unload();
    }
    changed(file, {});
    expect(trigger).toHaveBeenCalledTimes(3);

    function changed(candidate: TFile, next: CachedMetadata): void {
      metadataCache.trigger('changed', candidate, '', next);
    }
  });

  it('should keep cache mutation and listener mutation out of future old values', () => {
    const file = castTo<TFile>({});
    const nested = { value: 'alpha' };
    const metadataCache = Object.assign(new Events(), { getFileCache: () => ({ frontmatter: { nested } }) });
    const vault = Object.assign(new Events(), { getMarkdownFiles: () => [file] });
    const trigger = vi.fn();
    const component = new FrontmatterEventsComponent({ app: castTo<App>({ metadataCache, vault, workspace: { trigger } }) });
    component.load();
    try {
      nested.value = 'bravo';
      metadataCache.trigger('changed', file, '', { frontmatter: { nested } });
      expect(trigger.mock.calls[0]?.[2]).toEqual({ changedKeys: ['nested'], newValues: { nested: { value: 'bravo' } }, oldValues: { nested: { value: 'alpha' } } });
      const change = castTo<MutableChange>(trigger.mock.calls[0]?.[2]);
      change.newValues.nested.value = 'listener mutation';
      metadataCache.trigger('changed', file, '', {});
      expect(trigger.mock.calls[1]?.[2]).toEqual({ changedKeys: ['nested'], newValues: {}, oldValues: { nested: { value: 'bravo' } } });
    } finally {
      component.unload();
    }
  });
});
