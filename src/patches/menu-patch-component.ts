import type { Menu as MenuOriginal } from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { Menu } from 'obsidian';

/**
 * One kind of context menu that Obsidian builds without triggering any event for it, and that a component
 * of this plugin announces instead.
 */
export interface MenuAnnouncer {
  /**
   * Announces the menu when it is the kind this announcer knows, before it is shown.
   *
   * @param menu - The menu about to be shown. It still accepts items.
   * @param mouseEvent - The mouse event it is being shown for.
   * @returns `true` when the menu was this announcer's, so no other announcer is asked.
   */
  announceMenu: (menu: MenuOriginal, mouseEvent: MouseEvent) => boolean;
}

/**
 * Parameters for the {@link MenuPatchComponent} constructor.
 */
export interface MenuPatchComponentConstructorParams {
  /**
   * The announcers to ask, in order, about each menu shown at a mouse event.
   */
  readonly menuAnnouncers: readonly MenuAnnouncer[];
}

/**
 * The one patch every context menu that fires no event goes through: `Menu.prototype.showAtMouseEvent`.
 *
 * **Why a patch at all.** Obsidian builds many context menus with no workspace event for them, so a plugin
 * cannot add an item to one without patching the code that builds it. That code is a different internal
 * method for each menu, and its `contextmenu` listener is usually bound per instance when the view or tree
 * item is constructed (`el.addEventListener('contextmenu', this.onContextMenu.bind(this))`), so patching
 * that method's prototype misses every instance already on screen. `Menu` is public, every one of those
 * menus is shown through it, and a prototype patch on it reaches them all at once.
 *
 * **How a menu is told apart.** A menu shown straight from a `contextmenu` listener is shown while that
 * event is still being dispatched, so `evt.currentTarget` is the element whose listener is building it.
 * Each {@link MenuAnnouncer} compares that element with the one its view registers on, which identifies
 * the menu exactly rather than by guessing from the DOM under the pointer.
 *
 * **Transparent.** The announcer runs before the original, while `addItem` still accepts items, and the
 * original's return value is passed through untouched.
 */
export class MenuPatchComponent extends MonkeyAroundComponent {
  private readonly menuAnnouncers: readonly MenuAnnouncer[];

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: MenuPatchComponentConstructorParams) {
    super();
    this.menuAnnouncers = params.menuAnnouncers;
  }

  /**
   * Installs the patch.
   */
  public override onload(): void {
    super.onload();

    this.registerMethodPatch({
      $object: Menu.prototype,
      methodName: 'showAtMouseEvent',
      patchHandler: ({
        fallback,
        originalArguments,
        originalThis
      }) => {
        const [mouseEvent] = originalArguments;
        for (const menuAnnouncer of this.menuAnnouncers) {
          if (menuAnnouncer.announceMenu(originalThis, mouseEvent)) {
            break;
          }
        }
        return fallback();
      }
    });
  }
}
