import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { API_TIMEOUT_MS, isTimeoutError, networkErrorTranslationKey } from './networkPolicy.js'
import { shouldCloseSession } from './sessionPolicy.js'

test('uses a finite global API timeout', () => {
  assert.equal(API_TIMEOUT_MS, 15_000)
})

test('maps timeouts to a translated message without closing the session', () => {
  const error = { code: 'ECONNABORTED' }
  assert.equal(isTimeoutError(error), true)
  assert.equal(networkErrorTranslationKey(error), 'common.requestTimeout')
  assert.equal(shouldCloseSession({ status: undefined, isPublicRequest: false, hadStoredSession: true }), false)
})

test('maps offline network failures separately from cancellations', () => {
  assert.equal(networkErrorTranslationKey({ code: 'ERR_NETWORK' }), 'common.networkError')
  assert.equal(networkErrorTranslationKey({ code: 'ERR_CANCELED' }), null)
})

test('provides timeout and network messages in FR, NL and EN', () => {
  for (const language of ['fr', 'nl', 'en']) {
    const translations = JSON.parse(readFileSync(
      new URL(`../i18n/locales/${language}.json`, import.meta.url),
      'utf8',
    ))

    assert.ok(translations.common.networkError)
    assert.ok(translations.common.requestTimeout)
  }
})
