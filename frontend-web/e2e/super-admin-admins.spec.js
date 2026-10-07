import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`
const identity = { prenom: 'Anne', nom: 'Martin', email: 'admin@example.org' }

// Exercise the real creation form without creating accounts on a live backend.
async function setup(page, { rejectCreation = false } = {}) {
  const writes = []
  await page.addInitScript(token => {
    localStorage.setItem('bxconnect_lang', 'fr')
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({
      id: 1, prenom: 'Super', email: 'super@example.org', role: 'SUPER_ADMIN',
    }))
  }, token)
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    if (new URL(request.url()).pathname === '/api/super-admin/admins' && request.method() === 'POST') {
      writes.push(request.postDataJSON())
      if (rejectCreation) {
        return route.fulfill({ status: 400, json: { fields: { motDePasseTemporaire: 'size must be at least 8' } } })
      }
      return route.fulfill({ status: 201, json: {
        id: 2, ...identity, actif: true, dateInscription: '2026-10-05T12:00:00',
      } })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/super-admin/admins')
  const submit = page.getByRole('button', { name: 'Créer ADMIN', exact: true })
  await expect(submit).toBeVisible()
  const form = page.locator('form').filter({ has: submit })
  return {
    writes, form, submit,
    password: form.getByLabel('Mot de passe temporaire', { exact: true }),
    confirmation: form.getByLabel('Confirmer le mot de passe temporaire', { exact: true }),
  }
}

async function fillIdentity(form) {
  await form.getByLabel('Prénom', { exact: true }).fill(identity.prenom)
  await form.getByLabel('Nom', { exact: true }).fill(identity.nom)
  await form.getByLabel('Email', { exact: true }).fill(identity.email)
}

test('both password fields are required, initially masked and independently revealable', async ({ page }) => {
  const { form, password, confirmation, writes } = await setup(page)
  for (const field of [password, confirmation]) {
    await expect(field).toBeVisible()
    await expect(field).toHaveAttribute('type', 'password')
    await expect(field).toHaveAttribute('autocomplete', 'new-password')
    await expect(field).toHaveAttribute('required', '')
    await field.fill('test1234')
  }
  for (const [field, other] of [[password, confirmation], [confirmation, password]]) {
    const toggle = form.locator(`button[aria-controls="${await field.getAttribute('id')}"]`)
    await expect(toggle).toHaveAccessibleName('Afficher le mot de passe')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(field).toHaveAttribute('type', 'text')
    await expect(other).toHaveAttribute('type', 'password')
    await expect(toggle).toHaveAccessibleName('Masquer le mot de passe')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await toggle.click()
    await expect(field).toHaveAttribute('type', 'password')
    await expect(field).toHaveValue('test1234')
  }
  expect(writes).toHaveLength(0)
})

test('different confirmation blocks creation with a French error', async ({ page }) => {
  const { form, password, confirmation, submit, writes } = await setup(page)
  await fillIdentity(form)
  await password.fill('test1234')
  await confirmation.fill('test1235')
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('Les mots de passe ne correspondent pas.')
  expect(writes).toHaveLength(0)
  await confirmation.fill('test1234')
  await submit.click()
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(writes).toHaveLength(1)
})

test('empty confirmation blocks creation', async ({ page }) => {
  const { form, password, confirmation, submit, writes } = await setup(page)
  await fillIdentity(form)
  await password.fill('test1234')
  await submit.click()
  expect(await confirmation.evaluate(input => input.validity.valueMissing)).toBe(true)
  expect(writes).toHaveLength(0)
})

for (const [description, value] of [['short', '1234567'], ['blank', '        ']]) {
  test(`${description} password is rejected even when confirmation matches`, async ({ page }) => {
    const { form, password, confirmation, submit, writes } = await setup(page)
    await fillIdentity(form)
    await password.fill(value)
    await confirmation.fill(value)
    await submit.click()
    await expect(page.getByRole('alert')).toHaveText('Le mot de passe temporaire doit contenir au moins 8 caractères.')
    expect(writes).toHaveLength(0)
  })
}

for (const value of ['abcdefgh', ' test1234 ']) {
  test(`valid matching password preserves the existing API contract (length ${value.length})`, async ({ page }) => {
    const { form, password, confirmation, submit, writes } = await setup(page)
    await fillIdentity(form)
    await password.fill(value)
    await confirmation.fill(value)
    for (const field of [password, confirmation]) {
      await form.locator(`button[aria-controls="${await field.getAttribute('id')}"]`).click()
    }
    await submit.click()
    await expect(page.getByRole('status')).toBeVisible()
    expect(writes).toEqual([{ ...identity, motDePasseTemporaire: value }])
    await expect(page.getByRole('row').filter({ hasText: identity.email })).toBeVisible()
    for (const field of [password, confirmation]) {
      await expect(field).toHaveValue('')
      await expect(field).toHaveAttribute('type', 'password')
    }
    await expect(form.getByLabel('Email', { exact: true })).toHaveValue('')
    await expect(submit).toBeEnabled()
  })
}

test('backend validation errors remain visible and allow retry', async ({ page }) => {
  const { form, password, confirmation, submit, writes } = await setup(page, { rejectCreation: true })
  await fillIdentity(form)
  await password.fill('test1234')
  await confirmation.fill('test1234')
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('Le mot de passe temporaire doit contenir au moins 8 caractères.')
  expect(writes).toHaveLength(1)
  await expect(password).toHaveValue('test1234')
  await expect(confirmation).toHaveValue('test1234')
  await expect(submit).toBeEnabled()
  await expect(page.getByRole('status')).toHaveCount(0)
})
