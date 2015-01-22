'use strict';

var fs          = require('fs')
  , handlebars  = require('handlebars')
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

  validate: function(data, schemaOrURL, callback) {
    loadSchema(schemaOrURL, function(error, schema) {
      if (error) {
        return callback(error, false);
      }
      return tv4Validate(data, schema, callback);
    });
  }
};

function loadSchema(schema, callback) {
    if (validatorJS.isURL(schema)) {

      request(schema, function (error, response, body) {
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

function tv4Validate(data, schema, callback) {
  var result = tv4.validateMultiple(data, schema);
  if (result.valid && result.errors.length === 0 && result.missing.length === 0) {
    return callback(null, true);
  }
  var error = new Error(schema === metaSchema ? 'No valid JSON Schema' : 'JSON Schema Validation error');
  if (result.errors.length > 0) {
    error.detail = result.errors;
  } else {
    error.detail = result.missing;
  }
  return callback(error, false);
}