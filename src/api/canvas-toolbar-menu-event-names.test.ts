import {
  expect,
  it
} from 'vitest';

import {
  CANVAS_ALIGN_MENU_EVENT_NAME,
  CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME,
  CANVAS_LINE_DIRECTION_MENU_EVENT_NAME
} from './more-events-api.ts';

it('should preserve the published canvas toolbar menu names', () => {
  expect(CANVAS_ALIGN_MENU_EVENT_NAME).toBe('more-events:canvas-align-menu');
  expect(CANVAS_GROUP_BACKGROUND_MENU_EVENT_NAME).toBe('more-events:canvas-group-background-menu');
  expect(CANVAS_LINE_DIRECTION_MENU_EVENT_NAME).toBe('more-events:canvas-line-direction-menu');
});
