import type {
  App as AppOriginal,
  Menu as MenuOriginal
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  Events,
  Menu
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type {
  DeferredMenuAnnouncer,
  MenuAnnouncer,
  PositionedMenuAnnouncer
} from './menu-patch-component.ts';

import { MenuPatchComponent } from './menu-patch-component.ts';

interface AnchoredMenu {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- The menu fixture changes its anchor in the test.
  parentEl: HTMLElement | null;
}

interface Announcers {
  readonly deferredMenuAnnouncers: DeferredMenuAnnouncer[];
  readonly menuAnnouncers: MenuAnnouncer[];
  readonly positionedMenuAnnouncers?: PositionedMenuAnnouncer[];
}

interface TestApp {
  readonly app: AppOriginal;
  readonly windowHandlers: Map<string, WindowHandler>;
}

interface TestWorkspaceWindow {
  readonly win: Window;
}

type WindowHandler = (workspaceWindow: TestWorkspaceWindow) => void;

describe('MenuPatchComponent', () => {
  const loadedComponents: MenuPatchComponent[] = [];

  afterEach(() => {
    while (loadedComponents.length > 0) {
      loadedComponents.pop()?.unload();
    }
    vi.restoreAllMocks();
    activeDocument.body.empty();
  });

  it('should ask each announcer about a menu before it is shown, in order, until one claims it', () => {
    const calls: string[] = [];
    const showSpy = vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function showAtMouseEventStub(this: Menu) {
      calls.push('show');
      return this;
    });
    const first = createAnnouncer(calls, 'first', false);
    const second = createAnnouncer(calls, 'second', true);
    const third = createAnnouncer(calls, 'third', true);
    const deferred = createDeferredAnnouncer(calls, 'deferred', true);
    loadComponent({ deferredMenuAnnouncers: [deferred], menuAnnouncers: [first, second, third] });
    const menu = Menu.create2__().asOriginalType2__();
    const event_ = mouseEventWithCurrentTarget(createDiv());

    const returned = menu.showAtMouseEvent(event_);

    expect(calls).toEqual(['first', 'second', 'show']);
    expect(first.announceMenu).toHaveBeenCalledWith(menu, event_);
    expect(third.announceMenu).not.toHaveBeenCalled();
    expect(deferred.announceDeferredMenu).not.toHaveBeenCalled();
    // Transparent: the original still ran, on the same menu and event, and its return value came back.
    expect(showSpy).toHaveBeenCalledWith(event_);
    expect(returned).toBe(menu);
  });

  it('should ask the deferred announcers, with the recorded path, about a menu shown after the dispatch', () => {
    const calls: string[] = [];
    vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function showAtMouseEventStub(this: Menu) {
      calls.push('show');
      return this;
    });
    const announcer = createAnnouncer(calls, 'sync', true);
    const first = createDeferredAnnouncer(calls, 'first', false);
    const second = createDeferredAnnouncer(calls, 'second', true);
    const third = createDeferredAnnouncer(calls, 'third', true);
    loadComponent({ deferredMenuAnnouncers: [first, second, third], menuAnnouncers: [announcer] });
    const parentEl = activeDocument.body.createDiv();
    const targetEl = parentEl.createDiv();
    const event_ = new MouseEvent('contextmenu', { bubbles: true });
    targetEl.dispatchEvent(event_);
    const menu = Menu.create2__().asOriginalType2__();

    menu.showAtMouseEvent(event_);

    expect(calls).toEqual(['first', 'second', 'show']);
    expect(announcer.announceMenu).not.toHaveBeenCalled();
    expect(third.announceDeferredMenu).not.toHaveBeenCalled();
    const eventPath = vi.mocked(first.announceDeferredMenu).mock.calls[0]?.[2];
    expect(eventPath?.slice(0, 3)).toEqual([targetEl, parentEl, activeDocument.body]);
    expect(eventPath).toContain(window);
    expect(vi.mocked(first.announceDeferredMenu).mock.calls[0]?.slice(0, 2)).toEqual([menu, event_]);
  });

  it('should ask no announcer about a menu shown after the dispatch of an event it never saw', () => {
    vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockReturnThis();
    const announcer = createAnnouncer([], 'sync', true);
    const deferred = createDeferredAnnouncer([], 'deferred', true);
    loadComponent({ deferredMenuAnnouncers: [deferred], menuAnnouncers: [announcer] });

    createMenuAnchoredTo(null).showAtMouseEvent(new MouseEvent('contextmenu'));

    expect(announcer.announceMenu).not.toHaveBeenCalled();
    expect(deferred.announceDeferredMenu).not.toHaveBeenCalled();
  });

  it('should ask the positioned announcers about an anchored menu shown after the dispatch of an event whose path it never recorded', () => {
    vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockReturnThis();
    const announcer = createAnnouncer([], 'sync', true);
    const deferred = createDeferredAnnouncer([], 'deferred', true);
    const positioned = createPositionedAnnouncer([], 'positioned', true);
    loadComponent({ deferredMenuAnnouncers: [deferred], menuAnnouncers: [announcer], positionedMenuAnnouncers: [positioned] });
    const buttonEl = activeDocument.body.createDiv();
    // A click, which is not recorded, as `Menu.forEvent` shows a menu for it on a later task.
    const event_ = new MouseEvent('click', { bubbles: true });
    buttonEl.dispatchEvent(event_);
    const menu = createMenuAnchoredTo(buttonEl);

    menu.showAtMouseEvent(event_);

    expect(positioned.announcePositionedMenu).toHaveBeenCalledExactlyOnceWith(menu, buttonEl);
    expect(announcer.announceMenu).not.toHaveBeenCalled();
    expect(deferred.announceDeferredMenu).not.toHaveBeenCalled();
  });

  it('should record the events of the windows already open, of each window opened later, and stop when one closes', () => {
    vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockReturnThis();
    const deferred = createDeferredAnnouncer([], 'deferred', true);
    const existingWindow = createFakeWindow();
    const testApp = createApp([window, existingWindow]);
    loadComponent({ deferredMenuAnnouncers: [deferred], menuAnnouncers: [] }, testApp);
    const openedWindow = createFakeWindow();
    testApp.windowHandlers.get('window-open')?.({ win: openedWindow });

    showAfterDispatch(existingWindow);
    showAfterDispatch(openedWindow);
    expect(vi.mocked(deferred.announceDeferredMenu).mock.calls.map((call) => call[2])).toEqual([[existingWindow], [openedWindow]]);

    testApp.windowHandlers.get('window-close')?.({ win: openedWindow });
    // A window it never recorded closing is no error.
    testApp.windowHandlers.get('window-close')?.({ win: createFakeWindow() });
    showAfterDispatch(openedWindow);
    expect(deferred.announceDeferredMenu).toHaveBeenCalledTimes(2);
  });

  it('should leave the menu and the windows alone once unloaded', () => {
    vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockReturnThis();
    const announcer = createAnnouncer([], 'only', true);
    const deferred = createDeferredAnnouncer([], 'deferred', true);
    const existingWindow = createFakeWindow();
    loadComponent({ deferredMenuAnnouncers: [deferred], menuAnnouncers: [announcer] }, createApp([existingWindow])).unload();

    Menu.create2__().asOriginalType2__().showAtMouseEvent(mouseEventWithCurrentTarget(createDiv()));
    showAfterDispatch(existingWindow);

    expect(announcer.announceMenu).not.toHaveBeenCalled();
    expect(deferred.announceDeferredMenu).not.toHaveBeenCalled();
  });

  it('should ask the positioned announcers, in order, about a menu shown at a position and anchored to an element', () => {
    const calls: string[] = [];
    const showSpy = vi.spyOn(Menu.prototype, 'showAtPosition').mockImplementation(function showAtPositionStub(this: Menu) {
      calls.push('show');
      return this;
    });
    const announcer = createAnnouncer(calls, 'sync', true);
    const first = createPositionedAnnouncer(calls, 'first', false);
    const second = createPositionedAnnouncer(calls, 'second', true);
    const third = createPositionedAnnouncer(calls, 'third', true);
    loadComponent({ deferredMenuAnnouncers: [], menuAnnouncers: [announcer], positionedMenuAnnouncers: [first, second, third] });
    const parentEl = createDiv();
    const menu = createMenuAnchoredTo(parentEl);
    const position = { x: 1, y: 2 };

    const returned = menu.showAtPosition(position);

    expect(calls).toEqual(['first', 'second', 'show']);
    expect(first.announcePositionedMenu).toHaveBeenCalledWith(menu, parentEl);
    expect(third.announcePositionedMenu).not.toHaveBeenCalled();
    expect(announcer.announceMenu).not.toHaveBeenCalled();
    expect(showSpy).toHaveBeenCalledWith(position);
    expect(returned).toBe(menu);
  });

  it('should ask no announcer about a menu shown at a position and anchored to nothing', () => {
    vi.spyOn(Menu.prototype, 'showAtPosition').mockReturnThis();
    const announcer = createAnnouncer([], 'sync', true);
    const positioned = createPositionedAnnouncer([], 'positioned', true);
    loadComponent({ deferredMenuAnnouncers: [], menuAnnouncers: [announcer], positionedMenuAnnouncers: [positioned] });

    createMenuAnchoredTo(null).showAtPosition({ x: 0, y: 0 });

    expect(announcer.announceMenu).not.toHaveBeenCalled();
    expect(positioned.announcePositionedMenu).not.toHaveBeenCalled();
  });

  it('should ask the immediate announcers, with the event, about a menu shown at a position during a contextmenu dispatch', () => {
    vi.spyOn(Menu.prototype, 'showAtPosition').mockReturnThis();
    const currentTargets: (EventTarget | null)[] = [];
    const announcer: MenuAnnouncer = {
      announceMenu: vi.fn((_menu: MenuOriginal, event_: MouseEvent) => {
        currentTargets.push(event_.currentTarget);
        return true;
      })
    };
    const positioned = createPositionedAnnouncer([], 'positioned', true);
    loadComponent({ deferredMenuAnnouncers: [], menuAnnouncers: [announcer], positionedMenuAnnouncers: [positioned] });
    const buttonEl = activeDocument.body.createDiv();
    const parentEl = createDiv();
    const menu = createMenuAnchoredTo(parentEl);
    buttonEl.addEventListener('contextmenu', () => {
      menu.showAtPosition({ x: 0, y: 0 });
    });
    const event_ = new MouseEvent('contextmenu', { bubbles: true });

    buttonEl.dispatchEvent(event_);
    // Once the dispatch is over, the same event no longer makes a positioned menu an immediate one.
    menu.showAtPosition({ x: 0, y: 0 });

    expect(announcer.announceMenu).toHaveBeenCalledExactlyOnceWith(menu, event_);
    expect(currentTargets).toEqual([buttonEl]);
    expect(positioned.announcePositionedMenu).toHaveBeenCalledExactlyOnceWith(menu, parentEl);
  });

  it('should not announce a second time the position a menu shown at a mouse event is shown at', () => {
    const showAtPositionSpy = vi.spyOn(Menu.prototype, 'showAtPosition').mockReturnThis();
    vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function showAtMouseEventStub(this: Menu, event_: MouseEvent) {
      return this.showAtPosition({ x: event_.clientX, y: event_.clientY });
    });
    const announcer = createAnnouncer([], 'sync', false);
    const positioned = createPositionedAnnouncer([], 'positioned', true);
    loadComponent({ deferredMenuAnnouncers: [], menuAnnouncers: [announcer], positionedMenuAnnouncers: [positioned] });
    const menu = createMenuAnchoredTo(createDiv());

    menu.showAtMouseEvent(mouseEventWithCurrentTarget(createDiv()));

    expect(announcer.announceMenu).toHaveBeenCalledOnce();
    expect(positioned.announcePositionedMenu).not.toHaveBeenCalled();
    expect(showAtPositionSpy).toHaveBeenCalledOnce();

    // And the flag is down again afterwards.
    menu.showAtPosition({ x: 0, y: 0 });
    expect(positioned.announcePositionedMenu).toHaveBeenCalledOnce();
  });

  it('should leave a menu shown at a position alone once unloaded', () => {
    vi.spyOn(Menu.prototype, 'showAtPosition').mockReturnThis();
    const positioned = createPositionedAnnouncer([], 'positioned', true);
    loadComponent({ deferredMenuAnnouncers: [], menuAnnouncers: [], positionedMenuAnnouncers: [positioned] }).unload();

    createMenuAnchoredTo(createDiv()).showAtPosition({ x: 0, y: 0 });

    expect(positioned.announcePositionedMenu).not.toHaveBeenCalled();
  });

  function loadComponent(
    announcers: Announcers,
    testApp: TestApp = createApp([])
  ): MenuPatchComponent {
    const component = new MenuPatchComponent({ app: testApp.app, positionedMenuAnnouncers: [], ...announcers });
    component.load();
    loadedComponents.push(component);
    return component;
  }
});

function createAnnouncer(calls: string[], name: string, isClaiming: boolean): MenuAnnouncer {
  return {
    announceMenu: vi.fn((_menu: MenuOriginal, _event: MouseEvent) => {
      calls.push(name);
      return isClaiming;
    })
  };
}

/**
 * An app whose workspace has a leaf in each of the given windows, and which keeps the window handlers it is given.
 *
 * @param leafWindows - The window of each leaf.
 * @returns The app.
 */
function createApp(leafWindows: Window[]): TestApp {
  const windowHandlers = new Map<string, WindowHandler>();
  const events = new Events();
  const app = castTo<AppOriginal>({
    workspace: {
      iterateAllLeaves: (callback: (leaf: unknown) => void): void => {
        for (const win of leafWindows) {
          callback({ getContainer: () => ({ win }) });
        }
      },
      on: (name: string, handler: WindowHandler): unknown => {
        windowHandlers.set(name, handler);
        return events.on(name, castTo<(...data: unknown[]) => unknown>(handler));
      }
    }
  });
  return { app, windowHandlers };
}

function createDeferredAnnouncer(calls: string[], name: string, isClaiming: boolean): DeferredMenuAnnouncer {
  return {
    announceDeferredMenu: vi.fn((_menu: MenuOriginal, _event: MouseEvent, _eventPath: readonly EventTarget[]) => {
      calls.push(name);
      return isClaiming;
    })
  };
}

/**
 * A stand-in for a pop-out window: an event target, so a `contextmenu` event dispatched on it has a path of one.
 *
 * @returns The window.
 */
function createFakeWindow(): Window {
  return castTo<Window>(new EventTarget());
}

/**
 * A menu anchored to an element, as `setParentElement` leaves it.
 *
 * @param parentEl - The element, or `null` for a menu anchored to nothing.
 * @returns The menu.
 */
function createMenuAnchoredTo(parentEl: HTMLElement | null): MenuOriginal {
  const menu = Menu.create2__().asOriginalType2__();
  castTo<AnchoredMenu>(menu).parentEl = parentEl;
  return menu;
}

function createPositionedAnnouncer(calls: string[], name: string, isClaiming: boolean): PositionedMenuAnnouncer {
  return {
    announcePositionedMenu: vi.fn((_menu: MenuOriginal, _parentEl: HTMLElement) => {
      calls.push(name);
      return isClaiming;
    })
  };
}

/**
 * A `contextmenu` event as a listener on `currentTarget` sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function mouseEventWithCurrentTarget(currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}

/**
 * Dispatches a `contextmenu` event on the window, then shows a menu for it, as `Menu.forEvent` does.
 *
 * @param win - The window.
 */
function showAfterDispatch(win: Window): void {
  const event_ = new MouseEvent('contextmenu');
  win.dispatchEvent(event_);
  createMenuAnchoredTo(null).showAtMouseEvent(event_);
}
