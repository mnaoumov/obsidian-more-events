import type { App as AppOriginal } from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RIBBON_MENU_EVENT_NAME } from './more-events-api.ts';
import { RibbonMenuEventsComponent } from './ribbon-menu-events-component.ts';

describe('RibbonMenuEventsComponent', () => {
  it('should announce the menu the left ribbon shows from its own listener', () => {
    const { app, leftRibbonEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new RibbonMenuEventsComponent({ app }).announceMenu(menu, mouseEventWithCurrentTarget(leftRibbonEl))).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(RIBBON_MENU_EVENT_NAME, menu, 'left');
  });

  it('should announce the menu the right ribbon shows from its own listener', () => {
    const { app, rightRibbonEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new RibbonMenuEventsComponent({ app }).announceMenu(menu, mouseEventWithCurrentTarget(rightRibbonEl))).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(RIBBON_MENU_EVENT_NAME, menu, 'right');
  });

  it('should leave a menu shown from any other listener alone', () => {
    const { app } = createApp();

    expect(new RibbonMenuEventsComponent({ app }).announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(createDiv())))
      .toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu shown after the dispatch alone', () => {
    const { app } = createApp();

    expect(new RibbonMenuEventsComponent({ app }).announceMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'))).toBe(false);
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly leftRibbonEl: HTMLElement;
  readonly rightRibbonEl: HTMLElement;
}

function createApp(): TestApp {
  const leftRibbonEl = createDiv();
  const rightRibbonEl = createDiv();
  const app = castTo<AppOriginal>({
    workspace: {
      leftRibbon: { containerEl: leftRibbonEl },
      rightRibbon: { containerEl: rightRibbonEl },
      trigger: vi.fn()
    }
  });
  return { app, leftRibbonEl, rightRibbonEl };
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
