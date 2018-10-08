/* eslint-disable no-multi-spaces */
import dotenv from 'dotenv';
import path from 'path';
import { SecretsManager } from 'aws-sdk';

dotenv.config();

const configMetadata = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  cpmsServiceUrl: 'CPMS_SERVICE_URL',
  doSignedRequests: 'DO_SIGNED_REQUESTS',
  nodeEnv: 'NODE_ENV',
  paymentServiceUrl: 'PAYMENT_SERVICE_URL',
  penaltyServiceUrl: 'PENALTY_SERVICE_URL',
  port: 'PORT',
  publicAssets: 'PUBLIC_ASSETS',
  redirectUrl: 'REDIRECT_URL',
  region: 'REGION',
  urlRoot: 'URL_ROOT',
  views: 'VIEWS',
};

let configuration = {};
async function bootstrap() {
  return new Promise((resolve, reject) => {
    if (process.env.USE_SECRETS_MANAGER === 'true') {
      const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
      console.log(`Pulling config from AWS Secrets Manager for secret ${SecretId}...`);
      const secretsManagerClient = new SecretsManager({ region: process.env.REGION });
      secretsManagerClient.getSecretValue({ SecretId }, (err, secretsManagerResponse) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        configuration = JSON.parse(secretsManagerResponse.SecretString);
        console.log(`Cached ${Object.keys(configuration).length} config items from secrets manager`);
        resolve(configuration);
      });
    } else {
      console.log('Using envvars for config');
      configuration = Object.values(configMetadata)
        .reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
      console.log('Finished getting envvars');
      resolve(configuration);
    }
  });
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
  return configuration[configMetadata.publicAssets] ||  path.resolve(__dirname, '..', 'public');
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
  port,
  redirectUrl,
  region,
  urlRoot,
  views,
};

export default config;
