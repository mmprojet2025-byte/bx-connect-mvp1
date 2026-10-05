import test from 'node:test'
import assert from 'node:assert/strict'
import { PROJECT_STATUSES, projectStatusCounts, topActivityRegistrations } from './adminDashboardStatistics.js'

test('project distribution keeps all states, including zero, and separates review stages', () => {
  const rows = projectStatusCounts([{ statut: 'SOUMIS' }, { statut: 'SOUMIS' }, { statut: 'VALIDE_REFERENT' }])
  assert.equal(rows.length, PROJECT_STATUSES.length)
  assert.equal(rows.find(row => row.status === 'SOUMIS').count, 2)
  assert.equal(rows.find(row => row.status === 'VALIDE_REFERENT').count, 1)
  assert.equal(rows.find(row => row.status === 'APPROUVE').count, 0)
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 3)
})
test('unknown project states are counted rather than silently discarded', () => {
  assert.equal(projectStatusCounts([{ statut: 'FUTURE' }]).find(row => row.status === 'FUTURE').count, 1)
})
test('top five excludes drafts and cancelled activities and breaks ties by numeric ID', () => {
  const rows = [9, 7, 10, 2, 5, 1].map(id => ({ id, titre: `Activity ${id}`, statut: id % 2 ? 'PUBLIEE' : 'TERMINEE', nombreInscrits: 4 }))
  const data = [...rows, { id: 11, statut: 'BROUILLON', nombreInscrits: 99 }, { id: 12, statut: 'ANNULEE', nombreInscrits: 100 }]
  assert.deepEqual(topActivityRegistrations(data).map(row => row.id), [1, 2, 5, 7, 9])
  assert.deepEqual(topActivityRegistrations([...data].reverse()), topActivityRegistrations(data))
  rows[2].nombreInscrits = 20
  assert.equal(topActivityRegistrations(rows)[0].id, 10)
})
test('unknown, empty and genuine zero are distinct', () => {
  assert.equal(projectStatusCounts(null), null)
  assert.deepEqual(projectStatusCounts([]), [])
  assert.equal(topActivityRegistrations(null), null)
  assert.deepEqual(topActivityRegistrations([]), [])
  assert.deepEqual(topActivityRegistrations([{ statut: 'BROUILLON' }]), [])
  assert.equal(topActivityRegistrations([{ id: 1, statut: 'PUBLIEE', nombreInscrits: 0 }])[0].count, 0)
  assert.equal(topActivityRegistrations([{ id: 1, statut: 'PUBLIEE' }]), null)
})
