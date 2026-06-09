export const ServiceName = {
  Payments: 'PaymentsService',
  CPMS: 'CPMSOrchestrationService',
  Documents: 'DocumentsService',
};

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /(secret|password|passwd|token|api[_-]?key|private[_-]?key|authorization|cookie|session|credential)/i;

function sanitizeForLogging(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogging(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeForLogging(val);
      return acc;
    }, {});
  }

  return value;
}

export function logInfo(logName, message) {
  console.log(JSON.stringify({
    logName,
    message: sanitizeForLogging(message),
    logLevel: 'INFO',
  }, null, 2));
}

export function logError(logName, message) {
  console.error(JSON.stringify({
    logName,
    message: sanitizeForLogging(message),
    logLevel: 'ERROR',
  }, null, 2));
}

function errorMessageFromAxiosError(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { data, status } = error.response;
    return {
      errorData: data,
      errorStatus: status,
    };
  }

  if (error.request) {
    return {
      message: 'The request was made but no response was received',
      request: error.request,
    };
  }
  return {
    errorMessage: error.message,
  };
}

export function logAxiosError(logName, serviceName, error, details) {
  const message = errorMessageFromAxiosError(error);

  const log = {
    logName,
    serviceName,
    requestErrorMessage: sanitizeForLogging(message),
    logLevel: 'ERROR',
  };

  if (details !== undefined) {
    log.details = sanitizeForLogging(details);
  }

  console.error(JSON.stringify(log, null, 2));
}
