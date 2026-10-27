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
  PDF_DISPLAY_MENU_EVENT_NAME,
  PDF_SIDEBAR_MENU_EVENT_NAME
} from '../../api/more-events-api.ts';
import { PdfToolbarMenuEventsComponent } from './pdf-toolbar-menu-events-component.ts';

describe('PdfToolbarMenuEventsComponent', () => {
  it.each(
    [
      ['sidebar', PDF_SIDEBAR_MENU_EVENT_NAME],
      ['display', PDF_DISPLAY_MENU_EVENT_NAME]
    ] as const
  )('should announce the %s options menu with its PDF leaf', (kind, eventName) => {
    const { app, displayOptionsEl, leaf, sidebarOptionsEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const component = new PdfToolbarMenuEventsComponent({ app });

    expect(component.announcePositionedMenu(menu, kind === 'sidebar' ? sidebarOptionsEl : displayOptionsEl)).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(eventName, menu, leaf);
    expect(app.workspace.getLeavesOfType).toHaveBeenCalledWith('pdf');
  });

  it('should leave unrelated anchors and an incomplete toolbar alone', () => {
    const { app } = createApp();
    const component = new PdfToolbarMenuEventsComponent({ app });

    expect(component.announcePositionedMenu(Menu.create2__().asOriginalType2__(), createDiv())).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: App;
  readonly displayOptionsEl: HTMLElement;
  readonly leaf: WorkspaceLeaf;
  readonly sidebarOptionsEl: HTMLElement;
}

function createApp(): TestApp {
  const sidebarOptionsEl = createDiv();
  const toolbarLeftEl = createDiv();
  const zoomInEl = toolbarLeftEl.createDiv();
  const displayOptionsEl = toolbarLeftEl.createDiv();
  const leaf = castTo<WorkspaceLeaf>({ view: { viewer: { child: { toolbar: { sidebarOptionsEl, zoomInEl } } } } });
  const app = castTo<App>({
    workspace: {
      getLeavesOfType: vi.fn(() => [
        castTo<WorkspaceLeaf>({ view: {} }),
        castTo<WorkspaceLeaf>({ view: { viewer: { child: null } } }),
        castTo<WorkspaceLeaf>({ view: { viewer: { child: {} } } }),
        castTo<WorkspaceLeaf>({ view: { viewer: { child: { toolbar: {} } } } }),
        castTo<WorkspaceLeaf>({ view: { viewer: { child: { toolbar: { zoomInEl: createDiv() } } } } }),
        leaf
      ]),
      trigger: vi.fn()
    }
  });
  return { app, displayOptionsEl, leaf, sidebarOptionsEl };
}
