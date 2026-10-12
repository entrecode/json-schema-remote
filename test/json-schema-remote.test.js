const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { execFile } = require('node:child_process');
const packageSchema = require('./fixtures/package-schema.json');
const validator = require('..');

const DEFAULT_REQUEST_OPTIONS = { timeout: { response: 10000, deadline: 30000 }, retries: 2 };

// Local HTTP server, so tests do not need internet access. Every test registers its own paths, because
// tv4 caches loaded schemas by URL for the lifetime of the process.
const routes = new Map();
const hits = new Map();
let server;
let baseUrl;
let counter = 0;

function serve(name, handler) {
  counter += 1;
  const urlPath = `/${name}-${counter}`;
  routes.set(urlPath, handler);
  return `${baseUrl}${urlPath}`;
}

function hitsOf(url) {
  return hits.get(new URL(url).pathname) || 0;
}

function geoSchema(id) {
  return {
    $schema: 'http://json-schema.org/draft-04/schema#',
    id,
    type: 'object',
    properties: {
      latitude: { type: 'number' },
      longitude: { type: 'number' },
    },
    required: ['latitude', 'longitude'],
  };
}

function serveGeoSchema() {
  let url;
  url = serve('geo', (req, res) => res.end(JSON.stringify(geoSchema(url))));
  return url;
}

function closedPortUrl() {
  const tmp = http.createServer();
  return new Promise((resolve) => {
    tmp.listen(0, () => {
      const { port } = tmp.address();
      tmp.close(() => resolve(`http://localhost:${port}/schema`));
    });
  });
}

before(async () => {
  validator.setLoggingFunction(() => {});
  server = http.createServer((req, res) => {
    hits.set(req.url, (hits.get(req.url) || 0) + 1);
    const handler = routes.get(req.url);
    if (!handler) {
      res.statusCode = 404;
      return res.end('not found');
    }
    if (typeof handler === 'function') {
      return handler(req, res);
    }
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify(handler));
  });
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

describe('local schema and data', () => {
  const schema = {
    properties: {
      intKey: { type: 'integer' },
      stringKey: { type: 'string' },
    },
  };

  it('valid data', async () => {
    assert.equal(await validator.validate({ intKey: 1, stringKey: 'one' }, schema), true);
  });

  it('invalid data', async () => {
    await assert.rejects(validator.validate({ intKey: 1, stringKey: false }, schema), (error) => {
      assert.equal(error.message, 'JSON Schema Validation error');
      assert.equal(error.errors[0].message, 'Invalid type: boolean (expected string)');
      return true;
    });
  });

  it('string data', async () => {
    assert.equal(await validator.validate('hello', { type: 'string' }), true);
  });

  it('multipleOf with floating point numbers (bundled tv4 fork)', async () => {
    assert.equal(await validator.validate(19.99, { type: 'number', multipleOf: 0.01 }), true);
  });

  it('invalid schema', async () => {
    await assert.rejects(validator.validate({}, { type: 5 }), (error) => {
      assert.equal(error.message, 'No valid JSON Schema');
      assert.ok(error.errors.length > 0);
      return true;
    });
  });

  it('definition path invalid', async () => {
    const faultySchema = {
      $schema: 'http://json-schema.org/draft-04/schema#',
      id: 'https://example.com/schema',
      type: 'object',
      properties: {
        b: {
          $ref: '#/definitions/plainError',
          definitions: {
            plainError: { type: 'object' },
          },
        },
      },
    };
    await assert.rejects(validator.validate({ b: {} }, faultySchema), {
      message: 'json-schema-remote: tv4 is missing schema it already has in cache. possible faulty schema.',
    });
  });
});

describe('remote schema and local data', () => {
  it('valid data', async () => {
    const schema = serveGeoSchema();
    assert.equal(await validator.validate({ latitude: 48.778611, longitude: 9.179749 }, schema), true);
  });

  it('invalid data', async () => {
    const schema = serveGeoSchema();
    await assert.rejects(validator.validate({ latitude: 48.778611, longitude: '9.179749' }, schema), (error) => {
      assert.equal(error.errors[0].message, 'Invalid type: string (expected number)');
      return true;
    });
  });

  it('loads a schema only once', async () => {
    const schema = serveGeoSchema();
    await validator.validate({ latitude: 1, longitude: 2 }, schema);
    await validator.validate({ latitude: 3, longitude: 4 }, schema);
    assert.equal(hitsOf(schema), 1);
  });

  it('parallel requests share one download', async () => {
    const schema = serveGeoSchema();
    const results = await Promise.all([
      validator.validate({ latitude: 1, longitude: 2 }, schema),
      validator.validate({ latitude: 3, longitude: 4 }, schema),
    ]);
    assert.deepEqual(results, [true, true]);
    assert.equal(hitsOf(schema), 1);
  });

  it('remote schema with remote $refs', async () => {
    const geo = serveGeoSchema();
    let location;
    location = serve('location', (req, res) =>
      res.end(
        JSON.stringify({
          $schema: 'http://json-schema.org/draft-04/schema#',
          id: location,
          type: 'object',
          properties: {
            name: { type: 'string' },
            position: { $ref: geo },
          },
        })
      )
    );
    assert.equal(await validator.validate({ name: 'Stuttgart', position: { latitude: 1, longitude: 2 } }, location), true);
    await assert.rejects(validator.validate({ name: 'Stuttgart', position: { latitude: 1 } }, location), (error) => {
      assert.equal(error.errors[0].message, 'Missing required property: longitude');
      return true;
    });
    assert.equal(hitsOf(geo), 1);
  });

  it('invalid remote schema', async () => {
    const schema = serve('invalid-schema', { type: 5 });
    await assert.rejects(validator.validate({}, schema), { message: 'No valid JSON Schema' });
  });
});

describe('local schema and remote data', () => {
  it('valid data', async () => {
    const data = serve('package', { name: 'json-schema-remote', version: '1.7.0' });
    assert.equal(await validator.validate(data, packageSchema), true);
  });

  it('invalid data', async () => {
    const data = serve('package', { version: '1.7.0' });
    await assert.rejects(validator.validate(data, packageSchema), (error) => {
      assert.equal(error.errors[0].message, 'Missing required property: name');
      return true;
    });
  });

  it('data which is no JSON object', async () => {
    const data = serve('string', 'just a string');
    await assert.rejects(validator.validate(data, packageSchema), { message: 'No valid JSON Object' });
  });
});

describe('remote schema and data', () => {
  it('valid data', async () => {
    const schema = serveGeoSchema();
    const data = serve('position', { latitude: 1, longitude: 2 });
    assert.equal(await validator.validate(data, schema), true);
  });
});

describe('failing requests', () => {
  afterEach(() => validator.setRequestOptions(DEFAULT_REQUEST_OPTIONS));

  it('does not cache failed requests (ONE-11520)', async () => {
    let reachable = false;
    let schema;
    schema = serve('flaky', (req, res) => {
      if (!reachable) {
        return req.socket.destroy();
      }
      return res.end(JSON.stringify(geoSchema(schema)));
    });

    await assert.rejects(validator.validate({ latitude: 1, longitude: 2 }, schema), {
      code: 'ECONNRESET',
      url: schema,
    });
    reachable = true;
    assert.equal(await validator.validate({ latitude: 1, longitude: 2 }, schema), true);
  });

  it('times out hanging requests and does not cache them', async () => {
    validator.setRequestOptions({ timeout: { response: 100 }, retries: 0 });
    let responding = false;
    let schema;
    schema = serve('hanging', (req, res) => {
      if (responding) {
        res.end(JSON.stringify(geoSchema(schema)));
      }
    });

    await assert.rejects(validator.validate({ latitude: 1, longitude: 2 }, schema), (error) => {
      assert.equal(error.code, 'ECONNABORTED');
      assert.match(error.message, new RegExp(`^Could not load schema from ${schema}: .*timeout`, 'i'));
      return true;
    });
    responding = true;
    assert.equal(await validator.validate({ latitude: 1, longitude: 2 }, schema), true);
  });

  it('retries on 5xx responses', async () => {
    let schema;
    schema = serve('unavailable', (req, res) => {
      if (hitsOf(schema) === 1) {
        res.statusCode = 503;
        return res.end();
      }
      return res.end(JSON.stringify(geoSchema(schema)));
    });
    assert.equal(await validator.validate({ latitude: 1, longitude: 2 }, schema), true);
    assert.equal(hitsOf(schema), 2);
  });

  it('reports HTTP errors with status and URL', async () => {
    const schema = `${baseUrl}/does-not-exist`;
    await assert.rejects(validator.validate({}, schema), {
      message: `Could not load schema from ${schema}: HTTP 404`,
      status: 404,
      url: schema,
    });
    assert.equal(hitsOf(schema), 1);
  });

  it('reports HTTP errors when loading data', async () => {
    const data = `${baseUrl}/no-data`;
    await assert.rejects(validator.validate(data, packageSchema), {
      message: `Could not load remote data from ${data}: HTTP 404`,
      status: 404,
    });
  });

  it('reports network errors with code and URL', async () => {
    validator.setRequestOptions({ retries: 0 });
    const schema = await closedPortUrl();
    await assert.rejects(validator.validate({}, schema), (error) => {
      assert.equal(error.code, 'ECONNREFUSED');
      assert.equal(error.url, schema);
      assert.ok(error.message.startsWith(`Could not load schema from ${schema}: `));
      assert.ok(error.cause instanceof Error);
      return true;
    });
  });
});

describe('setRequestOptions', () => {
  afterEach(() => validator.setRequestOptions(DEFAULT_REQUEST_OPTIONS));

  it('accepts valid options', () => {
    validator.setRequestOptions({ timeout: 5000 });
    validator.setRequestOptions({ timeout: { response: 1000, deadline: 5000 } });
    validator.setRequestOptions({ timeout: 0, retries: 0 });
  });

  it('rejects invalid options', () => {
    assert.throws(() => validator.setRequestOptions());
    assert.throws(() => validator.setRequestOptions({ timeout: -1 }));
    assert.throws(() => validator.setRequestOptions({ timeout: '1000' }));
    assert.throws(() => validator.setRequestOptions({ retries: -1 }));
    assert.throws(() => validator.setRequestOptions({ retries: 1.5 }));
  });
});

describe('preload remote schema', () => {
  const id = 'https://nonexistent.tld/some/schema';
  const schema = {
    type: 'object',
    properties: {
      x: { $ref: id },
    },
  };

  before(() =>
    validator.preload({
      $schema: 'http://json-schema.org/draft-04/schema#',
      id,
      type: 'string',
    })
  );

  it('validate (passing)', async () => {
    assert.equal(await validator.validate({ x: 'string' }, schema), true);
  });

  it('validate (not passing)', async () => {
    await assert.rejects(validator.validate({ x: 0 }, schema), (error) => {
      assert.equal(error.errors[0].message, 'Invalid type: number (expected string)');
      return true;
    });
  });

  it('preload with url', async () => {
    validator.preload('https://nonexistent.tld/other/schema', { type: 'number' });
    assert.equal(await validator.validate(1, 'https://nonexistent.tld/other/schema'), true);
  });
});

describe('schema cache', () => {
  before(() =>
    validator.preload({
      $schema: 'http://json-schema.org/draft-04/schema#',
      id: 'https://nonexistent.tld/cached/schema',
      type: 'string',
    })
  );

  it('load schema from cache', () => {
    assert.equal(validator.getSchema('https://nonexistent.tld/cached/schema').type, 'string');
  });

  it('no cached version', () => {
    assert.equal(validator.getSchema('https://nonexistent.tld/no/schema'), undefined);
  });

  it('dropSchemas removes cached schemas', async () => {
    validator.dropSchemas();
    assert.equal(validator.getSchema('https://nonexistent.tld/cached/schema'), undefined);
    // meta schema is still available
    assert.equal(await validator.validate('hello', { type: 'string' }), true);
  });
});

describe('setLoggingFunction', () => {
  after(() => validator.setLoggingFunction(() => {}));

  it('logs downloads', async () => {
    const logged = [];
    validator.setLoggingFunction((...args) => logged.push(args.join('')));
    const schema = serveGeoSchema();
    await validator.validate({ latitude: 1, longitude: 2 }, schema);
    assert.deepEqual(logged, [`downloading from ${schema}\n`]);
  });

  it('throws on non-functions', () => {
    assert.throws(() => validator.setLoggingFunction('nope'), { message: 'logging function is no function!' });
  });
});

describe('callback style', () => {
  const schema = {
    properties: {
      intKey: { type: 'integer' },
      stringKey: { type: 'string' },
    },
  };

  it('valid data', (t, done) => {
    validator.validate({ intKey: 1, stringKey: 'one' }, schema, (error, isValid) => {
      assert.equal(error, null);
      assert.equal(isValid, true);
      done();
    });
  });

  it('invalid data', (t, done) => {
    validator.validate({ intKey: 1, stringKey: false }, schema, (error, isValid) => {
      assert.equal(isValid, false);
      assert.equal(error.errors[0].message, 'Invalid type: boolean (expected string)');
      done();
    });
  });

  it('remote schema', (t, done) => {
    validator.validate({ latitude: 1, longitude: 2 }, serveGeoSchema(), (error, isValid) => {
      assert.equal(error, null);
      assert.equal(isValid, true);
      done();
    });
  });

  it('failed request', (t, done) => {
    validator.loadSchema(`${baseUrl}/missing`, (error) => {
      assert.equal(error.status, 404);
      done();
    });
  });
});

describe('command line', () => {
  const bin = path.join(__dirname, '..', 'bin', 'json-schema-remote.js');
  const run = (...args) =>
    new Promise((resolve) => {
      execFile(process.execPath, [bin, ...args], (error, stdout, stderr) =>
        resolve({ code: error ? error.code : 0, stdout, stderr })
      );
    });

  it('valid data', async () => {
    const result = await run(serve('position', { latitude: 1, longitude: 2 }), serveGeoSchema());
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Successfully validated/);
  });

  it('invalid data', async () => {
    const result = await run(serve('position', { latitude: 1 }), serveGeoSchema());
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Missing required property: longitude/);
  });

  it('missing arguments', async () => {
    const result = await run();
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Usage/);
  });
});
