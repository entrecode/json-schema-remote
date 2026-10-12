// Type definitions for json-schema-remote
// Project: https://github.com/entrecode/json-schema-remote
// Definitions by: Simon Scherzinger <scherzinger@entrecode.de>

/** A single validation error as reported by tv4. */
export interface Tv4Error {
  message: string;
  code: number;
  params: { [key: string]: any };
  dataPath: string;
  schemaPath: string;
  subErrors: Tv4Error[] | null;
  stack?: string;
}

/** Errors rejected/passed by json-schema-remote. Which properties are set depends on the kind of error. */
export interface JsonSchemaRemoteError extends Error {
  /** Validation errors (`JSON Schema Validation error`, `No valid JSON Schema`). */
  errors?: Tv4Error[];
  /** URL which could not be loaded. */
  url?: string;
  /** HTTP status of a failed request. */
  status?: number;
  /** Error code of a failed request, e.g. `ENETUNREACH`, `ECONNREFUSED` or `ECONNABORTED` (timeout). */
  code?: string;
  /** Original error of a failed request. */
  cause?: unknown;
}

export interface RequestOptions {
  /** Timeout per attempt in ms, or superagent's `{ response, deadline }` in ms. `0` disables the timeout. */
  timeout?: number | { response?: number; deadline?: number };
  /** Number of retries on network errors, timeouts and 5xx responses. */
  retries?: number;
}

export interface Validator {
  validate: (dataOrURL: string | any, schemaOrURL: string | any, callback?: (error: Error, isValid: boolean) => void) => Promise<boolean>,
  preload: (url: string, schema: any) => void,
  getSchema: (url: string) => any,
  setLoggingFunction: (fn: (...any: Array<string>) => void) => void,
}

/** Validates data against a JSON Schema. Both can be passed directly or as URL. Rejects if data is invalid. */
export function validate(dataOrURL: string | any, schemaOrURL: string | any, callback?: (error: Error, isValid: boolean) => void): Promise<boolean>;

/** Adds a schema to the cache so it does not need to be loaded remotely. */
export function preload(url: string, schema: any): void;
/** Adds a schema with an `id` property to the cache so it does not need to be loaded remotely. */
export function preload(schema: any): void;

/** Removes all schemas from the cache. */
export function dropSchemas(): void;

/** Returns a cached schema, or `undefined`. */
export function getSchema(url: string): any;

/** Sets the function used to log remote downloads (default: `console.log`). */
export function setLoggingFunction(fn: (...any: Array<string>) => void): void;

/** Configures timeout and retries for remote requests. Unset options keep their current value. */
export function setRequestOptions(options: RequestOptions): void;

/** Loads JSON data from a URL, or returns the data itself if it is no URL. */
export function loadData(data: string | any, callback?: (error: Error, data?: any) => void): Promise<any>;

/** Loads a schema from a URL (or takes it directly), checks it against the JSON Schema meta schema and caches it. */
export function loadSchema(schema: string | any, callback?: (error: Error, schema?: any) => void): Promise<any>;

/** Validates data against an already loaded schema (object or cached schema id) and loads missing remote `$ref`s. */
export function tv4Validate(data: any, schema: any, callback?: (error: Error, isValid: boolean) => void): Promise<boolean>;
