import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectDetailsForm, projectDetailsPayload, projectFull, projectRegistrationClosed } from './projectDetails.js'

test('legacy projects remain unlimited without invented dates or images', () => {
  assert.deepEqual(projectDetailsPayload(projectDetailsForm()), { capacite: null, dateExecution: null, dateLimiteParticipation: null, imageUrl: null })
  assert.equal(projectFull({ nombreParticipants: 20 }), false)
  assert.equal(projectRegistrationClosed({}), false)
})
test('details survive editing and serialize capacity as a number', () => {
  const data = { capacite: 12, dateExecution: '2030-05-05', dateLimiteParticipation: '2030-05-04', imageUrl: '/cover.png' }
  assert.deepEqual(projectDetailsPayload({ ...projectDetailsForm(data), capacite: '12' }), data)
  assert.equal(projectFull({ capacite: 12, nombreParticipants: 12 }), true)
  assert.equal(projectFull({ capacite: 12, nombreParticipants: 11 }), false)
})
test('deadline is inclusive in Brussels, not based on the browser timezone', () => {
  const project = { dateLimiteParticipation: '2030-05-04' }
  assert.equal(projectRegistrationClosed(project, new Date('2030-05-04T21:59:00Z')), false)
  assert.equal(projectRegistrationClosed(project, new Date('2030-05-04T22:00:00Z')), true)
  assert.equal(projectRegistrationClosed({ dateExecution: '2030-05-04' }, new Date('2030-05-05T10:00:00Z')), true)
})
