# Changelog

## 1.7.0

### Fixed
- Failed requests are no longer cached. Before, a single failed download of a schema (e.g. a short network outage)
  made every following validation against this schema fail with the same error until the process was restarted.
- Remote requests have a timeout now (10 s until the response starts, 30 s in total per attempt), so a hanging request
  can no longer block all validations against a schema. Requests are retried up to 2 times on network errors,
  timeouts and 5xx responses. Both can be configured with the new `setRequestOptions(options)`.
- HTTP errors were not detected (wrong property checked), so the raw superagent error was passed through.
- Schemas which do not match the JSON Schema meta schema are now reported as `No valid JSON Schema` instead of
  `JSON Schema Validation error`, as originally intended.
- Type definitions: `dropSchemas` and `getSchema` are exported now.

### Added
- `setRequestOptions({ timeout, retries })`
- Errors of failed requests name the URL (`Could not load schema from <url>: <reason>`,
  `Could not load remote data from <url>: <reason>`) and have the properties `url`, `cause` and `status` (HTTP errors)
  or `code` (network errors, e.g. `ENETUNREACH`).
- Type definitions for `loadData`, `loadSchema`, `tv4Validate`, `setRequestOptions`, `preload(schema)` and the error
  object (`JsonSchemaRemoteError`). The definitions are a regular module now instead of an ambient `declare module`.
- Command line tool prints usage and exits with `2` on a wrong number of arguments.
- `LICENSE` file, GitHub Actions CI, `CHANGELOG.md`

### Changed
- tv4 (entrecode fork with the `multipleOf` fix of 1.6.0) is bundled as `lib/tv4.js` instead of being installed from
  GitHub, so installing no longer needs git.
- Parallel requests for the same URL share one download in all environments (before: only in Node.js).
- Dependencies: superagent 7 → 10 (needs Node.js ≥ 14.18, declared in `engines`), validator 13.15, tv4-formats 3.0.6.
  Removed lodash.isobject and lodash.isstring. No known vulnerabilities.
- The npm package only contains runtime files (about 90 kB instead of 1.6 MB unpacked).
- Tests use `node:test` and a local HTTP server, internet access is no longer needed. Removed mocha and chai.

### Removed
- Webpack UMD build in `dist/`. Bundlers use the package directly.

## 1.6.2
- dependency updates

## 1.6.1
- new webpack build

## 1.6.0
- use forked tv4 which accepts floating point values like `19.99` for `multipleOf: 0.01`

## 1.5.1
- adds new webpack build

## 1.5.0
- patchday with new version of validator

## 1.3.7
- readd meta schema on dropSchemas

## 1.3.6
- use packaged schema for metaSchema validation, should fix Mixed-Content warnings

## 1.3.5
- adds dropSchema to type definitions

## 1.3.4
- add option to remove all schemas from cache

## 1.3.3
- allow string only "jsons"
- improved require_tld logic in requests

## 1.3.2
- fixed infinity loop when schema has broken refs

## 1.3.1
- add request cache

## 1.3.0
- adds typescript typings

## 1.2.5 / 1.2.6
- fixed bufferhandling in browser with superagent

## 1.2.1
- updated Dependencies, fixed Tests for Chai 4

## 1.2.0
- adds `getSchema(url)`

## 1.1.6
- version 3.0.0 tv4-formats with fixed typescript usage

## 1.1.4 - 1.1.5
- bugfixes

## 1.1.3
- removed lodash
- split shell usage into single file

## 1.1.2
- updated dependencies

## 1.1.1
- made the feature from 1.1.0 actually work

## 1.1.0
- added function `setLoggingFunction(fn)` to add a custom logger function instead of `console.log`

## 1.0.0
- breaking change: Node.js >= 4.0.0 is required due to the usage of Promises and Arrow functions. Use json-schema-remote@0.1.7 for older node versions.
- added support for Promises (callbacks still work, too)
- removed dependency on `async`
- updated dependencies

## 0.1.7
- removed deprecation caused by validator.js

## 0.1.6
- updated dependencies

## 0.1.5
- updated dependencies

## 0.1.4
- updated dependencies
- added mocha and mocha-bamboo-reporter to dev dependencies

## 0.1.3
- updated dependencies

## 0.1.2
- updated dependencies

## 0.1.1
- updated dependencies
- updated tests for chai 2.x
- updated test for remote schema and data

## 0.1.0
- added preload function

## 0.0.2
- fix for package.json file

## 0.0.1
- initial release
