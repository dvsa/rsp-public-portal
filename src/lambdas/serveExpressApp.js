import awsServerlessExpress from 'aws-serverless-express';
import app from '../server/app';
import modifyPath from '../server/utils/modifyPath';

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

const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes);
const isProd = typeof process.env.NODE_ENV !== 'undefined' && process.env.NODE_ENV === 'production';

export default (event, context) => {
  console.log('NODE_ENV');
  console.log(process.env.NODE_ENV);
  console.log('event.path');
  console.log(event.path);
  if (isProd) {
    event.path = modifyPath(event.path); // eslint-disable-line
  }
  console.log('path modified');
  console.log(event.path);
  return awsServerlessExpress.proxy(server, event, context);
};
