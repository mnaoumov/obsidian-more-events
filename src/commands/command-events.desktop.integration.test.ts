import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Command dispatch events', () => {
  it('should announce successful dispatch once, after the callback, and ignore unknown ids', { timeout: 120_000 }, async () => {
    const result = await evalInObsidian({
      callback({ app }) {
        const calls: string[] = [];
        const id = 'more-events-test:alpha';
        app.commands.addCommand({
          callback: () => {
            calls.push('callback');
          },
          id,
          name: 'Alpha'
        });
        const ref = app.workspace.on('more-events:command-executed', (command) => {
          if (command.id === id) {
            calls.push(`${command.id}:${command.name}`);
          }
        });
        try {
          const isUnknown = app.commands.executeCommandById('more-events-test:missing');
          const isSuccess = app.commands.executeCommandById(id);
          return { calls, success: isSuccess, unknown: isUnknown };
        } finally {
          app.workspace.offref(ref);
          app.commands.removeCommand(id);
        }
      },
      vaultPath: getTemporaryVault().path
    });
    expect(result).toEqual({ calls: ['callback', 'more-events-test:alpha:Alpha'], success: true, unknown: false });
  });
});
