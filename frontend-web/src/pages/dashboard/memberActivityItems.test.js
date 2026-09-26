import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMemberActivityItems } from './memberActivityItems.js'

const t = key => key

test('returns a truly empty feed when the member has no activity or group', () => {
  assert.deepEqual(buildMemberActivityItems({
    dashboard: { notifications: [], inscriptions: [], projets: [] },
    groupe: null,
    t,
    language: 'fr',
  }), [])
})

test('filters false and null values while preserving real feed entries', () => {
  const items = buildMemberActivityItems({
    dashboard: { notifications: [{ id: 1, titre: 'Message' }], inscriptions: [], projets: [] },
    groupe: null,
    t,
    language: 'fr',
  })

  assert.equal(items.length, 1)
  assert.equal(items[0].key, 'notification-1')
  assert.equal(items.some(item => item == null || item === false), false)
})
