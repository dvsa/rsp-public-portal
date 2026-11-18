import { expect } from 'chai';
import sinon from 'sinon';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import * as logger from '../src/server/utils/logger';
import config from '../src/server/config';

describe('Configuration bootstrap', () => {
  let sandbox;
  let originalEnv;
  let send;
  let originalConfiguration;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    process.env.USE_SECRETS_MANAGER = 'false';
    originalConfiguration = await config.bootstrap();
    sandbox = sinon.createSandbox();
    sandbox.stub(logger, 'logInfo');
    sandbox.stub(logger, 'logError');
    send = sandbox.stub(SecretsManagerClient.prototype, 'send');
    process.env.USE_SECRETS_MANAGER = 'true';
    process.env.REGION = 'eu-west-1';
    process.env.SECRETS_MANAGER_SECRET_NAME = 'synthetic-config';
    send.resolves({ SecretString: '{}' });
    await config.bootstrap();
    send.resetHistory();
  });

  afterEach(async () => {
    send.resolves({ SecretString: JSON.stringify(originalConfiguration) });
    process.env.USE_SECRETS_MANAGER = 'true';
    await config.bootstrap();
    sandbox.restore();
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  it('loads environment-only configuration without contacting AWS', async () => {
    process.env.USE_SECRETS_MANAGER = 'false';
    process.env.PORT = '3456';
    process.env.PENALTY_SERVICE_URL = 'http://127.0.0.1:1234/';
    await config.bootstrap();
    expect(config.port()).to.equal(3456);
    expect(config.penaltyServiceUrl()).to.equal('http://127.0.0.1:1234/');
    sinon.assert.notCalled(send);
  });

  it('loads JSON configuration through the v3 Secrets Manager command', async () => {
    send.resolves({ SecretString: JSON.stringify({ PORT: '4567', URL_ROOT: 'portal' }) });
    await config.bootstrap();
    sinon.assert.calledOnce(send);
    expect(send.firstCall.args[0]).to.be.instanceOf(GetSecretValueCommand);
    expect(send.firstCall.args[0].input).to.deep.equal({ SecretId: 'synthetic-config' });
    expect(config.port()).to.equal(4567);
    expect(config.urlRoot()).to.equal('/portal');
  });

  [{}, { SecretString: '{invalid' }].forEach((response) => {
    it(`rejects ${response.SecretString ? 'malformed' : 'missing'} secret JSON`, async () => {
      send.resolves(response);
      let failure;
      try {
        await config.bootstrap();
      } catch (error) {
        failure = error;
      }
      expect(failure).to.be.instanceOf(SyntaxError);
      sinon.assert.calledOnce(logger.logError);
    });
  });

  it('preserves the original provider failure', async () => {
    const failure = new Error('Synthetic expired session');
    send.rejects(failure);
    try {
      await config.bootstrap();
      expect.fail('Expected bootstrap to reject');
    } catch (error) {
      expect(error).to.equal(failure);
    }
    sinon.assert.calledOnceWithExactly(logger.logError, 'PublicPortalSecretsManagerError', failure.message);
  });
});
