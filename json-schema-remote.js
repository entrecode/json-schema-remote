#!/usr/bin/env node
'use strict';

var async       = require('async')
  , tv4         = require('tv4')
  , tv4formats  = require('tv4-formats')
  , _           = require('lodash')
  , validatorJS = require('validator')
  , request     = require('request')
  ;

tv4.addFormat(tv4formats);
tv4.addSchema(require('./schema/schema.json'));
var metaSchema = 'http://json-schema.org/draft-04/schema';

var validator = module.exports = {

  /**
   * Preload a JSON Schema so it will not be necessary to remotely load it when validating
   * @param {string} [url]  URL/ID of the schema. Can be omitted if schema contains id property
   * @param {object} schema JSON Schema to add
   */
  preload: function(url, schema) {
    if (schema) {
      return tv4.addSchema(url, schema);
    }
    return tv4.addSchema(url);
  },

  /**
   * validates a JSON object against a JSON Schema. Both values can either be the actual objects or URLs.
   * @param {string, object} dataOrURL    A JSON object to validate or a URL to a JSON object.
   * @param {string, object} schemaOrURL  A JSON schema to validate against or a URL to a JSON schema.
   * @param {validate~callback} callback  Callback function
   */
  validate: function(dataOrURL, schemaOrURL, callback) {
    async.parallel({
      data: function(callback) {
        loadData(dataOrURL, callback);
      },
      schema: function(callback) {
        loadSchema(schemaOrURL, callback);
      }
    }, function(error, loaded) {
      if (error) {
        return callback(error);
      }
      return tv4Validate(loaded.data, loaded.schema, callback);
    });
  }
  /**
   * Callback used by validate(dataOrURL, schemaOrURL, callback).
   * @callback validate~callback
   * @param {object}  error       Error object. error.errors will be an array with validation errors.
   * @param {boolean} validated   true if the validation was successful.
   */
};
/**
 * loads a Schema by URL or directly and checks for JSON Schema compliance
 * @param schema Schema or URL to a schema
 * @param callback called with (error, schema)
 */
function loadSchema(schema, callback) {
  if (_.isString(schema) && validatorJS.isURL(schema)) {
    console.log('downloading schema ', schema, '\n');
    request(schema, function(error, response, body) {
      if (error) {
        return callback(error);
      }
      if (response.statusCode !== 200) {
        return callback(new Error('Could not load schema.'))
      }
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        return callback(parseError);
      }
      // check if valid schema
      tv4Validate(body, metaSchema, function(error, isValid) {
        if (error) {
          return callback(error);
        }
        return callback(null, body);
      });
    });
  } else {
    if (!_.isObject(schema)) {
      return callback(new Error('No valid JSON Schema'));
    }
    // check if valid schema
    tv4Validate(schema, metaSchema, function(error, isValid) {
      if (error) {
        return callback(error);
      }
      return callback(null, schema);
    });
  }
}

/**
 * loads a JSON object by URL or directly
 * @param data JSON object or URL to a JSON object
 * @param callback called with (error, data)
 */
function loadData(data, callback) {
  if (_.isString(data) && validatorJS.isURL(data)) {
    console.log('downloading data from ', data, '\n');
    request(data, function(error, response, body) {
      if (error) {
        return callback(error);
      }
      if (response.statusCode !== 200) {
        return callback(new Error('Could not load remote data.'))
      }
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        return callback(parseError);
      }
      // check if valid JSON
      if (!_.isObject(body)) {
        return callback(new Error('No valid JSON Object'));
      }
      return callback(null, body);

    });
  } else {
    if (!_.isObject(data)) {
      return callback(new Error('No valid JSON Object'));
    }
    return callback(null, data);
  }
}

/**
 * recursively validates against JSON schema. Loads missing $rel´s
 * @param {object}    data      JSON object to check
 * @param {object}    schema    JSON schema to check against
 * @param {function}  callback  called with (error, result)
 */
function tv4Validate(data, schema, callback) {
  var result = tv4.validateMultiple(data, schema);
  if (result.missing.length > 0) {
    // Missing Schemas
    return async.each(result.missing, function(schemaID, callback) {
      loadSchema(schemaID, function(error, schema) {
        if (error) {
          return callback(error);
        }
        tv4.addSchema(schemaID, schema);
        callback();
      })
    }, function(error) {
      if (error) {
        return callback(error);
      }
      return tv4Validate(data, schema, callback);
    });
  } else if (result.errors.length > 0) { // Invalid
    var error = new Error(schema === metaSchema ? 'No valid JSON Schema' : 'JSON Schema Validation error');
    var known = tv4.getSchemaMap();
    error.errors = result.errors;
    return callback(error, false);
  } else {
    // Valid
    return callback(null, true);
  }
}

/* for usage on command line */
if (!module.parent) {
  var args = process.argv.slice(-2);
  validator.validate(args[0], args[1], function(error, valid) {
    if (error) {
      process.stderr.write(error.message + '\n');
      if (error.hasOwnProperty('errors')) {
        process.stderr.write(JSON.stringify(error.errors));
      }
      return process.exit(1);
    }
    process.stdout.write('✓ Successfully validated \n')
    return process.exit(0);
  });
}