#  [![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-url]][daviddm-image]

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
$ node data schema
```


## API

### validator.validate(data, schema, callback)

`data` is either a JSON object or the URL to a JSON object.

`schema` is either a valid JSON schema or the URL to a valid JSON schema.

`callback` is called when validation is finished. Signature:
`callback(error, isValid)`
`error` will contain validation errors or be null if validation succeeded.
`isValid` is `true` when validation succeeded, or `false` otherwise.

## Tests

```
mocha
```

## Changelog


### 0.0.1
* initial release

## License

MIT © [entrecode GmbH](https://entrecode.de)


[npm-url]: https://npmjs.org/package/json-schema-remote
[npm-image]: https://badge.fury.io/js/json-schema-remote.svg
[daviddm-url]: https://david-dm.org/entrecode/json-schema-remote.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/entrecode/json-schema-remote
