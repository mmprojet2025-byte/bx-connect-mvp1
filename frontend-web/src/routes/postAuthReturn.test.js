import assert from 'node:assert/strict'
import test from 'node:test'
import { getPostAuthDestination } from './postAuthReturn.js'

test('uses the default dashboard when there is no return destination', () => {
  assert.equal(getPostAuthDestination(undefined, 'MEMBRE'), '/dashboard')
  assert.equal(getPostAuthDestination(null, 'ADMIN'), '/admin/dashboard')
})

test('returns a member to an allowed public activity or group', () => {
  assert.equal(getPostAuthDestination('/activites/42', 'MEMBRE'), '/activites/42')
  assert.equal(getPostAuthDestination('/groupes/7?tab=infos', 'MEMBRE'), '/groupes/7?tab=infos')
})

test('rejects external and malformed return destinations', () => {
  assert.equal(getPostAuthDestination('https://site-malveillant.example', 'MEMBRE'), '/dashboard')
  assert.equal(getPostAuthDestination('//site-malveillant.example', 'MEMBRE'), '/dashboard')
  assert.equal(getPostAuthDestination('javascript:alert(1)', 'MEMBRE'), '/dashboard')
  assert.equal(getPostAuthDestination('/\\site-malveillant.example', 'MEMBRE'), '/dashboard')
})

test('falls back when a destination is not allowed for the authenticated role', () => {
  assert.equal(getPostAuthDestination('/groupes/7', 'ADMIN'), '/admin/dashboard')
  assert.equal(getPostAuthDestination('/activites/42', 'PARTENAIRE'), '/partenaire')
})
