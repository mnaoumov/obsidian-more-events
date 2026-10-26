import type {
  App as AppOriginal,
  Menu as MenuOriginal
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Menu } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { CssSnippetMenuEventsComponent } from './css-snippet-menu-events-component.ts';
import { CSS_SNIPPET_MENU_EVENT_NAME } from './more-events-api.ts';

const SNIPPET_NAME = 'Wide tables';

describe('CssSnippetMenuEventsComponent', () => {
  it('should announce the menu of a known snippet\'s row', () => {
    const { app, modalEl, rowEl } = createApp();
    const menu = Menu.create2__().asOriginalType2__();
    const nameEl = castTo<HTMLElement>(rowEl.querySelector('.setting-item-name'));

    expect(isAnnounced(app, menu, [nameEl, rowEl, modalEl, window])).toBe(true);
    expect(app.workspace.trigger).toHaveBeenCalledExactlyOnceWith(CSS_SNIPPET_MENU_EVENT_NAME, menu, { name: SNIPPET_NAME });
  });

  it('should leave a menu shown outside the Settings modal alone', () => {
    const { app, rowEl } = createApp();

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [rowEl, window])).toBe(false);
    expect(app.workspace.trigger).not.toHaveBeenCalled();
  });

  it('should leave a menu shown while another tab is active alone', () => {
    const { app, modalEl, rowEl, setting } = createApp();
    setting.activeTab = { id: 'community-plugins' };

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [rowEl, modalEl, window])).toBe(false);
  });

  it('should leave a row with no context-menu listener alone', () => {
    const { app, modalEl } = createApp();
    const headingEl = modalEl.createDiv({ cls: 'setting-item' });
    headingEl.createDiv({ cls: 'setting-item-name', text: SNIPPET_NAME });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [headingEl, modalEl, window])).toBe(false);
  });

  it('should leave the row of a name that is not a known snippet alone', () => {
    const { app, modalEl, rowEl } = createApp();
    castTo<HTMLElement>(rowEl.querySelector('.setting-item-name')).setText('Removed snippet');

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [rowEl, modalEl, window])).toBe(false);
  });

  it('should leave a row with no name element alone', () => {
    const { app, modalEl } = createApp();
    const rowEl = modalEl.createDiv({ cls: 'setting-item' });
    // eslint-disable-next-line unicorn/prefer-add-event-listener -- Obsidian assigns the property, and the component reads it.
    rowEl.oncontextmenu = noop;

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [rowEl, modalEl, window])).toBe(false);
  });

  it('should leave every menu alone before the Settings modal exists', () => {
    const app = castTo<AppOriginal>({ customCss: { snippets: [] }, workspace: { trigger: vi.fn() } });

    expect(isAnnounced(app, Menu.create2__().asOriginalType2__(), [window])).toBe(false);
  });
});

interface MutableSetting {
  activeTab: null | SettingTabStub;
  readonly modalEl: HTMLElement;
}

interface SettingTabStub {
  readonly id: string;
}

interface TestApp {
  readonly app: AppOriginal;
  readonly modalEl: HTMLElement;
  readonly rowEl: HTMLElement;
  readonly setting: MutableSetting;
}

function createApp(): TestApp {
  const modalEl = createDiv();
  const rowEl = modalEl.createDiv({ cls: 'setting-item' });
  rowEl.createDiv({ cls: 'setting-item-name', text: SNIPPET_NAME });
  // eslint-disable-next-line unicorn/prefer-add-event-listener -- Obsidian assigns the property, and the component reads it.
  rowEl.oncontextmenu = noop;
  const setting: MutableSetting = { activeTab: { id: 'appearance' }, modalEl };
  const app = castTo<AppOriginal>({
    customCss: { snippets: ['other', SNIPPET_NAME] },
    setting,
    workspace: { trigger: vi.fn() }
  });
  return { app, modalEl, rowEl, setting };
}

function isAnnounced(app: AppOriginal, menu: MenuOriginal, eventPath: EventTarget[]): boolean {
  return new CssSnippetMenuEventsComponent({ app }).announceDeferredMenu(menu, new MouseEvent('contextmenu'), eventPath);
}

function noop(): void {
  // A stand-in for Obsidian's `oncontextmenu` handler, which only has to be set.
}
