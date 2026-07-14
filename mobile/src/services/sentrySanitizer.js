const FILTERED = '[Filtered]';
const MAX_DEPTH = 6;

const SENSITIVE_KEYWORDS = [
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'jwt',
  'password',
  'secret',
  'apikey',
  'api_key',
  'client_secret',
  'stripe',
  'paypal',
  'message',
  'contenu',
  'conversation',
  'email',
  'phone',
  'telephone',
];

const SENSITIVE_QUERY_KEYS = [
  'token',
  'jwt',
  'password',
  'secret',
  'client_secret',
  'session_id',
  'payment_intent',
  'email',
  'phone',
  'telephone',
];

export function sanitizeSentryEvent(event) {
  try {
    if (!event || typeof event !== 'object') return event;

    const technicalMessage = event.message;
    const sanitized = sanitizeValue(event);
    if (technicalMessage) sanitized.message = technicalMessage;

    if (sanitized.user) {
      sanitized.user = {
        ...sanitized.user,
        email: undefined,
        id: undefined,
        ip_address: undefined,
        username: undefined,
      };
    }

    if (sanitized.request) {
      sanitized.request = sanitizeRequest(event.request);
    }

    if (sanitized.extra) {
      sanitized.extra = stripTransportArtifacts(sanitized.extra);
    }

    if (sanitized.contexts) {
      sanitized.contexts = stripTransportArtifacts(sanitized.contexts);
    }

    if (sanitized.tags) {
      sanitized.tags = sanitizeTags(sanitized.tags);
    }

    return sanitized;
  } catch {
    return null;
  }
}

export function sanitizeBreadcrumb(breadcrumb) {
  try {
    if (!breadcrumb || typeof breadcrumb !== 'object') return breadcrumb;
    if (containsSensitiveValue(breadcrumb)) return null;

    const sanitized = sanitizeValue(breadcrumb);

    if (sanitized.category === 'xhr' || sanitized.category === 'fetch') {
      const data = sanitized.data || {};
      const url = data.url || data.to || data.href;
      sanitized.data = {
        method: normalizeMethod(data.method),
        url: normalizeEndpoint(url),
        status_code: data.status_code ?? data.status,
      };
    }

    if (sanitized.category === 'navigation' && sanitized.data) {
      sanitized.data = {
        from: normalizeRoute(sanitized.data.from),
        to: normalizeRoute(sanitized.data.to),
      };
    }

    return sanitized;
  } catch {
    return null;
  }
}

export function sanitizeValue(value, depth = 0, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value !== 'object') {
    return typeof value === 'string' ? sanitizeString(value) : value;
  }
  if (depth >= MAX_DEPTH) return '[Truncated]';
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1, seen));
  }

  return Object.entries(value).reduce((safe, [key, item]) => {
    if (isSensitiveKey(key)) {
      safe[key] = FILTERED;
      return safe;
    }
    safe[key] = sanitizeValue(item, depth + 1, seen);
    return safe;
  }, {});
}

export function sanitizeRequest(request) {
  if (!request || typeof request !== 'object') return request;

  const originalUrl = request.url;
  const originalQueryString = request.query_string;
  const sanitized = sanitizeValue(request);
  delete sanitized.headers;
  delete sanitized.cookies;
  delete sanitized.cookie;
  delete sanitized.data;
  delete sanitized.body;

  if (originalUrl) sanitized.url = normalizeEndpoint(originalUrl);
  if (originalQueryString) sanitized.query_string = sanitizeQueryString(originalQueryString);

  return sanitized;
}

export function normalizeEndpoint(url) {
  if (!url || typeof url !== 'string') return undefined;
  try {
    const parsed = new URL(url, 'https://bx-connect.local');
    return maskPathIdentifiers(parsed.pathname || '/');
  } catch {
    return maskPathIdentifiers(stripQueryAndHash(url));
  }
}

export function normalizeRoute(route) {
  if (!route || typeof route !== 'string') return undefined;
  return maskPathIdentifiers(stripQueryAndHash(route));
}

export function sanitizeTags(tags) {
  return Object.entries(tags || {}).reduce((safe, [key, value]) => {
    if (isSensitiveKey(key) || isSensitiveString(value)) {
      safe[key] = FILTERED;
      return safe;
    }
    safe[key] = value;
    return safe;
  }, {});
}

export function sanitizeApiError(error) {
  const config = error?.config || {};
  const response = error?.response || {};
  return {
    type: 'api_error',
    method: normalizeMethod(config.method),
    endpoint: normalizeEndpoint(config.url),
    status: response.status,
    requestId: response.headers?.['x-request-id'] || response.headers?.['X-Request-ID'],
    environment: process.env.NODE_ENV || 'unknown',
  };
}

function sanitizeQueryString(queryString) {
  if (!queryString || typeof queryString !== 'string') return queryString;

  try {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
    for (const key of params.keys()) {
      if (isSensitiveQueryKey(key)) params.set(key, FILTERED);
    }
    return params.toString();
  } catch {
    return FILTERED;
  }
}

function stripQueryAndHash(value) {
  return value.split('?')[0].split('#')[0];
}

function maskPathIdentifiers(path) {
  if (!path || typeof path !== 'string') return path;
  return path
    .split('/')
    .map(segment => (isIdentifierSegment(segment) ? ':id' : segment))
    .join('/');
}

function isIdentifierSegment(segment) {
  if (!segment) return false;
  return /^\d+$/.test(segment)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)
    || /^[0-9a-f]{24}$/i.test(segment);
}

function normalizeMethod(method) {
  return typeof method === 'string' ? method.toUpperCase() : undefined;
}

function isSensitiveKey(key) {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEYWORDS.some(keyword => normalized.includes(keyword));
}

function isSensitiveQueryKey(key) {
  const normalized = normalizeKey(key);
  return SENSITIVE_QUERY_KEYS.some(keyword => normalized.includes(keyword));
}

function normalizeKey(key) {
  return String(key || '').replace(/[-_\s]/g, '').toLowerCase();
}

function sanitizeString(value) {
  return isSensitiveString(value) ? FILTERED : value;
}

function isSensitiveString(value) {
  if (typeof value !== 'string') return false;
  const lower = value.toLowerCase();
  return lower.includes('bearer ')
    || lower.includes('eyj')
    || lower.includes('token=')
    || lower.includes('jwt=')
    || lower.includes('password=')
    || lower.includes('client_secret=')
    || lower.includes('session_id=')
    || lower.includes('payment_intent=')
    || lower.includes('sk_live_')
    || lower.includes('sk_test_')
    || lower.includes('whsec_')
    || lower.includes('paypal')
    || lower.includes('stripe');
}

function containsSensitiveValue(value, depth = 0, seen = new WeakSet()) {
  if (value == null || depth > MAX_DEPTH) return false;
  if (typeof value === 'string') return isSensitiveString(value);
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.entries(value).some(([key, item]) => (
    isSensitiveKey(key) || containsSensitiveValue(item, depth + 1, seen)
  ));
}

function stripTransportArtifacts(value, depth = 0, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[Truncated]';
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => stripTransportArtifacts(item, depth + 1, seen));
  }

  return Object.entries(value).reduce((safe, [key, item]) => {
    if (isTransportArtifactKey(key)) return safe;
    safe[key] = stripTransportArtifacts(item, depth + 1, seen);
    return safe;
  }, {});
}

function isTransportArtifactKey(key) {
  const normalized = normalizeKey(key);
  return normalized === 'config'
    || normalized === 'request'
    || normalized === 'response'
    || normalized === 'headers';
}
