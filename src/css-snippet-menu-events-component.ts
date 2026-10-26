import type {
  App,
  Menu
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { CssSnippetMenuItem } from '../api.d.ts';
import type { DeferredMenuAnnouncer } from './patches/menu-patch-component.ts';

import { CSS_SNIPPET_MENU_EVENT_NAME } from './more-events-api.ts';

/**
 * The id of the **Appearance** settings tab, whose **CSS snippets** page lists the snippets.
 */
const APPEARANCE_SETTING_TAB_ID = 'appearance';

/**
 * The class of a `Setting` row, and of its name element.
 */
const SETTING_ITEM_CLASS = 'setting-item';
const SETTING_ITEM_NAME_SELECTOR = '.setting-item-name';

/**
 * Parameters for the {@link CssSnippetMenuEventsComponent} constructor.
 */
export interface CssSnippetMenuEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * The Settings modal, as far as knowing a snippet row is shown in it needs it.
 */
interface AppSetting {
  readonly activeTab: null | SettingTabEntry;
  readonly modalEl: HTMLElement;
}

/**
 * The app, as far as telling a CSS snippet's row menu apart needs it.
 */
interface AppWithSetting {
  readonly customCss: CustomCss;
  readonly setting?: AppSetting;
}

/**
 * The snippet manager, as far as knowing which snippets exist needs it.
 */
interface CustomCss {
  readonly snippets: readonly string[];
}

/**
 * One settings tab.
 */
interface SettingTabEntry {
  readonly id: string;
}

/**
 * Publishes the context-menu event of a snippet's row on the **CSS snippets** page of **Settings -> Appearance**.
 *
 * **That menu fires nothing, so it is announced through {@link DeferredMenuAnnouncer}.** On the desktop app, each
 * snippet row's `Setting` gets `settingEl.oncontextmenu` when it is rendered (`app.js:223363`), which fills
 * `Menu.forEvent(evt)` with **Show in system explorer** (**Reveal in Finder** on macOS). `Menu.forEvent` shows the
 * menu on a later task, so it is recognized by the row being on the event's recorded path.
 *
 * The page is not inside the **Appearance** tab's `containerEl`: it is a `.setting-page` of the Settings modal
 * (measured in the real app, 2026-10-25), so the row is looked for inside the modal while that tab is active. The
 * row carries no snippet id, only the snippet's name as its name text, which Obsidian builds the row from, so the
 * name is matched against `app.customCss.snippets`. Of the rows on that page, only snippet rows set
 * `oncontextmenu`, which keeps the page's heading and empty-state rows out.
 */
export class CssSnippetMenuEventsComponent extends Component implements DeferredMenuAnnouncer {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: CssSnippetMenuEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Announces the menu of a CSS snippet's row.
   *
   * @param menu - The menu about to be shown.
   * @param _mouseEvent - The mouse event it is being shown for.
   * @param eventPath - The event's recorded path.
   * @returns `true` when the right-click landed on a known snippet's row in the Settings modal's **Appearance** tab.
   */
  public announceDeferredMenu(menu: Menu, _mouseEvent: MouseEvent, eventPath: readonly EventTarget[]): boolean {
    const app = castTo<AppWithSetting>(this.app);
    if (app.setting?.activeTab?.id !== APPEARANCE_SETTING_TAB_ID || !eventPath.includes(app.setting.modalEl)) {
      return false;
    }

    const rowEl = eventPath.find(isSnippetRowEl);
    const name = rowEl?.querySelector(SETTING_ITEM_NAME_SELECTOR)?.textContent;
    if (name === undefined || !app.customCss.snippets.includes(name)) {
      return false;
    }

    const snippet: CssSnippetMenuItem = { name };
    this.app.workspace.trigger(CSS_SNIPPET_MENU_EVENT_NAME, menu, snippet);
    return true;
  }
}

function isSnippetRowEl(eventTarget: EventTarget): eventTarget is HTMLElement {
  // Duck-typed rather than `instanceof HTMLElement`, which is false for an element of another window.
  const el = castTo<Partial<HTMLElement>>(eventTarget);
  return (el.classList?.contains(SETTING_ITEM_CLASS) ?? false) && !!el.oncontextmenu;
}
