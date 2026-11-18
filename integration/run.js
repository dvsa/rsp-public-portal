const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const syntheticPaymentCode = 'synth00000000001';
const syntheticReceiptReference = 'SYNTHETIC-RECEIPT-001';
const syntheticPenalty = {
  ID: 'SYNTHETIC-PENALTY-001_FPN',
  Enabled: true,
  Value: {
    paymentToken: syntheticPaymentCode,
    dateTime: Math.floor(Date.now() / 1000),
    vehicleDetails: { regNo: 'SYNTHETIC' },
    referenceNo: 'SYNTHETIC-REFERENCE-001',
    placeWhereIssued: 'Synthetic Test Location',
    penaltyAmount: 123,
    paymentStatus: 'UNPAID',
    penaltyType: 'FPN',
  },
};
const syntheticGroupCode = 'synthgroup1';
const syntheticGroupPenalties = [syntheticPenalty, {
  ...syntheticPenalty,
  ID: 'SYNTHETIC-PENALTY-002_FPN',
  Value: { ...syntheticPenalty.Value, referenceNo: 'SYNTHETIC-REFERENCE-002', penaltyAmount: 77 },
}];
const syntheticGroup = {
  ID: syntheticGroupCode,
  Enabled: true,
  VehicleRegistration: 'SYNTHETIC',
  Location: 'Synthetic Test Location',
  Timestamp: syntheticPenalty.Value.dateTime,
  TotalAmount: 200,
  PaymentStatus: 'UNPAID',
  Payments: [{
    PaymentCategory: 'FPN',
    TotalAmount: 200,
    PaymentStatus: 'UNPAID',
    Penalties: syntheticGroupPenalties,
  }],
};
const syntheticPaymentDetail = {
  PaymentMethod: 'CARD',
  PaymentRef: syntheticReceiptReference,
  AuthCode: 'SYNTHETIC-AUTH',
  PaymentAmount: 200,
  PaymentDate: 1609459200,
  PaymentStatus: 'PAID',
};

function jsonResponse(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

function createStub(handler) {
  const requests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      let body;
      const rawBody = Buffer.concat(chunks).toString('utf8');
      if (rawBody && request.headers['content-type']?.includes('application/json')) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          jsonResponse(response, 400, { error: 'invalid-json' });
          return;
        }
      }

      const recordedRequest = {
        method: request.method,
        path: request.url,
        headers: request.headers,
        body,
      };
      requests.push(recordedRequest);
      const result = handler(recordedRequest);
      jsonResponse(response, result.status, result.body);
    });
  });

  return {
    requests,
    server,
    origin: undefined,
    async start() {
      await listen(server);
      const address = server.address();
      assert(address && typeof address === 'object');
      this.origin = `http://127.0.0.1:${address.port}`;
      return this;
    },
    reset() {
      requests.length = 0;
    },
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
}

function closeServer(server) {
  if (!server?.listening) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}

function request(origin, method, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(requestPath, origin);
    const outgoing = http.request(target, {
      method,
      headers: options.headers,
      agent: false,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    outgoing.once('error', reject);
    if (options.body) {
      outgoing.write(options.body);
    }
    outgoing.end();
  });
}

function assertStatus(response, expected) {
  assert.equal(response.status, expected);
}

function assertNoDownstreamCalls(stubs) {
  for (const stub of Object.values(stubs)) {
    assert.equal(stub.requests.length, 0);
  }
}

function resetStubs(stubs, state) {
  Object.values(stubs).forEach((stub) => stub.reset());
  state.penaltyStatus = 200;
  state.cpmsCardStatus = 200;
  state.confirmCode = 801;
  state.paid = false;
  state.paymentReadStatus = 200;
  state.paymentWriteStatus = 201;
}

function colour(text, code, stream) {
  if (!stream.isTTY || process.env.NO_COLOR || process.env.TERM === 'dumb') {
    return text;
  }
  return `\x1b[${code}m${text}\x1b[0m`;
}

function reportHtml(report) {
  const escape = (text) => String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const rows = report.scenarios.map((scenario) => (
    `<tr><td>${escape(scenario.name)}</td><td>${escape(scenario.status)}</td></tr>`
  )).join('');
  const untested = report.untestedBoundaries.map((item) => `<li>${escape(item)}</li>`).join('');
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Portal integration report</title></head>
<body>
  <h1>Portal integration report</h1>
  <p>Generated: ${escape(report.generatedAt)}</p>
  <p>Total: ${report.summary.total}; passed: ${report.summary.passed}; failed: ${report.summary.failed}; skipped: ${report.summary.skipped}</p>
  <p>Startup: ${escape(report.startup)}; cleanup: ${escape(report.cleanup)}</p>
  <p>Stubbed dependencies: ${report.stubbedDependencies.map(escape).join(', ')}</p>
  <table><thead><tr><th>Scenario</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Untested boundaries</h2><ul>${untested}</ul>
</body>
</html>`;
}

function writeReports(report) {
  const directory = path.join(__dirname, 'reports');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, 'latest.html'), reportHtml(report));
}

async function main() {
  if (process.env.CI && !['false', '0'].includes(process.env.CI.toLowerCase())) {
    process.stderr.write('The manual integration suite does not run in CI.\n');
    process.exitCode = 1;
    return;
  }

  const originalCwd = process.cwd();
  const isolatedCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rsp-public-portal-integration-'));
  const stubs = [];
  const results = [];
  const state = {};
  resetStubs({}, state);
  const report = {
    suite: 'RSP Public Portal manual integration suite',
    generatedAt: new Date().toISOString(),
    startup: 'not-started',
    cleanup: 'not-started',
    summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
    stubbedDependencies: ['Penalty service', 'CPMS', 'Payment service'],
    scenarios: results,
    untestedBoundaries: [
      'AWS Secrets Manager, AWS credentials and permissions',
      'Real payment gateway initiation, confirmation and persistence',
      'Downstream timeout behavior',
      'IM/CDN-specific grouped journeys and pending groups',
      'API Gateway/Lambda adapter translation, stage prefixes and binary responses',
      'Static asset delivery and deployed infrastructure',
    ],
  };
  let appServer;
  let axios;
  let axiosGuardId;
  let nock;
  let networkGuardEnabled = false;
  let originalFsWatch;
  const fileWatchers = [];
  let cleanupFailed = false;

  try {
    process.chdir(isolatedCwd);
    Object.assign(process.env, {
      USE_SECRETS_MANAGER: 'false',
      NODE_ENV: 'development',
      PORT: '0',
      CLIENT_ID: 'integration-client',
      CLIENT_SECRET: 'integration-secret',
      DO_SIGNED_REQUESTS: 'false',
      REGION: 'eu-west-1',
      PENDING_PAYMENT_TIME_MILLISECONDS: '600000',
      PUBLIC_ASSETS: '/assets',
      REDIRECT_URL: 'http://127.0.0.1/portal',
      URL_ROOT: '',
      VIEWS: path.join(root, 'src/server/views'),
    });

    const penaltyStub = createStub((recordedRequest) => {
      if (
        recordedRequest.method === 'GET'
        && recordedRequest.path === `/documents/tokens/${syntheticPaymentCode}`
      ) {
        return {
          status: state.penaltyStatus,
          body: state.penaltyStatus === 200 ? {
            ...syntheticPenalty,
            Value: { ...syntheticPenalty.Value, paymentStatus: state.paid ? 'PAID' : 'UNPAID' },
          } : { error: 'not-found' },
        };
      }
      if (recordedRequest.method === 'GET' && recordedRequest.path === `/penaltyGroup/${syntheticGroupCode}`) {
        return {
          status: state.penaltyStatus,
          body: {
            ...syntheticGroup,
            PaymentStatus: state.paid ? 'PAID' : 'UNPAID',
            Payments: syntheticGroup.Payments.map((payment) => ({
              ...payment,
              PaymentStatus: state.paid ? 'PAID' : 'UNPAID',
              Penalties: payment.Penalties.map((penalty) => ({
                ...penalty,
                Value: { ...penalty.Value, paymentStatus: state.paid ? 'PAID' : 'UNPAID' },
              })),
            })),
          },
        };
      }
      if (
        recordedRequest.method === 'PUT'
        && ['/documents/updateWithPaymentStartTime/', '/penaltyGroup/updateWithPaymentStartTime'].includes(recordedRequest.path)
      ) {
        return { status: 200, body: {} };
      }
      return { status: 404, body: { error: 'not-found' } };
    });
    const cpmsStub = createStub((recordedRequest) => {
      if (recordedRequest.method === 'POST' && ['/cardPayment/', '/groupPayment/'].includes(recordedRequest.path)) {
        return {
          status: state.cpmsCardStatus,
          body: { gateway_url: 'https://gateway.invalid/synthetic-session' },
        };
      }
      if (recordedRequest.method === 'POST' && recordedRequest.path === '/confirm/') {
        return {
          status: 200,
          body: {
            code: state.confirmCode,
            receipt_reference: syntheticReceiptReference,
            auth_code: 'SYNTHETIC-AUTH',
          },
        };
      }
      return { status: 404, body: { error: 'not-found' } };
    });
    const paymentStub = createStub((recordedRequest) => {
      if (recordedRequest.method === 'POST' && ['/payments/', '/groupPayments/'].includes(recordedRequest.path)) {
        return { status: state.paymentWriteStatus, body: {} };
      }
      if (recordedRequest.method === 'GET' && recordedRequest.path === '/payments/SYNTHETIC-PENALTY-001_FPN') {
        return {
          status: state.paymentReadStatus,
          body: { payment: { PaymentDetail: { ...syntheticPaymentDetail, PaymentAmount: 123 } } },
        };
      }
      if (recordedRequest.method === 'GET' && recordedRequest.path === `/groupPayments/${syntheticGroupCode}`) {
        return { status: state.paymentReadStatus, body: { Payments: { FPN: syntheticPaymentDetail } } };
      }
      return { status: 404, body: { error: 'not-found' } };
    });

    for (const stub of [penaltyStub, cpmsStub, paymentStub]) {
      stubs.push(stub);
      await stub.start();
    }
    const namedStubs = {
      penalty: penaltyStub,
      cpms: cpmsStub,
      payment: paymentStub,
    };
    process.env.PENALTY_SERVICE_URL = `${penaltyStub.origin}/`;
    process.env.CPMS_SERVICE_URL = `${cpmsStub.origin}/`;
    process.env.PAYMENT_SERVICE_URL = `${paymentStub.origin}/`;

    axios = require('axios');
    nock = require('nock');
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    networkGuardEnabled = true;
    const allowedStubOrigins = new Set(
      Object.values(namedStubs).map((stub) => stub.origin),
    );
    axiosGuardId = axios.interceptors.request.use((config) => {
      const target = new URL(config.url, config.baseURL);
      if (!allowedStubOrigins.has(target.origin)) {
        throw new Error('Blocked an outbound request to a non-stub target');
      }
      return config;
    });

    originalFsWatch = fs.watch;
    fs.watch = (...args) => {
      const watcher = originalFsWatch.apply(fs, args);
      fileWatchers.push(watcher);
      return watcher;
    };
    const createApp = require(path.join(root, 'build/server/app.js')).default;
    const app = await createApp();
    appServer = http.createServer(app);
    await listen(appServer);
    const appAddress = appServer.address();
    assert(appAddress && typeof appAddress === 'object');
    const appOrigin = `http://127.0.0.1:${appAddress.port}`;
    report.startup = 'passed';

    const scenarios = [
      ['robots and security headers', async () => {
        const response = await request(appOrigin, 'GET', '/robots.txt');
        assertStatus(response, 200);
        assert.match(response.headers['content-type'], /^text\/plain/);
        assert.equal(response.body, 'User-agent: *\nDisallow: /');
        assert.equal(response.headers['x-content-type-options'], 'nosniff');
        assert.equal(response.headers['x-powered-by'], undefined);
        assert.match(response.headers['cache-control'], /no-store/);
        assert.match(response.headers['content-security-policy'], /nonce-/);
        const secondResponse = await request(appOrigin, 'GET', '/robots.txt');
        const nonce = response.headers['content-security-policy'].match(/nonce-([^' ;]+)/)?.[1];
        const secondNonce = secondResponse.headers['content-security-policy'].match(/nonce-([^' ;]+)/)?.[1];
        assert.ok(nonce);
        assert.ok(secondNonce);
        assert.notEqual(nonce, secondNonce);
        assertNoDownstreamCalls(namedStubs);
      }],
      ['development landing redirect', async () => {
        const response = await request(appOrigin, 'GET', '/');
        assertStatus(response, 302);
        assert.equal(response.headers.location, '/payment-code');
        assertNoDownstreamCalls(namedStubs);
      }],
      ['public pages and language cookie', async () => {
        const localized = await request(appOrigin, 'GET', '/cookie-preferences?clang=fr');
        assertStatus(localized, 200);
        assert.match(localized.headers['set-cookie'].join(';'), /locale=fr/);
        assert.match(localized.body, /<html[^>]*lang="fr"/i);
        assert.match(localized.body, /Cookie preferences/);

        const pages = [
          ['/cookie-details', 'Cookie details'],
          ['/accessibility-statement', 'Accessibility statement'],
          ['/privacy-statement', 'Privacy statement'],
          ['/payment-code', 'name="payment_code"'],
        ];
        for (const [pagePath, expectedText] of pages) {
          const response = await request(appOrigin, 'GET', pagePath, {
            headers: { cookie: 'locale=en' },
          });
          assertStatus(response, 200);
          assert.ok(response.body.includes(expectedText), `Expected ${pagePath} to contain its page content`);
          if (pagePath === '/cookie-details') {
            assert.match(response.body, /<html[^>]*lang="en"/i);
          }
        }
        assertNoDownstreamCalls(namedStubs);
      }],
      ['invalid payment-code form avoids downstream calls', async () => {
        const response = await request(appOrigin, 'POST', '/payment-code', {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'payment_code=x',
        });
        assertStatus(response, 200);
        assert.match(response.body, /govuk-error-summary/);
        assertNoDownstreamCalls(namedStubs);
      }],
      ['valid form and JSON payment codes normalize before redirect', async () => {
        const formResponse = await request(appOrigin, 'POST', '/payment-code', {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'payment_code=SYNTH-00001',
        });
        assertStatus(formResponse, 302);
        assert.equal(formResponse.headers.location, 'payment-code/synth00001');

        const jsonResponse = await request(appOrigin, 'POST', '/payment-code', {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ payment_code: 'SYNTH-00001' }),
        });
        assertStatus(jsonResponse, 302);
        assert.equal(jsonResponse.headers.location, 'payment-code/synth00001');
        assertNoDownstreamCalls(namedStubs);
      }],
      ['bodyless payment-code form renders validation error', async () => {
        const response = await request(appOrigin, 'POST', '/payment-code');
        assertStatus(response, 200);
        assert.match(response.body, /govuk-error-summary/);
        assertNoDownstreamCalls(namedStubs);
      }],
      ['unsupported payment-code content type renders validation error', async () => {
        const response = await request(appOrigin, 'POST', '/payment-code', {
          headers: { 'content-type': 'text/plain' },
          body: 'payment_code=SYNTH-00001',
        });
        assertStatus(response, 200);
        assert.match(response.body, /govuk-error-summary/);
        assertNoDownstreamCalls(namedStubs);
      }],
      ['single-penalty details render data from local penalty stub', async () => {
        const response = await request(appOrigin, 'GET', `/payment-code/${syntheticPaymentCode}`);
        assertStatus(response, 200);
        assert.match(response.body, /Penalty details/);
        assert.ok(response.body.includes(syntheticPaymentCode));
        assert.ok(response.body.includes('SYNTHETIC'));
        assert.ok(response.body.includes('£123'));
        assert.equal(penaltyStub.requests.length, 1);
        assert.equal(penaltyStub.requests[0].method, 'GET');
        assert.equal(penaltyStub.requests[0].path, `/documents/tokens/${syntheticPaymentCode}`);
        assert.equal(cpmsStub.requests.length, 0);
        assert.equal(paymentStub.requests.length, 0);
      }],
      ['CPMS initiation failure retries locally and returns to payment details', async () => {
        state.cpmsCardStatus = 503;
        const response = await request(
          appOrigin,
          'POST',
          `/payment-code/${syntheticPaymentCode}/payment`,
        );
        assertStatus(response, 302);
        assert.equal(response.headers.location, `/payment-code/${syntheticPaymentCode}`);
        assert.equal(cpmsStub.requests.length, 4);
        assert.ok(cpmsStub.requests.every((item) => item.path === '/cardPayment/'));
        assert.ok(cpmsStub.requests.every((item) => item.body.payment_code === syntheticPaymentCode));
        assert.equal(paymentStub.requests.length, 0);
      }],
      ['invalid code and penalty-service not-found do not expose details', async () => {
        const invalid = await request(appOrigin, 'GET', '/payment-code/no');
        assertStatus(invalid, 302);
        assert.equal(invalid.headers.location, '../payment-code?invalidPaymentCode');
        assert.equal(penaltyStub.requests.length, 0);

        state.penaltyStatus = 404;
        const missing = await request(appOrigin, 'GET', `/payment-code/${syntheticPaymentCode}`);
        assertStatus(missing, 302);
        assert.equal(missing.headers.location, '../payment-code?invalidPaymentCode');
        assert.equal(penaltyStub.requests.length, 1);
        assert.equal(cpmsStub.requests.length, 0);
        assert.equal(paymentStub.requests.length, 0);
      }],
      ['payment initiation sends only expected stub requests', async () => {
        const response = await request(
          appOrigin,
          'POST',
          `/payment-code/${syntheticPaymentCode}/payment`,
        );
        assertStatus(response, 302);
        assert.equal(response.headers.location, 'https://gateway.invalid/synthetic-session');

        const penaltyReads = penaltyStub.requests.filter((item) => item.method === 'GET');
        const penaltyUpdates = penaltyStub.requests.filter((item) => item.method === 'PUT');
        assert.equal(penaltyReads.length, 2);
        assert.equal(penaltyUpdates.length, 1);
        assert.equal(penaltyUpdates[0].path, '/documents/updateWithPaymentStartTime/');
        assert.match(penaltyUpdates[0].headers['content-type'], /^application\/json/);
        assert.equal(penaltyUpdates[0].body.id, syntheticPenalty.ID);
        assert.equal(cpmsStub.requests.length, 1);
        assert.equal(cpmsStub.requests[0].path, '/cardPayment/');
        assert.match(cpmsStub.requests[0].headers['content-type'], /^application\/json/);
        assert.deepEqual(cpmsStub.requests[0].body, {
          payment_code: syntheticPaymentCode,
          penalty_reference: 'SYNTHETIC-REFERENCE-001',
          penalty_id: 'SYNTHETIC-PENALTY-001',
          penalty_type: 'FPN',
          penalty_amount: 123,
          redirect_url: `http://127.0.0.1/portal/payment-code/${syntheticPaymentCode}/confirmPayment`,
          vehicle_reg: 'SYNTHETIC',
        });
        assert.equal(paymentStub.requests.length, 0);
      }],
      ['payment confirmation records only at local payment stub', async () => {
        const response = await request(
          appOrigin,
          'GET',
          `/payment-code/${syntheticPaymentCode}/confirmPayment?receipt_reference=${syntheticReceiptReference}`,
        );
        assertStatus(response, 302);
        assert.equal(response.headers.location, `/payment-code/${syntheticPaymentCode}/receipt`);
        assert.equal(penaltyStub.requests.length, 1);
        assert.equal(cpmsStub.requests.length, 1);
        assert.equal(cpmsStub.requests[0].path, '/confirm/');
        assert.deepEqual(cpmsStub.requests[0].body, {
          receipt_reference: syntheticReceiptReference,
          penalty_type: 'FPN',
        });
        assert.equal(paymentStub.requests.length, 1);
        assert.equal(paymentStub.requests[0].path, '/payments/');
        assert.match(paymentStub.requests[0].headers['content-type'], /^application\/json/);
        assert.equal(paymentStub.requests[0].body.PaymentCode, syntheticPaymentCode);
        assert.equal(paymentStub.requests[0].body.PenaltyStatus, 'PAID');
        assert.equal(paymentStub.requests[0].body.PaymentDetail.PaymentRef, syntheticReceiptReference);
        assert.equal(paymentStub.requests[0].body.PaymentDetail.PaymentAmount, 123);
        assert.equal(paymentStub.requests[0].body.PaymentDetail.PaymentMethod, 'CARD');
      }],
      ['cancelled payment renders failure without recording payment', async () => {
        state.confirmCode = 807;
        const response = await request(
          appOrigin,
          'GET',
          `/payment-code/${syntheticPaymentCode}/confirmPayment?receipt_reference=${syntheticReceiptReference}`,
        );
        assertStatus(response, 200);
        assert.ok(response.body.includes(syntheticPaymentCode));
        assert.equal(cpmsStub.requests.length, 1);
        assert.equal(paymentStub.requests.length, 0);
      }],
      ['group details and summary render the stubbed penalties and payment form', async () => {
        const details = await request(appOrigin, 'GET', `/payment-code/${syntheticGroupCode}`);
        assertStatus(details, 200);
        assert.ok(details.body.includes('SYNTHETIC'));
        assert.ok(details.body.includes(`/payment-code/${syntheticGroupCode}/FPN/details`));
        const summary = await request(appOrigin, 'GET', `/payment-code/${syntheticGroupCode}/FPN/details`);
        assertStatus(summary, 200);
        assert.ok(summary.body.includes(`action="/payment-code/${syntheticGroupCode}/FPN/payment"`));
        assert.ok(summary.body.includes('SYNTHETIC-REFERENCE-001'));
        assert.ok(summary.body.includes('SYNTHETIC-REFERENCE-002'));
        assert.match(summary.body, /&pound;200/);
        assert.equal(penaltyStub.requests.length, 3);
        assert.ok(penaltyStub.requests.every((item) => item.method === 'GET' && item.path === `/penaltyGroup/${syntheticGroupCode}`));
        assert.equal(cpmsStub.requests.length, 0);
        assert.equal(paymentStub.requests.length, 0);
      }],
      ['group initiation preserves update and CPMS payload contracts', async () => {
        const response = await request(appOrigin, 'POST', `/payment-code/${syntheticGroupCode}/FPN/payment`);
        assertStatus(response, 302);
        assert.equal(response.headers.location, 'https://gateway.invalid/synthetic-session');
        assert.deepEqual(penaltyStub.requests.map(({ method, path }) => [method, path]), [
          ['GET', `/penaltyGroup/${syntheticGroupCode}`],
          ['GET', `/penaltyGroup/${syntheticGroupCode}`],
          ['PUT', '/penaltyGroup/updateWithPaymentStartTime'],
        ]);
        assert.deepEqual(penaltyStub.requests[2].body, { id: syntheticGroupCode, penaltyType: 'FPN' });
        assert.equal(cpmsStub.requests.length, 1);
        assert.equal(cpmsStub.requests[0].path, '/groupPayment/');
        assert.deepEqual(cpmsStub.requests[0].body, {
          PenaltyGroupId: syntheticGroupCode,
          TotalAmount: 200,
          VehicleRegistration: 'SYNTHETIC',
          PenaltyType: 'FPN',
          RedirectUrl: `http://127.0.0.1/portal/payment-code/${syntheticGroupCode}/FPN/confirmGroupPayment`,
          Penalties: [
            { PenaltyReference: 'SYNTHETIC-REFERENCE-001', PenaltyAmount: 123, VehicleRegistration: 'SYNTHETIC' },
            { PenaltyReference: 'SYNTHETIC-REFERENCE-002', PenaltyAmount: 77, VehicleRegistration: 'SYNTHETIC' },
          ],
        });
        assert.equal(paymentStub.requests.length, 0);
      }],
      ['group confirmation records the expected payment at the stub boundary', async () => {
        const before = Math.floor(Date.now() / 1000);
        const response = await request(appOrigin, 'GET', `/payment-code/${syntheticGroupCode}/FPN/confirmGroupPayment?receipt_reference=${syntheticReceiptReference}`);
        assertStatus(response, 302);
        assert.equal(response.headers.location, `/payment-code/${syntheticGroupCode}/FPN/receipt`);
        assert.equal(penaltyStub.requests.length, 1);
        assert.equal(penaltyStub.requests[0].path, `/penaltyGroup/${syntheticGroupCode}`);
        assert.equal(cpmsStub.requests.length, 1);
        assert.equal(cpmsStub.requests[0].path, '/confirm/');
        assert.deepEqual(cpmsStub.requests[0].body, { receipt_reference: syntheticReceiptReference, penalty_type: 'FPN' });
        assert.equal(paymentStub.requests.length, 1);
        const recorded = paymentStub.requests[0];
        assert.equal(recorded.method, 'POST');
        assert.equal(recorded.path, '/groupPayments/');
        const date = recorded.body.PaymentDetail.PaymentDate;
        assert.ok(Number.isInteger(date) && date >= before && date <= Math.floor(Date.now() / 1000));
        assert.deepEqual(recorded.body, {
          PaymentCode: syntheticGroupCode,
          PenaltyType: 'FPN',
          PaymentDetail: {
            PaymentMethod: 'CARD',
            PaymentRef: syntheticReceiptReference,
            AuthCode: 'SYNTHETIC-AUTH',
            PaymentAmount: 200,
            PaymentDate: date,
          },
          PenaltyIds: ['SYNTHETIC-PENALTY-001_FPN', 'SYNTHETIC-PENALTY-002_FPN'],
        });
      }],
      ['cancelled and rejected group confirmations never record a payment', async () => {
        for (const code of [807, 999]) {
          resetStubs(namedStubs, state);
          state.confirmCode = code;
          const response = await request(appOrigin, 'GET', `/payment-code/${syntheticGroupCode}/FPN/confirmGroupPayment?receipt_reference=${syntheticReceiptReference}`);
          assertStatus(response, code === 807 ? 302 : 200);
          if (code === 807) assert.equal(response.headers.location, `/payment-code/${syntheticGroupCode}`);
          else assert.ok(response.body.includes(syntheticGroupCode));
          assert.equal(cpmsStub.requests.length, 1);
          assert.equal(paymentStub.requests.length, 0);
        }
      }],
      ['group payment recording failure does not redirect to a successful receipt', async () => {
        state.paymentWriteStatus = 400;
        const response = await request(appOrigin, 'GET', `/payment-code/${syntheticGroupCode}/FPN/confirmGroupPayment?receipt_reference=${syntheticReceiptReference}`);
        assertStatus(response, 200);
        assert.ok(response.body.includes(syntheticGroupCode));
        assert.equal(paymentStub.requests.length, 1);
        assert.equal(response.headers.location, undefined);
      }],
      ['single and group receipts render stubbed payment details', async () => {
        state.paid = true;
        for (const [route, paymentPath, amount] of [
          [`/payment-code/${syntheticPaymentCode}/receipt`, '/payments/SYNTHETIC-PENALTY-001_FPN', 123],
          [`/payment-code/${syntheticGroupCode}/FPN/receipt`, `/groupPayments/${syntheticGroupCode}`, 200],
        ]) {
          penaltyStub.reset();
          paymentStub.reset();
          const response = await request(appOrigin, 'GET', route);
          assertStatus(response, 200);
          assert.ok(response.body.includes('SYNTHETIC-AUTH'));
          assert.ok(response.body.includes('SYNTHETIC-REFERENCE-001'));
          assert.ok(response.body.includes(`\u00a3${amount}`));
          assert.ok(response.body.includes('01/01/2021'));
          assert.ok(response.body.includes('SYNTHETIC'));
          assert.equal(penaltyStub.requests.length, 1);
          assert.equal(paymentStub.requests.length, 1);
          assert.equal(paymentStub.requests[0].method, 'GET');
          assert.equal(paymentStub.requests[0].path, paymentPath);
          assert.equal(cpmsStub.requests.length, 0);
        }
      }],
      ['receipt failures redirect safely and invalid group types avoid downstream calls', async () => {
        const invalid = await request(appOrigin, 'GET', `/payment-code/${syntheticGroupCode}/INVALID/receipt`);
        assertStatus(invalid, 302);
        assert.equal(invalid.headers.location, '/?invalidPaymentCode');
        assertNoDownstreamCalls(namedStubs);
        state.paymentReadStatus = 404;
        for (const route of [
          `/payment-code/${syntheticPaymentCode}/receipt`,
          `/payment-code/${syntheticGroupCode}/FPN/receipt`,
        ]) {
          penaltyStub.reset();
          paymentStub.reset();
          const response = await request(appOrigin, 'GET', route);
          assertStatus(response, 302);
          assert.equal(response.headers.location, '/?invalidPaymentCode');
          assert.equal(penaltyStub.requests.length, 1);
          assert.equal(paymentStub.requests.length, 1);
          assert.equal(cpmsStub.requests.length, 0);
        }
      }],
    ];

    for (const [name, scenario] of scenarios) {
      resetStubs(namedStubs, state);
      try {
        await scenario();
        results.push({ name, status: 'passed' });
        process.stdout.write(`${colour('PASS', 32, process.stdout)} ${name}\n`);
      } catch (error) {
        results.push({ name, status: 'failed' });
        process.stderr.write(`${colour('FAIL', 31, process.stderr)} ${name}: ${error.message}\n`);
      }
    }
  } catch (error) {
    report.startup = 'failed';
    process.stderr.write(`${colour('Integration suite startup failed', 31, process.stderr)}: ${error.message}\n`);
  } finally {
    report.cleanup = 'passed';
    for (const server of [appServer, ...stubs.map((stub) => stub.server)]) {
      try {
        await closeServer(server);
      } catch {
        cleanupFailed = true;
      }
    }
    for (const watcher of fileWatchers) {
      try {
        watcher.close();
      } catch {
        cleanupFailed = true;
      }
    }
    if (originalFsWatch) {
      fs.watch = originalFsWatch;
    }
    if (networkGuardEnabled) {
      nock.enableNetConnect();
    }
    if (axios && typeof axiosGuardId === 'number') {
      axios.interceptors.request.eject(axiosGuardId);
    }
    try {
      process.chdir(originalCwd);
      fs.rmSync(isolatedCwd, { recursive: true, force: true });
    } catch {
      cleanupFailed = true;
    }
    if (cleanupFailed) {
      report.cleanup = 'failed';
    }
    report.summary.total = results.length;
    report.summary.passed = results.filter((result) => result.status === 'passed').length;
    report.summary.failed = results.filter((result) => result.status === 'failed').length;
    try {
      writeReports(report);
    } catch (error) {
      cleanupFailed = true;
      report.cleanup = 'failed';
      process.stderr.write(`${colour('Could not write integration reports', 31, process.stderr)}: ${error.message}\n`);
    }
  }

  process.stdout.write(
    `Scenarios: ${colour(`${report.summary.passed} passed`, 32, process.stdout)}, `
    + `${colour(`${report.summary.failed} failed`, report.summary.failed ? 31 : 32, process.stdout)}, `
    + `${colour(`${report.summary.skipped} skipped`, report.summary.skipped ? 33 : 32, process.stdout)} `
    + `(${report.summary.total} total); `
    + `reports: integration/reports/latest.json and integration/reports/latest.html; `
    + `cleanup: ${colour(report.cleanup, report.cleanup === 'passed' ? 32 : 31, process.stdout)}\n`,
  );
  if (report.summary.failed > 0 || report.startup !== 'passed' || cleanupFailed) {
    process.exitCode = 1;
  }
}

main();
