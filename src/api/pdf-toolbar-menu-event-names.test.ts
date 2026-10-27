import {
  expect,
  it
} from 'vitest';

import {
  PDF_DISPLAY_MENU_EVENT_NAME,
  PDF_SIDEBAR_MENU_EVENT_NAME
} from './more-events-api.ts';

it('should preserve the published PDF toolbar menu names', () => {
  expect(PDF_DISPLAY_MENU_EVENT_NAME).toBe('more-events:pdf-display-menu');
  expect(PDF_SIDEBAR_MENU_EVENT_NAME).toBe('more-events:pdf-sidebar-menu');
});
