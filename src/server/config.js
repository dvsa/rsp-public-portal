/* eslint-disable no-multi-spaces */
import dotenv from 'dotenv';
import path from 'path';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logInfo, logError } from './utils/logger';

dotenv.config();

const configMetadata = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  cpmsServiceUrl: 'CPMS_SERVICE_URL',
  doSignedRequests: 'DO_SIGNED_REQUESTS',
  nodeEnv: 'NODE_ENV',
  paymentServiceUrl: 'PAYMENT_SERVICE_URL',
  penaltyServiceUrl: 'PENALTY_SERVICE_URL',
  pendingPaymentTimeMilliseconds: 'PENDING_PAYMENT_TIME_MILLISECONDS',
  port: 'PORT',
  publicAssets: 'PUBLIC_ASSETS',
  redirectUrl: 'REDIRECT_URL',
  region: 'REGION',
  urlRoot: 'URL_ROOT',
  views: 'VIEWS',
};

let configuration = {};
async function bootstrap() {
  if (process.env.USE_SECRETS_MANAGER === 'true') {
    const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
    logInfo('PublicPortalSecretsManagerId', { secretId: SecretId });
    const client = new SecretsManagerClient({ region: process.env.REGION });
    try {
      const response = await client.send(new GetSecretValueCommand({ SecretId }));
      configuration = JSON.parse(response.SecretString);
    } catch (err) {
      const errorDetails = err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : { message: String(err) };
      logError('PublicPortalSecretsManagerError', errorDetails);
      throw err;
    }
  } else {
    console.log('Using envvars for config');
    configuration = Object.values(configMetadata)
      .reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
  }
  return configuration;
}

function ensureRelativeUrl(url) {
  if (!url) {
    return '';
  }

  if (!url.startsWith('/')) {
    return `/${url}`;
  }

  return url;
}

function assets() {
  return configuration[configMetadata.publicAssets] ||  path.resolve(__dirname, '..', 'dist', 'public');
}

function clientId() {
  return configuration[configMetadata.clientId] || 'client';
}

function clientSecret() {
  return configuration[configMetadata.clientSecret] || 'secret';
}

function cpmsServiceUrl() {
  return configuration[configMetadata.cpmsServiceUrl];
}

function doSignedRequests() {
  return configuration[configMetadata.doSignedRequests] === 'true';
}

function env() {
  return configuration[configMetadata.nodeEnv] || 'development';
}

function isDevelopment() {
  return env() === 'development';
}

function paymentServiceUrl() {
  return configuration[configMetadata.paymentServiceUrl];
}

function penaltyServiceUrl() {
  return configuration[configMetadata.penaltyServiceUrl];
}

function pendingPaymentTimeMilliseconds() {
  return Number(configuration[configMetadata.pendingPaymentTimeMilliseconds]);
}

function port() {
  const portVar = configuration[configMetadata.port];
  return portVar ? Number(portVar) : 3000;
}

function redirectUrl() {
  return configuration[configMetadata.redirectUrl];
}

function region() {
  return configuration[configMetadata.region];
}

function urlRoot() {
  return ensureRelativeUrl(configuration[configMetadata.urlRoot]);
}

function views() {
  return configuration[configMetadata.views] || path.resolve(__dirname, 'views');
}

const config = {
  assets,
  bootstrap,
  clientId,
  clientSecret,
  cpmsServiceUrl,
  doSignedRequests,
  env,
  isDevelopment,
  paymentServiceUrl,
  penaltyServiceUrl,
  pendingPaymentTimeMilliseconds,
  port,
  redirectUrl,
  region,
  urlRoot,
  views,
};

export default config;
