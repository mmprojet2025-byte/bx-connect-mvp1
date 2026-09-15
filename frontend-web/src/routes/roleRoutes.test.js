import test from 'node:test'
import assert from 'node:assert/strict'
import { getAuthenticatedRootRedirect } from './roleRoutes.js'

test('redirects authenticated users from root to the dashboard for their role', () => {
  const destinations = {
    MEMBRE: '/dashboard',
    REFERENT: '/referent/dashboard',
    ADMIN: '/admin/dashboard',
    PARTENAIRE: '/partenaire',
    SUPER_ADMIN: '/super-admin/dashboard',
  }

  for (const [role, destination] of Object.entries(destinations)) {
    assert.equal(
      getAuthenticatedRootRedirect({ isAuthenticated: true, pathname: '/', role }),
      destination,
    )
  }
})

test('keeps root public for visitors and incomplete or invalid sessions', () => {
  for (const role of [undefined, null, '', 'UNKNOWN']) {
    assert.equal(
      getAuthenticatedRootRedirect({ isAuthenticated: true, pathname: '/', role }),
      null,
    )
  }

  assert.equal(
    getAuthenticatedRootRedirect({ isAuthenticated: false, pathname: '/', role: 'MEMBRE' }),
    null,
  )
})

test('does not redirect authenticated users away from non-root routes', () => {
  assert.equal(
    getAuthenticatedRootRedirect({ isAuthenticated: true, pathname: '/activites', role: 'MEMBRE' }),
    null,
  )
})
