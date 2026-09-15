import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldCloseSession } from './sessionPolicy.js'

test('closes an existing session only for a protected 401 response', () => {
  assert.equal(shouldCloseSession({ status: 401, isPublicRequest: false, hadStoredSession: true }), true)
  assert.equal(shouldCloseSession({ status: 403, isPublicRequest: false, hadStoredSession: true }), false)
  assert.equal(shouldCloseSession({ status: 401, isPublicRequest: true, hadStoredSession: true }), false)
  assert.equal(shouldCloseSession({ status: 401, isPublicRequest: false, hadStoredSession: false }), false)
})
