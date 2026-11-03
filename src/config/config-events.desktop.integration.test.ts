import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Configuration events', () => {
  it('should name changed keys after native setters and external app.json reloads', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { waitUntil } }) {
        const previous = app.vault.getConfig('readableLineLength') ?? true;
        const calls: { key: string; value: boolean }[] = [];
        const ref = app.workspace.on('more-events:config-changed', (key) => {
          if (key === 'readableLineLength') {
            calls.push({ key, value: app.vault.getConfig('readableLineLength') ?? true });
          }
        });
        try {
          app.vault.setConfig('readableLineLength', !previous);
          app.vault.setConfig('readableLineLength', !previous);
          const synchronous = calls.slice();
          app.vault.requestSaveConfig.cancel();
          await app.vault.adapter.write(`${app.vault.configDir}/app.json`, JSON.stringify({ ...app.vault.config, readableLineLength: previous }));
          await waitUntil({ message: 'external configuration key announcement', predicate: () => calls.length === 2 });
          return { calls, previous, synchronous };
        } finally {
          app.workspace.offref(ref);
          app.vault.setConfig('readableLineLength', previous);
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result.synchronous).toEqual([{ key: 'readableLineLength', value: !result.previous }]);
    expect(result.calls).toEqual([
      { key: 'readableLineLength', value: !result.previous },
      { key: 'readableLineLength', value: result.previous }
    ]);
  });
});
