import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { PublishChangeType } from '../../api/more-events-api.ts';
import type { DeferredMenuAnnouncer } from '../menu-patch-component.ts';

import { PUBLISH_FILE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The id of the core **Publish** plugin.
 */
const PUBLISH_PLUGIN_ID = 'publish';

/**
 * Parameters for the {@link PublishFileMenuEventsComponent} constructor.
 */
export interface PublishFileMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The app, as far as reaching the core **Publish** plugin needs it.
 */
interface AppWithInternalPlugins {
  readonly internalPlugins: InternalPlugins;
}

/**
 * The core plugin manager, as far as reaching the **Publish** plugin needs it.
 */
interface InternalPlugins {
  readonly getEnabledPluginById: (id: string) => null | PublishPluginInstance;
}

/**
 * How a row's file differs from the site (`app.js:166570` in 1.15.0).
 */
interface PublishFileDiff {
  readonly path: string;
  readonly type: PublishChangeType;
}

/**
 * A file row of the **Publish changes** dialog (`app.js:165259` in 1.15.0).
 */
interface PublishFileRow {
  readonly diff: PublishFileDiff;
  readonly selfEl: HTMLElement;
}

/**
 * The **Publish changes** dialog, as far as this menu needs it.
 */
interface PublishModal {
  readonly reviewChangesSection?: null | Readonly<Record<PublishSectionKey, null | PublishSection | undefined>>;
}

/**
 * The core **Publish** plugin's instance, as far as this menu needs it.
 */
interface PublishPluginInstance {
  /**
   * The **Publish changes** dialog, built the first time it opens and kept (`app.js:166705` in 1.15.0).
   */
  readonly modal?: null | PublishModal;
}

/**
 * One of the dialog's three file lists, with its rows by path (`app.js:165520` in 1.15.0).
 */
interface PublishSection {
  readonly files: Readonly<Record<string, PublishFileRow>>;
}

/**
 * The dialog's three file lists (`app.js:165641`-`:165655` in 1.15.0).
 */
type PublishSectionKey = 'sectionChanged' | 'sectionNew' | 'sectionUnchanged';

const PUBLISH_SECTION_KEYS: readonly PublishSectionKey[] = ['sectionChanged', 'sectionNew', 'sectionUnchanged'];

/**
 * Publishes the menu of a file row in the **Publish changes** dialog.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** Each row binds one
 * `contextmenu` listener on its `selfEl` (`app.js:165295` in 1.15.0), whose `onContextMenu` (`:165317`) awaits the
 * site's address from the Publish server before it fills a `new Menu()` and shows it with `showAtMouseEvent`, so the
 * menu is shown after the event's dispatch, and is recognized by the row's `selfEl` being on the recorded path. The
 * rows are kept by the dialog's three file lists, and the dialog by the plugin, so the row's own change is handed over
 * rather than anything read off the page.
 */
export class PublishFileMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PublishFileMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a file row in the **Publish changes** dialog.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a file row of the dialog.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const publish = castTo<AppWithInternalPlugins>(this.app).internalPlugins.getEnabledPluginById(PUBLISH_PLUGIN_ID);
    const reviewChangesSection = publish?.modal?.reviewChangesSection;
    if (!reviewChangesSection) {
      return false;
    }

    for (const sectionKey of PUBLISH_SECTION_KEYS) {
      const row = Object.values(reviewChangesSection[sectionKey]?.files ?? {}).find((fileRow) => eventPath.includes(fileRow.selfEl));
      if (row) {
        this.app.workspace.trigger(PUBLISH_FILE_MENU_EVENT_NAME, menu, { path: row.diff.path, type: row.diff.type });
        return true;
      }
    }

    return false;
  }
}
