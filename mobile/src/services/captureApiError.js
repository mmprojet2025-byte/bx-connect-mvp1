import { sanitizeApiError } from './sentrySanitizer.js';

export function captureApiError(error, type = 'api_error') {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) return false;

  const Sentry = require('@sentry/react-native');
  const safeContext = {
    ...sanitizeApiError(error),
    type,
  };

  Sentry.captureException(new Error(type), {
    level: 'error',
    tags: {
      type,
      status: safeContext.status ? String(safeContext.status) : 'unknown',
    },
    extra: safeContext,
  });

  return true;
}
