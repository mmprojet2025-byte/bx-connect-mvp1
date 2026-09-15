import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPasswordReset, passwordResetErrorKey } from '../src/api/auth.js';
import {
  createSessionInvalidator,
  shouldCloseSession,
} from '../src/api/sessionPolicy.js';

test('password reset performs the real public API request', async () => {
  const calls = [];
  const api = {
    post: async (...args) => {
      calls.push(args);
      return { data: { message: 'accepted' } };
    },
  };
  assert.deepEqual(await requestPasswordReset(api, 'member@example.org'), { message: 'accepted' });
  assert.deepEqual(calls, [[
    '/auth/forgot-password',
    { email: 'member@example.org' },
    { skipAuth: true },
  ]]);
});

test('password reset distinguishes API and network errors', () => {
  assert.equal(passwordResetErrorKey({ response: { status: 500 } }), 'auth.forgot_password_error_api');
  assert.equal(passwordResetErrorKey(new Error('offline')), 'auth.forgot_password_error_network');
});

test('mobile closes a stored session on protected 401 but not on 403', () => {
  assert.equal(shouldCloseSession({ status: 401, isPublicRequest: false, hadStoredSession: true }), true);
  assert.equal(shouldCloseSession({ status: 403, isPublicRequest: false, hadStoredSession: true }), false);
  assert.equal(shouldCloseSession({ status: 401, isPublicRequest: true, hadStoredSession: true }), false);
  assert.equal(shouldCloseSession({ status: 401, isPublicRequest: false, hadStoredSession: false }), false);
});

test('simultaneous protected 401 responses share one cleanup and notification', async () => {
  let clears = 0;
  let notifications = 0;
  let releaseRead;
  const readGate = new Promise(resolve => { releaseRead = resolve; });
  const invalidate = createSessionInvalidator({
    hasSession: async () => {
      await readGate;
      return true;
    },
    clearSession: async () => { clears += 1; },
    notify: () => { notifications += 1; },
  });

  const first = invalidate();
  const second = invalidate();
  releaseRead();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(clears, 1);
  assert.equal(notifications, 1);
});
