import {
  describe,
  expect,
  it
} from 'vitest';

import {
  ALL_PROPERTIES_MENU_EVENT_NAME,
  BASES_COLUMN_MENU_EVENT_NAME,
  BOOKMARKS_MENU_EVENT_NAME,
  BOOKMARKS_VIEW_MENU_EVENT_NAME,
  CALLOUT_MENU_EVENT_NAME,
  CANVAS_VIEW_MENU_EVENT_NAME,
  COMMUNITY_PLUGIN_DISABLED_EVENT_NAME,
  COMMUNITY_PLUGIN_ENABLED_EVENT_NAME,
  COMMUNITY_PLUGIN_MENU_EVENT_NAME,
  COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
  CORE_PLUGIN_DISABLED_EVENT_NAME,
  CORE_PLUGIN_ENABLED_EVENT_NAME,
  CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME,
  CSS_SNIPPET_MENU_EVENT_NAME,
  PDF_OUTLINE_MENU_EVENT_NAME,
  PDF_PAGE_MENU_EVENT_NAME,
  PDF_THUMBNAIL_MENU_EVENT_NAME,
  PLUGIN_API_CONTRACT,
  PLUGIN_API_VERSION,
  PROPERTY_MENU_EVENT_NAME,
  PROPERTY_VALUE_MENU_EVENT_NAME,
  RIBBON_MENU_EVENT_NAME,
  SIDEBAR_TOGGLE_MENU_EVENT_NAME,
  TABLE_CELL_MENU_EVENT_NAME,
  TABLE_HANDLE_MENU_EVENT_NAME,
  WEB_VIEWER_HISTORY_MENU_EVENT_NAME
} from './more-events-api.ts';

/*
 * These values are a WIRE CONTRACT: a consumer hardcodes the event names rather than importing them, and
 * negotiates against the version. So the test asserts the literals themselves — a rename that compiles
 * everywhere in this repo still breaks every plugin already listening, and this is the only thing that
 * notices.
 */
describe('the published contract', () => {
  it('should keep the event names it published', () => {
    expect(CORE_PLUGIN_ENABLED_EVENT_NAME).toBe('more-events:core-plugin-enabled');
    expect(CORE_PLUGIN_DISABLED_EVENT_NAME).toBe('more-events:core-plugin-disabled');
    expect(COMMUNITY_PLUGIN_ENABLED_EVENT_NAME).toBe('more-events:community-plugin-enabled');
    expect(COMMUNITY_PLUGIN_DISABLED_EVENT_NAME).toBe('more-events:community-plugin-disabled');
    expect(BOOKMARKS_MENU_EVENT_NAME).toBe('more-events:bookmarks-menu');
    expect(BOOKMARKS_VIEW_MENU_EVENT_NAME).toBe('more-events:bookmarks-view-menu');
    expect(CANVAS_VIEW_MENU_EVENT_NAME).toBe('more-events:canvas-view-menu');
    expect(RIBBON_MENU_EVENT_NAME).toBe('more-events:ribbon-menu');
    expect(ALL_PROPERTIES_MENU_EVENT_NAME).toBe('more-events:all-properties-menu');
    expect(WEB_VIEWER_HISTORY_MENU_EVENT_NAME).toBe('more-events:web-viewer-history-menu');
    expect(PDF_THUMBNAIL_MENU_EVENT_NAME).toBe('more-events:pdf-thumbnail-menu');
    expect(SIDEBAR_TOGGLE_MENU_EVENT_NAME).toBe('more-events:sidebar-toggle-menu');
    expect(COMMUNITY_PLUGIN_MENU_EVENT_NAME).toBe('more-events:community-plugin-menu');
    expect(CALLOUT_MENU_EVENT_NAME).toBe('more-events:callout-menu');
    expect(CORE_PLUGIN_SETTING_TAB_MENU_EVENT_NAME).toBe('more-events:core-plugin-setting-tab-menu');
    expect(COMMUNITY_PLUGIN_SETTING_TAB_MENU_EVENT_NAME).toBe('more-events:community-plugin-setting-tab-menu');
    expect(TABLE_CELL_MENU_EVENT_NAME).toBe('more-events:table-cell-menu');
    expect(TABLE_HANDLE_MENU_EVENT_NAME).toBe('more-events:table-handle-menu');
    expect(PROPERTY_VALUE_MENU_EVENT_NAME).toBe('more-events:property-value-menu');
    expect(BASES_COLUMN_MENU_EVENT_NAME).toBe('more-events:bases-column-menu');
    expect(PROPERTY_MENU_EVENT_NAME).toBe('more-events:property-menu');
    expect(CSS_SNIPPET_MENU_EVENT_NAME).toBe('more-events:css-snippet-menu');
    expect(PDF_OUTLINE_MENU_EVENT_NAME).toBe('more-events:pdf-outline-menu');
    expect(PDF_PAGE_MENU_EVENT_NAME).toBe('more-events:pdf-page-menu');
  });

  it('should declare every member of the api in the contract', () => {
    expect(Object.keys(PLUGIN_API_CONTRACT).sort()).toEqual([
      'getEnabledCommunityPluginIds',
      'getEnabledCorePluginIds',
      'isCommunityPluginEnabled',
      'isCorePluginEnabled'
    ]);
  });

  it('should publish a contract version independent of the plugin version', () => {
    expect(PLUGIN_API_VERSION).toBe('1.4.0');
  });
});
