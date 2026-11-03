import { App } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { ConfigEventsComponent } from './config-events-component.ts';

describe('ConfigEventsComponent', () => {
  it('should relay each native key synchronously and stop on unload', () => {
    const app = App.createConfigured__().asOriginalType__();
    const component = new ConfigEventsComponent({ app });
    const handler = vi.fn();
    app.workspace.on('more-events:config-changed', handler);
    component.load();
    app.vault.trigger('config-changed', 'readableLineLength');
    app.vault.trigger('config-changed', 'custom-key');
    expect(handler.mock.calls).toEqual([['readableLineLength'], ['custom-key']]);
    component.unload();
    app.vault.trigger('config-changed', 'after-unload');
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
