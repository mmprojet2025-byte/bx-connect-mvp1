import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveNotificationRoute, hasExactNotificationRoute } from './notificationRoute.js'

for (const type of ['BUSINESS_MESSAGE', 'BUSINESS_CONVERSATION_CREATED']) {
  for (const lienAction of [undefined, '/api/conversations-metier/42', '/admin/conversations?conversationId=42']) {
    test(`ADMIN ${type} falls back to dashboard (${lienAction || 'no link'})`, () => {
      const notification = { type, lienAction }
      assert.equal(resolveNotificationRoute(notification, 'ADMIN'), '/admin/dashboard')
      assert.equal(hasExactNotificationRoute(notification, 'ADMIN'), false)
    })
  }
}

test('old conversation links without a recognized type also fall back for ADMIN', () => {
  for (const lienAction of ['/admin/conversations', '/admin/conversations/42', '/conversations-metier', '/conversations-metier/42']) {
    assert.equal(resolveNotificationRoute({ lienAction }, 'ADMIN'), '/admin/dashboard')
    assert.equal(hasExactNotificationRoute({ lienAction }, 'ADMIN'), false)
  }
})

test('ordinary ADMIN notification destinations remain available', () => {
  for (const [lienAction, expected] of [
    ['/groupes/7', '/admin/groupes'],
    ['/projets/8', '/admin/projets'],
    ['/activites/9', '/admin/activites'],
    ['/admin/soutiens?soutien=12', '/admin/soutiens?soutien=12'],
  ]) {
    assert.equal(resolveNotificationRoute({ lienAction }, 'ADMIN'), expected)
    assert.equal(hasExactNotificationRoute({ lienAction }, 'ADMIN'), true)
  }
})

test('REFERENT and PARTENAIRE retain their exact business conversation destinations', () => {
  for (const [role, path] of [['REFERENT', '/referent/conversations'], ['PARTENAIRE', '/partenaire/conversations']]) {
    for (const type of ['BUSINESS_MESSAGE', 'BUSINESS_CONVERSATION_CREATED']) {
      const notification = { type, lienAction: '/api/conversations-metier/42' }
      assert.equal(resolveNotificationRoute(notification, role), `${path}?conversationId=42`)
      assert.equal(hasExactNotificationRoute(notification, role), true)
    }
  }
})

test('normal member and referent messaging destinations remain unchanged', () => {
  for (const [role, path] of [['MEMBRE', '/messagerie'], ['REFERENT', '/referent/messagerie']]) {
    const notification = { type: 'MESSAGE', lienAction: '/messages/17' }
    assert.equal(resolveNotificationRoute(notification, role), path)
    assert.equal(hasExactNotificationRoute(notification, role), true)
  }
})
