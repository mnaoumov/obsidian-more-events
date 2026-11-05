import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { DeferredMenuAnnouncer } from '../menu-patch-component.ts';

import { SYNC_FILES_MENU_EVENT_NAME } from '../../api/more-events-api.ts';

/**
 * The view type of the **Sync history** view (`app.js:170252` in 1.15.0).
 */
const SYNC_VIEW_TYPE = 'sync';

/**
 * Parameters for the {@link SyncFilesMenuEventsComponent} constructor.
 */
export interface SyncFilesMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The **Sync history** view's tree, as far as its selection.
 */
interface SyncTree {
  readonly selectedDoms: ReadonlySet<SyncTreeItem>;
}

/**
 * One item of the **Sync history** view's tree, as far as this menu needs it. Group headers have no `sFile`.
 */
interface SyncTreeItem {
  readonly selfEl: HTMLElement;
  readonly sFile?: SyncTreeItemFile;
}

/**
 * The remote file a **Sync history** item stands for.
 */
interface SyncTreeItemFile {
  readonly path: string;
}

/**
 * The **Sync history** view, as far as this menu needs it.
 */
interface SyncView {
  /**
   * The file items on screen, by path (`app.js:169498` in 1.15.0).
   */
  readonly fileItems?: Readonly<Record<string, SyncTreeItem>>;
  readonly tree?: SyncTree;
}

/**
 * Publishes the menu of several files selected in the **Sync history** view.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** Each file item binds one
 * `contextmenu` listener on its `selfEl` (`app.js:169648` in 1.15.0), which fills `Menu.forEvent(evt)`
 * (`:169661`). For one file the listener ends with `handleLinkContextMenu`, which fires the public `file-menu`, so
 * that menu is left to it. For an item that is one of several selected, it skips that call and adds only **Delete**,
 * which acts on the whole selection (`:169676`). `Menu.forEvent` shows the menu on a later task, so it is recognized
 * by the item's `selfEl` being on the event's recorded path.
 */
export class SyncFilesMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: SyncFilesMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a file that is one of several selected in a **Sync history** view.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a file item that is part of a multiple selection.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    for (const leaf of this.app.workspace.getLeavesOfType(SYNC_VIEW_TYPE)) {
      const view = castTo<SyncView>(leaf.view);
      const selectedDoms = view.tree?.selectedDoms;
      const item = Object.values(view.fileItems ?? {}).find((fileItem) => eventPath.includes(fileItem.selfEl));
      if (!item || !selectedDoms) {
        continue;
      }

      if (selectedDoms.size <= 1 || !selectedDoms.has(item)) {
        return false;
      }

      const paths = [...selectedDoms].map((selectedItem) => selectedItem.sFile?.path).filter((path) => path !== undefined);
      this.app.workspace.trigger(SYNC_FILES_MENU_EVENT_NAME, menu, paths);
      return true;
    }

    return false;
  }
}
