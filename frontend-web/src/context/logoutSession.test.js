import test from 'node:test'
import assert from 'node:assert/strict'
import { logoutAndNavigate } from './logoutSession.js'

test('clears the session before navigating once to the public home', () => {
  const calls = []
  logoutAndNavigate({
    logout: () => calls.push('logout'),
    closeMenu: () => calls.push('close-menu'),
    navigate: (path, options) => calls.push(['navigate', path, options]),
  })
  assert.deepEqual(calls, [
    'logout',
    'close-menu',
    ['navigate', '/', { replace: true }],
  ])
})
