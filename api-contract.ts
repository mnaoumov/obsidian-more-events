/**
 * @file
 *
 * The runtime half of `More Events`' published API: its CONTRACT, one entry per method of
 * {@link MoreEventsApi}, each with a schema over the argument list and a schema over the value the method
 * returns.
 *
 * This plugin publishes exactly this constant with its API, and a consumer copies it beside `api.d.ts` and
 * passes it as the `contract` when it looks the API up, so both ends validate against ONE definition. The
 * plugin registry checks the payloads against it only while its debugger is on.
 *
 * Copying it takes one dependency beside `api.d.ts`: `@mnaoumov/typescript-lib`, whose `api-contract` entry
 * point carries the contract type, the {@link https://standardschema.dev | Standard Schema} builders and the
 * common guards, so this file is the constant alone. {@link defineApiContract} checks every entry against its
 * method's signature, and the result is assignable to any registry's contract type that is generic over the
 * API (such as `PluginApiContract<MoreEventsApi>`).
 *
 * It is not named `api.ts`: TypeScript would read `api.d.ts` as that file's own declarations.
 */

import {
  BOOLEAN_GUARD,
  createApiContractSchemaBuilders,
  defineApiContract,
  STRING_ARRAY_GUARD,
  STRING_GUARD
} from '@mnaoumov/typescript-lib/api-contract';

import type { MoreEventsApi } from './api.d.ts';

const { createArgumentsSchema, createTypeGuardSchema } = createApiContractSchemaBuilders('more-events');

/**
 * The contract this plugin publishes with {@link MoreEventsApi}, for a consumer to pass as the `contract`
 * when it looks the API up.
 */
export const MORE_EVENTS_API_CONTRACT = defineApiContract<MoreEventsApi>({
  getEnabledCommunityPluginIds: {
    input: createArgumentsSchema([]),
    output: createTypeGuardSchema({ ...STRING_ARRAY_GUARD, expected: 'an array of community plugin ids' })
  },
  getEnabledCorePluginIds: {
    input: createArgumentsSchema([]),
    output: createTypeGuardSchema({ ...STRING_ARRAY_GUARD, expected: 'an array of core plugin ids' })
  },
  isCommunityPluginEnabled: {
    input: createArgumentsSchema([{ ...STRING_GUARD, expected: 'a community plugin id' }]),
    output: createTypeGuardSchema(BOOLEAN_GUARD)
  },
  isCorePluginEnabled: {
    input: createArgumentsSchema([{ ...STRING_GUARD, expected: 'a core plugin id' }]),
    output: createTypeGuardSchema(BOOLEAN_GUARD)
  }
});
