import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import aws4 from 'aws4';
import config from '../../src/server/config';
import SignedHttpClient from '../../src/server/utils/httpclient';

describe('SignedHttpClient signing paths', () => {
  let sandbox;
  let sign;
  let client;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(config, 'doSignedRequests').returns(true);
    sandbox.stub(config, 'clientId').returns('synthetic-client');
    sandbox.stub(config, 'clientSecret').returns('synthetic-secret');
    sandbox.stub(config, 'region').returns('eu-west-1');
    sign = sandbox.stub(aws4, 'sign');
    sandbox.stub(axios, 'get').resolves({ data: { ok: true } });
    sandbox.stub(axios, 'post').resolves({ status: 201 });
    sandbox.stub(axios, 'put').resolves({ status: 200 });
    client = new SignedHttpClient('https://api.example.test/base/', {}, 'SyntheticService');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('signs GET, POST and PUT requests using configured credentials', async () => {
    await client.get('penalties/one', 'GetSyntheticPenalty');
    await client.post('payments/', { amount: 10 }, 0, 'CreateSyntheticPayment');
    await client.put('payments/one', { status: 'PAID' }, undefined, 'UpdateSyntheticPayment');

    expect(sign.callCount).to.equal(3);
    expect(sign.firstCall.args[0]).to.include({
      host: 'api.example.test',
      region: 'eu-west-1',
    });
    expect(sign.firstCall.args[1]).to.deep.equal({
      accessKeyId: 'synthetic-client',
      secretAccessKey: 'synthetic-secret',
    });
    sinon.assert.calledWith(
      axios.get,
      'https://api.example.test/base/penalties/one',
      sinon.match({ path: '/base/penalties/one' }),
    );
    sinon.assert.calledWith(
      axios.post,
      'https://api.example.test/base/payments/',
      { amount: 10 },
      sinon.match({ path: '/base/payments/' }),
    );
    sinon.assert.calledWith(
      axios.put,
      'https://api.example.test/base/payments/one',
      { status: 'PAID' },
      sinon.match({ path: '/base/payments/one' }),
    );
  });

  it('logs and rethrows a GET failure without swallowing the error', async () => {
    const error = new Error('synthetic transport failure');
    const get = axios.get;
    get.rejects(error);
    const logError = sandbox.stub(console, 'error');

    await assert.rejects(client.get('penalties/missing', 'GetSyntheticPenalty'), error);

    sinon.assert.calledOnce(logError);
  });
});
