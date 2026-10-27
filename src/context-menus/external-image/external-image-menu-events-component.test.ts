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

import { EXTERNAL_IMAGE_MENU_EVENT_NAME } from '../../api/more-events-api.ts';
import { ExternalImageMenuEventsComponent } from './external-image-menu-events-component.ts';

const EMBED_LINE = 3;
const EMBED_OFFSET = 21;
const IMAGE_URL = 'https://example.com/image.png';

describe('ExternalImageMenuEventsComponent', () => {
  it('should announce the menu of an external image in a Markdown view', () => {
    const { app, embedEl, imageEl, leaf, wrapperEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();

    expect(isAnnounced(app, menu, [imageEl, wrapperEl, embedEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(EXTERNAL_IMAGE_MENU_EVENT_NAME, menu, leaf, {
      line: EMBED_LINE,
      url: IMAGE_URL
    });
  });

  it('should leave a menu shown on no image alone', () => {
    const { app, editorEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [editorEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave an image embedded from the vault alone', () => {
    const { app, editorEl } = createApp();
    const internalEmbedEl = editorEl.createDiv({ cls: 'internal-embed image-embed' });
    const wrapperEl = internalEmbedEl.createDiv({ cls: 'image-wrapper' });
    const imageEl = wrapperEl.createEl('img', { attr: { src: 'app://local/image.png' } });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [imageEl, wrapperEl, internalEmbedEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave an image wrapper outside an image embed alone', () => {
    const { app, editorEl } = createApp();
    const wrapperEl = editorEl.createDiv({ cls: 'image-wrapper' });
    wrapperEl.createEl('img', { attr: { src: IMAGE_URL } });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [wrapperEl, editorEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave an image wrapper with no image alone', () => {
    const { app, editorEl } = createApp();
    const embedEl = editorEl.createDiv({ cls: 'image-embed' });
    const wrapperEl = embedEl.createDiv({ cls: 'image-wrapper' });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [wrapperEl, embedEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave an image outside every Markdown view alone', () => {
    const { app } = createApp();
    const strayEmbedEl = createDiv({ cls: 'image-embed' });
    const strayWrapperEl = strayEmbedEl.createDiv({ cls: 'image-wrapper' });
    strayWrapperEl.createEl('img', { attr: { src: IMAGE_URL } });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [strayWrapperEl, strayEmbedEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });
});

interface TestApp {
  readonly app: AppOriginal;
  readonly editorEl: HTMLElement;
  readonly embedEl: HTMLElement;
  readonly imageEl: HTMLElement;
  readonly leaf: WorkspaceLeaf;
  readonly wrapperEl: HTMLElement;
}

function createApp(): TestApp {
  const editorEl = createDiv({ cls: 'cm-editor' });
  const embedEl = editorEl.createDiv({ cls: 'image-embed' });
  const wrapperEl = embedEl.createDiv({ cls: 'image-wrapper' });
  const imageEl = wrapperEl.createEl('img', { attr: { src: IMAGE_URL } });

  const editor = {
    cm: {
      dom: editorEl,
      posAtDOM: (node: Node): number => node === embedEl ? EMBED_OFFSET : -1
    },
    offsetToPos: (offset: number): EditorPosition => ({ ch: 0, line: offset === EMBED_OFFSET ? EMBED_LINE : -1 })
  };
  const leaf = castTo<WorkspaceLeaf>({ view: { editor } });

  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): WorkspaceLeaf[] => viewType === 'markdown' ? [leaf] : [],
      trigger: vi.fn()
    }
  });
  return { app, editorEl, embedEl, imageEl, leaf, wrapperEl };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new ExternalImageMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}
