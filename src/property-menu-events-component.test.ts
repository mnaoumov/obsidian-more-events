import type {
  App as AppOriginal,
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

import { PROPERTY_MENU_EVENT_NAME } from './more-events-api.ts';
import { PropertyMenuEventsComponent } from './property-menu-events-component.ts';

describe('PropertyMenuEventsComponent', () => {
  it('should announce the menu shown from a property\'s icon in a Markdown view, with the key as written', () => {
    const { app, markdownLeaf, topicsIconEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new PropertyMenuEventsComponent({ app }).announceMenu(menu, mouseEventWithCurrentTarget(topicsIconEl))).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(PROPERTY_MENU_EVENT_NAME, menu, markdownLeaf, { key: 'Topics' });
  });

  it('should announce the menu shown from a property\'s icon in the Properties view', () => {
    const { app, propertiesIconEl, propertiesLeaf } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(new PropertyMenuEventsComponent({ app }).announceMenu(menu, mouseEventWithCurrentTarget(propertiesIconEl))).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(PROPERTY_MENU_EVENT_NAME, menu, propertiesLeaf, { key: 'tags' });
  });

  it('should leave a menu shown from any other listener alone', () => {
    const { app } = createApp();

    expect(new PropertyMenuEventsComponent({ app }).announceMenu(Menu.create2__().asOriginalType2__(), mouseEventWithCurrentTarget(createDiv())))
      .toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu shown after the dispatch alone', () => {
    const { app } = createApp();

    expect(new PropertyMenuEventsComponent({ app }).announceMenu(Menu.create2__().asOriginalType2__(), new MouseEvent('contextmenu'))).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly markdownLeaf: WorkspaceLeaf;
  readonly propertiesIconEl: HTMLElement;
  readonly propertiesLeaf: WorkspaceLeaf;
  readonly topicsIconEl: HTMLElement;
}

function createApp(): TestApp {
  const topicsIconEl = createSpan();
  const propertiesIconEl = createSpan();

  const markdownLeaf = castTo<WorkspaceLeaf>({
    view: {
      metadataEditor: {
        rendered: [
          { entry: { key: 'status', value: 'done' }, iconEl: createSpan() },
          { entry: { key: 'Topics', value: ['alpha'] }, iconEl: topicsIconEl }
        ]
      }
    }
  });
  const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
  const propertiesLeaf = castTo<WorkspaceLeaf>({
    view: {
      metadataEditor: {
        rendered: [{ entry: { key: 'tags', value: 'draft' }, iconEl: propertiesIconEl }]
      }
    }
  });

  const leavesByType: Record<string, WorkspaceLeaf[]> = {
    'file-properties': [propertiesLeaf],
    'markdown': [deferredLeaf, markdownLeaf]
  };
  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): WorkspaceLeaf[] => leavesByType[viewType] ?? [],
      trigger: vi.fn()
    }
  });
  return { app, markdownLeaf, propertiesIconEl, propertiesLeaf, topicsIconEl };
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
