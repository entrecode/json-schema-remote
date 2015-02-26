/*global describe, it */
'use strict';
var chai                   = require('chai')
  , expect                 = chai.expect
  , localPackageJsonSchema = require('../schema/package.json')
  ;

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
      expect(isValid).to.be.true;
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
      expect(isValid).to.not.be.true;
      expect(error).to.have.deep.property('errors.0.message', 'Invalid type: boolean (expected string)');
      done();
    })
  });
});

describe('remote schema and local data', function() {
  it('valid data', function(done) {
    var data = {latitude: 48.778611, longitude: 9.179749};
    var schema = "http://json-schema.org/geo";
    validator.validate(data, schema, function(error, isValid) {
      if (error) {
        done(error);
      }
      expect(isValid).to.be.true;
      done();
    });
  });
  it('invalid data', function(done) {
    var data = {latitude: 48.778611, longitude: "9.179749"};
    var schema = "http://json-schema.org/geo";
    validator.validate(data, schema, function(error, isValid) {
      expect(isValid).to.not.be.true;
      expect(error).to.have.deep.property('errors.0.message', 'Invalid type: string (expected number)');
      done();
    });
  });
  it('remote schema with remote $refs', function(done) {
    var data = {
      "collection": {
        "version": "1.0",
        "href": "http://example.org/friends/",
        "links": [
          {
            "rel": "feed",
            "href": "http://example.org/friends/rss"
          }
        ],
        "items": [
          {
            "href": "http://example.org/friends/jdoe",
            "data": [
              {
                "name": "full-name",
                "value": "J. Doe",
                "prompt": "Full Name"
              },
              {
                "name": "email",
                "value": "jdoe@example.org",
                "prompt": "Email"
              }
            ],
            "links": [
              {
                "rel": "blog",
                "href": "http://examples.org/blogs/jdoe",
                "prompt": "Blog"
              },
              {
                "rel": "avatar",
                "href": "http://examples.org/images/jdoe",
                "prompt": "Avatar",
                "render": "image"
              }
            ]
          },
          {
            "href": "http://example.org/friends/msmith",
            "data": [
              {
                "name": "full-name",
                "value": "M. Smith",
                "prompt": "Full Name"
              },
              {
                "name": "email",
                "value": "msmith@example.org",
                "prompt": "Email"
              }
            ],
            "links": [
              {
                "rel": "blog",
                "href": "http://examples.org/blogs/msmith",
                "prompt": "Blog"
              },
              {
                "rel": "avatar",
                "href": "http://examples.org/images/msmith",
                "prompt": "Avatar",
                "render": "image"
              }
            ]
          },
          {
            "href": "http://example.org/friends/rwilliams",
            "data": [
              {
                "name": "full-name",
                "value": "R. Williams",
                "prompt": "Full Name"
              },
              {
                "name": "email",
                "value": "rwilliams@example.org",
                "prompt": "Email"
              }
            ],
            "links": [
              {
                "rel": "blog",
                "href": "http://examples.org/blogs/rwilliams",
                "prompt": "Blog"
              },
              {
                "rel": "avatar",
                "href": "http://examples.org/images/rwilliams",
                "prompt": "Avatar",
                "render": "image"
              }
            ]
          }
        ],
        "queries": [
          {
            "rel": "search",
            "href": "http://example.org/friends/search",
            "prompt": "Search",
            "data": [
              {
                "name": "search",
                "value": ""
              }
            ]
          }
        ],
        "template": {
          "data": [
            {
              "name": "full-name",
              "value": "",
              "prompt": "Full Name"
            },
            {
              "name": "email",
              "value": "",
              "prompt": "Email"
            },
            {
              "name": "blog",
              "value": "",
              "prompt": "Blog"
            },
            {
              "name": "avatar",
              "value": "",
              "prompt": "Avatar"
            }
          ]
        }
      }
    };
    var schema = 'http://hyperschema.org/mediatypes/collection-json';
    validator.validate(data, schema, function(error, isValid) {
      if (error) {
        done(error);
      }
      expect(isValid).to.be.true;
      done();
    });
  });
});

describe('local schema and remote data', function() {
  it('valid data', function(done) {
    var data = "https://raw.githubusercontent.com/geraintluff/tv4/master/package.json";
    var schema = localPackageJsonSchema;
    validator.validate(data, schema, function(error, isValid) {
      if (error) {
        done(error);
      }
      expect(isValid).to.be.true;
      done();
    });
  });
  it('invalid data', function(done) {
    var data = 'http://hyperschema.org/mediatypes/hal';
    var schema = localPackageJsonSchema;
    validator.validate(data, schema, function(error, isValid) {
      expect(isValid).to.not.be.true;
      expect(error).to.have.deep.property('errors.0.message', 'Missing required property: name');
      done();
    });
  });
});

describe('remote schema and data', function() {
  it('valid data', function(done) {
    var data = 'https://raw.githubusercontent.com/geraintluff/tv4/master/package.json';
    var schema = 'https://gitlab.com/mjkaye/hal-json-schema/raw/master/hal-schema.json';
    validator.validate(data, schema, function(error, isValid) {
      if (error) {
        done(error);
      }
      expect(isValid).to.be.true;
      done();
    });
  });
  it('invalid data', function(done) {
    var data = 'http://hyperschema.org/mediatypes/hal';
    var schema = 'http://json.schemastore.org/package';
    validator.validate(data, schema, function(error, isValid) {
      expect(isValid).to.not.be.true;
      expect(error).to.have.deep.property('errors.0.message', 'Missing required property: name');
      done();
    });
  });
});

describe('preload remote schema', function() {
  before(function(done) {
    validator.preload({
      $schema: 'http://json-schema.org/draft-04/schema#',
      id: 'https://nonexistent.tld/some/schema',
      type: 'string'
    });
    done();
  });
  it('validate (passing)', function(done) {
    var data = {x: 'string'};
    var schema = {
      type: 'object',
      properties: {
        x: {$ref: 'https://nonexistent.tld/some/schema'}
      }
    };
    validator.validate(data, schema, function(error, isValid) {
      if (error) {
        done(error);
      }
      expect(isValid).to.be.true;
      done();
    });
  });
  it('validate (not passing)', function(done) {
    var data = {x: 0};
    var schema = {
      type: 'object',
      properties: {
        x: {$ref: 'https://nonexistent.tld/some/schema'}
      }
    };
    validator.validate(data, schema, function(error, isValid) {
      expect(isValid).to.not.be.true;
      expect(error).to.have.deep.property('errors.0.message', 'Invalid type: number (expected string)');
      done();
    });
  });
});
