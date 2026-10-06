import test from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultRouteForRole } from './roleRoutes.js'

test('preserves role destinations after login and for private route guards', () => {
  const destinations = {
    MEMBRE: '/dashboard',
    REFERENT: '/referent/dashboard',
    ADMIN: '/admin/dashboard',
    PARTENAIRE: '/partenaire',
    SUPER_ADMIN: '/super-admin/dashboard',
  }
  for (const [role, destination] of Object.entries(destinations)) {
    assert.equal(getDefaultRouteForRole(role), destination)
  }
})

test('preserves the default destination for an unknown role', () => {
  for (const role of [undefined, null, '', 'UNKNOWN']) {
    assert.equal(getDefaultRouteForRole(role), '/dashboard')
  }
})
