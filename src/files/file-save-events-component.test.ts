import type {
  App,
  DataWriteOptions,
  TFile
} from 'obsidian';

import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { FileSaveEventsComponent } from './file-save-events-component.ts';

describe('FileSaveEventsComponent', () => {
  it('should bracket a write and preserve its promise, receiver, arguments and cleanup', async () => {
    const modify = vi.fn((_file: TFile, _content: string, _options?: DataWriteOptions) => noopAsync());
    const trigger = vi.fn();
    const vault = { modify };
    const component = new FileSaveEventsComponent({ app: castTo<App>({ vault, workspace: { trigger } }) });
    component.load();
    try {
      const file = castTo<TFile>({ path: 'alpha.md' });
      const options: DataWriteOptions = { mtime: 123 };
      const promise = vault.modify(file, 'bravo', options);
      expect(promise).toBe(modify.mock.results[0]?.value);
      expect(modify.mock.contexts[0]).toBe(vault);
      expect(modify).toHaveBeenCalledExactlyOnceWith(file, 'bravo', options);
      expect(trigger.mock.calls).toEqual([['more-events:before-save', file, { content: 'bravo' }]]);
      await promise;
      expect(trigger.mock.calls[1]).toEqual(['more-events:after-save', file, { content: 'bravo' }]);
    } finally {
      component.unload();
    }
    expect(vault.modify).toBe(modify);
  });

  it.each(['failure', 'unload'])('should suppress the after event on %s', async (mode) => {
    const trigger = vi.fn();
    const error = new Error('write failed');
    const modify = vi.fn((_file: TFile, _content: string) => mode === 'failure' ? Promise.reject(error) : noopAsync());
    const vault = { modify };
    const component = new FileSaveEventsComponent({ app: castTo<App>({ vault, workspace: { trigger } }) });
    component.load();
    try {
      const promise = vault.modify(castTo<TFile>({}), 'bravo');
      if (mode === 'failure') {
        await expect(promise).rejects.toBe(error);
      } else {
        component.unload();
        await promise;
      }
      expect(trigger).toHaveBeenCalledTimes(1);
    } finally {
      component.unload();
    }
  });
});
