import type { App } from 'obsidian';

import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { IndexReadyEventsComponent } from './index-ready-events-component.ts';

describe('IndexReadyEventsComponent', () => {
  it('should announce an already-clean index asynchronously once', async () => {
    const trigger = vi.fn();
    const component = new IndexReadyEventsComponent({
      app: castTo<App>({
        metadataCache: {
          onCleanCache: (callback: () => void) => {
            callback();
          }
        },
        workspace: { trigger }
      })
    });
    component.load();
    expect(trigger).not.toHaveBeenCalled();
    await noopAsync();
    expect(trigger).toHaveBeenCalledExactlyOnceWith('more-events:index-ready');
    component.unload();
  });

  it('should ignore a pending index that finishes after the installation unloaded', async () => {
    const callbacks: (() => void)[] = [];
    const trigger = vi.fn();
    const component = new IndexReadyEventsComponent({
      app: castTo<App>({
        metadataCache: {
          onCleanCache: (callback: () => void): void => {
            callbacks.push(callback);
          }
        },
        workspace: { trigger }
      })
    });
    component.load();
    component.unload();
    for (const callback of callbacks) {
      callback();
    }
    await noopAsync();
    expect(trigger).not.toHaveBeenCalled();
  });
});
