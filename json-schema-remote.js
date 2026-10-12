const tv4formats = require('tv4-formats');
const validatorJS = require('validator');
const superagent = require('superagent');
const tv4 = require('./lib/tv4');
const schemaSchema = require('./schema/schema.json');

tv4.addFormat(tv4formats);
tv4.addSchema(schemaSchema);

let log = console.log;

let requestOptions = {
  timeout: { response: 10000, deadline: 30000 },
  retries: 2,
};

// Holds only requests which are in flight, so parallel loads of the same URL share one download.
// Settled requests (successful or failed) are removed, loaded schemas are cached by tv4.
const requestCache = new Map();

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isObject(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function isURL(value) {
  return isString(value) && validatorJS.isURL(value, { require_tld: value.indexOf('localhost') === -1 });
}

function setLoggingFunction(fn) {
  if (typeof fn !== 'function') {
    throw new Error('logging function is no function!');
  }
  log = fn;
}

/**
 * Configure how remote schemas and data are requested.
 * @param {object} options
 * @param {number|object} [options.timeout] Timeout per attempt in ms, or `{ response, deadline }` in ms. 0 disables.
 * @param {number} [options.retries] Number of retries on network errors, timeouts and 5xx responses.
 */
function setRequestOptions(options) {
  if (!isObject(options)) {
    throw new Error('request options must be an object');
  }
  const next = { ...requestOptions };
  if ('timeout' in options) {
    const { timeout } = options;
    if (!(typeof timeout === 'number' && timeout >= 0) && !isObject(timeout)) {
      throw new Error('timeout must be a non-negative number or an object with response and/or deadline');
    }
    next.timeout = timeout;
  }
  if ('retries' in options) {
    if (!Number.isInteger(options.retries) || options.retries < 0) {
      throw new Error('retries must be a non-negative integer');
    }
    next.retries = options.retries;
  }
  requestOptions = next;
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

function parseBody(res) {
  try {
    return JSON.parse(res.text);
  } catch (err) {
    return res.body;
  }
}

function makeRequest(url) {
  return Promise.resolve().then(() => {
    if (requestCache.has(url)) {
      return requestCache.get(url);
    }
    log('downloading from ', url, '\n');

    const promise = superagent
      .get(url)
      .timeout(requestOptions.timeout)
      .retry(requestOptions.retries)
      .then(parseBody)
      .finally(() => {
        if (requestCache.get(url) === promise) {
          requestCache.delete(url);
        }
      });

    requestCache.set(url, promise);
    return promise;
  });
}

/**
 * Wraps a failed request in an error which names the URL. Keeps code (e.g. ENETUNREACH) and HTTP status.
 */
function requestError(error, message, url) {
  const status = error.status || (error.response && error.response.status);
  const wrapped = new Error(`${message} from ${url}: ${status ? `HTTP ${status}` : error.message}`);
  wrapped.url = url;
  wrapped.cause = error;
  if (status) {
    wrapped.status = status;
  }
  if (error.code) {
    wrapped.code = error.code;
  }
  return wrapped;
}

/**
 * loads a JSON object by URL or directly
 * @param data JSON object or URL to a JSON object
 * @param [callback] called with (error, data)
 */
function loadData(data, callback) {
  return Promise.resolve()
    .then(() => {
      if (isURL(data)) {
        return makeRequest(data)
          .catch((error) => Promise.reject(requestError(error, 'Could not load remote data', data)))
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
      if (isURL(schema)) {
        const cachedSchema = tv4.getSchema(schema);
        if (cachedSchema) {
          return cachedSchema;
        }
        return makeRequest(schema)
          .catch((error) => Promise.reject(requestError(error, 'Could not load schema', schema)))
          .then((parsedBody) => tv4Validate(parsedBody, schemaSchema).then(() => parsedBody));
      }
      if (!isObject(schema)) {
        return Promise.reject(new Error('No valid JSON Schema'));
      }
      // check if valid schema
      return tv4Validate(schema, schemaSchema).then(() => schema);
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
 * recursively validates against JSON schema. Loads missing $ref´s
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
        return Promise.all(
          result.missing.map((schemaID) => {
            if (tv4.getSchema(schemaID)) {
              throw new Error(
                'json-schema-remote: tv4 is missing schema it already has in cache. possible faulty schema.'
              );
            }
            return loadSchema(schemaID).then((loadedSchema) => tv4.addSchema(schemaID, loadedSchema));
          })
        ).then(() => tv4Validate(data, schema));
      } else if (result.errors.length > 0) {
        // Invalid
        const isSchemaCheck = schema === schemaSchema || schema === schemaSchema.id;
        const error = new Error(isSchemaCheck ? 'No valid JSON Schema' : 'JSON Schema Validation error');
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
    .then((loaded) => tv4Validate(loaded[0], loaded[1]))
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
  setRequestOptions,

  loadData,
  loadSchema,
  tv4Validate,
};
