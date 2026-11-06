import { Events } from 'obsidian';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { SyncStatus } from '../api/more-events-api.ts';

import { SyncStatusEventsComponent } from './sync-status-events-component.ts';

interface Fixture {
  readonly app: App;
  readonly handler: ReturnType<typeof vi.fn>;
  readonly instance: FakeSyncInstance;
  readonly internalPlugins: Events;
  readonly wrapper: FakeSyncWrapper;
}

class FakeSyncInstance extends Events {
  public status: SyncStatus = 'synced';

  public getStatus(): SyncStatus {
    return this.status;
  }

  public setStatus(status: SyncStatus): void {
    this.status = status;
    this.trigger('status-change');
  }
}

class FakeSyncWrapper {
  public enabled = true;

  public constructor(public readonly instance: FakeSyncInstance) {}
}

function createFixture(hasSync = true): Fixture {
  const app = App.createConfigured__();
  const instance = new FakeSyncInstance();
  const wrapper = new FakeSyncWrapper(instance);
  const internalPlugins = Object.assign(new Events(), {
    getPluginById: (id: string): FakeSyncWrapper | null => hasSync && id === 'sync' ? wrapper : null
  });
  Object.assign(app, { internalPlugins });
  const handler = vi.fn();
  app.asOriginalType__().workspace.on('more-events:sync-status-changed', handler);
  return { app, handler, instance, internalPlugins, wrapper };
}

describe('SyncStatusEventsComponent', () => {
  it('should announce each change of state and skip the progress lines in between', () => {
    const { app, handler, instance } = createFixture();
    const component = new SyncStatusEventsComponent({ app: app.asOriginalType__() });
    component.load();

    instance.setStatus('syncing');
    instance.setStatus('syncing');
    instance.trigger('status-change');
    instance.setStatus('synced');
    instance.setStatus('error');
    instance.setStatus('paused');
    instance.setStatus('disconnected');

    expect(handler.mock.calls).toEqual([
      ['syncing', 'synced'],
      ['synced', 'syncing'],
      ['error', 'synced'],
      ['paused', 'error'],
      ['disconnected', 'paused']
    ]);
  });

  it('should stay silent while the plugin is disabled and take a fresh baseline when it is enabled again', () => {
    const { app, handler, instance, internalPlugins, wrapper } = createFixture();
    const component = new SyncStatusEventsComponent({ app: app.asOriginalType__() });
    component.load();

    wrapper.enabled = false;
    internalPlugins.trigger('change', wrapper);
    // The sync loop's final notification can land after the disable.
    instance.setStatus('syncing');
    instance.setStatus('synced');
    expect(handler).not.toHaveBeenCalled();

    instance.status = 'paused';
    wrapper.enabled = true;
    internalPlugins.trigger('change', wrapper);
    instance.setStatus('paused');
    instance.setStatus('synced');
    expect(handler.mock.calls).toEqual([['synced', 'paused']]);
  });

  it('should ignore another core plugin changing', () => {
    const { app, handler, instance, internalPlugins } = createFixture();
    const component = new SyncStatusEventsComponent({ app: app.asOriginalType__() });
    component.load();

    instance.status = 'syncing';
    internalPlugins.trigger('change', { id: 'canvas' });
    instance.setStatus('syncing');
    expect(handler.mock.calls).toEqual([['syncing', 'synced']]);
  });

  it('should announce nothing after an enable that fires its notification before the manager does', () => {
    const { app, handler, instance, internalPlugins, wrapper } = createFixture();
    wrapper.enabled = false;
    const component = new SyncStatusEventsComponent({ app: app.asOriginalType__() });
    component.load();

    wrapper.enabled = true;
    instance.setStatus('syncing');
    internalPlugins.trigger('change', wrapper);
    instance.setStatus('synced');
    expect(handler.mock.calls).toEqual([['synced', 'syncing']]);
  });

  it('should stop on unload', () => {
    const { app, handler, instance } = createFixture();
    const component = new SyncStatusEventsComponent({ app: app.asOriginalType__() });
    component.load();
    component.unload();

    instance.setStatus('syncing');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should do nothing when there is no Sync core plugin', () => {
    const { app, handler, instance } = createFixture(false);
    const component = new SyncStatusEventsComponent({ app: app.asOriginalType__() });
    component.load();

    instance.setStatus('syncing');
    expect(handler).not.toHaveBeenCalled();
  });
});
