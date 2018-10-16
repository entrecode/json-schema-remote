const tv4 = require('tv4');
const tv4formats = require('tv4-formats');
const validatorJS = require('validator');
const superagent = require('superagent');
const schemaSchema = require('./schema/schema.json');
const isString = require('lodash.isstring');
const isObject = require('lodash.isobject');

tv4.addFormat(tv4formats);
tv4.addSchema(schemaSchema);

let log = console.log;

const requestCache = new Map();

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

/**
 * Drop all schemas from tv4 cache.
 * @returns {undefined}
 */
function dropSchemas() {
  tv4.dropSchemas();
  tv4.addSchema(schemaSchema);
}

/**
 * Get a JSON Schema from tv4 cache.
 * @param {string} url URL/ID of the schema
 * @returns {object} Returns the schema from the cache.
 */
function getSchema(url) {
  return tv4.getSchema(url);
}

function makeRequest(url) {
  return Promise.resolve()
    .then(() => {
      if (requestCache.has(url)) {
        return requestCache.get(url);
      }
      log('downloading from ', url, '\n');

      const req = superagent.get(url);
      const isNode = module && !!module.exports && !(typeof navigator !== 'undefined' && navigator.product === 'ReactNative');
      // const isBrowser = typeof process === 'undefined' || typeof process.browser !== 'undefined';
      if (!isNode) {
        return req.then((res) => {
          if (res.body) {
            return res.body;
          }
          return JSON.parse(res.text);
        });
      }
      // This buffer(…) logic should parse all content types as json. Or fail violently.
      const promise = req.buffer(true).parse(superagent.parse.image)
        .then((res) => {
          try {
            return JSON.parse(res.body.toString());
          } catch (err) {
            return res.body;
          }
        })
        .then((res) => {
          if (requestCache.has(url)) {
            requestCache.delete(url);
          }
          return res;
        });

      requestCache.set(url, promise);
      return promise;
    });
}

/**
 * loads a JSON object by URL or directly
 * @param data JSON object or URL to a JSON object
 * @param [callback] called with (error, data)
 */
function loadData(data, callback) {
  return Promise.resolve()
    .then(() => {
      const tld = !isString(data) || data.indexOf('localhost') === -1;
      if (isString(data) && validatorJS.isURL(data, { require_tld: tld })) {
        return makeRequest(data)
          .catch((error) => {
            if (error.hasOwnProperty('response') && error.response.statusCode !== 200) {
              return Promise.reject(new Error('Could not load remote data.'));
            }
            return Promise.reject(error);
          })
          .then((body) => {
            if (!isObject(body)) {
              return Promise.reject(new Error('No valid JSON Object'));
            }
            return body;
          });
      }
      return data;
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
      const tld = !isString(schema) || schema.indexOf('localhost') === -1;
      if (isString(schema) && validatorJS.isURL(schema, { require_tld: tld })) {
        const cachedSchema = tv4.getSchema(schema);
        if (cachedSchema) {
          return cachedSchema;
        }
        return makeRequest(schema)
          .catch((error) => {
            if (error.hasOwnProperty('response') && error.response.statusCode !== 200) {
              return Promise.reject(new Error('Could not load schema.'));
            }
            return Promise.reject(error);
          })
          .then(parsedBody =>
            tv4Validate(parsedBody, schemaSchema)
              .then(() => parsedBody));
      }
      if (!isObject(schema)) {
        return Promise.reject(new Error('No valid JSON Schema'));
      }
      // check if valid schema
      return tv4Validate(schema, schemaSchema)
        .then(() => schema);
    })
    .then((result) => {
      tv4.addSchema(result.id, result);

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
      const result = tv4.validateMultiple(data, schema);
      if (result.missing.length > 0) {
        // Missing Schemas
        return Promise.all(result.missing.map((schemaID) => {
          if (tv4.getSchema(schemaID)) {
            throw new Error('json-schema-remote: tv4 is missing schema it already has in cache. possible faulty schema.');
          }
          return loadSchema(schemaID)
            .then(loadedSchema => tv4.addSchema(schemaID, loadedSchema));
        }))
          .then(() => tv4Validate(data, schema));
      } else if (result.errors.length > 0) { // Invalid
        const error = new Error(schema === schemaSchema.id ? 'No valid JSON Schema' : 'JSON Schema Validation error');
        error.errors = result.errors;
        return Promise.reject(error);
      }
      // Valid
      return true;
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
 * validates a JSON object against a JSON Schema. Both values can either be the actual objects or
 * URLs.
 * @param {string, object} dataOrURL    A JSON object to validate or a URL to a JSON object.
 * @param {string, object} schemaOrURL  A JSON schema to validate against or a URL to a JSON
 *   schema.
 * @param {validate~callback} [callback]  Callback function
 */
function validate(dataOrURL, schemaOrURL, callback) {
  return Promise.all([loadData(dataOrURL), loadSchema(schemaOrURL)])
    .then(loaded => tv4Validate(loaded[0], loaded[1]))
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

module.exports = {
  validate,
  preload,
  dropSchemas,
  getSchema,
  setLoggingFunction,

  loadData,
  loadSchema,
  tv4Validate,
};
