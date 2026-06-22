import * as Sentry from '@sentry/react-native';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
let sentryEnabled = false;

export function initSentry() {
  if (!sentryDsn || sentryEnabled) return sentryEnabled;

  // Define EXPO_PUBLIC_SENTRY_DSN in the Expo environment to enable Sentry.
  Sentry.init({
    dsn: sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.id;
        delete event.user.ip_address;
        delete event.user.username;
      }
      return event;
    },
  });

  sentryEnabled = true;
  return sentryEnabled;
}

export function withSentry(AppComponent) {
  return sentryEnabled ? Sentry.wrap(AppComponent) : AppComponent;
}
