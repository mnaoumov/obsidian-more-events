import type {
  App,
  PluginManifest
} from 'obsidian';

import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Events } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { CommunityPluginUninstalledEventsComponent } from './community-plugin-uninstalled-events-component.ts';

describe('CommunityPluginUninstalledEventsComponent', () => {
  it.each(['unload', 'restored', 'replaced'])('should suppress a removal invalidated by %s while checking its folder', async (mode) => {
    const manifest = createManifest('Alpha');
    const manifests: App['plugins']['manifests'] = { alpha: manifest, unknown: castTo<PluginManifest>({ name: 'No installed folder' }) };
    const plugins = Object.assign(new Events(), { manifests });
    let finish: ((hasDirectory: boolean) => void) | undefined;
    const pending = new Promise<boolean>((resolve) => {
      finish = resolve;
    });
    const doesExistMock = vi.fn(() => pending);
    const trigger = vi.fn();
    const component = new CommunityPluginUninstalledEventsComponent({ app: castTo<App>({ plugins, vault: { adapter: { exists: doesExistMock } }, workspace: { trigger } }) });
    component.load();
    delete manifests['alpha'];
    delete manifests['unknown'];
    plugins.trigger('changed');
    expect(doesExistMock).toHaveBeenCalledExactlyOnceWith('plugins/alpha');
    if (mode === 'unload') {
      component.unload();
    } else {
      manifests['alpha'] = manifest;
      if (mode === 'replaced') {
        plugins.trigger('changed');
      }
    }
    finish?.(false);
    await pending;
    await noopAsync();
    expect(trigger).not.toHaveBeenCalled();
    component.unload();
  });

  it('should retain installed plugins while a manifest refresh temporarily clears its map', async () => {
    const manifest = createManifest('Alpha');
    const manifests: App['plugins']['manifests'] = { alpha: manifest };
    const plugins = Object.assign(new Events(), { manifests });
    let hasDirectory = true;
    const doesExistMock = vi.fn(() => Promise.resolve(hasDirectory));
    const trigger = vi.fn();
    const component = new CommunityPluginUninstalledEventsComponent({ app: castTo<App>({ plugins, vault: { adapter: { exists: doesExistMock } }, workspace: { trigger } }) });
    component.load();
    try {
      delete manifests['alpha'];
      plugins.trigger('changed');
      await noopAsync();
      expect(trigger).not.toHaveBeenCalled();
      manifests['alpha'] = manifest;
      plugins.trigger('changed');
      await noopAsync();
      expect(trigger).not.toHaveBeenCalled();
      delete manifests['alpha'];
      hasDirectory = false;
      plugins.trigger('changed');
      plugins.trigger('changed');
      await vi.waitFor(() => {
        expect(trigger).toHaveBeenCalledTimes(1);
      });
      expect(trigger).toHaveBeenCalledWith('more-events:community-plugin-uninstalled', { communityPluginId: 'alpha', communityPluginName: 'Alpha' });
    } finally {
      component.unload();
    }
  });

  it('should observe installed removal, retain the old name and ignore disable, update and unload', async () => {
    const manifests: App['plugins']['manifests'] = { alpha: createManifest('Alpha') };
    const plugins = Object.assign(new Events(), { manifests });
    const trigger = vi.fn();
    const component = new CommunityPluginUninstalledEventsComponent({ app: castTo<App>({ plugins, vault: { adapter: { exists: () => Promise.resolve(false) } }, workspace: { trigger } }) });
    component.load();
    plugins.trigger('changed');
    expect(trigger).not.toHaveBeenCalled();
    manifests['alpha'] = createManifest('Updated Alpha');
    plugins.trigger('changed');
    expect(trigger).not.toHaveBeenCalled();
    delete manifests['alpha'];
    plugins.trigger('changed');
    await vi.waitFor(() => {
      expect(trigger).toHaveBeenCalledTimes(1);
    });
    expect(trigger).toHaveBeenCalledExactlyOnceWith('more-events:community-plugin-uninstalled', { communityPluginId: 'alpha', communityPluginName: 'Updated Alpha' });
    plugins.trigger('changed');
    component.unload();
    manifests['bravo'] = castTo<PluginManifest>({ name: 'Bravo' });
    plugins.trigger('changed');
    delete manifests['bravo'];
    plugins.trigger('changed');
    expect(trigger).toHaveBeenCalledTimes(1);
  });
});

function createManifest(name: string): PluginManifest {
  return {
    author: 'Test',
    description: 'Installed test plugin',
    // eslint-disable-next-line unicorn/name-replacements -- Obsidian's manifest format names this directory member `dir`.
    dir: 'plugins/alpha',
    id: 'alpha',
    minAppVersion: '1.0.0',
    name,
    version: '1.0.0'
  };
}
