import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import awsServerlessExpress from 'aws-serverless-express';
import * as appModule from '../../src/server/app';
import config from '../../src/server/config';
import * as logger from '../../src/server/utils/logger';

function event(path, overrides = {}) {
  return {
    resource: '/{proxy+}',
    path,
    httpMethod: 'GET',
    headers: { Host: 'localhost' },
    requestContext: { identity: { sourceIp: '127.0.0.1' } },
    queryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    ...overrides,
  };
}

describe('API Gateway REST Lambda adapter', () => {
  let sandbox;
  let createApp;
  let createServer;
  let handler;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    const app = express();
    app.use(express.urlencoded({ extended: false }));
    app.get('/page', (req, res) => {
      res.cookie('locale', 'cy');
      res.cookie('preference', 'synthetic');
      res.set('X-Portal-Test', 'adapter');
      res.type('html').send('<html lang="cy"><body>synthetic page</body></html>');
    });
    app.post('/form', (req, res) => res.redirect(`/page?code=${req.body.payment_code}`));
    app.get('/binary', (req, res) => res.type('application/octet-stream').send(Buffer.from([0, 255, 128, 1])));
    createApp = sandbox.stub(appModule, 'default').resolves(app);
    createServer = sandbox.spy(awsServerlessExpress, 'createServer');
    sandbox.stub(config, 'env').returns('production');
    sandbox.stub(logger, 'logInfo');
    delete require.cache[require.resolve('../../src/lambdas/serveExpressApp')];
    // Reload the module so each test starts with a cold Lambda.
    // eslint-disable-next-line global-require
    handler = require('../../src/lambdas/serveExpressApp').handler;
  });

  afterEach(async () => {
    await Promise.all(createServer.returnValues.map(async (server) => {
      if (server.listening) {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    }));
    sandbox.restore();
    delete require.cache[require.resolve('../../src/lambdas/serveExpressApp')];
  });

  it('strips the production prefix, translates HTML, headers and cookies, and reuses the server', async () => {
    const response = await handler(event('/portal/page'), {});
    expect(response.statusCode).to.equal(200);
    const body = Buffer.from(response.body, response.isBase64Encoded ? 'base64' : 'utf8').toString('utf8');
    expect(body).to.equal('<html lang="cy"><body>synthetic page</body></html>');
    const headers = Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), value]));
    expect(headers['x-portal-test']).to.equal('adapter');
    const cookies = Object.entries(response.headers)
      .filter(([key]) => key.toLowerCase() === 'set-cookie')
      .map(([, value]) => value);
    expect(cookies).to.have.lengthOf(2);
    expect(cookies.join(';')).to.include('locale=cy');
    expect(cookies.join(';')).to.include('preference=synthetic');
    await handler(event('/portal/page'), {});
    sinon.assert.calledOnce(createApp);
    sinon.assert.calledOnce(createServer);
  });

  it('preserves form input and redirects with base64-encoded API Gateway requests', async () => {
    const response = await handler(event('/portal/form', {
      httpMethod: 'POST',
      headers: { Host: 'localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: Buffer.from('payment_code=synthetic').toString('base64'),
      isBase64Encoded: true,
    }), {});
    expect(response.statusCode).to.equal(302);
    const location = Object.entries(response.headers).find(([key]) => key.toLowerCase() === 'location')[1];
    expect(location).to.equal('/page?code=synthetic');
  });

  it('preserves binary response bytes and leaves development paths unchanged', async () => {
    config.env.returns('development');
    const response = await handler(event('/binary'), {});
    expect(response.statusCode).to.equal(200);
    expect(response.isBase64Encoded).to.equal(true);
    expect(Buffer.from(response.body, 'base64')).to.deep.equal(Buffer.from([0, 255, 128, 1]));
  });
});
