---
name: RSP Node 24 upgrade
description: Upgrade the RSP public portal to Node 24, OSLS and AWS SDK v3 while preserving its server-rendered, API Gateway and payment contracts.
---

# Role and scope

Work on the `rsp-public-portal` Node.js 24 upgrade: runtime and build
compatibility, OSLS where applicable, and AWS SDK v3. Preserve the existing
public portal and its independently established behaviour. This is not a
Serverless Starter rewrite or permission to deploy.

Inspect the current checkout, applicable instructions and
`.github/agents/rsp-public-portal-integration.agent.md` first. The code and
scripts may have changed since this guide was written; verify them rather than
assuming the upgrade is complete.

- Preserve uncommitted changes. Do not switch branches, create a worktree,
  commit, push, create a PR or deploy without the user's approval.
- Capture the pre-upgrade unit, lint, build and authorised integration results.
  Record existing failures and known defects separately; do not weaken tests,
  change baselines or invent an expected result.
- Keep changes focused on the migration and necessary compatibility fixes.
  Preserve the payment journey, not just successful application startup.

# Understand the portal

This is a server-rendered Express application, not a collection of separate
Payments Service Lambdas or a database owner.

- `src/server/app.js` composes middleware, Nunjucks, translations and routes in
  `src/server/routes.js`. Views are in `src/server/views`; translations are in
  `src/server/i18n`.
- `src/lambdas/serveExpressApp.js` adapts API Gateway events through
  `aws-serverless-express`, initialises the Express server lazily and reuses it
  for subsequent invocations. `serverless.yml` currently maps REST API `ANY /`
  and `ANY /{proxy+}` to `handler.handler`.
- The portal calls penalty, payment and CPMS services via
  `src/server/utils/httpclient.js`; it does not own their data. Preserve HTTP
  methods, paths, request bodies, response/error handling, retry behaviour and
  optional `aws4` signing. Never infer payment persistence from a stubbed
  response.
- Preserve form and JSON input handling, redirects, validation, payment and
  grouped-payment flows, receipts, cookies, language selection, security/cache
  headers, CSP nonces and accessibility. Check rendered HTML and browser-facing
  assets, not only status codes. Do not silently change existing contracts or
  treat an existing sanitisation chain as effective without verifying it runs.
- Preserve the Lambda adapter's production path-prefix handling, event/response
  translation, cookies, headers and configured binary MIME types. Exercise
  representative synthetic REST API v1 events, including base64/binary responses
  where applicable; direct Express tests alone do not prove adapter behaviour.

# Runtime, dependencies and configuration

- Inspect `.nvmrc`, `package.json`, its lockfile, Babel and Webpack targets,
  `serverless.yml` and CI. Align the selected Node 24 and npm versions without
  changing the user's global runtime. Verify actual tool versions and the
  resolved dependency tree.
- Verify OSLS alias, binary and plugin compatibility before changing framework
  dependencies. Do not add SAM, DynamoDB Local, OpenAPI tooling or other
  Payments-specific dependencies to this portal without a demonstrated need.
  Do not assume the local Serverless runtime updates deployed infrastructure;
  identify external runtime and deployment work separately.
- Check Express, Nunjucks, `aws-serverless-express`, Babel, Webpack, Sass,
  GOV.UK Frontend and the browser build for Node 24 compatibility. Preserve
  server and browser targets separately. Avoid unrelated dependency rewrites;
  confirm versions, engines, peer requirements and lockfile changes.
- Configuration is bootstrapped by `src/server/config.js`. With
  `USE_SECRETS_MANAGER=true`, it uses `REGION` and
  `SECRETS_MANAGER_SECRET_NAME` to fetch and parse a Secrets Manager
  `SecretString`. Otherwise it uses environment configuration. Preserve both
  paths, the configuration keys, error propagation and startup timing.
- When migrating SDK v2 usage, inspect actual imports and use the v3
  `SecretsManagerClient` and `GetSecretValueCommand` where appropriate.
  Preserve the normal credential provider chain and profile-based local
  authentication. Do not hardcode credentials or assume every AWS SDK package
  must have the same version.
- Use synthetic SDK stubs to test successful JSON secret loading, missing or
  malformed secret data, provider failures and the environment-only path. Do
  not log secret contents. Expired SSO is an authentication failure, not a
  successful test; if local startup provides guidance, retain the original
  error and identify the correct profile before suggesting `aws sso login`.

# Safe local startup and tests

- Never read, print, copy or parse real `.env` files, AWS configuration or
  credential files, private keys or secret-bearing data without explicit
  approval. Use code and safe example configuration for variable names; use
  synthetic values for tests. Do not export real credentials into commands or
  logs.
- `npm run start-server` builds and runs the local Express server;
  `npm run start-dev-server` also builds Webpack output and starts nodemon.
  Verify current scripts before running them. Startup calls `dotenv.config()`
  and can read a real `.env` from the working directory; do not run it that way
  without explicit approval for that file. Use an isolated empty working
  directory and synthetic configuration for safe checks. Secrets Manager
  startup can access AWS; request explicit approval for real AWS checks, and
  avoid unintended calls to payment or other downstream services.
- Inspect process ownership and ports before starting a service. Do not stop or
  reuse a user's process. Verify the task-owned listener and HTTP response, then
  stop only task-owned processes. A startup log alone is not readiness proof.
- Unit tests must not require AWS credentials or contact real services. Set
  synthetic configuration and install stubs before importing modules that
  bootstrap configuration or create clients. Intercept unexpected HTTP/HTTPS and
  AWS calls; restore stubs, environment changes and timers.
- Test SDK errors, body and validation edge cases, HTTP signing and retries,
  language/cookie handling, rendered views and adapter responses where changed.
  Keep assertions for exact observable behaviour and downstream requests.
  Do not weaken existing assertions or add blanket coverage exclusions.

# Build and verify the deployment archive

Inspect `webpack.common.js`, `webpack.development.js`,
`webpack.production.js`, `scripts/i18n-shim.js` and package scripts before
changing packaging. The current build has separate server and client
configurations; the server's `asyncChunks: false` keeps SDK dynamic imports in
the server bundle. Preserve that invariant or ensure every emitted runtime chunk
is included beside the bundle in the archive.

- `npm run package` currently runs the i18n shim, cleans `dist/`, builds the
  server and client, and writes `dist/package.zip`. Confirm the actual script
  order before running: the shim modifies the installed `i18n-express` module
  and the clean step removes existing `dist/` output.
- The production plugin writes `dist/handler.js` as `app.js` in the archive and
  includes `public/`, `views/` and `i18n/`. CI expects `package.zip`. Preserve
  the deployed Lambda handler contract; distinguish this archive entry from the
  local `serverless.yml` handler mapping rather than assuming they are the same.
- Await archive finalisation and output-stream closure, propagate failures, and
  ensure the client build finishes before its assets are packaged. A successful
  Webpack compilation alone does not prove a complete zip.
- Inspect the generated archive for its handler, all referenced chunks, views,
  translations, GOV.UK assets and browser bundle. Compare the archive's asset
  files with the fresh output and verify zip integrity. Compare against an
  agreed default-branch artifact or isolated build when parity matters;
  document dependency-driven differences rather than assuming byte identity.
- Smoke-test the extracted archive with synthetic API Gateway events in an
  isolated working directory, with synthetic environment configuration and no
  real credentials or downstream calls. Check the exported handler, rendered
  pages, translations, path prefixes and asset requests. Loading the module or
  checking HTTP status alone is not end-to-end validation.
- The current Express static path and packaged `public/` location can differ:
  isolated extracted-archive requests for `/all.css` and `/client.js` have
  returned 404, including on the previous default-branch build. Determine the
  intended deployed asset origin and configuration before claiming static
  delivery works or changing paths; distinguish pre-existing issues from
  upgrade regressions.

# Integration and operational boundaries

Read `integration/README.md` and the integration agent before running or
changing the manual suite. `npm run test:integration` currently builds the server
and starts the real Express app and local penalty, CPMS and payment stubs on
ephemeral loopback ports. It uses synthetic configuration, disables Secrets
Manager, blocks external requests and writes ignored JSON/HTML reports under
`integration/reports/`.

- Preserve independent assertions, synthetic fixtures, loopback restrictions,
  cleanup and reports. The runner is manual and rejects CI execution; do not
  enable remote targets or real payment operations as part of normal tests.
- Express integration tests do not exercise API Gateway, deployed Lambda
  permissions, real payments, production stage-prefix handling, binary
  translation or packaged static delivery. Treat these as separate boundaries
  and report untested scenarios and skipped checks.
- Obtain explicit approval before non-production AWS or downstream calls. Never
  create real payments, mutate shared records, print sensitive responses or
  treat a local stub response as proof of downstream persistence.

# Validation and handoff

Inspect the current scripts and run the applicable checks, recording baseline
failures and the exact scope. Tests that import application configuration may
also call `dotenv.config()`; inspect their execution environment and prevent
access to real environment files unless explicitly approved. The current
commands include:

```sh
npm test
npm run test:coverage
npm run lint
npm run test:integration
npm run package
```

Run security checks where configured and authorised; report scan scope,
authentication failures and unresolved findings honestly. Do not add blanket
ignores or claim a clean full-tree scan from a production-only scan.

Document actual runtime/tool versions, tests and integration totals, archive
contents, startup and cleanup results, security scan scope, and any missing AWS,
payment, adapter or asset checks. Keep README instructions aligned with verified
commands; its existing local Node instructions may be stale. CI may upload
feature-branch artifacts and update the default-branch Lambda, so do not trigger
deployment implicitly. Do not claim completion when required checks are
blocked or skipped.
