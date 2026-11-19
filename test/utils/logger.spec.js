import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { logAxiosError } from '../../src/server/utils/logger';

describe('logAxiosError', () => {
  let sandbox;
  let consoleError;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    consoleError = sandbox.stub(console, 'error');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('records an HTTP response failure and optional request details', () => {
    logAxiosError(
      'SyntheticRequest',
      'SyntheticService',
      { response: { data: { status: 'failed' }, status: 503 } },
      { id: 'synthetic-request' },
    );

    assert.deepEqual(JSON.parse(consoleError.firstCall.args[0]), {
      logName: 'SyntheticRequest',
      serviceName: 'SyntheticService',
      requestErrorMessage: {
        errorData: { status: 'failed' },
        errorStatus: 503,
      },
      logLevel: 'ERROR',
      details: { id: 'synthetic-request' },
    });
  });

  it('records a transport failure when a request received no response', () => {
    const request = { path: '/synthetic' };
    logAxiosError('SyntheticRequest', 'SyntheticService', { request });

    assert.deepEqual(JSON.parse(consoleError.firstCall.args[0]).requestErrorMessage, {
      message: 'The request was made but no response was received',
      request,
    });
    assert.equal('details' in JSON.parse(consoleError.firstCall.args[0]), false);
  });

  it('records a local error when Axios has no request or response', () => {
    logAxiosError('SyntheticRequest', 'SyntheticService', new Error('synthetic setup failure'));

    assert.deepEqual(JSON.parse(consoleError.firstCall.args[0]).requestErrorMessage, {
      errorMessage: 'synthetic setup failure',
    });
  });
});
