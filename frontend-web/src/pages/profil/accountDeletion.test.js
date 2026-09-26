import test from 'node:test'
import assert from 'node:assert/strict'
import { canSubmitAccountDeletion, requestAccountDeletion } from './accountDeletion.js'

test('requires explicit confirmation before deletion can be submitted', () => {
  assert.equal(canSubmitAccountDeletion({ confirmed: false, isSubmitting: false }), false)
  assert.equal(canSubmitAccountDeletion({ confirmed: true, isSubmitting: true }), false)
  assert.equal(canSubmitAccountDeletion({ confirmed: true, isSubmitting: false }), true)
})

test('deletes the account, logs out and redirects after success', async () => {
  const calls = []
  await requestAccountDeletion({
    apiClient: { delete: async path => calls.push(path) },
    logout: () => calls.push('logout'),
    navigate: (path, options) => calls.push([path, options]),
  })

  assert.deepEqual(calls, ['/users/me', 'logout', ['/', { replace: true }]])
})

test('keeps the session when account deletion fails', async () => {
  let loggedOut = false
  await assert.rejects(() => requestAccountDeletion({
    apiClient: { delete: async () => { throw new Error('network') } },
    logout: () => { loggedOut = true },
    navigate: () => {},
  }))
  assert.equal(loggedOut, false)
})
