import type {
  App,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  CANVAS_ALIGN_MENU_EVENT_NAME,
  CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME,
  CANVAS_LINE_DIRECTION_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import { CanvasToolbarMenuEventsComponent } from './canvas-toolbar-menu-events-component.ts';

interface TestApp {
  readonly app: App;
  readonly leaf: WorkspaceLeaf;
  readonly menuEl: HTMLElement;
  readonly otherMenuEl: HTMLElement;
}

describe('CanvasToolbarMenuEventsComponent', () => {
  it.each(
    [
      ['lucide-align-start-vertical', CANVAS_ALIGN_MENU_EVENT_NAME],
      ['lucide-image', CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME],
      ['line-horizontal', CANVAS_LINE_DIRECTION_MENU_EVENT_NAME],
      ['lucide-arrow-right', CANVAS_LINE_DIRECTION_MENU_EVENT_NAME],
      ['lucide-move-horizontal', CANVAS_LINE_DIRECTION_MENU_EVENT_NAME]
    ] as const
  )('should announce the menu of the %s button with its canvas leaf and a copy of the selection', (icon, eventName) => {
    const { app, leaf, menuEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const component = new CanvasToolbarMenuEventsComponent({ app });

    expect(component.announcePositionedMenu(menu, createButton(menuEl, icon))).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(eventName, menu, leaf, {
      edges: [{ id: 'e1' }],
      nodes: [{ id: 'n1' }]
    });
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('canvas');
  });

  it('should leave a button of another icon, an icon-less anchor and a button outside every canvas toolbar alone', () => {
    const { app, menuEl, otherMenuEl } = createApp();
    const component = new CanvasToolbarMenuEventsComponent({ app });
    const menu = Menu.create2__().asOriginalType2__();

    expect(component.announcePositionedMenu(menu, createButton(menuEl, 'lucide-palette'))).toBe(false);
    expect(component.announcePositionedMenu(menu, menuEl.createEl('button'))).toBe(false);
    expect(component.announcePositionedMenu(menu, createButton(otherMenuEl, 'lucide-align-start-vertical'))).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

function createApp(): TestApp {
  const menuEl = createDiv();
  const otherMenuEl = createDiv();
  const node = { getData: (): object => ({ id: 'n1' }), id: 'n1' };
  const edge = { getData: (): object => ({ id: 'e1' }), id: 'e1' };
  const canvas = {
    edges: new Map([['e1', edge]]),
    menu: { menuEl },
    nodes: new Map([['n1', node]]),
    selection: new Set([edge, node])
  };
  const leaf = castTo<WorkspaceLeaf>({ view: { canvas } });
  const app = castTo<App>({
    workspace: {
      getLeavesOfType: vi.fn(() => [
        // A deferred leaf has no canvas yet.
        castTo<WorkspaceLeaf>({ view: {} }),
        castTo<WorkspaceLeaf>({ view: { canvas: { menu: { menuEl: createDiv() } } } }),
        leaf
      ]),
      trigger: vi.fn()
    }
  });
  return { app, leaf, menuEl, otherMenuEl };
}

function createButton(parentEl: HTMLElement, icon: string): HTMLElement {
  const buttonEl = parentEl.createEl('button', 'clickable-icon');
  const svgEl = buttonEl.createSvg('svg');
  svgEl.addClass('svg-icon', icon);
  return buttonEl;
}
