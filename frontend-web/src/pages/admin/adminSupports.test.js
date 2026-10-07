import test from 'node:test'
import assert from 'node:assert/strict'
import { isSupportDeclaration, canDecideSupport } from './adminSupports.js'

const declaration = { typeSource: 'DECLARATION', projetId: 1, statutPaiement: 'EN_ATTENTE' }

test('only project declarations appear in support lists and counters', () => {
  const invalid = [null, { ...declaration, typeSource: 'STRIPE' },
    { ...declaration, typeSource: 'PAYPAL' }, { ...declaration, typeSource: null },
    { ...declaration, projetId: null }, { ...declaration, activiteId: 2 }]
  assert.deepEqual([declaration, ...invalid].filter(isSupportDeclaration), [declaration])
  invalid.forEach(support => assert.equal(canDecideSupport(support), false))
})

test('processed declarations remain in history without decision actions', () => {
  assert.equal(canDecideSupport(declaration), true)
  for (const statutPaiement of ['PAYE', 'REMBOURSE', 'ANNULE', 'ECHOUE']) {
    const support = { ...declaration, statutPaiement }
    assert.equal(isSupportDeclaration(support), true)
    assert.equal(canDecideSupport(support), false)
  }
})
