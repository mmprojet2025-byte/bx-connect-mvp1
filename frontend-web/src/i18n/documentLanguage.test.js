import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDocumentLanguage, syncDocumentLanguage } from './documentLanguage.js'

test('synchronizes the document language for FR, NL and EN', () => {
  for (const language of ['fr', 'nl', 'en']) {
    const documentElement = { lang: '' }
    assert.equal(syncDocumentLanguage(documentElement, language), language)
    assert.equal(documentElement.lang, language)
  }
})

test('normalizes regional languages and falls back safely', () => {
  assert.equal(normalizeDocumentLanguage('nl-BE'), 'nl')
  assert.equal(normalizeDocumentLanguage('de'), 'fr')
})
