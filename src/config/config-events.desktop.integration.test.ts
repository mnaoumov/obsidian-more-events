import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

interface ConfigChangeObservation {
  readonly key: string;
  readonly value: boolean;
}

describe('Configuration events', () => {
  it('should name changed keys after native setters and external app.json reloads', async () => {
    const result = await evalInObsidian({
      async callback({ app, lib: { waitUntil } }) {
        const isPrevious = app.vault.getConfig('readableLineLength') ?? true;
        const calls: ConfigChangeObservation[] = [];
        const ref = app.workspace.on('more-events:config-changed', (key) => {
          if (key === 'readableLineLength') {
            calls.push({ key, value: app.vault.getConfig('readableLineLength') ?? true });
          }
        });
        try {
          app.vault.setConfig('readableLineLength', !isPrevious);
          app.vault.setConfig('readableLineLength', !isPrevious);
          const synchronous = [...calls];
          app.vault.requestSaveConfig.cancel();
          await app.vault.adapter.write(`${app.vault.configDir}/app.json`, JSON.stringify({ ...app.vault.config, readableLineLength: isPrevious }));
          await waitUntil({ message: 'external configuration key announcement', predicate: () => calls.length === 2 });
          return { calls, previous: isPrevious, synchronous };
        } finally {
          app.workspace.offref(ref);
          app.vault.setConfig('readableLineLength', isPrevious);
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
