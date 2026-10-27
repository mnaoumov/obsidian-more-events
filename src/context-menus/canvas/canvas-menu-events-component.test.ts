import type {
  App as AppOriginal,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  App,
  Menu
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { CANVAS_VIEW_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { CanvasMenuEventsComponent } from './canvas-menu-events-component.ts';

describe('CanvasMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: CanvasMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new CanvasMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  it('should announce the menu a canvas shows from its own listener, with the position in canvas coordinates', () => {
    const wrapperEl = createDiv();
    const posFromEvent = vi.fn(() => ({ extra: true, x: 12, y: -34 }));
    const otherLeaf = mockCanvasLeaf(createDiv(), vi.fn());
    const leaf = mockCanvasLeaf(wrapperEl, posFromEvent);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([otherLeaf, leaf]);
    const handler = vi.fn();
    app.workspace.on(CANVAS_VIEW_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();
    const mouseEvent = mouseEventWithCurrentTarget('contextmenu', wrapperEl);

    expect(component.announceMenu(menu, mouseEvent)).toBe(true);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('canvas');
    expect(posFromEvent).toHaveBeenCalledWith(mouseEvent);
    // A plain copy of the two coordinates, not the object the canvas returned.
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, { x: 12, y: -34 });
  });

  it('should leave a menu shown from any other listener alone', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockCanvasLeaf(createDiv(), vi.fn())]);
    const handler = vi.fn();
    app.workspace.on(CANVAS_VIEW_MENU_EVENT_NAME, handler);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget('contextmenu', createDiv()))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should skip a deferred canvas leaf, which has no canvas yet', () => {
    const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([deferredLeaf]);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget('contextmenu', createDiv()))).toBe(false);
  });

  it('should leave a menu shown for an event other than a right-click alone', () => {
    const wrapperEl = createDiv();
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockCanvasLeaf(wrapperEl, vi.fn())]);
    const handler = vi.fn();
    app.workspace.on(CANVAS_VIEW_MENU_EVENT_NAME, handler);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget('pointerup', wrapperEl))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

function mockCanvasLeaf(wrapperEl: HTMLElement, posFromEvent: (mouseEvent: MouseEvent) => unknown): WorkspaceLeaf {
  return castTo<WorkspaceLeaf>({
    view: {
      canvas: {
        // eslint-disable-next-line unicorn/name-replacements -- Obsidian's own method name, which the component calls.
        posFromEvt: posFromEvent,
        wrapperEl
      }
    }
  });
}

/**
 * A mouse event as a listener on `currentTarget` sees it while it is being dispatched.
 *
 * @param type - The event type.
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function mouseEventWithCurrentTarget(type: string, currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent(type);
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}
