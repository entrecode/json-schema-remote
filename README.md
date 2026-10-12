[![NPM version][npm-image]][npm-url] [![CI][ci-image]][ci-url] [![Downloads][downloads-image]][npm-url]

> Node.js module to validate JSON objects against a [JSON Schema](http://json-schema.org/) (draft-04), including remote references (`$ref`).

## Features

Uses [tv4](https://github.com/geraintluff/tv4) for validation, but asynchronously loads missing remote schemas automatically.
Just input a JSON Schema or a URL to a JSON Schema, and it will do the rest. No more manual loading of remote schemas!

- Data and schema can be passed as objects or as URLs
- Remote `$ref`s are resolved recursively and cached
- Parallel validations share one download per URL
- Timeouts and retries for remote requests, failed requests are not cached
- Promise and callback API, TypeScript definitions included
- Command line tool

## Install

```sh
npm install --save json-schema-remote
```

Requires Node.js ≥ 14.18. Tested on Node.js 20, 22, 24 and 26.

## Usage

### Module usage

```js
const validator = require('json-schema-remote');

validator
  .validate(data, 'https://example.com/schema')
  .then(() => {
    // data is valid!
  })
  .catch((error) => {
    // invalid data (error.errors) or schema could not be loaded
  });
```

Optionally, a callback can be provided as third parameter. It will be called with `(error, isValid)`.

TypeScript:

```ts
import { validate, JsonSchemaRemoteError } from 'json-schema-remote';
```

### Command line usage

```sh
# when installed globally
json-schema-remote dataURL schemaURL
# when installed locally
npx json-schema-remote dataURL schemaURL
```

Exits with `0` if the data is valid, `1` if it is invalid or could not be loaded, and `2` on wrong usage.

## API

### validator.validate(data, schema[, callback])

Validate a JSON against a JSON Schema. Missing remote schemas referenced by `$ref` are loaded automatically.

* `data` is either a JSON value or the URL to a JSON object.
* `schema` is either a valid JSON schema or the URL to a valid JSON schema.
* `callback` (optional) is called when validation is finished. Signature: `callback(error, isValid)`
  * `error` will contain validation errors (`error.errors`) or be `null` if validation succeeded.
  * `isValid` is `true` when validation succeeded, or `false` otherwise.

Returns a Promise which resolves to `true` if the data is valid and rejects otherwise (see [Errors](#errors)).

### validator.preload([url, ]schema)

Preload a JSON Schema so it will not be necessary to remotely load it when validating. Synchronous function.

* `url` can be the id of the schema. May be omitted if `schema` contains the `id` property. Otherwise, it will overwrite it.
* `schema` the Schema to add as JSON

*Calls tv4.addSchema internally.*

### validator.getSchema(url)

Get a JSON Schema from the cache. Returns `undefined` if it is not cached.

* `url` URL/ID of the JSON Schema

*Calls tv4.getSchema internally.*

### validator.dropSchemas()

Remove all schemas from the cache. They will be loaded again when needed.

### validator.setLoggingFunction(fn)

Set a custom logging function. Will take `console.log` else. It is called when data is loaded over the network.
Throws an error if `fn` is no function.

### validator.setRequestOptions(options)

Configure remote requests. Options which are not passed keep their current value.

* `timeout` timeout per attempt in ms, or an object `{ response, deadline }` in ms
  (see [superagent timeouts](https://ladjs.github.io/superagent/#timeouts)). `0` disables the timeout.
  Default: `{ response: 10000, deadline: 30000 }`
* `retries` number of retries on network errors, timeouts and 5xx responses. Default: `2`

```js
validator.setRequestOptions({ timeout: 5000, retries: 1 });
```

### validator.loadSchema(schema[, callback]), validator.loadData(data[, callback]), validator.tv4Validate(data, schema[, callback])

Lower level functions used by `validate`: load (and cache) a schema and check it against the JSON Schema meta schema,
load data from a URL, and validate data against an already loaded schema.

## Caching and remote requests

* Successfully loaded schemas are cached (in tv4) for the lifetime of the process, until `dropSchemas()` is called.
  Remote data is not cached.
* While a request for a URL is in flight, other validations needing the same URL wait for it instead of downloading again.
* Failed requests are **not** cached. The next validation tries to load the schema again.
* Requests time out and are retried according to `setRequestOptions`.

## Errors

The returned Promise rejects with an `Error` (TypeScript: `JsonSchemaRemoteError`):

| `message` | Cause | Additional properties |
|---|---|---|
| `JSON Schema Validation error` | data is not valid | `errors`: tv4 errors (`message`, `code`, `dataPath`, `schemaPath`, …) |
| `No valid JSON Schema` | schema is no object or does not match the JSON Schema meta schema | `errors` (if checked against the meta schema) |
| `No valid JSON Object` | remote data is no JSON object | |
| `Could not load schema from <url>: <reason>` | schema could not be loaded | `url`, `cause`, `status` (HTTP errors) or `code` (network errors, e.g. `ENETUNREACH`, `ECONNABORTED` for timeouts) |
| `Could not load remote data from <url>: <reason>` | data could not be loaded | same as above |

## Bundled tv4

tv4 is not maintained anymore, so json-schema-remote ships its own copy as [`lib/tv4.js`](lib/tv4.js) instead of depending
on the npm package. It is tv4 1.3.0 from the [entrecode fork](https://github.com/entrecode/tv4) with one change:
the tolerance for `multipleOf` is raised, so that floating point values like `19.99` pass `multipleOf: 0.01`.

The bundled tv4 instance is used internally only; installing `tv4` separately does not affect json-schema-remote.
tv4 is released into the public domain by its authors.

String formats (`date`, `date-time`, `email`, `uri`, …) are provided by [tv4-formats](https://github.com/ikr/tv4-formats).

## Development

```sh
npm test            # unit tests (node:test, no internet access needed)
npm run test:types  # type check of json-schema-remote.d.ts
```

Releases: update the version in `package.json` and [CHANGELOG.md](CHANGELOG.md), tag the commit with the plain version
(e.g. `1.7.0`, no `v` prefix) and run `npm publish`.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT © [entrecode GmbH](https://entrecode.de)


[npm-url]: https://npmjs.org/package/json-schema-remote
[npm-image]: https://img.shields.io/npm/v/json-schema-remote.svg
[ci-url]: https://github.com/entrecode/json-schema-remote/actions/workflows/ci.yml
[ci-image]: https://github.com/entrecode/json-schema-remote/actions/workflows/ci.yml/badge.svg
[downloads-image]: https://img.shields.io/npm/dm/json-schema-remote.svg
