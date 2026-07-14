import * as Sentry from '@sentry/react'
import { sanitizeApiError } from './sentrySanitizer.js'

export function captureApiError(error, type = 'api_error') {
  if (!import.meta.env?.VITE_SENTRY_DSN) return false

  const safeContext = {
    ...sanitizeApiError(error),
    type,
  }

  Sentry.captureException(new Error(type), {
    level: 'error',
    tags: {
      type,
      status: safeContext.status ? String(safeContext.status) : 'unknown',
    },
    extra: safeContext,
  })
  return true
}
