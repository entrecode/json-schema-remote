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


```js
var validator = require('json-schema-remote');

validator.validate(data, schema, function(error, isValid) {
  if (error) {
    // handle error
  }

});
```

### Command line usage

```sh
$ ./json-schema-remote.js dataURL schemaURL
```

## API

### validator.validate(data, schema, callback)

Validate a JSON against a JSON Schema.

* `data` is either a JSON object or the URL to a JSON object.
* `schema` is either a valid JSON schema or the URL to a valid JSON schema.
* `callback` is called when validation is finished. Signature:

    `callback(error, isValid)`


    * `error` will contain validation errors (`error.errors`) or be null if validation succeeded.
    * `isValid` is `true` when validation succeeded, or `false` otherwise.

### validator.preload([url, ]schema)

Preload a JSON Schema so it will not be necessary to remotely load it when validating. Synchronous function.

* `url` can be the id of the schema. May be omitted if `schema` contains the `id` property. Otherwise, it will overwrite it.
* `schema` the Schema to add as JSON

*Calls tv4.addSchema internally.*

## Tests

```
mocha
```
Note that the tests need internet access for testing download of remote schemas.

## Changelog

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
