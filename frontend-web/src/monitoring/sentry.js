import * as Sentry from '@sentry/react'
import { sanitizeBreadcrumb, sanitizeSentryEvent } from './sentrySanitizer'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const sentryEnvironment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE
const sentryRelease = import.meta.env.VITE_SENTRY_RELEASE
const sentryDist = import.meta.env.VITE_SENTRY_DIST

// Define VITE_SENTRY_DSN in the web environment to enable Sentry.
if (sentryDsn) {
  const sentryOptions = {
    dsn: sentryDsn,
    environment: sentryEnvironment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: sanitizeSentryEvent,
    beforeBreadcrumb: sanitizeBreadcrumb,
  }

  if (sentryRelease) sentryOptions.release = sentryRelease
  if (sentryDist) sentryOptions.dist = sentryDist

  Sentry.init(sentryOptions)
}
