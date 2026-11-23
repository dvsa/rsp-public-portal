const dotenv = require('dotenv');
const nock = require('nock');
const sinon = require('sinon');

const originalEnv = { ...process.env };
const dotenvStub = sinon.stub(dotenv, 'config').returns({ parsed: {} });
Object.assign(process.env, {
  USE_SECRETS_MANAGER: 'false',
  NODE_ENV: 'test',
  REGION: 'eu-west-1',
  PORT: '0',
  CLIENT_ID: 'synthetic-client',
  CLIENT_SECRET: 'synthetic-secret',
  PENALTY_SERVICE_URL: 'http://127.0.0.1:1/',
  PAYMENT_SERVICE_URL: 'http://127.0.0.1:1/',
  CPMS_SERVICE_URL: 'http://127.0.0.1:1/',
  DO_SIGNED_REQUESTS: 'false',
  URL_ROOT: '',
  PUBLIC_ASSETS: '',
  VIEWS: '',
  REDIRECT_URL: 'http://127.0.0.1/portal',
  PENDING_PAYMENT_TIME_MILLISECONDS: '600000',
  AWS_ACCESS_KEY_ID: 'synthetic-access-key',
  AWS_SECRET_ACCESS_KEY: 'synthetic-secret-key',
  AWS_SESSION_TOKEN: 'synthetic-session-token',
  AWS_EC2_METADATA_DISABLED: 'true',
});
nock.disableNetConnect();
nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:|$)/);

// Keep the safety guards active between watch-mode runs.
process.once('exit', () => {
  dotenvStub.restore();
  nock.cleanAll();
  nock.enableNetConnect();
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) delete process.env[key];
  });
  Object.assign(process.env, originalEnv);
});
