'use strict';

var fs         = require('fs')
  , handlebars = require('handlebars')
  , tv4        = require('tv4')
  , tv4formats = require('tv4-formats')
  , schemas    = {
      resourcedoc: require('./schema/resourcedoc.json')
    }
  ;

tv4.addFormat(tv4formats);
for (var schema in schemas) {
  tv4.addSchema(schemas[schema]);
}

var handlebarsHelpers = require('./lib/handlebarsHelpers');

var resourceTemplate = handlebars.compile(fs.readFileSync(__dirname+'/templates/resource.md.handlebars', {encoding: 'utf8'}));

handlebars = handlebarsHelpers(handlebars);

var hypermediadoc = module.exports = {

  /**
   * render Markdown from a resource definition using the resource template
   * @param resource JSON that complies to the resourcedoc JSON Schema
   * @returns Markdown string
   */
  markdownFromResource: function(resource) {
    // TODO check for JSON schema
    var validation = tv4.validateResult(resource, schemas.resourcedoc, false, true);
    if (!validation.valid) {
      throw validation.error;
    }
    return resourceTemplate(resource);
  }
};