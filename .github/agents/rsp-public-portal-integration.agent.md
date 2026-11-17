---
name: RSP Public Portal integration baseline
description: Build safe, manually run black-box HTTP integration tests for the RSP public payment portal and its Lambda adapter.
---

# Outcome

Build a repeatable, manually run integration suite for `rsp-public-portal` that
checks the externally observable behaviour of its Express application and, where
useful, its API Gateway Lambda adapter. This is test work, not permission to
upgrade dependencies, rewrite the service, contact production systems, create
real payments, or deploy.

Work in this repository only. Confirm the branch, working tree and applicable
instructions before editing. Preserve existing user changes. Do not modify the
Documents Service checkout or copy its service-specific fixtures, credentials,
database tooling or deployment configuration.

# Understand this service

The portal is an Express application with Nunjucks views. Its routes are defined
in `src/server/routes.js`, the app and middleware are assembled in
`src/server/app.js`, and `src/lambdas/serveExpressApp.js` adapts API Gateway
events through `aws-serverless-express`.

The portal calls external penalty, payment and CPMS services through
`src/server/utils/httpclient.js`. Configuration is loaded by
`src/server/config.js`; when `USE_SECRETS_MANAGER=true`, startup calls AWS
Secrets Manager. The portal does not own the payment records or a local database.

Discover the current route list, event shape, configuration and build paths from
source before designing tests. Do not assume route inventories, contracts, ports,
stage prefixes, downstream APIs or runtime details from another RSP repository.

# Test boundaries

Prefer these levels, keeping their claims distinct:

1. **Express HTTP integration:** start the real app composition root on a
   loopback port and send HTTP requests through the actual middleware, router,
   controllers and views. Assert status, headers, redirects and meaningful
   response content.
2. **Downstream contract integration:** keep the real portal HTTP stack and
   replace CPMS, payment and penalty endpoints with controlled local HTTP stubs
   or narrowly scoped request interceptors. Assert outbound methods, paths,
   headers, payloads, call counts and the resulting portal response.
3. **Lambda adapter integration:** where it adds confidence, invoke the exported
   handler with synthetic API Gateway events and assert the translated response
   and path behaviour. Never invoke a deployed Lambda as part of the default
   suite.
4. **Non-production end-to-end checks:** treat these as a separate, explicitly
   approved activity. They may reach real AWS or payment systems and must not be
   enabled by ordinary local test commands or CI.

Do not call mocked downstream checks end-to-end tests. A stubbed response does
not prove a payment was persisted, a real CPMS request succeeded, or AWS
credentials and permissions work.

Tests may import `createApp` as the application composition root and the Lambda
handler only for its adapter tests. Do not call controllers or production
services directly from black-box contract scenarios. Keep ordinary unit tests
under `test/`; keep this suite outside `test/**/*.js` and outside source
coverage.

# Safety and isolation

- Default every listener and stub to an ephemeral `127.0.0.1` port. Reject
  remote targets, CI execution and unknown URLs before sending requests.
- Make outbound HTTP fail closed. Allow only the test's explicitly registered
  local stub targets; unexpected external requests must fail the scenario.
- Do not read, print, copy or parse `.env`, `.env.*` with real values, AWS
  profiles, credentials, private keys or secret-bearing files. Use documented
  variable names or safe example files for configuration structure.
- Set synthetic test configuration before importing the app/config modules.
  Keep `USE_SECRETS_MANAGER` disabled by default, use fake credentials, and
  point service URLs at local stubs. Test Secrets Manager behaviour with a
  controlled SDK stub; never require AWS login for the default suite.
- Do not use real payment codes, customer data, payment references or secrets.
  Generate deterministic synthetic values and keep sensitive fixtures out of
  source control and reports.
- Payment initiation and confirmation can cause external financial or state
  changes. Stub them by default. Ask for explicit approval before any
  non-production scenario that can contact real payment services or mutate
  shared resources. Never send real payments.
- Do not seed, reset, truncate or delete backend data. This portal does not own
  those records, and a local portal process does not make downstream systems
  local.
- Do not stop a user's existing service. Stop only processes started by the
  integration runner.

# Build and run the local app safely

Inspect the current scripts before adding commands. The existing app factory
calls configuration bootstrap, and production assets/views are emitted by the
build. Ensure integration runs use fresh build output or a documented local
asset setup; never silently test against stale `dist/` files.

If a runner starts the app in-process:

- Set safe environment values before importing `src/server/app.js`.
- Bootstrap with Secrets Manager disabled.
- Start the app on loopback and an ephemeral port.
- Start local downstream stubs before making portal requests.
- Close the HTTP server and every stub in `finally`, including on assertion or
  setup failures.

If a separately started service is needed, document the exact startup command,
safe environment, readiness request, ports, log location and shutdown steps.
Check that the test is talking to the process it started, not a stale local
server. Do not rely on an undocumented shell environment.

# Discover and test portal contracts

Inventory every route in `src/server/routes.js` and the API Gateway mapping in
`serverless.yml`. Record the method, path, input shape, expected response,
middleware, downstream calls, and whether the path is served through the Lambda
adapter. Do not invent routes for Lambda-only behavior.

Select meaningful scenarios from the current contract, including where
applicable:

- Public pages, robots response, language selection, cookie preferences and
  cookie details.
- Payment-code form parsing, normalization, validation failures and redirects.
- Individual and grouped payment details, including missing, invalid, expired,
  paid, unpaid and pending cases.
- Payment initiation and confirmation success, cancellation, downstream errors
  and rejected requests.
- CSP, cache and other security headers, static assets and rendered page content.
- API Gateway path/stage-prefix handling and binary/response translation.

For each scenario:

- Assert exact status and important headers, plus redirect location or relevant
  rendered text/data. A status-only assertion is not meaningful coverage.
- For downstream interactions, assert the request contract and expected number
  of calls as well as the response. For invalid or rejected input, assert that
  no unintended downstream action occurred.
- Exercise both form-encoded and JSON bodies only where the route supports
  them. Include bodyless requests and requests with unsupported content types.
- Verify cookies, query parameters, language selection, CSP nonces and path
  prefixes at the HTTP boundary where relevant.
- Cover failure and timeout paths without weakening existing contract
  assertions. Distinguish current known behaviour from intended behaviour.
- Do not infer persistence from a rendered page or mocked success response.
  State clearly which effects are only observed at the local stub boundary.

The existing unit tests use Sinon and Nock. Reuse installed tools when suitable;
do not add a dependency without demonstrating a need. A small local HTTP stub
can provide stronger transport-level evidence than mocking controller methods.
Do not make tests concurrent if they share global environment variables, Nock
state, a fixed port or module-level configuration.

# Suite commands, reporting and completion

Keep integration tests separate from `npm test`, `npm run test:coverage`, lint
and CI unless the user explicitly changes that scope. Add a dedicated manual
command only when the runner is implemented. Do not describe a tooling
self-test as an integration run.

Provide a self-contained HTML report and machine-readable JSON when the suite is
large enough to warrant them. Reports must redact URLs with credentials,
authorization headers, cookies, secret values, personal/payment data and raw
downstream payloads. Include scenario totals, passed/failed/skipped counts,
which external dependencies were stubbed, startup/cleanup results and untested
boundaries. Skips are not passes.

Before completion:

- Confirm every route and tested Lambda adapter path is accounted for, including
  explicit gaps.
- Run the existing unit suite, coverage and lint to ensure the new suite is
  isolated and does not change their discovery or results.
- Run the integration scenarios only against verified loopback app/stub
  targets, and report actual outcomes.
- Confirm listeners and stubs are closed and generated reports/fixtures are
  ignored as appropriate.
- Leave production logic, deployment configuration and user changes untouched
  unless a necessary defect is separately discussed and authorised.

Report the scenario count, exact commands, whether dependencies were mocked,
the artifact/report location, cleanup outcome, known contract defects, and any
real AWS/payment behaviour that remains untested. Never claim real persistence,
payment completion, AWS access or deployment success based only on local stubs.
