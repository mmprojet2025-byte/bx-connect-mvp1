import * as Sentry from '@sentry/react'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN

// Define VITE_SENTRY_DSN in the web environment to enable Sentry.
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email
        delete event.user.id
        delete event.user.ip_address
        delete event.user.username
      }
      return event
    },
  })
}
