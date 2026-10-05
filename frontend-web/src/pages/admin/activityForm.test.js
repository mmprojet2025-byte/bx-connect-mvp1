import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { emptyActivityForm, activityToForm, assignmentLocked, eligibleGroups, groupReferent, validateActivityForm, activityPayload, audienceKey } from './activityForm.js'

const group = { id: 5, nom: 'Sport', actif: true, statut: 'VALIDE', referentId: 9 }
const ref = { id: 9, prenom: 'Anne', nom: 'Martin', actif: true, role: 'REFERENT' }
const valid = { ...emptyActivityForm, titre: ' Atelier ', description: ' Description ', lieu: ' Bruxelles ', dateDebut: '2099-01-15T10:00', dateFin: '2099-01-15T12:00', capaciteMax: '10' }
const grouped = { ...valid, nature: 'GROUPE', groupeId: '5', visibilite: 'PRIVE_GROUPE' }
const validate = (form, groups = [group], refs = [ref], original) => validateActivityForm(form, groups, refs, original)

test('general draft is free, public, and explicitly unassigned', () => {
  assert.deepEqual(validate(valid), [])
  const payload = activityPayload(valid)
  assert.equal(payload.nature, 'GENERALE')
  assert.equal(payload.groupeId, null)
  assert.equal(payload.referentAssigneId, null)
  assert.equal(payload.visibilite, 'PUBLIC')
  assert.equal(payload.gratuite, true)
  assert.equal(payload.prix, null)
  assert.equal(payload.titre, 'Atelier')
  assert.equal(payload.capaciteMax, 10)
  assert.equal('statut' in payload, false)
})
for (const visibility of ['PUBLIC', 'PRIVE_GROUPE']) {
  test(`group draft ${visibility} lets backend determine referent`, () => {
    const form = { ...grouped, visibilite: visibility }
    assert.deepEqual(validate(form), [])
    const payload = activityPayload(form)
    assert.equal(payload.groupeId, 5)
    assert.equal(payload.visibilite, visibility)
    assert.equal('referentAssigneId' in payload, false)
  })
}
for (const field of ['titre', 'description', 'lieu', 'dateDebut', 'dateFin']) {
  test(`${field} is required`, () => assert.ok(validate({ ...valid, [field]: ' ' }).includes(field)))
}
for (const end of ['2099-01-15T10:00', '2099-01-15T09:59']) {
  test(`reject end ${end}`, () => assert.ok(validate({ ...valid, dateFin: end }).includes('dateOrder')))
}
for (const capacity of [0, -1, '', 'abc', 1.5]) {
  test(`reject capacity ${capacity}`, () => assert.ok(validate({ ...valid, capaciteMax: capacity }).includes('capaciteMax')))
}
test('group required', () => assert.ok(validate({ ...grouped, groupeId: '' }).includes('groupeId')))
test('only approved active groups', () => assert.deepEqual(eligibleGroups([group, { ...group, actif: false }, { ...group, statut: 'EN_ATTENTE' }]), [group]))
for (const refs of [[], [{ ...ref, actif: false }], [{ ...ref, role: 'MEMBRE' }], [{ ...ref, id: 8 }]]) {
  test(`invalid referent ${JSON.stringify(refs)} blocks submission`, () => assert.ok(validate(grouped, [group], refs).includes('referent')))
}
test('referent is derived from group', () => assert.equal(groupReferent(group, [ref]), ref))
test('stale assignment is blocked, not silently replaced', () => assert.ok(validate(grouped, [group], [ref], { groupeId: 5, referentAssigneId: 8 }).includes('referent')))
for (const visibility of ['', 'MEMBRES']) {
  test(`reject group visibility ${visibility}`, () => assert.ok(validate({ ...grouped, visibilite: visibility }).includes('visibilite')))
}
test('draft assignment can change', () => {
  assert.equal(assignmentLocked({ statut: 'BROUILLON', gratuite: true, visibilite: 'PUBLIC' }), false)
  assert.equal(activityPayload(valid, { statut: 'BROUILLON', groupeId: 5 }).groupeId, null)
})
for (const statut of ['PUBLIEE', 'TERMINEE', 'ANNULEE']) {
  test(`${statut} assignment frozen and omitted from payload`, () => {
    const original = { statut, gratuite: true }
    assert.equal(assignmentLocked(original), true)
    const payload = activityPayload(grouped, original)
    for (const key of ['nature', 'groupeId', 'referentAssigneId', 'visibilite']) assert.equal(key in payload, false)
  })
}
test('historical paid and connected-only fields preserved without conversion', () => {
  const original = { ...valid, statut: 'BROUILLON', gratuite: false, prix: 12.5, visibilite: 'MEMBRES', groupeId: null, categorie: 'Art', latitude: 50.85 }
  const form = activityToForm(original)
  assert.equal(form.nature, 'GENERALE')
  assert.equal(form.visibilite, 'MEMBRES')
  assert.equal(assignmentLocked(original), true)
  const payload = activityPayload(form, original)
  assert.equal(payload.gratuite, false)
  assert.equal(payload.prix, 12.5)
  assert.equal(payload.categorie, 'Art')
  assert.equal(payload.latitude, 50.85)
  assert.equal('visibilite' in payload, false)
})
test('loading an activity preserves local time and group assignment', () => {
  const form = activityToForm({ ...valid, groupeId: 5, dateDebut: '2099-01-15T10:00:30' })
  assert.equal(form.nature, 'GROUPE')
  assert.equal(form.groupeId, 5)
  assert.equal(form.dateDebut, '2099-01-15T10:00:30')
})
for (const [activity, expected] of [
  [{ visibilite: 'PUBLIC' }, 'generalAudience'],
  [{ groupeId: 5, visibilite: 'PUBLIC' }, 'groupAudience'],
  [{ groupeId: 5, visibilite: 'PRIVE_GROUPE' }, 'privateAudience'],
  [{ visibilite: 'MEMBRES' }, 'legacyAudience'],
]) test(`audience ${expected}`, () => assert.equal(audienceKey(activity), expected))
test('all form messages translated in FR/NL/EN', () => {
  const messages = ['fr', 'nl', 'en'].map(lang => JSON.parse(readFileSync(new URL(`../../i18n/locales/${lang}.json`, import.meta.url))).adminActivity)
  for (const message of messages) {
    assert.deepEqual(Object.keys(message).sort(), Object.keys(messages[0]).sort())
    assert.deepEqual(Object.keys(message.errors).sort(), Object.keys(messages[0].errors).sort())
    for (const value of Object.values(message)) if (typeof value === 'string') assert.ok(value.trim())
  }
})
