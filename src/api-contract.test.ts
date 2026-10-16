import type { ApiMethodContract } from '@mnaoumov/typescript-lib/api-contract';

import {
  describe,
  expect,
  it
} from 'vitest';

import type { MoreEventsApi } from '../api.d.ts';

import { MORE_EVENTS_API_CONTRACT } from '../api-contract.ts';

interface MethodCases {
  readonly input: PayloadCase;
  readonly output: PayloadCase;
}

type MethodName = keyof MoreEventsApi;

interface PayloadCase {
  readonly invalid: readonly unknown[];
  readonly valid: readonly unknown[];
}

type Schema = NonNullable<ApiMethodContract['input']>;

type SchemaResult = Exclude<ReturnType<Schema['~standard']['validate']>, Promise<unknown>>;

const NO_ARGUMENTS: PayloadCase = { invalid: [['extra'], null, undefined], valid: [[]] };
const PLUGIN_ID: PayloadCase = { invalid: [[], [null], [1], ['canvas', 'extra'], 'canvas'], valid: [['canvas']] };
const BOOLEAN: PayloadCase = { invalid: [null, undefined, 'true', 1], valid: [true, false] };
const STRINGS: PayloadCase = { invalid: [null, undefined, 'canvas', ['canvas', 1]], valid: [[], ['canvas', 'backlink']] };

const CASES: Record<MethodName, MethodCases> = {
  getEnabledCommunityPluginIds: { input: NO_ARGUMENTS, output: STRINGS },
  getEnabledCorePluginIds: { input: NO_ARGUMENTS, output: STRINGS },
  isCommunityPluginEnabled: { input: PLUGIN_ID, output: BOOLEAN },
  isCorePluginEnabled: { input: PLUGIN_ID, output: BOOLEAN }
};

const METHOD_NAMES: readonly MethodName[] = [
  'getEnabledCommunityPluginIds',
  'getEnabledCorePluginIds',
  'isCommunityPluginEnabled',
  'isCorePluginEnabled'
];

describe('MORE_EVENTS_API_CONTRACT', () => {
  it('should have one entry per method of the API, each with both schemas', () => {
    expect(Object.keys(MORE_EVENTS_API_CONTRACT).sort()).toEqual([...METHOD_NAMES].sort());
    for (const methodName of METHOD_NAMES) {
      const methodContract = MORE_EVENTS_API_CONTRACT[methodName];
      for (const schema of [methodContract.input, methodContract.output]) {
        expect(schema['~standard']).toMatchObject({ vendor: 'more-events', version: 1 });
      }
    }
  });

  it('should accept every valid payload and refuse every invalid one', () => {
    for (const methodName of METHOD_NAMES) {
      for (const half of ['input', 'output'] as const) {
        const schema: Schema = MORE_EVENTS_API_CONTRACT[methodName][half];
        const { invalid, valid } = CASES[methodName][half];
        for (const [index, value] of valid.entries()) {
          expect(validate(schema, value), `${methodName} ${half} should accept valid case ${String(index)}`).toEqual({ value });
        }

        for (const [index, value] of invalid.entries()) {
          expect(validate(schema, value).issues, `${methodName} ${half} should refuse invalid case ${String(index)}`).not.toHaveLength(0);
        }
      }
    }
  });

  it('should name the failing argument and what it expected', () => {
    expect(validate(MORE_EVENTS_API_CONTRACT.isCorePluginEnabled.input, [1])).toEqual({
      issues: [{ message: 'Expected a core plugin id.', path: [0] }]
    });
    expect(validate(MORE_EVENTS_API_CONTRACT.isCorePluginEnabled.input, 'canvas')).toEqual({
      issues: [{ message: 'Expected an argument list.' }]
    });
    expect(validate(MORE_EVENTS_API_CONTRACT.isCorePluginEnabled.input, ['a', 'b'])).toEqual({
      issues: [{ message: 'Expected at most 1 argument(s), got 2.' }]
    });
    expect(validate(MORE_EVENTS_API_CONTRACT.getEnabledCorePluginIds.output, null)).toEqual({
      issues: [{ message: 'Expected an array of core plugin ids.' }]
    });
  });
});

function validate(schema: Schema, value: unknown): SchemaResult {
  const result = schema['~standard'].validate(value);
  if (result instanceof Promise) {
    throw new TypeError('Expected a synchronous schema.');
  }

  return result;
}
