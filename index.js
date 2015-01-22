'use strict';

var fs         = require('fs')
  , handlebars = require('handlebars')
  , tv4        = require('tv4')
  , tv4formats = require('tv4-formats')
  , schemas    = {
    }
  ;

tv4.addFormat(tv4formats);
for (var schema in schemas) {
  tv4.addSchema(schemas[schema]);
}


var validator = module.exports = {

  validate: function(data, schema, callback) {
    var result = tv4.validateMultiple(data, schema);
    if (result.valid) {
      return callback(null, true);
    }
    var error = new Error('JSON Schema Validation error');
    error.detail = result.errors;
    return callback(error, false);
  }
};