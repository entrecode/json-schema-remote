[![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-url]][daviddm-image] [![Downloads][downloads-image]][npm-url]

> Node.js module to validate JSON objects against a [JSON Schema](http://json-schema.org/), including remote references ($ref).

## Features
Uses [tv4](https://github.com/geraintluff/tv4) for validation, but asynchronously loads missing remote schemas automatically.
Just input a JSON Schema or a URI to a JSON Schema, and it will do the rest. No more manual loading of remote schemas!

## Install

```sh
$ npm install --save json-schema-remote
```

## Usage

The module can be used from a Node.js script, or directly on command line.

### Module usage

*Node.js ≥ 4.0.0 is required.*

```js
const validator = require('json-schema-remote');

validator.validate(data, schema)
.then(() => {
  // data is valid!
})
.catch((error) => {
  // handle error
});
```

Optionally, a callback can be provided as third parameter. It will be called with (error, isValid).

### Command line usage

```sh
# when installed globally
json-schema-remote dataURL schemaURL
# when installed locally
./bin/json-schema-remote.js dataURL schemaURL
```

## API

### validator.validate(data, schema[, callback])

Validate a JSON against a JSON Schema.

* `data` is either a JSON object or the URL to a JSON object.
* `schema` is either a valid JSON schema or the URL to a valid JSON schema.
* `callback` (optional) is called when validation is finished. Signature:

    `callback(error, isValid)`


    * `error` will contain validation errors (`error.errors`) or be null if validation succeeded.
    * `isValid` is `true` when validation succeeded, or `false` otherwise.

If no `callback` is provided, the function returns a Promise.

### validator.preload([url, ]schema)

Preload a JSON Schema so it will not be necessary to remotely load it when validating. Synchronous function.

* `url` can be the id of the schema. May be omitted if `schema` contains the `id` property. Otherwise, it will overwrite it.
* `schema` the Schema to add as JSON

*Calls tv4.addSchema internally.*

### validator.getSchema(url)

Get a JSON Schema from tv4 cache.

* `url` URL/ID of the JSON Schema

*Calls tv4.getSchema internally.*

### validator.setLoggingFunction(fn)

Set a custom Logging function. Will take `console.log` else. It is logged when data is loaded over the network.
Throws an error if `fn` is no function.

## Tests

```
mocha
```
Note that the tests need internet access for testing download of remote schemas.

## Changelog

### 1.3.3
- allow string only "jsons"
- improved require_tld logic in requests

### 1.3.2
- fixed infinity loop when schema has broken refs

### 1.3.1
- add request cache

### 1.3.0
- adds typescript typings

### 1.2.5 / 1.2.6
- fixed bufferhandling in browser with superagent

### 1.2.1
- updated Dependencies, fixed Tests for Chai 4

### 1.2.0
- adds `getSchema(url)`

### 1.1.6
- version 3.0.0 tv4-formats with fixed typescript usage

### 1.1.4 - 1.1.5
- bugfixes

### 1.1.3
- removed lodash
- split shell usage into single file

### 1.1.2
* updated dependencies

### 1.1.1
* made the feature from 1.1.0 actually work

### 1.1.0
* added function `setLoggingFunction(fn)` to add a custom logger function instead of `console.log`

### 1.0.0
* breaking change: Node.js >= 4.0.0 is required due to the usage of Promises and Arrow functions. Use json-schema-remote@0.1.7 for older node versions.
* added support for Promises (callbacks still work, too)
* removed dependency on `async`
* updated dependencies

### 0.1.7
* removed deprecation caused by validator.js

### 0.1.6
* updated dependencies

### 0.1.5
* updated dependencies

### 0.1.4
* updated dependencies 
* added mocha and mocha-bamboo-reporter to dev dependencies

### 0.1.3
* updated dependencies

### 0.1.2
* updated dependencies

### 0.1.1
* updated dependencies
* updated tests for chai 2.x
* updated test for remote schema and data

### 0.1.0
* added preload function

### 0.0.2
* fix for package.json file

### 0.0.1
* initial release

## License

MIT © [entrecode GmbH](https://entrecode.de)


[npm-url]: https://npmjs.org/package/json-schema-remote
[npm-image]: https://badge.fury.io/js/json-schema-remote.svg
[downloads-image]: http://img.shields.io/npm/dm/json-schema-remote.svg
[daviddm-url]: https://david-dm.org/entrecode/json-schema-remote.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/entrecode/json-schema-remote
