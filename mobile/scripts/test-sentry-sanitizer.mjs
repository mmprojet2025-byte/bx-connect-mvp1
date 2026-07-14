import assert from 'node:assert/strict';
import {
  normalizeEndpoint,
  sanitizeApiError,
  sanitizeBreadcrumb,
  sanitizeSentryEvent,
  sanitizeValue,
} from '../src/services/sentrySanitizer.js';
import { captureApiError } from '../src/services/captureApiError.js';

delete process.env.EXPO_PUBLIC_SENTRY_DSN;

const circular = { normal: 'ok' };
circular.self = circular;

const event = sanitizeSentryEvent({
  message: 'TypeError: cannot read property foo',
  user: {
    id: '123',
    email: 'person@example.org',
    username: 'person',
    ip_address: '127.0.0.1',
  },
  request: {
    url: 'https://api.example.org/api/messages?token=abc&search=hello',
    headers: { Authorization: 'Bearer abc.def.ghi' },
    cookies: 'session=secret',
    data: { message: 'private conversation', amount: 10 },
  },
  extra: {
    config: {
      headers: { Authorization: 'Bearer abc.def.ghi' },
      data: {
        email: 'person@example.org',
        stripePaymentIntent: 'pi_secret',
        paypalOrderId: 'paypal-order',
        contenu: 'conversation text',
      },
    },
    circular,
  },
});

assert.equal(event.message, 'TypeError: cannot read property foo');
assert.equal(event.user.email, undefined);
assert.equal(event.user.id, undefined);
assert.equal(event.user.ip_address, undefined);
assert.equal(event.user.username, undefined);
assert.equal(event.request.headers, undefined);
assert.equal(event.request.cookies, undefined);
assert.equal(event.request.data, undefined);
assert.equal(event.request.url, '/api/messages');
assert.equal(event.extra.config, undefined);
assert.equal(event.extra.circular.self, '[Circular]');

const nestedTransport = sanitizeSentryEvent({
  contexts: {
    http: {
      response: { data: { email: 'person@example.org' } },
      safe: 'kept',
    },
  },
  extra: {
    request: { data: { Authorization: 'Bearer abc' } },
    response: { data: { contenu: 'conversation text' } },
    headers: { Authorization: 'Bearer abc' },
    safe: 'kept',
  },
});

assert.equal(nestedTransport.extra.request, undefined);
assert.equal(nestedTransport.extra.response, undefined);
assert.equal(nestedTransport.extra.headers, undefined);
assert.equal(nestedTransport.extra.safe, 'kept');
assert.equal(nestedTransport.contexts.http.response, undefined);
assert.equal(nestedTransport.contexts.http.safe, 'kept');

const sensitiveBreadcrumb = sanitizeBreadcrumb({
  category: 'fetch',
  data: {
    method: 'post',
    url: 'https://api.example.org/api/paiements?token=abc',
    status_code: 500,
    headers: { Authorization: 'Bearer abc' },
  },
});
assert.equal(sensitiveBreadcrumb, null);

const safeBreadcrumb = sanitizeBreadcrumb({
  category: 'xhr',
  data: {
    method: 'get',
    url: 'https://api.example.org/api/groupes?page=1',
    status_code: 200,
  },
});
assert.deepEqual(safeBreadcrumb.data, {
  method: 'GET',
  url: '/api/groupes',
  status_code: 200,
});

assert.equal(normalizeEndpoint('/api/users/42?email=person@example.org'), '/api/users/:id');
assert.equal(
  normalizeEndpoint('/api/projets/550e8400-e29b-41d4-a716-446655440000?token=abc'),
  '/api/projets/:id'
);
assert.equal(normalizeEndpoint('/api/messages/64a7f2a3f9d1b2c3d4e5f678'), '/api/messages/:id');

const apiError = sanitizeApiError({
  config: {
    method: 'post',
    url: '/api/users/42?token=abc',
    headers: { Authorization: 'Bearer abc' },
    data: { email: 'person@example.org' },
  },
  response: {
    status: 503,
    headers: {
      'x-request-id': 'req-1',
      Authorization: 'Bearer abc',
    },
  },
});
assert.equal(apiError.method, 'POST');
assert.equal(apiError.endpoint, '/api/users/:id');
assert.equal(apiError.status, 503);
assert.equal(apiError.requestId, 'req-1');
assert.equal(Object.hasOwn(apiError, 'headers'), false);
assert.equal(Object.hasOwn(apiError, 'body'), false);
assert.equal(Object.hasOwn(apiError, 'config'), false);
assert.equal(Object.hasOwn(apiError, 'response'), false);

const throwingEvent = new Proxy({}, {
  ownKeys() {
    throw new Error('proxy exploded');
  },
});
assert.equal(sanitizeSentryEvent(throwingEvent), null);
assert.equal(captureApiError(new Error('api failed')), false);
assert.doesNotThrow(() => sanitizeValue(circular));

console.log('Mobile Sentry sanitizer tests OK');
