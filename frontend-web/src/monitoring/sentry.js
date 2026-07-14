import * as Sentry from '@sentry/react'
import { sanitizeBreadcrumb, sanitizeSentryEvent } from './sentrySanitizer'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN

// Define VITE_SENTRY_DSN in the web environment to enable Sentry.
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: sanitizeSentryEvent,
    beforeBreadcrumb: sanitizeBreadcrumb,
  })
}
