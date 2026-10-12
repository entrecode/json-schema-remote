// Compile-only check of the type definitions, run with `npm run test:types`.
import * as validator from 'json-schema-remote';
import { JsonSchemaRemoteError, RequestOptions, preload, validate } from 'json-schema-remote';

const schema = { id: 'https://example.com/schema', type: 'string' };

preload('https://example.com/schema', schema);
preload(schema);
validator['preload'](schema);
validator.dropSchemas();
const cached: any = validator.getSchema('https://example.com/schema');
validator.setLoggingFunction((...args: string[]) => args.join(' '));

const options: RequestOptions = { timeout: { response: 5000, deadline: 10000 }, retries: 1 };
validator.setRequestOptions(options);
validator.setRequestOptions({ timeout: 5000 });

const valid: Promise<boolean> = validate({ a: 1 }, 'https://example.com/schema');
validate('https://example.com/data', schema, (error: Error, isValid: boolean) => {});
validator.validate({}, schema).catch((error: JsonSchemaRemoteError) => {
  const firstMessage: string | undefined = error.errors?.[0].message;
  const status: number | undefined = error.status;
  const code: string | undefined = error.code;
  const url: string | undefined = error.url;
});

const data: Promise<any> = validator.loadData('https://example.com/data');
const loaded: Promise<any> = validator.loadSchema('https://example.com/schema', (error, result) => {});
const checked: Promise<boolean> = validator.tv4Validate({}, schema);

const legacy: validator.Validator = validator;
