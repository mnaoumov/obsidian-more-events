import {
  expect,
  it
} from 'vitest';

import {
  CANVAS_CONTENT_CHANGED_EVENT_NAME,
  CANVAS_NODE_EDITING_CHANGED_EVENT_NAME,
  CANVAS_READ_ONLY_CHANGED_EVENT_NAME,
  CANVAS_SELECTION_CHANGED_EVENT_NAME,
  CANVAS_TOOLBAR_RENDERED_EVENT_NAME
} from './more-events-api.ts';

it('should preserve the published canvas event names', () => {
  expect(CANVAS_CONTENT_CHANGED_EVENT_NAME).toBe('more-events:canvas-content-changed');
  expect(CANVAS_NODE_EDITING_CHANGED_EVENT_NAME).toBe('more-events:canvas-node-editing-changed');
  expect(CANVAS_READ_ONLY_CHANGED_EVENT_NAME).toBe('more-events:canvas-read-only-changed');
  expect(CANVAS_SELECTION_CHANGED_EVENT_NAME).toBe('more-events:canvas-selection-changed');
  expect(CANVAS_TOOLBAR_RENDERED_EVENT_NAME).toBe('more-events:canvas-toolbar-rendered');
});
