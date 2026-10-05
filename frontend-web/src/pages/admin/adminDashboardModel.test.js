import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAdminDashboard } from './adminDashboardModel.js'
const empty = { users: [], groups: [], pendingGroups: [], projects: [], activities: [], supports: [] }

test('active accounts exclude inactive accounts and technical roles', () => {
  const users = ['MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN', 'SUPER_ADMIN'].flatMap(role => [
    { role, actif: true }, { role, actif: false }, { role, actif: 'true' },
  ])
  const result = buildAdminDashboard({ ...empty, users })
  assert.equal(result.users, 3)
  assert.equal(result.partners, 1)
})

test('overview and decisions use distinct workflow states; drafts are not decisions', () => {
  const result = buildAdminDashboard({ ...empty,
    groups: ['VALIDE', 'EN_ATTENTE', 'REFUSE'].map(statut => ({ statut })),
    pendingGroups: [{ statut: 'EN_ATTENTE' }],
    projects: ['SOUMIS', 'VALIDE_REFERENT', 'APPROUVE', 'EN_COURS', 'TERMINE'].map(statut => ({ statut })),
    activities: ['BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE'].map(statut => ({ statut })),
  })
  assert.equal(result.groups, 1)
  assert.equal(result.activities, 1)
  assert.equal(result.projects, 2)
  assert.equal(result.actions.projects, 1)
  assert.equal(result.drafts, 1)
  assert.equal(result.total, 2)
})

test('only pending project declarations without any associated activity are actionable', () => {
  const valid = { projetId: 1, activiteId: null, typeSource: 'DECLARATION', statutPaiement: 'EN_ATTENTE' }
  const supports = [valid,
    { ...valid, projetId: null }, { ...valid, activiteId: 5 },
    { ...valid, typeSource: 'STRIPE' }, { ...valid, typeSource: null },
    ...['PAYE', 'REMBOURSE', 'ANNULE'].map(statutPaiement => ({ ...valid, statutPaiement })),
  ]
  assert.equal(buildAdminDashboard({ ...empty, supports }).actions.supports, 1)
})

test('known empty sources produce zeros; unavailable sources never do', () => {
  const result = buildAdminDashboard(empty)
  for (const key of ['users', 'groups', 'activities', 'projects', 'partners', 'total']) assert.equal(result[key], 0)
  for (const source of ['pendingGroups', 'projects', 'supports']) {
    assert.equal(buildAdminDashboard({ ...empty, [source]: null }).total, null)
  }
  const missingUsers = buildAdminDashboard({ ...empty, users: null })
  assert.equal(missingUsers.users, null)
  assert.equal(missingUsers.partners, null)
  assert.equal(missingUsers.total, 0)
  const missingActivities = buildAdminDashboard({ ...empty, activities: null })
  assert.equal(missingActivities.activities, null)
  assert.equal(missingActivities.drafts, null)
  assert.equal(missingActivities.total, 0)
})
