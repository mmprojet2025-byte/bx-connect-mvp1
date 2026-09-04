import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./Register.jsx', import.meta.url), 'utf8')

test('registration renders a required native date field', () => {
  assert.match(source, /id="register-birthdate"/)
  assert.match(source, /type="date"/)
  assert.match(source, /required/)
})

test('registration sends dateNaissance in the shared payload', () => {
  assert.match(source, /dateNaissance:\s*form\.dateNaissance/)
  assert.match(source, /legalVersion:\s*LEGAL_VERSION/)
})

test('registration validates exact minimum and maximum ages', () => {
  assert.match(source, /age < 16/)
  assert.match(source, /shiftYears\(today, -120\)/)
})
