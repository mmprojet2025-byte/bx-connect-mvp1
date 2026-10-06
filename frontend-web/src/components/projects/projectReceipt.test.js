import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createProjectReceipt } from './projectReceipt.js'
const receipt = { statut: 'PAYE', numeroRecu: 'BX-PROJET-3', titreProjet: 'Projet test', participant: 'Alice Test',
  montant: 5, devise: 'EUR', datePaiement: '2026-10-06T12:00:00' }
for (const language of ['fr', 'nl', 'en']) {
  test(`paid receipt creates an actual PDF in ${language}`, () => {
    const dictionary = JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url)))
    const t = key => key.split('.').reduce((value, part) => value[part], dictionary)
    const pdf = createProjectReceipt(receipt, t, language).output()
    assert.ok(pdf.startsWith('%PDF-'))
    for (const text of ['BX-PROJET-3', 'Projet test', 'Alice Test', '5.00 EUR']) assert.ok(pdf.includes(text))
    assert.ok(!pdf.includes('checkout.stripe.com'))
  })
}
test('no receipt before confirmed payment', () => {
  assert.throws(() => createProjectReceipt({ ...receipt, statut: 'EN_ATTENTE' }, key => key), /pending/)
})
