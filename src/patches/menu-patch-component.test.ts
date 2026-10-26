import type { Menu as MenuOriginal } from 'obsidian';

import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { MenuAnnouncer } from './menu-patch-component.ts';

import { MenuPatchComponent } from './menu-patch-component.ts';

describe('MenuPatchComponent', () => {
  const loadedComponents: MenuPatchComponent[] = [];

  afterEach(() => {
    while (loadedComponents.length > 0) {
      loadedComponents.pop()?.unload();
    }
    vi.restoreAllMocks();
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
    loadComponent([first, second, third]);
    const menu = Menu.create2__().asOriginalType2__();
    const event_ = new MouseEvent('contextmenu');

    const returned = menu.showAtMouseEvent(event_);

    expect(calls).toEqual(['first', 'second', 'show']);
    expect(first.announceMenu).toHaveBeenCalledWith(menu, event_);
    expect(third.announceMenu).not.toHaveBeenCalled();
    // Transparent: the original still ran, on the same menu and event, and its return value came back.
    expect(showSpy).toHaveBeenCalledWith(event_);
    expect(returned).toBe(menu);
  });

  it('should leave the menu alone once unloaded', () => {
    vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockReturnThis();
    const announcer = createAnnouncer([], 'only', true);
    loadComponent([announcer]).unload();

    Menu.create2__().asOriginalType2__().showAtMouseEvent(new MouseEvent('contextmenu'));

    expect(announcer.announceMenu).not.toHaveBeenCalled();
  });

  function loadComponent(menuAnnouncers: MenuAnnouncer[]): MenuPatchComponent {
    const component = new MenuPatchComponent({ menuAnnouncers });
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
