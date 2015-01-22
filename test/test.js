/*global describe, it */
'use strict';
var chai   = require('chai')
  , expect = chai.expect
var validator = require('../');

describe('basic check of testing library', function() {
  it('assert that JavaScript is still a little crazy', function() {
    expect([] + []).to.equal('');
  });
});

describe('local schema and data', function() {
  it('valid data', function(done) {
    var data = {intKey: 1, stringKey: "one"};
    var schema = {
      properties: {
        intKey: {"type": "integer"},
        stringKey: {"type": "string"}
      }
    };
    validator.validate(data, schema, function(error, isValid) {
      if (error) {
        done(error);
      }
      expect(isValid).to.be.true();
      done();
    })
  });
  it('invalid data', function(done) {
    var data = {intKey: 1, stringKey: false};
    var schema = {
      properties: {
        intKey: {"type": "integer"},
        stringKey: {"type": "string"}
      }
    };
    validator.validate(data, schema, function(error, isValid) {
      expect(isValid).to.not.be.true();
      expect(error).to.have.deep.property('detail.0.message', 'Invalid type: boolean (expected string)');
      done();
    })
  });
});

