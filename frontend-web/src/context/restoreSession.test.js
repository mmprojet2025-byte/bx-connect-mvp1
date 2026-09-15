import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreSession } from './restoreSession.js'
import { getDefaultRouteForRole } from '../routes/roleRoutes.js'

const now = 1_800_000_000_000
const jwt = exp => `header.${btoa(JSON.stringify({ exp }))}.signature`
const storageFor = entries => {
  const data = new Map(Object.entries(entries))
  return { getItem: key => data.get(key) ?? null, removeItem: key => data.delete(key) }
}

test('restores the complete session repeatedly for each existing role', () => {
  for (const [role, destination] of Object.entries({
    SUPER_ADMIN: '/super-admin/dashboard', ADMIN: '/admin/dashboard',
    REFERENT: '/referent/dashboard', MEMBRE: '/dashboard', PARTENAIRE: '/partenaire',
  })) {
    const user = { role, prenom: 'Test' }
    const token = jwt(now / 1000 + 60)
    const storage = storageFor({ token, user: JSON.stringify(user) })
    // Même stockage lors d'un nouvel onglet, d'un rechargement ou en StrictMode.
    assert.deepEqual(restoreSession(storage, now), { token, user })
    assert.deepEqual(restoreSession(storage, now), { token, user })
    assert.equal(getDefaultRouteForRole(role), destination)
  }
})

test('anonymous, expired and corrupt sessions never restore an authenticated user', () => {
  for (const entries of [
    {}, { token: jwt(now / 1000 + 60) }, { user: '{"role":"SUPER_ADMIN"}' },
    { token: jwt(now / 1000 - 1), user: '{"role":"SUPER_ADMIN"}' },
    { token: jwt(now / 1000), user: '{"role":"SUPER_ADMIN"}' },
    { token: 'invalid', user: '{"role":"SUPER_ADMIN"}' },
    { token: jwt(now / 1000 + 60), user: '{broken' },
    { token: jwt(now / 1000 + 60), user: 'null' },
    { token: jwt(now / 1000 + 60), user: '{}' },
  ]) {
    const storage = storageFor(entries)
    assert.deepEqual(restoreSession(storage, now), { token: null, user: null })
    assert.equal(storage.getItem('token'), null)
    assert.equal(storage.getItem('user'), null)
  }
})

test('a cleared session stays anonymous on the next load', () => {
  const storage = storageFor({ token: jwt(now / 1000 + 60), user: '{"role":"SUPER_ADMIN"}' })
  storage.removeItem('token')
  storage.removeItem('user')
  assert.deepEqual(restoreSession(storage, now), { token: null, user: null })
})
