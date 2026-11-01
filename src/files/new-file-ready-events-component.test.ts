import type {
  App as AppOriginal,
  ObsidianProtocolData,
  ObsidianProtocolHandler,
  TFile
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { NEW_FILE_READY_EVENT_NAME } from '../api/more-events-api.ts';
import { NewFileReadyEventsComponent } from './new-file-ready-events-component.ts';

interface DeferredAction {
  readonly finish: () => void;
  readonly started: Promise<TFile>;
}

interface ProtocolHandlerLike {
  readonly handlers: Map<string, ObsidianProtocolHandler>;
  readonly register: (action: string, handler: ObsidianProtocolHandler) => void;
  readonly unregister: (action: string, handler?: ObsidianProtocolHandler) => void;
}

interface WorkspaceWithProtocolHandler {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- The test installs its own protocol handler on the mock workspace.
  protocolHandler: ProtocolHandlerLike;
}

describe('NewFileReadyEventsComponent', () => {
  let app: AppOriginal;
  let component: NewFileReadyEventsComponent;
  let protocolHandler: ProtocolHandlerLike;
  let readyFiles: TFile[];

  beforeEach(() => {
    const mockApp = App.createConfigured__();
    mockApp.workspace.setLayoutReady__();
    setUp(mockApp);
  });

  afterEach(() => {
    component.unload();
  });

  it('should announce a file created with no URI action running at once', async () => {
    component.load();

    const file = await app.vault.create('note.md', 'content');

    expect(readyFiles).toEqual([file]);
  });

  it('should not announce a folder', async () => {
    component.load();

    await app.vault.createFolder('folder');

    expect(readyFiles).toEqual([]);
  });

  it('should not announce anything created before the layout is ready', async () => {
    const mockApp = App.createConfigured__();
    setUp(mockApp);
    component.load();

    await app.vault.create('early.md', '');
    mockApp.workspace.setLayoutReady__();
    const file = await app.vault.create('late.md', '');

    expect(readyFiles).toEqual([file]);
  });

  it('should hold a file an already registered URI action creates until the action settles', async () => {
    const { finish, started } = registerDeferredAction('new');
    component.load();

    const resultPromise = dispatch('new');
    const file = await started;
    expect(readyFiles).toEqual([]);

    await app.vault.modify(file, 'content');
    finish();
    await resultPromise;

    expect(readyFiles).toEqual([file]);
  });

  it('should hold a file a URI action registered after load creates', async () => {
    component.load();
    const { finish, started } = registerDeferredAction('unique');

    const resultPromise = dispatch('unique');
    const file = await started;
    expect(readyFiles).toEqual([]);

    finish();
    await resultPromise;

    expect(readyFiles).toEqual([file]);
  });

  it('should announce once a rejecting URI action ends, and pass the rejection on', async () => {
    const error = new Error('failed');
    async function createAndReject(): Promise<void> {
      await app.vault.create('rejected.md', '');
      throw error;
    }
    protocolHandler.register('new', () => createAndReject());
    component.load();

    await expect(dispatch('new')).rejects.toBe(error);

    expect(readyFiles.map((file) => file.path)).toEqual(['rejected.md']);
  });

  it('should announce a file a synchronous URI action creates once it returns', async () => {
    const file = await app.vault.create('sync.md', '');
    let readyFilesDuringAction: TFile[] = [];
    protocolHandler.register('sync', () => {
      app.vault.trigger('create', file);
      readyFilesDuringAction = [...readyFiles];
      return 'result';
    });
    component.load();

    expect(dispatch('sync')).toBe('result');

    expect(readyFilesDuringAction).toEqual([]);
    expect(readyFiles).toEqual([file]);
  });

  it('should announce files held by a throwing URI action and rethrow', async () => {
    const error = new Error('thrown');
    const file = await app.vault.create('thrown.md', '');
    protocolHandler.register('throw', () => {
      app.vault.trigger('create', file);
      throw error;
    });
    component.load();

    expect(() => dispatch('throw')).toThrow(error);

    expect(readyFiles).toEqual([file]);
  });

  it('should not announce a file deleted before its URI action ends', async () => {
    const { finish, started } = registerDeferredAction('new');
    component.load();

    const resultPromise = dispatch('new');
    const file = await started;
    await app.fileManager.trashFile(file);
    finish();
    await resultPromise;

    expect(readyFiles).toEqual([]);
  });

  it('should hold a file created during two overlapping URI actions until both end', async () => {
    const first = registerDeferredAction('first');
    const second = registerDeferredAction('second', 'second.md');
    component.load();

    const firstResult = dispatch('first');
    const firstFile = await first.started;
    const secondResult = dispatch('second');
    const secondFile = await second.started;

    // The first file was created while only the first action ran; the second while both did.
    first.finish();
    await firstResult;
    expect(readyFiles).toEqual([firstFile]);

    second.finish();
    await secondResult;
    expect(readyFiles).toEqual([firstFile, secondFile]);
  });

  it('should keep the this Obsidian calls a handler with', () => {
    const handler = vi.fn();
    protocolHandler.register('this', handler);
    component.load();

    const wrappedHandler = protocolHandler.handlers.get('this');
    wrappedHandler?.call(protocolHandler, castTo<ObsidianProtocolData>({ action: 'this' }));

    expect(handler.mock.contexts).toEqual([protocolHandler]);
  });

  it('should let the owner of a handler registered after load unregister it with its own function', () => {
    component.load();
    const handler = vi.fn();
    protocolHandler.register('later', handler);
    expect(protocolHandler.handlers.get('later')).not.toBe(handler);

    protocolHandler.unregister('later', handler);

    expect(protocolHandler.handlers.has('later')).toBe(false);
  });

  it('should leave unregister alone for a handler it does not know or one already replaced', () => {
    const handler = vi.fn();
    const otherHandler = vi.fn();
    component.load();
    protocolHandler.register('known', handler);
    protocolHandler.register('other', otherHandler);
    // Replaced behind the patch, so the wrapper is no longer the registered handler.
    protocolHandler.handlers.set('known', otherHandler);

    protocolHandler.unregister('known', handler);
    protocolHandler.unregister('other', vi.fn());
    protocolHandler.unregister('missing');

    expect(protocolHandler.handlers.get('known')).toBe(otherHandler);
    expect(protocolHandler.handlers.has('other')).toBe(true);
  });

  it('should wrap a handler once even when registered again', () => {
    const handler = vi.fn();
    component.load();
    protocolHandler.register('once', handler);
    const wrappedHandler = protocolHandler.handlers.get('once');
    protocolHandler.handlers.delete('once');

    protocolHandler.register('once', handler);
    protocolHandler.handlers.delete('once');
    protocolHandler.register('once', castTo<ObsidianProtocolHandler>(wrappedHandler));

    expect(protocolHandler.handlers.get('once')).toBe(wrappedHandler);
  });

  it('should restore the original handlers once unloaded', () => {
    const handler = vi.fn();
    protocolHandler.register('restore', handler);
    component.load();
    const laterHandler = vi.fn();
    protocolHandler.register('later', laterHandler);
    protocolHandler.handlers.set('foreign', vi.fn());

    component.unload();

    expect(protocolHandler.handlers.get('restore')).toBe(handler);
    expect(protocolHandler.handlers.get('later')).toBe(laterHandler);
  });

  it('should pass straight through a wrapper still held after unload', async () => {
    const { finish, started } = registerDeferredAction('held');
    component.load();
    const wrappedHandler = castTo<ObsidianProtocolHandler>(protocolHandler.handlers.get('held'));
    component.unload();

    const result: unknown = wrappedHandler(castTo<ObsidianProtocolData>({ action: 'held' }));
    await started;
    finish();

    await expect(result).resolves.toBeUndefined();
    expect(readyFiles).toEqual([]);
  });

  it('should announce nothing for a URI action still running when it was unloaded', async () => {
    const { finish, started } = registerDeferredAction('new');
    component.load();

    const result = dispatch('new');
    await started;
    component.unload();
    finish();
    await result;

    expect(readyFiles).toEqual([]);
  });

  function setUp(mockApp: App): void {
    app = mockApp.asOriginalType__();
    protocolHandler = createProtocolHandler();
    castTo<WorkspaceWithProtocolHandler>(app.workspace).protocolHandler = protocolHandler;
    readyFiles = [];
    app.workspace.on(NEW_FILE_READY_EVENT_NAME, (file: TFile) => {
      readyFiles.push(file);
    });
    component = new NewFileReadyEventsComponent({ app });
  }

  function dispatch(action: string): unknown {
    const handler = castTo<ObsidianProtocolHandler>(protocolHandler.handlers.get(action));
    return handler(castTo<ObsidianProtocolData>({ action }));
  }

  function registerDeferredAction(action: string, path = 'new.md'): DeferredAction {
    let finish!: () => void;
    let resolveStarted!: (file: TFile) => void;
    const started = new Promise<TFile>((resolve) => {
      resolveStarted = resolve;
    });
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    async function run(): Promise<void> {
      const file = await app.vault.create(path, '');
      resolveStarted(file);
      await finished;
    }
    protocolHandler.register(action, () => run());
    return { finish, started };
  }
});

function createProtocolHandler(): ProtocolHandlerLike {
  const handlers = new Map<string, ObsidianProtocolHandler>();
  return {
    handlers,
    register(action: string, handler: ObsidianProtocolHandler): void {
      if (handlers.has(action)) {
        throw new Error(`Action "${action}" is already registered as a handler.`);
      }
      handlers.set(action, handler);
    },
    unregister(action: string, handler?: ObsidianProtocolHandler): void {
      if (!handler || handlers.get(action) === handler) {
        handlers.delete(action);
      }
    }
  };
}
