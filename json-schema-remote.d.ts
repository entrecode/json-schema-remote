// Type definitions for json-schema-remote
// Project: json-schema-remote
// Definitions by: Simon Scherzinger <scherzinger@entrecode.de>

declare module 'json-schema-remote' {
  export interface Validator {
    validate: (dataOrURL: string | any, schemaOrURL: string | any, callback?: (error: Error, isValid: boolean) => void) => Promise<boolean>,
    preload: (url: string, schema: any) => void,
    getSchema: (url: string) => any,
    setLoggingFunction: (fn: (...any: Array<string>) => void) => void,
  }

  export function validate(dataOrURL: string | any, schemaOrURL: string | any, callback?: (error: Error, isValid: boolean) => void): Promise<boolean>;

  export function preload(url: string, schema: any): void;

  function dropSchemas(): void;
  
  function getSchema(url: string): any;

  export function setLoggingFunction(fn: (...any: Array<string>) => void): void
}
