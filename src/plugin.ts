import type { PluginApiDeclaration } from 'obsidian-dev-utils/obsidian/plugin/plugin-api';

import { OpenDemoVaultCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/open-demo-vault-command-handler';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';

import { CorePluginEventsComponent } from './core-plugin-events-component.ts';
import { MoreEventsApiImpl } from './more-events-api-impl.ts';
import {
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './more-events-api.ts';

export class Plugin extends PluginBase {
  private moreEventsApi: MoreEventsApiImpl | null = null;

  /**
   * Declares the API for the base to publish, once `onloadImpl` has built it.
   *
   * Published by the base rather than by hand: the `plugin-loaded` broadcast's `apiVersions` is derived
   * from this method alone, so a hand `publishPluginApi` call would announce this plugin as publishing no
   * API at all — while the registry still worked, which is what makes that mistake invisible from here.
   *
   * @returns The declaration, or none before the plugin has loaded.
   */
  protected override getPluginApis(): PluginApiDeclaration[] {
    if (!this.moreEventsApi) {
      return [];
    }

    return [
      {
        api: this.moreEventsApi,
        apiVersion: PLUGIN_API_VERSION,
        contract: PLUGIN_API_CONTRACT
      }
    ];
  }

  protected override async onloadImpl(): Promise<void> {
    const corePluginEventsComponent = this.addChild(
      new CorePluginEventsComponent({
        app: this.app
      })
    );

    this.moreEventsApi = new MoreEventsApiImpl({ corePluginEventsComponent });

    await this.commandHandlerComponent.registerCommandHandlers(() => [
      new OpenDemoVaultCommandHandler({
        app: this.app,
        pluginId: this.manifest.id,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginVersion: this.manifest.version
      })
    ]);
  }
}
