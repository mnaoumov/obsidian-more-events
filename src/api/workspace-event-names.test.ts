import {
  describe,
  expect,
  it
} from 'vitest';

import {
  COMMUNITY_PLUGIN_UNINSTALLED_EVENT_NAME,
  INDEX_READY_EVENT_NAME,
  LEAF_CLOSED_EVENT_NAME,
  LEAF_VISIBILITY_CHANGED_EVENT_NAME,
  MARKDOWN_MODE_CHANGED_EVENT_NAME,
  MARKDOWN_PREVIEW_RENDERED_EVENT_NAME
} from './more-events-api.ts';

describe('the additive workspace contract', () => {
  it('should preserve the names consumers hardcode across plugin boundaries', () => {
    expect([
      COMMUNITY_PLUGIN_UNINSTALLED_EVENT_NAME,
      INDEX_READY_EVENT_NAME,
      LEAF_CLOSED_EVENT_NAME,
      LEAF_VISIBILITY_CHANGED_EVENT_NAME,
      MARKDOWN_MODE_CHANGED_EVENT_NAME,
      MARKDOWN_PREVIEW_RENDERED_EVENT_NAME
    ]).toEqual([
      'more-events:community-plugin-uninstalled',
      'more-events:index-ready',
      'more-events:leaf-closed',
      'more-events:leaf-visibility-changed',
      'more-events:markdown-mode-changed',
      'more-events:markdown-preview-rendered'
    ]);
  });
});
