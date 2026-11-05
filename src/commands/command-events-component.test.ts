import type {
  App,
  Command
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { CommandEventsComponent } from './command-events-component.ts';

describe('CommandEventsComponent', () => {
  it('should leave Obsidian alone if a future command manager has no dispatcher', () => {
    const component = new CommandEventsComponent({ app: castTo<App>({ commands: { executeCommand: null } }) });
    component.load();
    component.unload();
  });
  it.each([true, false])('should preserve dispatch and announce only a successful return (%s)', (success) => {
    const command: Command = { id: 'alpha:bravo', name: 'Bravo' };
    const didExecuteCommandMock = vi.fn((_command: Command) => success);
    const trigger = vi.fn();
    const commands = { executeCommand: didExecuteCommandMock };
    const component = new CommandEventsComponent({ app: castTo<App>({ commands, workspace: { trigger } }) });
    component.load();
    try {
      expect(commands.executeCommand(command)).toBe(success);
      expect(didExecuteCommandMock).toHaveBeenCalledExactlyOnceWith(command);
      expect(didExecuteCommandMock.mock.contexts[0]).toBe(commands);
      expect(trigger.mock.calls).toEqual(success ? [['more-events:command-executed', { id: 'alpha:bravo', name: 'Bravo' }]] : []);
    } finally {
      component.unload();
    }
    expect(commands.executeCommand).toBe(didExecuteCommandMock);
  });
});
