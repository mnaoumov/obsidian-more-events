import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import type { FileExplorerRootMenuSpot } from '../api.d.ts';

interface RootMenuRecord {
  readonly menuCount: number;
  readonly phase: string;
  readonly spot: FileExplorerRootMenuSpot;
  readonly spots: FileExplorerRootMenuSpot[];
  readonly titles: string[];
}
const PARTNER_ID = 'root-folder-context-menu';
const TEST_TIMEOUT_IN_MS = 120_000;

// A separately bundled subscriber proves the cross-copy contract in CI. For the migration handoff, the
// same suite accepts `Root Folder Context Menu`'s prepared main.js and exercises the actual plugin too.
beforeAll(async () => {
  const preparedPluginPath = process.env['ROOT_MENU_COEXISTENCE_PLUGIN_PATH'];
  const bundled = preparedPluginPath ? null : await build({
    bundle: true,
    external: ['obsidian', 'electron'],
    format: 'cjs',
    platform: 'node',
    stdin: {
      contents: `import { Plugin } from 'obsidian';
import { FileExplorerRootMenuComponent } from '@mnaoumov/obsidian-lib/components/file-explorer-root-menu-component';
import { noop } from '@mnaoumov/typescript-lib/function';
export default class extends Plugin {
  onload() {
    this.addChild(new FileExplorerRootMenuComponent({
      app: this.app,
      shouldPresentRootAsFolder: true,
      handler: noop
    }));
  }
}`,
      // eslint-disable-next-line unicorn/name-replacements -- esbuild's public option name.
      resolveDir: process.cwd()
    },
    write: false
  });
  const main = preparedPluginPath ? await readFile(preparedPluginPath, 'utf-8') : bundled?.outputFiles[0]?.text;
  if (!main) {
    throw new Error('No coexistence plugin build');
  }
  const vault = getTemporaryVault();
  vault.populate({
    [`.obsidian/plugins/${PARTNER_ID}/main.js`]: main,
    [`.obsidian/plugins/${PARTNER_ID}/manifest.json`]: JSON.stringify({
      author: 'More Events',
      description: 'Root menu coexistence test subscriber',
      id: PARTNER_ID,
      minAppVersion: '1.0.0',
      name: 'Root Folder Context Menu',
      version: '1.0.0'
    })
  });
  await vault.syncToDevice();
  await evalInObsidian({
    async callback({ app }) {
      await app.plugins.loadManifests();
      app.workspace.leftSplit.expand();
      const leaf = app.workspace.getLeavesOfType('file-explorer')[0];
      if (!leaf) {
        throw new Error('No File Explorer');
      }
      await app.workspace.revealLeaf(leaf);
    },
    vaultPath: vault.path
  });
});

describe('File Explorer root menu events', () => {
  for (const isPartnerFirst of [false, true]) {
    it(`should share both menus and survive either unload order (partner first: ${String(isPartnerFirst)})`, { timeout: TEST_TIMEOUT_IN_MS }, async () => {
      const results = await evalInObsidian({
        async callback({ app, lib: { clickMouse, waitUntil }, partnerFirst: loadPartnerFirst, partnerId }) {
          const records: RootMenuRecord[] = [];
          const pluginId = 'more-events';
          await app.plugins.disablePlugin(pluginId);
          await app.plugins.disablePlugin(partnerId);
          for (const id of loadPartnerFirst ? [partnerId, pluginId] : [pluginId, partnerId]) {
            await app.plugins.enablePlugin(id);
          }
          const spots: FileExplorerRootMenuSpot[] = [];
          const eventRef = app.workspace.on('more-events:file-explorer-root-menu', (menu, spot) => {
            spots.push(spot);
            menu.addItem((item) => item.setTitle('Added by a listener'));
          });
          try {
            for (const phase of ['together', 'survivor', 'restored']) {
              if (phase === 'survivor') {
                await app.plugins.disablePlugin(loadPartnerFirst ? partnerId : pluginId);
              } else if (phase === 'restored') {
                await app.plugins.enablePlugin(loadPartnerFirst ? partnerId : pluginId);
              }
              for (const spot of ['vault-name', 'empty-area'] as const) {
                spots.length = 0;
                const selector = spot === 'vault-name' ? '.workspace-drawer-vault-switcher' : '.nav-files-container';
                const element = activeDocument.querySelector<HTMLElement>(selector);
                if (!element) {
                  throw new Error(`No root menu target: ${selector}`);
                }
                await waitUntil({
                  message: 'the root menu target to be visible',
                  predicate: () => element.getBoundingClientRect().width > 0,
                  timeoutInMilliseconds: 8000
                });
                const rect = element.getBoundingClientRect();
                let x = rect.left + rect.width / 2;
                let y = rect.top + rect.height / 2;
                if (spot === 'empty-area') {
                  let isFound = false;
                  for (let row = 9; row >= 1 && !isFound; row--) {
                    for (let column = 1; column < 10; column++) {
                      x = rect.left + rect.width * column / 10;
                      y = rect.top + rect.height * row / 10;
                      if (activeDocument.elementFromPoint(x, y) === element) {
                        isFound = true;
                        break;
                      }
                    }
                  }
                  if (!isFound) {
                    throw new Error('No uncovered File Explorer empty area');
                  }
                }
                await clickMouse({ button: 'right', x: Math.round(x), y: Math.round(y) });
                try {
                  await waitUntil({
                    message: 'the shared root menu to open',
                    predicate: () => !!activeDocument.querySelector('.menu'),
                    timeoutInMilliseconds: 8000
                  });
                  records.push({
                    menuCount: activeDocument.querySelectorAll('.menu').length,
                    phase,
                    spot,
                    spots: [...spots],
                    titles: Array.from(activeDocument.querySelectorAll(':scope .menu .menu-item-title'), (el) => el.textContent)
                  });
                } finally {
                  // Dismiss independently of our event, so a broken publisher cannot swallow the next click.
                  await clickMouse({ button: 'left', x: 700, y: 400 });
                  await waitUntil({
                    message: 'the root menu to close',
                    predicate: () => !activeDocument.querySelector('.menu'),
                    timeoutInMilliseconds: 8000
                  });
                }
              }
            }
            return records;
          } finally {
            app.workspace.offref(eventRef);
            await app.plugins.disablePlugin(partnerId);
            if (!app.plugins.getPlugin(pluginId)) {
              await app.plugins.enablePlugin(pluginId);
            }
          }
        },
        input: { partnerFirst: isPartnerFirst, partnerId: PARTNER_ID },
        vaultPath: getTemporaryVault().path
      });
      expect(results).toHaveLength(6);
      for (const record of results) {
        const hasPublisher = isPartnerFirst || record.phase !== 'survivor';
        const hasPartner = !isPartnerFirst || record.phase !== 'survivor';
        expect(record.menuCount).toBe(1);
        expect(record.spots).toEqual(hasPublisher ? [record.spot] : []);
        expect(record.titles.includes('Added by a listener')).toBe(hasPublisher);
        expect(record.titles.includes('Bookmark...')).toBe(hasPartner);
        expect(record.titles).not.toContain('Delete');
        expect(record.titles).not.toContain('Rename...');
      }
    });
  }
});
