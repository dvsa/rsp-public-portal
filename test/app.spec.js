const fs = require('fs');
const http = require('http');
const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const { default: config } = require('../src/server/config');
const { default: createApp } = require('../src/server/app');

describe('Application content security policy', () => {
  let sandbox;
  let server;
  let watchSpy;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    watchSpy = sandbox.spy(fs, 'watch');
    sandbox.stub(config, 'bootstrap').resolves();
    sandbox.stub(config, 'isDevelopment').returns(false);
    sandbox.stub(config, 'assets').returns('https://assets.example.test/public');
    sandbox.stub(config, 'views').returns(path.resolve(__dirname, '../src/server/views'));
  });

  afterEach(async () => {
    watchSpy.returnValues.forEach((watcher) => watcher.close());
    if (server && server.listening) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    sandbox.restore();
  });

  it('allows analytics connections without widening font or image access', async () => {
    server = http.createServer(await createApp());
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const headers = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${server.address().port}/`, (res) => {
        res.resume();
        resolve(res.headers);
      }).on('error', reject);
    });
    const directives = headers['content-security-policy'].split(';');
    const connect = directives.find((directive) => directive.startsWith('connect-src '));

    expect(connect.split(' ').slice(1)).to.have.members([
      "'self'",
      'https://assets.example.test/public/',
      'https://www.google-analytics.com/',
      'https://region1.analytics.google.com/',
    ]);
    expect(directives).to.include("font-src 'self' data: https://assets.example.test/public/");
    expect(directives.find((directive) => directive.startsWith('img-src '))).to.include('https://assets.example.test/public/');
    expect(directives.find((directive) => directive.startsWith('img-src '))).not.to.include('*');
  });
});
