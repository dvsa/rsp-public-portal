# Public portal integration suite

Run the manually invoked suite with:

```sh
npm run test:integration
```

Terminal output highlights passing results in green and failures in red. Colour
is disabled for redirected output, dumb terminals and when `NO_COLOR` is non-empty.

The command first transpiles the current server source to `build/server`, then
starts the real Express application and three local HTTP stubs on ephemeral
`127.0.0.1` ports. The runner sets synthetic configuration before loading the
application, changes to an empty temporary working directory so `dotenv` cannot
load a repository `.env`, and points Nunjucks at the source views. Static
`dist/` assets are not exercised. It denies non-loopback network access and
separately allowlists the three stub origins for the application's Axios
requests. No AWS credentials, remote services, payment gateway, or backend
records are used.

The JSON and self-contained HTML reports are written under `integration/reports/`.
They contain scenario outcomes and test boundaries, not request payloads or
response bodies. The reports directory is ignored by Git.

## Route inventory

All application routes are composed by `src/server/app.js`. A route's presence
in the Express integration suite does not mean API Gateway or the deployed
Lambda was exercised.

Every listed route passes through the app's security-header/cache middleware,
cookie parsing, body parsers, language selection, body-check middleware and
Lambda event-context middleware. The payment-code form and details routes also
run the express-validator checks: `POST /payment-code` validates the submitted
code, and `GET /payment-code/:payment_code` validates its path parameter. The
group summary, payment-start and receipt routes do not add that validator.

| Express method and path | Input and observable behavior | Downstream | Suite coverage |
| --- | --- | --- | --- |
| `GET /robots.txt` | No input; plain-text robots policy | None | Exact body, content type, security/cache headers |
| `GET /` | Optional language query/cookie; local development redirect | None | Redirect checked without following it |
| `GET /cookie-preferences` | Optional language query/cookie; rendered preferences page | None | Page, French language cookie and HTML language |
| `GET /cookie-details` | Optional language query/cookie; rendered details page | None | Page and cookie-selected language |
| `GET /accessibility-statement` | Optional language query/cookie; rendered statement | None | Rendered page |
| `GET /privacy-statement` | Optional language query/cookie; rendered statement | None | Rendered page |
| `GET /payment-code` | Optional invalid-code query; rendered code form | None | Form and validation-error rendering |
| `POST /payment-code` | Form-encoded or JSON `payment_code`; normalizes then redirects or renders error | None | Normalized form and JSON redirects; invalid, bodyless and unsupported-content-type input |
| `GET /payment-code/:payment_code` | Validates code; renders a single/group payment or redirects on invalid/missing/old data | Penalty service | Single-penalty render, invalid input and stubbed not-found response |
| `GET /payment-code/:payment_code/receipt` | Renders a single-payment receipt or redirects when downstream data is unavailable | Penalty and payment services | Not covered |
| `GET /payment-code/:payment_code/:type/details` | Renders a grouped-payment summary | Penalty service | Not covered |
| `POST /payment-code/:payment_code/payment` | Starts a single or group payment; redirects to payment gateway or back to details | Penalty and CPMS services | Single-penalty gateway redirect and CPMS failure/retry path; outbound update and payloads asserted |
| `POST /payment-code/:payment_code/:type/payment` | Starts a grouped payment | Penalty and CPMS services | Not covered |
| `GET /payment-code/:payment_code/confirmPayment` | Confirms a single payment; redirects to receipt or renders failure | Penalty, CPMS and payment services | Stubbed success and cancellation; recording observed only at local payment stub |
| `GET /payment-code/:payment_code/:type/confirmGroupPayment` | Confirms a grouped payment; redirects or renders failure | Penalty, CPMS and payment services | Not covered |
| `GET /payment-code/:payment_code/:type/receipt` | Renders a grouped-payment receipt | Penalty and payment services | Not covered |

`serverless.yml` maps `ANY /` and `ANY /{proxy+}` to `handler.handler`. The
suite tests Express over HTTP, not API Gateway event translation, deployed
stage-prefix behavior, Lambda binary responses, or AWS permissions. Static
asset delivery is also not covered.

The app's body-sanitizing middleware creates an express-validator chain with
`.escape()` but never runs it; the integration scenarios do not claim that
request bodies are sanitized. The payment initiation and confirmation scenarios
only prove requests and responses at the local stub boundary. They do not prove
that a real payment was created, confirmed, or persisted.
