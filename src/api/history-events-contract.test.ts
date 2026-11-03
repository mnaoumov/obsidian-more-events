import {
  describe,
  expect,
  expectTypeOf,
  it
} from 'vitest';

import type { LinkOpenRequest } from '../../api.d.ts';

import {
  BEFORE_LINK_OPEN_EVENT_NAME,
  CONFIG_CHANGED_EVENT_NAME
} from './more-events-api.ts';

interface ExpectedLinkOpenRequest {
  readonly linktext: string;
  readonly sourcePath: string;
}

describe('History-request event contract', () => {
  it('should keep published event strings and plain link request fields stable', () => {
    expect(CONFIG_CHANGED_EVENT_NAME).toBe('more-events:config-changed');
    expect(BEFORE_LINK_OPEN_EVENT_NAME).toBe('more-events:before-link-open');
    expectTypeOf<LinkOpenRequest>().toEqualTypeOf<ExpectedLinkOpenRequest>();
  });
});
