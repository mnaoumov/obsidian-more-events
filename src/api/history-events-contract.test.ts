import type { LinkOpenRequest } from '../../api.d.ts';

import {
  describe,
  expect,
  expectTypeOf,
  it
} from 'vitest';

import {
  BEFORE_LINK_OPEN_EVENT_NAME,
  CONFIG_CHANGED_EVENT_NAME
} from './more-events-api.ts';

describe('History-request event contract', () => {
  it('should keep published event strings and plain link request fields stable', () => {
    expect(CONFIG_CHANGED_EVENT_NAME).toBe('more-events:config-changed');
    expect(BEFORE_LINK_OPEN_EVENT_NAME).toBe('more-events:before-link-open');
    expectTypeOf<LinkOpenRequest>().toEqualTypeOf<{ readonly linktext: string; readonly sourcePath: string }>();
  });
});
