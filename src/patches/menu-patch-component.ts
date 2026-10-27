import type {
  App,
  Menu as MenuOriginal
} from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian';

/**
 * One kind of context menu that Obsidian shows AFTER its `contextmenu` event has finished dispatching, without
 * triggering any event for it, and that a component of this plugin announces instead.
 */
export interface DeferredMenuAnnouncer {
  /**
   * Announces the menu when it is the kind this announcer knows, before it is shown.
   *
   * @param menu - The menu about to be shown. It still accepts items.
   * @param mouseEvent - The mouse event it is being shown for. Its dispatch has finished, so its `currentTarget` is `null`.
   * @param eventPath - The event's `composedPath()`, as it was recorded while the event was being dispatched: the
   * element right-clicked first, then each of its ancestors, ending with the window.
   * @returns `true` when the menu was this announcer's, so no other announcer is asked.
   */
  announceDeferredMenu: (menu: MenuOriginal, mouseEvent: MouseEvent, eventPath: readonly EventTarget[]) => boolean;
}

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
   * The Obsidian application instance.
   */
  readonly app: App;

  /**
   * The announcers to ask, in order, about each menu shown at a mouse event whose dispatch has finished.
   */
  readonly deferredMenuAnnouncers: readonly DeferredMenuAnnouncer[];

  /**
   * The announcers to ask, in order, about each menu shown at a mouse event still being dispatched.
   */
  readonly menuAnnouncers: readonly MenuAnnouncer[];

  /**
   * The announcers to ask, in order, about each menu anchored to an element and shown with `showAtPosition` outside
   * any `contextmenu` dispatch, or shown after the dispatch of an event whose path was not recorded.
   */
  readonly positionedMenuAnnouncers: readonly PositionedMenuAnnouncer[];
}

/**
 * One kind of menu that Obsidian anchors to an element with `setParentElement` and shows with nothing else to tell
 * it apart by, without triggering any event for it, and that a component of this plugin announces instead: shown
 * with `showAtPosition` and no event at all, or by `Menu.forEvent` for an event that is not a `contextmenu` one,
 * such as a button's click.
 */
export interface PositionedMenuAnnouncer {
  /**
   * Announces the menu when it is the kind this announcer knows, before it is shown.
   *
   * @param menu - The menu about to be shown. It still accepts items.
   * @param parentEl - The element the menu was anchored to with `setParentElement`, usually the button that opens it.
   * @returns `true` when the menu was this announcer's, so no other announcer is asked.
   */
  announcePositionedMenu: (menu: MenuOriginal, parentEl: HTMLElement) => boolean;
}

/**
 * A menu, as far as telling a positioned one apart needs it.
 */
interface MenuWithParentEl {
  /**
   * The element `setParentElement` anchored the menu to (`app.js:64493` in 1.15.0), if any.
   */
  readonly parentEl?: HTMLElement | null;
}

/**
 * The one patch every context menu that fires no event goes through: `Menu.prototype.showAtMouseEvent`, and the
 * `showAtPosition` it delegates to.
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
 * **A menu shown after the dispatch is told apart by the event's path instead.** `Menu.forEvent` shows its
 * menu on a later task (`app.js:70084`), and a few listeners `await` before they show theirs, so by then
 * `currentTarget` is `null` and `composedPath()` answers `[]`. The same event object still reaches
 * `showAtMouseEvent`, so a capture-phase `contextmenu` listener on every window records its path while it is
 * being dispatched, and each {@link DeferredMenuAnnouncer} asks whether its listener's element is on it.
 * The two kinds of announcer are asked about different menus on purpose: a view-level element such as the
 * **Bookmarks** view's container is on the path of every deferred menu shown inside it, so a synchronous
 * announcer must never be asked about one.
 *
 * **A menu shown with `showAtPosition` carries no event, so the same patch covers that method too.**
 * `showAtMouseEvent(e)` is `this.showAtPosition({ x, y }, e.doc)` (`app.js:64501` in 1.15.0), so the call it makes
 * is skipped rather than announced twice. Any other call is told apart in one of two ways. Shown while a recorded
 * `contextmenu` event is still being dispatched, as a view header's history buttons show theirs (`:64819`), the
 * menu goes to the {@link MenuAnnouncer}s with that event, whose `currentTarget` is the listener's element, exactly
 * as a menu shown with `showAtMouseEvent` would. Shown at any other time, as a button's click shows one, it goes to
 * the {@link PositionedMenuAnnouncer}s when it was anchored with `setParentElement`, and that element names it. A
 * submenu, and a menu anchored to nothing, reaches no announcer.
 *
 * **A menu `Menu.forEvent` shows for a click is told apart by its anchor too.** Only `contextmenu` paths are
 * recorded, so a menu shown after the dispatch of any other event has no path, and goes to the
 * {@link PositionedMenuAnnouncer}s when it was anchored, as the Bases toolbar's **More options** buttons anchor
 * theirs (`app.js:120135` in 1.15.0).
 *
 * **Transparent.** The announcer runs before the original, while `addItem` still accepts items, and the
 * original's return value is passed through untouched. The recording listener only reads the event.
 */
export class MenuPatchComponent extends MonkeyAroundComponent {
  private readonly app: App;
  private readonly deferredMenuAnnouncers: readonly DeferredMenuAnnouncer[];
  private readonly eventPaths = new WeakMap<Event, readonly EventTarget[]>();
  private isShowingAtMouseEvent = false;
  private lastContextMenuEvent: MouseEvent | null = null;
  private readonly menuAnnouncers: readonly MenuAnnouncer[];
  private readonly positionedMenuAnnouncers: readonly PositionedMenuAnnouncer[];
  private readonly recordedWindows = new Map<Window, () => void>();

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: MenuPatchComponentConstructorParams) {
    super();
    this.app = params.app;
    this.deferredMenuAnnouncers = params.deferredMenuAnnouncers;
    this.menuAnnouncers = params.menuAnnouncers;
    this.positionedMenuAnnouncers = params.positionedMenuAnnouncers;
  }

  /**
   * Installs the patch, and starts recording the path of every `contextmenu` event.
   */
  public override onload(): void {
    super.onload();

    this.recordWindow(window);
    this.app.workspace.iterateAllLeaves((leaf) => {
      this.recordWindow(leaf.getContainer().win);
    });
    this.registerEvent(this.app.workspace.on('window-open', (workspaceWindow) => {
      this.recordWindow(workspaceWindow.win);
    }));
    this.registerEvent(this.app.workspace.on('window-close', (workspaceWindow) => {
      this.recordedWindows.get(workspaceWindow.win)?.();
    }));
    this.register(() => {
      for (const stopRecording of this.recordedWindows.values()) {
        stopRecording();
      }
      this.lastContextMenuEvent = null;
    });

    this.registerMethodPatch({
      $object: Menu.prototype,
      methodName: 'showAtMouseEvent',
      patchHandler: ({
        fallback,
        originalArguments,
        originalThis
      }) => {
        const [mouseEvent] = originalArguments;
        if (mouseEvent.currentTarget) {
          this.menuAnnouncers.some((menuAnnouncer) => menuAnnouncer.announceMenu(originalThis, mouseEvent));
        } else {
          const eventPath = this.eventPaths.get(mouseEvent);
          if (eventPath) {
            this.deferredMenuAnnouncers.some((deferredMenuAnnouncer) => deferredMenuAnnouncer.announceDeferredMenu(originalThis, mouseEvent, eventPath));
          } else {
            // Not a `contextmenu` event: `Menu.forEvent` for a click, which only the anchor can name.
            this.announceAnchoredMenu(originalThis);
          }
        }
        // The original shows the menu through `showAtPosition`, which must not announce it a second time.
        this.isShowingAtMouseEvent = true;
        try {
          return fallback();
        } finally {
          this.isShowingAtMouseEvent = false;
        }
      }
    });

    this.registerMethodPatch({
      $object: Menu.prototype,
      methodName: 'showAtPosition',
      patchHandler: ({
        fallback,
        originalThis
      }) => {
        if (!this.isShowingAtMouseEvent) {
          this.announcePositionedMenu(originalThis);
        }
        return fallback();
      }
    });
  }

  private announceAnchoredMenu(menu: MenuOriginal): void {
    const { parentEl } = castTo<MenuWithParentEl>(menu);
    if (parentEl) {
      this.positionedMenuAnnouncers.some((positionedMenuAnnouncer) => positionedMenuAnnouncer.announcePositionedMenu(menu, parentEl));
    }
  }

  private announcePositionedMenu(menu: MenuOriginal): void {
    // `currentTarget` is `null` again once the event's dispatch has finished, so this is a menu shown during it.
    const contextMenuEvent = this.lastContextMenuEvent;
    if (contextMenuEvent?.currentTarget) {
      this.menuAnnouncers.some((menuAnnouncer) => menuAnnouncer.announceMenu(menu, contextMenuEvent));
      return;
    }

    this.announceAnchoredMenu(menu);
  }

  private recordWindow(win: Window): void {
    if (this.recordedWindows.has(win)) {
      return;
    }

    const recordEventPath = (event_: MouseEvent): void => {
      this.eventPaths.set(event_, event_.composedPath());
      this.lastContextMenuEvent = event_;
    };
    // Capture phase on the window, so the path is recorded before any listener on the way can stop the event.
    win.addEventListener('contextmenu', recordEventPath, { capture: true });
    this.recordedWindows.set(win, () => {
      win.removeEventListener('contextmenu', recordEventPath, { capture: true });
      this.recordedWindows.delete(win);
    });
  }
}
