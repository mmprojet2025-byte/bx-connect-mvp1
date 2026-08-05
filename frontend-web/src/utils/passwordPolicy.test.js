import test from 'node:test'
import assert from 'node:assert/strict'
import { getResetPasswordChecks, isValidResetPassword } from './passwordPolicy.js'

test('accepts a password matching every reset requirement', () => {
  assert.equal(isValidResetPassword('NewSecure123!'), true)
  assert.deepEqual(getResetPasswordChecks('NewSecure123!'), [true, true, true, true, true])
})

test('rejects missing length, case, digit, and special character requirements', () => {
  assert.equal(isValidResetPassword('short'), false)
  assert.equal(isValidResetPassword('alllowercase123!'), false)
  assert.equal(isValidResetPassword('ALLUPPERCASE123!'), false)
  assert.equal(isValidResetPassword('NoDigitsHere!'), false)
  assert.equal(isValidResetPassword('NoSpecial1234'), false)
})

test('rejects passwords longer than the backend maximum', () => {
  assert.equal(isValidResetPassword(`Aa1!${'x'.repeat(125)}`), false)
})
