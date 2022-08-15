import { isNumber } from 'lodash';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import aws4 from 'aws4';
import URL from 'url-parse';

import config from '../config';
import { logAxiosError } from './logger';

export default class SignedHttpClient {
  constructor(baseURL, headers, serviceName) {
    this.baseUrlOb = new URL(baseURL);
    this.headers = headers;
    this.serviceName = serviceName;
    this.credentials = {
      clientId: config.clientId(),
      clientSecret: config.clientSecret(),
    };
    this.signingOptions = {
      host: this.baseUrlOb.host,
      region: config.region(),
    };
    axiosRetry(axios);
  }

  get(path, logName) {
    const options = {
      path: `${this.baseUrlOb.pathname}${path}`,
      ...(config.doSignedRequests() ? this.signingOptions : {}),
    };
    if (config.doSignedRequests()) {
      aws4.sign(options, {
        accessKeyId: this.credentials.clientId,
        secretAccessKey: this.credentials.clientSecret,
      });
    }
    const fullPath = new URL(path, this.baseUrlOb.href);
    return axios.get(fullPath.toString(), options).catch((err) => {
      logAxiosError(logName, this.serviceName, err);
      throw err;
    });
  }

  post(path, data, retryAttempts, logName) {
    const options = {
      body: JSON.stringify(data),
      path: `${this.baseUrlOb.pathname}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(config.doSignedRequests() ? this.signingOptions : {}),
    };
    if (config.doSignedRequests()) {
      aws4.sign(options, {
        accessKeyId: this.credentials.clientId,
        secretAccessKey: this.credentials.clientSecret,
      });
    }

    if (isNumber(retryAttempts) && retryAttempts !== 0) {
      options['axios-retry'] = {
        retries: retryAttempts,
        retryCondition: axiosRetry.isRetryableError,
      };
    }

    const fullPath = new URL(path, this.baseUrlOb.href);
    return axios.post(fullPath.toString(), data, options).catch((err) => {
      logAxiosError(logName, this.serviceName, err, data);
      throw err;
    });
  }

  put(path, data, retryAttempts, logName) {
    const options = {
      body: JSON.stringify(data),
      method: 'PUT',
      path: `${this.baseUrlOb.pathname}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(config.doSignedRequests() ? this.signingOptions : {}),
    };

    if (config.doSignedRequests()) {
      aws4.sign(options, {
        accessKeyId: this.credentials.clientId,
        secretAccessKey: this.credentials.clientSecret,
      });
    }

    if (isNumber(retryAttempts) && retryAttempts !== 0) {
      options['axios-retry'] = {
        retries: retryAttempts,
        retryCondition: axiosRetry.isRetryableError,
      };
    }

    const fullPath = new URL(path, this.baseUrlOb.href);
    return axios.put(fullPath.toString(), data, options).catch((err) => {
      logAxiosError(logName, this.serviceName, err, data);
      throw err;
    });
  }
}
