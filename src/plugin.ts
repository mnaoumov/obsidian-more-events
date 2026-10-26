import type { PluginApiDeclaration } from '@mnaoumov/obsidian-lib/plugin/plugin-api';

import { OpenDemoVaultCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-demo-vault-command-handler';
import { PluginBase } from '@mnaoumov/obsidian-lib/plugin/plugin';

import { AllPropertiesMenuEventsComponent } from './all-properties-menu-events-component.ts';
import { BookmarksMenuEventsComponent } from './bookmarks-menu-events-component.ts';
import { CalloutMenuEventsComponent } from './callout-menu-events-component.ts';
import { CanvasMenuEventsComponent } from './canvas-menu-events-component.ts';
import { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import { CommunityPluginMenuEventsComponent } from './community-plugin-menu-events-component.ts';
import { CorePluginEventsComponent } from './core-plugin-events-component.ts';
import { MoreEventsApiImpl } from './more-events-api-impl.ts';
import {
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './more-events-api.ts';
import { MenuPatchComponent } from './patches/menu-patch-component.ts';
import { PdfThumbnailMenuEventsComponent } from './pdf-thumbnail-menu-events-component.ts';
import { PluginSettingTabMenuEventsComponent } from './plugin-setting-tab-menu-events-component.ts';
import { RibbonMenuEventsComponent } from './ribbon-menu-events-component.ts';
import { SidebarToggleMenuEventsComponent } from './sidebar-toggle-menu-events-component.ts';
import { TableMenuEventsComponent } from './table-menu-events-component.ts';
import { WebViewerHistoryMenuEventsComponent } from './web-viewer-history-menu-events-component.ts';

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
    return this.moreEventsApi
      ? [
        {
          api: this.moreEventsApi,
          apiVersion: PLUGIN_API_VERSION,
          contract: PLUGIN_API_CONTRACT
        }
      ]
      : [];
  }

  protected override async onloadImpl(): Promise<void> {
    const communityPluginEventsComponent = this.addChild(
      new CommunityPluginEventsComponent({
        app: this.app
      })
    );

    const corePluginEventsComponent = this.addChild(
      new CorePluginEventsComponent({
        app: this.app
      })
    );

    const bookmarksMenuEventsComponent = this.addChild(
      new BookmarksMenuEventsComponent({
        app: this.app
      })
    );

    const canvasMenuEventsComponent = this.addChild(
      new CanvasMenuEventsComponent({
        app: this.app
      })
    );

    const ribbonMenuEventsComponent = this.addChild(
      new RibbonMenuEventsComponent({
        app: this.app
      })
    );

    const allPropertiesMenuEventsComponent = this.addChild(
      new AllPropertiesMenuEventsComponent({
        app: this.app
      })
    );

    const webViewerHistoryMenuEventsComponent = this.addChild(
      new WebViewerHistoryMenuEventsComponent({
        app: this.app
      })
    );

    const pdfThumbnailMenuEventsComponent = this.addChild(
      new PdfThumbnailMenuEventsComponent({
        app: this.app
      })
    );

    const sidebarToggleMenuEventsComponent = this.addChild(
      new SidebarToggleMenuEventsComponent({
        app: this.app
      })
    );

    const communityPluginMenuEventsComponent = this.addChild(
      new CommunityPluginMenuEventsComponent({
        app: this.app
      })
    );

    const calloutMenuEventsComponent = this.addChild(
      new CalloutMenuEventsComponent({
        app: this.app
      })
    );

    const pluginSettingTabMenuEventsComponent = this.addChild(
      new PluginSettingTabMenuEventsComponent({
        app: this.app
      })
    );

    const tableMenuEventsComponent = this.addChild(
      new TableMenuEventsComponent({
        app: this.app
      })
    );

    this.addChild(
      new MenuPatchComponent({
        app: this.app,
        deferredMenuAnnouncers: [
          sidebarToggleMenuEventsComponent,
          communityPluginMenuEventsComponent,
          calloutMenuEventsComponent,
          pluginSettingTabMenuEventsComponent,
          tableMenuEventsComponent
        ],
        menuAnnouncers: [
          bookmarksMenuEventsComponent,
          canvasMenuEventsComponent,
          ribbonMenuEventsComponent,
          allPropertiesMenuEventsComponent,
          webViewerHistoryMenuEventsComponent,
          pdfThumbnailMenuEventsComponent,
          tableMenuEventsComponent
        ]
      })
    );

    this.moreEventsApi = new MoreEventsApiImpl({
      communityPluginEventsComponent,
      corePluginEventsComponent
    });

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
