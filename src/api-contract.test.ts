import type {
  ApiMethodCases,
  PayloadCases
} from '@mnaoumov/typescript-lib/api-contract-verifier';

import {
  validateSync,
  verifyApiContract
} from '@mnaoumov/typescript-lib/api-contract-verifier';
import {
  describe,
  expect,
  it
} from 'vitest';

import type { MoreEventsApi } from '../api.d.ts';

import { MORE_EVENTS_API_CONTRACT } from '../api-contract.ts';

const NO_ARGUMENTS: PayloadCases = { invalid: [['extra'], null, undefined], valid: [[]] };
const PLUGIN_ID: PayloadCases = { invalid: [[], [null], [1], ['canvas', 'extra'], 'canvas'], valid: [['canvas']] };
const BOOLEAN: PayloadCases = { invalid: [null, undefined, 'true', 1], valid: [true, false] };
const STRINGS: PayloadCases = { invalid: [null, undefined, 'canvas', ['canvas', 1]], valid: [[], ['canvas', 'backlink']] };

const CASES: Record<keyof MoreEventsApi, ApiMethodCases> = {
  getEnabledCommunityPluginIds: { input: NO_ARGUMENTS, output: STRINGS },
  getEnabledCorePluginIds: { input: NO_ARGUMENTS, output: STRINGS },
  isCommunityPluginEnabled: { input: PLUGIN_ID, output: BOOLEAN },
  isCorePluginEnabled: { input: PLUGIN_ID, output: BOOLEAN }
};

describe('MORE_EVENTS_API_CONTRACT', () => {
  it('should pass the contract verification', async () => {
    expect(await verifyApiContract(MORE_EVENTS_API_CONTRACT, { cases: CASES, vendor: 'more-events' })).toEqual([]);
  });

  it('should name the failing argument and what it expected', () => {
    expect(validateSync(MORE_EVENTS_API_CONTRACT.isCorePluginEnabled.input, [1])).toEqual({
      issues: [{ message: 'Expected a core plugin id.', path: [0] }]
    });
    expect(validateSync(MORE_EVENTS_API_CONTRACT.isCorePluginEnabled.input, 'canvas')).toEqual({
      issues: [{ message: 'Expected an argument list.' }]
    });
    expect(validateSync(MORE_EVENTS_API_CONTRACT.isCorePluginEnabled.input, ['a', 'b'])).toEqual({
      issues: [{ message: 'Expected at most 1 argument(s), got 2.' }]
    });
    expect(validateSync(MORE_EVENTS_API_CONTRACT.getEnabledCorePluginIds.output, null)).toEqual({
      issues: [{ message: 'Expected an array of core plugin ids.' }]
    });
  });
});
