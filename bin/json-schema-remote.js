#!/usr/bin/env node

const validator = require('../json-schema-remote');

/* for usage on command line */
const args = process.argv.slice(2);
if (args.length !== 2) {
  process.stderr.write('Usage: json-schema-remote <dataURL> <schemaURL>\n');
  process.exit(2);
}

validator.validate(args[0], args[1])
.then(() => {
  process.stdout.write('✓ Successfully validated \n');
  return process.exit(0);
})
.catch((error) => {
  process.stderr.write(`${error.message}\n`);
  if ('errors' in error) {
    process.stderr.write(JSON.stringify(error.errors));
  }
  return process.exit(1);
});
