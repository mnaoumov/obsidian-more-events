import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Community plugin uninstall event', () => {
  it('should distinguish uninstalling an installed plugin from disabling it', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { waitUntil } }) {
        const id = 'more-events-uninstall-fixture';
        const directory = `${app.vault.configDir}/plugins/${id}`;
        await app.vault.adapter.mkdir(directory);
        await app.vault.adapter.write(`${directory}/manifest.json`, JSON.stringify({ author: 'Test', description: 'Test plugin', id, isDesktopOnly: false, minAppVersion: '1.0.0', name: 'Uninstall fixture', version: '1.0.0' }));
        await app.vault.adapter.write(`${directory}/main.js`, 'module.exports = class extends require(\'obsidian\').Plugin {};');
        await app.plugins.loadManifests();
        await app.plugins.enablePlugin(id);
        const calls: string[] = [];
        const ref = app.workspace.on('more-events:community-plugin-uninstalled', (plugin) => {
          if (plugin.communityPluginId === id) {
            calls.push(`${plugin.communityPluginName}:${String(app.plugins.manifests[id] === undefined)}`);
          }
        });
        try {
          // Native refresh clears the map before its asynchronous reads. Disabling supplies a concurrent
          // native change signal while the fixture's directory still exists, which must not mean removal.
          const refresh = app.plugins.loadManifests();
          await app.plugins.disablePlugin(id);
          await refresh;
          // The native debounced signal must run while the plugin is still installed.
          await new Promise<void>((resolve) => {
            const changed = app.plugins.on('changed', () => {
              app.plugins.offref(changed);
              resolve();
            });
          });
          const afterDisable = calls.length;
          await app.plugins.uninstallPlugin(id);
          await waitUntil({ message: 'uninstalled plugin announcement', predicate: () => calls.length > 0 });
          return { afterDisable, calls };
        } finally {
          app.workspace.offref(ref);
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result).toEqual({ afterDisable: 0, calls: ['Uninstall fixture:true'] });
  });
});
