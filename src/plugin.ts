import type { PluginApiDeclaration } from '@mnaoumov/obsidian-lib/plugin/plugin-api';

import { OpenDemoVaultCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-demo-vault-command-handler';
import { PluginBase } from '@mnaoumov/obsidian-lib/plugin/plugin';

import { AllPropertiesMenuEventsComponent } from './all-properties-menu-events-component.ts';
import { BasesColumnMenuEventsComponent } from './bases-column-menu-events-component.ts';
import { BasesKanbanColumnMenuEventsComponent } from './bases-kanban-column-menu-events-component.ts';
import { BookmarksMenuEventsComponent } from './bookmarks-menu-events-component.ts';
import { CalloutMenuEventsComponent } from './callout-menu-events-component.ts';
import { CanvasMenuEventsComponent } from './canvas-menu-events-component.ts';
import { CanvasObjectMenuEventsComponent } from './canvas-object-menu-events-component.ts';
import { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import { CommunityPluginMenuEventsComponent } from './community-plugin-menu-events-component.ts';
import { CorePluginEventsComponent } from './core-plugin-events-component.ts';
import { CssSnippetMenuEventsComponent } from './css-snippet-menu-events-component.ts';
import { ExternalImageMenuEventsComponent } from './external-image-menu-events-component.ts';
import { MarkdownMenuEventsComponent } from './markdown-menu-events-component.ts';
import { MoreEventsApiImpl } from './more-events-api-impl.ts';
import {
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './more-events-api.ts';
import { MenuPatchComponent } from './patches/menu-patch-component.ts';
import { PdfOutlineMenuEventsComponent } from './pdf-outline-menu-events-component.ts';
import { PdfPageMenuEventsComponent } from './pdf-page-menu-events-component.ts';
import { PdfThumbnailMenuEventsComponent } from './pdf-thumbnail-menu-events-component.ts';
import { PluginSettingTabMenuEventsComponent } from './plugin-setting-tab-menu-events-component.ts';
import { PropertyMenuEventsComponent } from './property-menu-events-component.ts';
import { PropertyValueMenuEventsComponent } from './property-value-menu-events-component.ts';
import { RibbonMenuEventsComponent } from './ribbon-menu-events-component.ts';
import { SearchMenuEventsComponent } from './search-menu-events-component.ts';
import { SidebarToggleMenuEventsComponent } from './sidebar-toggle-menu-events-component.ts';
import { TableMenuEventsComponent } from './table-menu-events-component.ts';
import { VaultMenuEventsComponent } from './vault-menu-events-component.ts';
import { WebViewerHistoryMenuEventsComponent } from './web-viewer-history-menu-events-component.ts';
import { WorkspaceMenuEventsComponent } from './workspace-menu-events-component.ts';

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

    const propertyValueMenuEventsComponent = this.addChild(
      new PropertyValueMenuEventsComponent({
        app: this.app
      })
    );

    const basesColumnMenuEventsComponent = this.addChild(
      new BasesColumnMenuEventsComponent({
        app: this.app
      })
    );

    const propertyMenuEventsComponent = this.addChild(
      new PropertyMenuEventsComponent({
        app: this.app
      })
    );

    const cssSnippetMenuEventsComponent = this.addChild(
      new CssSnippetMenuEventsComponent({
        app: this.app
      })
    );

    const pdfOutlineMenuEventsComponent = this.addChild(
      new PdfOutlineMenuEventsComponent({
        app: this.app
      })
    );

    const pdfPageMenuEventsComponent = this.addChild(
      new PdfPageMenuEventsComponent({
        app: this.app
      })
    );

    const externalImageMenuEventsComponent = this.addChild(
      new ExternalImageMenuEventsComponent({
        app: this.app
      })
    );

    const basesKanbanColumnMenuEventsComponent = this.addChild(
      new BasesKanbanColumnMenuEventsComponent({
        app: this.app
      })
    );

    const vaultMenuEventsComponent = this.addChild(
      new VaultMenuEventsComponent({
        app: this.app
      })
    );

    this.addChild(
      new WorkspaceMenuEventsComponent({
        app: this.app
      })
    );

    this.addChild(
      new SearchMenuEventsComponent({
        app: this.app
      })
    );

    this.addChild(
      new MarkdownMenuEventsComponent({
        app: this.app
      })
    );

    this.addChild(
      new CanvasObjectMenuEventsComponent({
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
          // Before the table cell one: an image's listener calls `preventDefault`, so a cell's own listener shows
          // nothing for an image inside it, yet the cell is on the image menu's path.
          externalImageMenuEventsComponent,
          tableMenuEventsComponent,
          propertyValueMenuEventsComponent,
          basesColumnMenuEventsComponent,
          cssSnippetMenuEventsComponent,
          pdfOutlineMenuEventsComponent,
          pdfPageMenuEventsComponent,
          basesKanbanColumnMenuEventsComponent,
          vaultMenuEventsComponent
        ],
        menuAnnouncers: [
          bookmarksMenuEventsComponent,
          canvasMenuEventsComponent,
          ribbonMenuEventsComponent,
          allPropertiesMenuEventsComponent,
          webViewerHistoryMenuEventsComponent,
          pdfThumbnailMenuEventsComponent,
          tableMenuEventsComponent,
          propertyMenuEventsComponent,
          pdfOutlineMenuEventsComponent
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
