import type {
  App as AppOriginal,
  EditorPosition,
  Menu as MenuOriginal,
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

import { CalloutMenuEventsComponent } from './callout-menu-events-component.ts';
import { CALLOUT_MENU_EVENT_NAME } from './more-events-api.ts';

const HEADER_LINE = 2;
const HEADER_OFFSET = 17;

describe('CalloutMenuEventsComponent', () => {
  it('should announce the menu of a callout in a Markdown view', () => {
    const { app, calloutEl, leaf } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const titleEl = calloutEl.createDiv();

    expect(isAnnounced(app, menu, [titleEl, calloutEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(CALLOUT_MENU_EVENT_NAME, menu, leaf, {
      line: HEADER_LINE,
      type: 'Warning'
    });
  });

  it('should leave a menu shown on no callout alone', () => {
    const { app, editorEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [editorEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a callout outside every Markdown view alone', () => {
    const { app } = createApp();
    const strayCalloutEl = createDiv({ cls: 'cm-embed-block cm-callout' });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [strayCalloutEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly calloutEl: HTMLElement;
  readonly editorEl: HTMLElement;
  readonly leaf: WorkspaceLeaf;
}

function createApp(): TestApp {
  const editorEl = createDiv({ cls: 'cm-editor' });
  const calloutEl = editorEl.createDiv({ cls: 'cm-embed-block cm-callout' });
  const otherEditorEl = createDiv({ cls: 'cm-editor' });

  const editor = {
    cm: {
      dom: editorEl,
      posAtDOM: (node: Node): number => node === calloutEl ? HEADER_OFFSET : -1
    },
    getLine: (line: number): string => line === HEADER_LINE ? '> [!Warning]- Mind the gap' : '',
    offsetToPos: (offset: number): EditorPosition => ({ ch: 0, line: offset === HEADER_OFFSET ? HEADER_LINE : -1 })
  };
  const otherEditor = { cm: { dom: otherEditorEl } };
  const deferredLeaf = castTo<WorkspaceLeaf>({ view: {} });
  const otherLeaf = castTo<WorkspaceLeaf>({ view: { editor: otherEditor } });
  const leaf = castTo<WorkspaceLeaf>({ view: { editor } });

  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): WorkspaceLeaf[] => viewType === 'markdown' ? [deferredLeaf, otherLeaf, leaf] : [],
      trigger: vi.fn()
    }
  });
  return { app, calloutEl, editorEl, leaf };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new CalloutMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
