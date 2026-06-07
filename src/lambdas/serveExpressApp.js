import serverless from 'serverless-http';
import app from '../server/app';
import config from '../server/config';
import modifyPath from '../server/utils/modifyPath';
import { logInfo } from '../server/utils/logger';

function isProd() {
  const envConfig = config.env();
  return typeof envConfig !== 'undefined' && envConfig === 'production';
}

let serverlessHandler;
export const handler = async (event, context) => {
  if (!serverlessHandler) {
    logInfo('ServerInit', 'Creating new express server');
    const expressApp = await app();
    serverlessHandler = serverless(expressApp);
  }
  if (isProd()) {
    event.path = modifyPath(event.path); // eslint-disable-line
  }
  logInfo('VisitedPage', { path: event.path });
  return serverlessHandler(event, context);
};

export default handler;
