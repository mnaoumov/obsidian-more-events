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
 * Copyable for the same reason `api.d.ts` is: it imports from `./api.d.ts` and nothing else. So the schemas
 * are hand-written {@link https://standardschema.dev | Standard Schema} objects rather than built with a
 * schema library, and the constant is typed structurally rather than as a registry type. A consumer on a
 * library whose contract type is generic over the API (such as `PluginApiContract<MoreEventsApi>`) can
 * assign the constant to it, which checks every entry against its method's signature.
 *
 * It is not named `api.ts`: TypeScript would read `api.d.ts` as that file's own declarations.
 */

import type { MoreEventsApi } from './api.d.ts';

/**
 * The type of {@link MORE_EVENTS_API_CONTRACT}: one entry per method of {@link MoreEventsApi}, each typed
 * against that method's parameters and awaited return value.
 */
export type MoreEventsApiContract = {
  readonly [TMethodName in keyof MoreEventsApi]: MoreEventsApiMethodContract<
    Parameters<MoreEventsApi[TMethodName]>,
    Awaited<ReturnType<MoreEventsApi[TMethodName]>>
  >;
};

/**
 * The payload schemas of one method.
 *
 * @typeParam TParameters - The method's parameters.
 * @typeParam TReturnValue - The method's return value, awaited.
 */
export interface MoreEventsApiMethodContract<TParameters, TReturnValue> {
  /**
   * Validates the method's arguments, as an array.
   */
  readonly input: MoreEventsApiSchema<TParameters>;

  /**
   * Validates the method's return value, or the value it resolves to.
   */
  readonly output: MoreEventsApiSchema<TReturnValue>;
}

/**
 * A {@link https://standardschema.dev | Standard Schema} (`StandardSchemaV1<unknown, T>`), restated with
 * only the members this file uses so it needs no dependency for them.
 *
 * @typeParam T - The type a value that passes is.
 */
export interface MoreEventsApiSchema<T> {
  /**
   * The Standard Schema properties.
   */
  readonly '~standard': MoreEventsApiSchemaProps<T>;
}

/**
 * The result of a value that failed {@link MoreEventsApiSchema}'s `validate`.
 */
export interface MoreEventsApiSchemaFailure {
  /**
   * What was wrong with the value.
   */
  readonly issues: readonly MoreEventsApiSchemaIssue[];
}

/**
 * One thing wrong with a value.
 */
export interface MoreEventsApiSchemaIssue {
  /**
   * What was expected.
   */
  readonly message: string;

  /**
   * Where in the value, e.g. `[0]` for the first argument; absent for the value as a whole.
   */
  readonly path?: readonly PropertyKey[];
}

/**
 * The Standard Schema properties of {@link MoreEventsApiSchema}.
 *
 * @typeParam T - The type a value that passes is.
 */
export interface MoreEventsApiSchemaProps<T> {
  /**
   * The inferred types, present for type inference only.
   */
  readonly types?: MoreEventsApiSchemaTypes<T> | undefined;

  /**
   * Validates a value.
   *
   * @param value - The value to validate.
   * @returns The value when it passes; otherwise the issues found.
   */
  readonly validate: (value: unknown) => MoreEventsApiSchemaResult<T>;

  /**
   * Who made the schema.
   */
  readonly vendor: string;

  /**
   * The Standard Schema version.
   */
  readonly version: 1;
}

/**
 * The result of {@link MoreEventsApiSchema}'s `validate`.
 *
 * @typeParam T - The type a value that passes is.
 */
export type MoreEventsApiSchemaResult<T> = MoreEventsApiSchemaFailure | MoreEventsApiSchemaSuccess<T>;

/**
 * The result of a value that passed {@link MoreEventsApiSchema}'s `validate`.
 *
 * @typeParam T - The type a value that passes is.
 */
export interface MoreEventsApiSchemaSuccess<T> {
  /**
   * Absent on success.
   */
  readonly issues?: undefined;

  /**
   * The value.
   */
  readonly value: T;
}

/**
 * The types a schema infers, present for type inference only.
 *
 * @typeParam T - The type a value that passes is.
 */
export interface MoreEventsApiSchemaTypes<T> {
  /**
   * The type the schema accepts.
   */
  readonly input: unknown;

  /**
   * The type a value that passes is.
   */
  readonly output: T;
}

type ArgumentSchemaParams<TParameters extends readonly unknown[]> = {
  readonly [TIndex in keyof TParameters]: ValueSchemaParams<TParameters[TIndex]>;
};

interface ValueSchemaParams<T> {
  readonly expected: string;
  readonly isValid: (value: unknown) => value is T;
}

const VENDOR = 'more-events';

/**
 * The contract this plugin publishes with {@link MoreEventsApi}, for a consumer to pass as the `contract`
 * when it looks the API up.
 */
export const MORE_EVENTS_API_CONTRACT: MoreEventsApiContract = {
  getEnabledCommunityPluginIds: {
    input: createArgumentsSchema<[]>([]),
    output: createValueSchema({ expected: 'an array of community plugin ids', isValid: isStringArray })
  },
  getEnabledCorePluginIds: {
    input: createArgumentsSchema<[]>([]),
    output: createValueSchema({ expected: 'an array of core plugin ids', isValid: isStringArray })
  },
  isCommunityPluginEnabled: {
    input: createArgumentsSchema<[communityPluginId: string]>([{ expected: 'a community plugin id', isValid: isString }]),
    output: createValueSchema({ expected: 'a boolean', isValid: isBoolean })
  },
  isCorePluginEnabled: {
    input: createArgumentsSchema<[corePluginId: string]>([{ expected: 'a core plugin id', isValid: isString }]),
    output: createValueSchema({ expected: 'a boolean', isValid: isBoolean })
  }
};

function createArgumentsSchema<TParameters extends readonly unknown[]>(
  parameters: ArgumentSchemaParams<TParameters>
): MoreEventsApiSchema<TParameters> {
  const parameterList: readonly ValueSchemaParams<unknown>[] = parameters;

  function getIssues(value: unknown): MoreEventsApiSchemaIssue[] {
    if (!Array.isArray(value)) {
      return [{ message: 'Expected an argument list.' }];
    }

    return value.length > parameterList.length
      ? [{ message: `Expected at most ${String(parameterList.length)} argument(s), got ${String(value.length)}.` }]
      : parameterList.flatMap((parameter, index) => parameter.isValid(value[index]) ? [] : [{ message: `Expected ${parameter.expected}.`, path: [index] }]);
  }

  function isArgumentList(value: unknown): value is TParameters {
    return getIssues(value).length === 0;
  }

  return createSchema((value) => isArgumentList(value) ? { value } : { issues: getIssues(value) });
}

function createSchema<T>(validate: (value: unknown) => MoreEventsApiSchemaResult<T>): MoreEventsApiSchema<T> {
  return {
    '~standard': {
      validate,
      vendor: VENDOR,
      version: 1
    }
  };
}

function createValueSchema<T>(params: ValueSchemaParams<T>): MoreEventsApiSchema<T> {
  return createSchema((value) => params.isValid(value) ? { value } : { issues: [{ message: `Expected ${params.expected}.` }] });
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isString(item));
}
