# Sentry mobile preproduction validation

This runbook validates that the BX-Connect mobile preview build sends sanitized
Sentry events with a coherent release/dist and symbolicated stack traces.

Do not run this against production first. Do not commit secrets, DSNs, auth
tokens, Sentry organization names, or project names.

## Current status

The local validation can be prepared without secrets, but a real Sentry/EAS
validation requires:

- an authenticated EAS CLI session;
- a linked Expo/EAS project;
- a Sentry mobile project for preproduction;
- EAS or CI secrets for Sentry upload;
- a preview build on one platform at a time.

If any prerequisite is missing, stop before starting `eas build`.

## Required variables

Public runtime variables, safe to expose in the mobile app:

```bash
EXPO_PUBLIC_SENTRY_DSN=<sentry-mobile-public-dsn>
EXPO_PUBLIC_SENTRY_ENVIRONMENT=preprod
EXPO_PUBLIC_SENTRY_RELEASE=bx-connect-mobile@<expo.version>
EXPO_PUBLIC_SENTRY_DIST=<ios-buildNumber-or-android-versionCode-dist>
```

Secret build/upload variables, never prefixed with `EXPO_PUBLIC_`:

```bash
SENTRY_AUTH_TOKEN=<sentry-ci-token>
SENTRY_ORG=<sentry-org-slug>
SENTRY_PROJECT=<sentry-mobile-project-slug>
```

Store secrets with EAS Secrets or the CI secret store. Never put them in
`app.json`, `eas.json`, source files, shell history shared with others, or
documentation.

## Release and dist convention

Use:

- release: `bx-connect-mobile@<expo.version>`;
- iOS dist: `ios-<ios.buildNumber>`;
- Android dist: `android-<android.versionCode>`;
- environment: `preprod`.

For the current app config:

- Expo version: `1.0.0`;
- iOS buildNumber: `1`;
- Android versionCode: `1`;
- expected release: `bx-connect-mobile@1.0.0`;
- expected iOS dist: `ios-1`;
- expected Android dist: `android-1`.

The runtime event values must match the uploaded sourcemap artifacts. If EAS
auto-increments a native build number, update `EXPO_PUBLIC_SENTRY_DIST` for the
same build before publishing it.

## Preflight checks

Run from `mobile/`:

```bash
npx eas whoami
npx eas config
npx expo config --type public
npm run lint
npm audit --omit=dev
npx expo export --platform web
```

Expected:

- EAS account is authenticated;
- preview profile is available;
- no Sentry secret appears in `npx expo config --type public`;
- lint has no errors;
- Expo export succeeds;
- known Expo/xcode/uuid audit findings are documented and not fixed with
  `npm audit fix --force`.

## Safe test error

Only add a temporary JavaScript test error if the preproduction validation needs
an explicit event and no existing safe error path is available.

Rules:

- guard it with `EXPO_PUBLIC_SENTRY_TEST_ENABLED=true`;
- keep it disabled by default;
- do not expose a user-facing button to ordinary users;
- do not include personal data, emails, tokens, messages, payment data, or API
  payloads;
- remove the trigger after validation.

Preferred temporary behavior: trigger one controlled JavaScript exception on
startup only in a local/preproduction test build where
`EXPO_PUBLIC_SENTRY_TEST_ENABLED=true` and
`EXPO_PUBLIC_SENTRY_ENVIRONMENT=preprod`.

## Preview build

Build one platform at a time.

iOS preview example:

```bash
EXPO_PUBLIC_SENTRY_ENVIRONMENT=preprod \
EXPO_PUBLIC_SENTRY_RELEASE=bx-connect-mobile@1.0.0 \
EXPO_PUBLIC_SENTRY_DIST=ios-1 \
eas build --profile preview --platform ios
```

Android preview example:

```bash
EXPO_PUBLIC_SENTRY_ENVIRONMENT=preprod \
EXPO_PUBLIC_SENTRY_RELEASE=bx-connect-mobile@1.0.0 \
EXPO_PUBLIC_SENTRY_DIST=android-1 \
eas build --profile preview --platform android
```

Before running the build, confirm that `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and
`SENTRY_PROJECT` are provided by EAS Secrets or CI. Do not echo their values.

The build must fail rather than silently publish an unusable artifact if the
Sentry sourcemap upload fails.

## Sentry checks

In the Sentry preproduction project, verify:

- an event is received;
- environment is `preprod`;
- release matches `bx-connect-mobile@<expo.version>`;
- dist matches the platform build;
- stacktrace is symbolicated and references readable source frames;
- no `Authorization` header is present;
- no JWT, token, cookie, password, or secret is present;
- no API body or raw Axios config/response/request is present;
- no Stripe or PayPal secret/payment payload is present;
- no private message, conversation body, email, or phone number is present;
- requestId is present for captured API errors when the backend returned one.

Do not paste real event payloads into tickets or documentation. Record only
pass/fail results and the Sentry event id if it contains no sensitive data.

## API error checks

Use only safe test endpoints or controlled preproduction failures:

- network error: captured as a sanitized Sentry API error;
- HTTP 5xx: captured as a sanitized Sentry API error;
- HTTP 400/401/403: not captured;
- canceled requests: not captured;
- 401 behavior still clears stored auth and notifies session listeners.

Never test against real payment failures or production payment callbacks.

## Failure procedure

Stop the validation if:

- EAS authentication is unavailable;
- Sentry secrets are missing;
- release/dist cannot be made consistent;
- sourcemap upload fails;
- stacktrace is not symbolicated;
- any PII or secret appears in Sentry;
- the build includes `SENTRY_AUTH_TOKEN` or another secret in public config.

Fix the configuration, rotate any exposed secret, and rerun a new preview build.

## Cleanup

After validation:

- remove any temporary test-error trigger;
- unset local shell variables containing secrets;
- keep the Sentry token only in EAS Secrets or CI;
- keep screenshots/logs free of secrets and personal data;
- document the validated platform, release, dist, and date.

## GO / NO-GO

GO for mobile Sentry preproduction only when:

- preview build completed for the tested platform;
- sourcemaps uploaded successfully;
- one sanitized event was received;
- stacktrace is symbolicated;
- release/dist/environment are correct;
- no PII, token, secret, body, header, private message, or payment data is in
  the event.

NO-GO if any required secret/access is missing, upload is not validated, or PII
controls fail.
