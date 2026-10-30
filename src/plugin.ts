import type { PluginApiDeclaration } from '@mnaoumov/obsidian-lib/plugin/plugin-api';

import { OpenBugReportCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-bug-report-command-handler';
import { OpenDemoVaultCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-demo-vault-command-handler';
import { FileExplorerRootMenuComponent } from '@mnaoumov/obsidian-lib/components/file-explorer-root-menu-component';
import { PluginBase } from '@mnaoumov/obsidian-lib/plugin/plugin';

import { MoreEventsApiImpl } from './api/more-events-api-impl.ts';
import {
  FILE_EXPLORER_ROOT_MENU_EVENT_NAME,
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION
} from './api/more-events-api.ts';
import { AllPropertiesMenuEventsComponent } from './context-menus/all-properties/all-properties-menu-events-component.ts';
import { BasesColumnMenuEventsComponent } from './context-menus/bases/bases-column-menu-events-component.ts';
import { BasesKanbanColumnMenuEventsComponent } from './context-menus/bases/bases-kanban-column-menu-events-component.ts';
import { BasesViewMenuEventsComponent } from './context-menus/bases/bases-view-menu-events-component.ts';
import { BookmarksMenuEventsComponent } from './context-menus/bookmarks/bookmarks-menu-events-component.ts';
import { CalloutMenuEventsComponent } from './context-menus/callout/callout-menu-events-component.ts';
import { CanvasMenuEventsComponent } from './context-menus/canvas/canvas-menu-events-component.ts';
import { CanvasObjectMenuEventsComponent } from './context-menus/canvas/canvas-object-menu-events-component.ts';
import { CanvasToolbarMenuEventsComponent } from './context-menus/canvas/canvas-toolbar-menu-events-component.ts';
import { CommunityPluginMenuEventsComponent } from './context-menus/community-plugin/community-plugin-menu-events-component.ts';
import { CssSnippetMenuEventsComponent } from './context-menus/css-snippet/css-snippet-menu-events-component.ts';
import { ExternalImageMenuEventsComponent } from './context-menus/external-image/external-image-menu-events-component.ts';
import { HistoryMenuEventsComponent } from './context-menus/history/history-menu-events-component.ts';
import { MarkdownMenuEventsComponent } from './context-menus/markdown/markdown-menu-events-component.ts';
import { MenuPatchComponent } from './context-menus/menu-patch-component.ts';
import { PdfOutlineMenuEventsComponent } from './context-menus/pdf/pdf-outline-menu-events-component.ts';
import { PdfPageMenuEventsComponent } from './context-menus/pdf/pdf-page-menu-events-component.ts';
import { PdfThumbnailMenuEventsComponent } from './context-menus/pdf/pdf-thumbnail-menu-events-component.ts';
import { PdfToolbarMenuEventsComponent } from './context-menus/pdf/pdf-toolbar-menu-events-component.ts';
import { PluginSettingTabMenuEventsComponent } from './context-menus/plugin-setting-tab/plugin-setting-tab-menu-events-component.ts';
import { PropertyMenuEventsComponent } from './context-menus/property/property-menu-events-component.ts';
import { PropertyValueMenuEventsComponent } from './context-menus/property/property-value-menu-events-component.ts';
import { RibbonMenuEventsComponent } from './context-menus/ribbon/ribbon-menu-events-component.ts';
import { SearchMenuEventsComponent } from './context-menus/search/search-menu-events-component.ts';
import { SidebarToggleMenuEventsComponent } from './context-menus/sidebar-toggle/sidebar-toggle-menu-events-component.ts';
import { TableMenuEventsComponent } from './context-menus/table/table-menu-events-component.ts';
import { VaultMenuEventsComponent } from './context-menus/vault/vault-menu-events-component.ts';
import { WebViewerHistoryMenuEventsComponent } from './context-menus/web-viewer-history/web-viewer-history-menu-events-component.ts';
import { WorkspaceMenuEventsComponent } from './context-menus/workspace/workspace-menu-events-component.ts';
import { CommunityPluginEventsComponent } from './plugin-lifecycle/community-plugin-events-component.ts';
import { CorePluginEventsComponent } from './plugin-lifecycle/core-plugin-events-component.ts';

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
    this.addChild(
      new FileExplorerRootMenuComponent({
        app: this.app,
        handler: ({ menu, spot }): void => {
          this.app.workspace.trigger(FILE_EXPLORER_ROOT_MENU_EVENT_NAME, menu, spot);
        }
      })
    );

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

    const pdfToolbarMenuEventsComponent = this.addChild(new PdfToolbarMenuEventsComponent({ app: this.app }));

    const canvasToolbarMenuEventsComponent = this.addChild(new CanvasToolbarMenuEventsComponent({ app: this.app }));

    const basesViewMenuEventsComponent = this.addChild(
      new BasesViewMenuEventsComponent({
        app: this.app
      })
    );

    const historyMenuEventsComponent = this.addChild(
      new HistoryMenuEventsComponent({
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
          pdfOutlineMenuEventsComponent,
          historyMenuEventsComponent
        ],
        positionedMenuAnnouncers: [
          communityPluginMenuEventsComponent,
          basesViewMenuEventsComponent,
          pdfToolbarMenuEventsComponent,
          canvasToolbarMenuEventsComponent
        ]
      })
    );

    this.moreEventsApi = new MoreEventsApiImpl({
      communityPluginEventsComponent,
      corePluginEventsComponent
    });

    await this.commandHandlerComponent.registerCommandHandlers(() => [
      new OpenBugReportCommandHandler({
        app: this.app,
        gitHubRepo: 'mnaoumov/obsidian-more-events',
        pluginId: this.manifest.id
      }),
      new OpenDemoVaultCommandHandler({
        app: this.app,
        pluginId: this.manifest.id,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginVersion: this.manifest.version
      })
    ]);
  }
}
