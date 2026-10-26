import { registerDemoVaultButtonSuite } from '@mnaoumov/obsidian-dev-toolkit/demo-vault-buttons';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  afterAll,
  beforeAll
} from 'vitest';

// Clicks every `code-button` in `demo-vault/` against a real Obsidian.
// A button's failure happens at click time — a wrong `require('/demoSetup.ts')` path, or an API that
// changed shape under it — so no other gate in this repo can catch it.
// `lint:md` reads the markdown and the coverage suite checks the authoring conventions, and neither
// executes anything.
//
// Isolation: `npx vitest run --project integration-tests:demo-vault`.

const CANVAS_CORE_PLUGIN_ID = 'canvas' as const;

let wasCanvasEnabled = true;

// The toggle button on `01 Core plugin events` turns Canvas off, and a `.canvas` file opened with no canvas
// view goes to `app.openWithDefaultApp`, which on Windows pops the operating system's Open With dialog on
// the desktop of whoever runs the suite. So any external open fails the button that caused it instead.
// These hooks sit at file level, so they run around the suite's own `beforeAll` and every click.
beforeAll(async () => {
  wasCanvasEnabled = await evalInObsidian({
    callback({ app, CANVAS_CORE_PLUGIN_ID: canvasCorePluginId }): boolean {
      if (Object.getOwnPropertyDescriptor(app, 'openWithDefaultApp')) {
        throw new Error('app.openWithDefaultApp is already replaced on the instance.');
      }
      app.openWithDefaultApp = (path: string): void => {
        throw new Error(`A button handed ${path} to the operating system's default app.`);
      };
      return app.internalPlugins.getPluginById(canvasCorePluginId)?.enabled ?? false;
    },
    input: {
      CANVAS_CORE_PLUGIN_ID
    },
    vaultPath: getTemporaryVault().path
  });
});

afterAll(async () => {
  await evalInObsidian({
    async callback({ app, CANVAS_CORE_PLUGIN_ID: canvasCorePluginId, wasCanvasEnabled: shouldCanvasBeEnabled }): Promise<void> {
      // Drops the instance stub, so the prototype's own method shows through again.
      Reflect.deleteProperty(app, 'openWithDefaultApp');
      const canvasCorePlugin = app.internalPlugins.getPluginById(canvasCorePluginId);
      if (!canvasCorePlugin || canvasCorePlugin.enabled === shouldCanvasBeEnabled) {
        return;
      }
      if (shouldCanvasBeEnabled) {
        await canvasCorePlugin.enable(false);
      } else {
        canvasCorePlugin.disable(false);
      }
    },
    input: {
      CANVAS_CORE_PLUGIN_ID,
      wasCanvasEnabled
    },
    vaultPath: getTemporaryVault().path
  });
});

registerDemoVaultButtonSuite();
