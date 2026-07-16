import * as Sentry from '@sentry/react-native';
import { sanitizeBreadcrumb, sanitizeSentryEvent } from './sentrySanitizer';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryEnvironment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (__DEV__ ? 'development' : 'production');
const sentryRelease = process.env.EXPO_PUBLIC_SENTRY_RELEASE;
const sentryDist = process.env.EXPO_PUBLIC_SENTRY_DIST;
let sentryEnabled = false;

export function initSentry() {
  if (!sentryDsn || sentryEnabled) return sentryEnabled;

  // Define EXPO_PUBLIC_SENTRY_DSN in the Expo environment to enable Sentry.
  const sentryOptions = {
    dsn: sentryDsn,
    environment: sentryEnvironment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: sanitizeSentryEvent,
    beforeBreadcrumb: sanitizeBreadcrumb,
  };

  if (sentryRelease) sentryOptions.release = sentryRelease;
  if (sentryDist) sentryOptions.dist = sentryDist;

  Sentry.init(sentryOptions);

  sentryEnabled = true;
  return sentryEnabled;
}

export function withSentry(AppComponent) {
  return sentryEnabled ? Sentry.wrap(AppComponent) : AppComponent;
}
