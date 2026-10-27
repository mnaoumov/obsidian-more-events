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

import { ALL_PROPERTIES_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { AllPropertiesMenuEventsComponent } from './all-properties-menu-events-component.ts';

interface ViewItem {
  readonly property: ViewProperty;
  readonly selfEl: HTMLElement;
}

interface ViewProperty {
  readonly name: string;
}

describe('AllPropertiesMenuEventsComponent', () => {
  let app: AppOriginal;
  let component: AllPropertiesMenuEventsComponent;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
    component = new AllPropertiesMenuEventsComponent({ app });
    component.load();
  });

  afterEach(() => {
    component.unload();
    vi.restoreAllMocks();
  });

  it('should announce the menu of one property, shown from its own listener', () => {
    const status = mockItem('status');
    const otherLeaf = mockAllPropertiesLeaf([mockItem('other')], []);
    const leaf = mockAllPropertiesLeaf([mockItem('tags'), status], [status]);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([otherLeaf, leaf]);
    const handler = vi.fn();
    app.workspace.on(ALL_PROPERTIES_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, mouseEventWithCurrentTarget(status.selfEl))).toBe(true);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('all-properties');
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, ['status']);
  });

  it('should name the whole selection when the property right-clicked is part of a multiple selection', () => {
    const status = mockItem('status');
    const tags = mockItem('tags');
    const leaf = mockAllPropertiesLeaf([status, tags, mockItem('aliases')], [tags, status]);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([leaf]);
    const handler = vi.fn();
    app.workspace.on(ALL_PROPERTIES_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, mouseEventWithCurrentTarget(status.selfEl))).toBe(true);
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, ['tags', 'status']);
  });

  it('should name only the property right-clicked when it is outside a multiple selection', () => {
    const aliases = mockItem('aliases');
    const status = mockItem('status');
    const tags = mockItem('tags');
    const leaf = mockAllPropertiesLeaf([status, tags, aliases], [tags, status]);
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([leaf]);
    const handler = vi.fn();
    app.workspace.on(ALL_PROPERTIES_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, mouseEventWithCurrentTarget(aliases.selfEl))).toBe(true);
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, ['aliases']);
  });

  it('should leave a menu shown from any other listener alone', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([mockAllPropertiesLeaf([mockItem('status')], [])]);
    const handler = vi.fn();
    app.workspace.on(ALL_PROPERTIES_MENU_EVENT_NAME, handler);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(createDiv()))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should skip a deferred leaf, which has no items yet', () => {
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([castTo<WorkspaceLeaf>({ view: {} })]);

    expect(component.announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(createDiv()))).toBe(false);
  });

  it('should name the property right-clicked when the view has no tree to read a selection from', () => {
    const status = mockItem('status');
    const leaf = castTo<WorkspaceLeaf>({ view: { doms: { status } } });
    vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([leaf]);
    const handler = vi.fn();
    app.workspace.on(ALL_PROPERTIES_MENU_EVENT_NAME, handler);
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announceMenu(menu, mouseEventWithCurrentTarget(status.selfEl))).toBe(true);
    expect(handler).toHaveBeenCalledExactlyOnceWith(menu, leaf, ['status']);
  });
});

function mockAllPropertiesLeaf(items: readonly ViewItem[], selectedItems: readonly ViewItem[]): WorkspaceLeaf {
  return castTo<WorkspaceLeaf>({
    view: {
      doms: Object.fromEntries(items.map((item) => [item.property.name, item])),
      tree: {
        selectedDoms: new Set(selectedItems)
      }
    }
  });
}

function mockItem(name: string): ViewItem {
  return {
    property: { name },
    selfEl: createDiv()
  };
}

/**
 * A right-click as a listener on `currentTarget` sees it while it is being dispatched.
 *
 * @param currentTarget - The element whose listener is running.
 * @returns The event.
 */
function mouseEventWithCurrentTarget(currentTarget: HTMLElement): MouseEvent {
  const event_ = new MouseEvent('contextmenu');
  Object.defineProperty(event_, 'currentTarget', { value: currentTarget });
  return event_;
}
