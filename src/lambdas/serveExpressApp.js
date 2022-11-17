import awsServerlessExpress from 'aws-serverless-express';
import app from '../server/app';
import config from '../server/config';
import modifyPath from '../server/utils/modifyPath';
import { logInfo } from '../server/utils/logger';

// NOTE: If you get ERR_CONTENT_DECODING_FAILED in your browser, this is likely
// due to a compressed response (e.g. gzip) which has not been handled correctly
// by aws-serverless-express and/or API Gateway. Add the necessary MIME types to
// binaryMimeTypes below, then redeploy (`npm run package-deploy`)
const binaryMimeTypes = [
  'application/javascript',
  'application/json',
  'application/octet-stream',
  'application/xml',
  'font/eot',
  'font/opentype',
  'font/otf',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'text/comma-separated-values',
  'text/css',
  'text/html',
  'text/javascript',
  'text/plain',
  'text/text',
  'text/xml',
];

function isProd() {
  const envConfig = config.env();
  return typeof envConfig !== 'undefined' && envConfig === 'production';
}

let lambdaExpressServer;
export const handler = async (event, context) => {
  if (!lambdaExpressServer) {
    logInfo('ServerInit', 'Creating new express server');
    const expressApp = await app();
    lambdaExpressServer = awsServerlessExpress.createServer(expressApp, null, binaryMimeTypes);
  }
  if (isProd()) {
    event.path = modifyPath(event.path); // eslint-disable-line
  }
  logInfo('VisitedPage', { path: event.path });
  return awsServerlessExpress.proxy(lambdaExpressServer, event, context, 'PROMISE').promise;
};

export default handler;
