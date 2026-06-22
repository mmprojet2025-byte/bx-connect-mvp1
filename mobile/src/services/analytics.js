const analyticsKey = process.env.EXPO_PUBLIC_ANALYTICS_KEY;
const analyticsEnabled = Boolean(analyticsKey);
const allowedEvents = new Set([
  'app_open',
  'login_success_role',
  'dashboard_view',
  'language_change',
]);

let appOpenTracked = false;

function track(eventName, properties = {}) {
  if (!analyticsEnabled || !allowedEvents.has(eventName)) return;

  const payload = {
    event: eventName,
    properties: sanitizeProperties(properties),
    timestamp: new Date().toISOString(),
    platform: 'mobile',
  };

  // EXPO_PUBLIC_ANALYTICS_KEY enables this local adapter. No personal data is sent.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug('[analytics]', payload);
  }
}

function sanitizeProperties(properties) {
  return Object.entries(properties).reduce((safe, [key, value]) => {
    if (value == null) return safe;
    if (['email', 'nom', 'prenom', 'token', 'jwt', 'password'].includes(key.toLowerCase())) {
      return safe;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    }
    return safe;
  }, {});
}

export function trackAppOpen() {
  if (appOpenTracked) return;
  appOpenTracked = true;
  track('app_open');
}

export function trackLoginSuccessRole(role) {
  track('login_success_role', { role });
}

export function trackDashboardView(role) {
  track('dashboard_view', { role });
}

export function trackLanguageChange(language) {
  track('language_change', { language });
}
