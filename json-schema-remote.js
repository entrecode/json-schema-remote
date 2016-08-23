#!/usr/bin/env node
'use strict';

const tv4 = require('tv4');
const tv4formats = require('tv4-formats');
const _ = require('lodash');
const validatorJS = require('validator');
const request = require('request');

const schemaSchema = require('./schema/schema.json');
let log = console.log;

tv4.addFormat(tv4formats);
tv4.addSchema(schemaSchema);
const metaSchema = 'http://json-schema.org/draft-04/schema';

function setLoggingFunction(fn) {
  if (typeof fn !== 'function') {
    throw new Error('logging function is no function!');
  }
  log = fn;
}

/**
 * Preload a JSON Schema so it will not be necessary to remotely load it when validating
 * @param {string} [url]  URL/ID of the schema. Can be omitted if schema contains id property
 * @param {object} schema JSON Schema to add
 */
function preload(url, schema) {
  if (schema) {
    return tv4.addSchema(url, schema);
  }
  return tv4.addSchema(url);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    request.get(url, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      return resolve(body);
    });
  })
  .then(body => Promise.resolve(JSON.parse(body)));
}

/**
 * loads a JSON object by URL or directly
 * @param data JSON object or URL to a JSON object
 * @param [callback] called with (error, data)
 */
function loadData(data, callback) {

  return Promise.resolve()
  .then(() => {
    if (_.isString(data) && validatorJS.isURL(data)) {
      log('downloading data from ', data, '\n');
      return makeRequest(data)
      .catch((error) => {
        if (error.hasOwnProperty('response') && error.response.statusCode !== 200) {
          return Promise.reject(new Error('Could not load remote data.'))
        }
        return Promise.reject(error);
      })
      .then((body) => {
        if (!_.isObject(body)) {
          return Promise.reject(new Error('No valid JSON Object'));
        }
        return body;
      });
    } else {
      if (!_.isObject(data)) {
        return Promise.reject(new Error('No valid JSON Object'));
      }
      return data;
    }
  })
  .then((result) => {
    if (callback) {
      return callback(null, result);
    }
    return result;
  })
  .catch((error) => {
    if (callback) {
      return callback(error);
    }
    return Promise.reject(error);
  });
}

/**
 * loads a Schema by URL or directly and checks for JSON Schema compliance
 * @param schema Schema or URL to a schema
 * @param [callback] called with (error, schema)
 */
function loadSchema(schema, callback) {
  return Promise.resolve()
  .then(() => {
    if (_.isString(schema) && validatorJS.isURL(schema)) {
      log('downloading schema ', schema, '\n');
      return makeRequest(schema)
      .catch((error) => {
        if (error.hasOwnProperty('response') && error.response.statusCode !== 200) {
          return Promise.reject(new Error('Could not load schema.'))
        }
        return Promise.reject(error);
      })
      .then(parsedBody =>
        tv4Validate(parsedBody, metaSchema)
        .then(isValid => parsedBody)
      );
    } else {
      if (!_.isObject(schema)) {
        return Promise.reject(new Error('No valid JSON Schema'));
      }
      // check if valid schema
      return tv4Validate(schema, metaSchema)
      .then(isValid => schema);
    }
  })
  .then((result) => {
    if (callback) {
      return callback(null, result);
    }
    return result;
  })
  .catch((error) => {
    if (callback) {
      return callback(error);
    }
    return Promise.reject(error);
  });
}

/**
 * recursively validates against JSON schema. Loads missing $rel´s
 * @param {object}    data      JSON object to check
 * @param {object}    schema    JSON schema to check against
 * @param {function}  [callback]  called with (error, result)
 */
function tv4Validate(data, schema, callback) {
  return Promise.resolve()
  .then(() => {
    var result = tv4.validateMultiple(data, schema);
    if (result.missing.length > 0) {
      // Missing Schemas
      return Promise.all(result.missing.map(
        schemaID => loadSchema(schemaID)
        .then(schema => tv4.addSchema(schemaID, schema))
      ))
      .then(() => tv4Validate(data, schema));
    } else if (result.errors.length > 0) { // Invalid
      const error = new Error(schema === metaSchema ? 'No valid JSON Schema' : 'JSON Schema Validation error');
      error.errors = result.errors;
      return Promise.reject(error);
    } else {
      // Valid
      return true;
    }
  })
  .then((isValid) => {
    if (callback) {
      return callback(null, isValid);
    }
    return isValid;
  })
  .catch((error) => {
    if (callback) {
      return callback(error, false);
    }
    return Promise.reject(error);
  });
}

/**
 * validates a JSON object against a JSON Schema. Both values can either be the actual objects or URLs.
 * @param {string, object} dataOrURL    A JSON object to validate or a URL to a JSON object.
 * @param {string, object} schemaOrURL  A JSON schema to validate against or a URL to a JSON schema.
 * @param {validate~callback} [callback]  Callback function
 */
function validate(dataOrURL, schemaOrURL, callback) {
  return Promise.all([loadData(dataOrURL), loadSchema(schemaOrURL)])
  .then((loaded) => {
    return tv4Validate(loaded[0], loaded[1]);
  })
  .then((isValid) => {
    if (callback) {
      return callback(null, isValid);
    }
    return isValid;
  })
  .catch((error) => {
    if (callback) {
      return callback(error, false);
    }
    return Promise.reject(error);
  });
}

const validator = module.exports = {
  preload,
  loadData,
  loadSchema,
  tv4Validate,
  validate,
  setLoggingFunction,
};

/* for usage on command line */
if (!module.parent) {
  const args = process.argv.slice(-2);
  validator.validate(args[0], args[1])
  .then(() => {
    process.stdout.write('✓ Successfully validated \n')
    return process.exit(0);
  })
  .catch((error) => {
    process.stderr.write(error.message + '\n');
    if (error.hasOwnProperty('errors')) {
      process.stderr.write(JSON.stringify(error.errors));
    }
    return process.exit(1);
  });
}