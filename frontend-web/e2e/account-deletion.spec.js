import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`

async function authenticate(page) {
  await page.addInitScript(({ sessionToken }) => {
    window.localStorage.setItem('bxconnect_lang', 'fr')
    window.localStorage.setItem('token', sessionToken)
    window.localStorage.setItem('user', JSON.stringify({
      id: 1, prenom: 'Amina', nom: 'Test', email: 'amina@example.org', role: 'MEMBRE',
    }))
  }, { sessionToken: token })
}

function profileResponse() {
  return {
    id: 1, prenom: 'Amina', nom: 'Test', email: 'amina@example.org', role: 'MEMBRE',
    languePreference: 'FR', actif: true, dateInscription: '2025-01-01T12:00:00',
  }
}

test('requires confirmation, then deletes the account and signs out', async ({ page }) => {
  await authenticate(page)
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/users/me') && route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profileResponse()) })
      return
    }
    if (path.endsWith('/users/me') && route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto('/profil')
  const deleteButton = page.getByRole('button', { name: 'Demander la suppression' })
  await expect(page.getByRole('heading', { name: 'Supprimer mon compte' })).toBeVisible()
  await expect(deleteButton).toBeDisabled()
  await page.getByLabel(/Je comprends que mon compte/).check()
  await expect(deleteButton).toBeEnabled()
  await deleteButton.click()
  await expect(page).toHaveURL('/')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull()
})

test('shows a translated error and keeps the session when deletion fails', async ({ page }) => {
  await authenticate(page)
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/users/me') && route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profileResponse()) })
      return
    }
    if (path.endsWith('/users/me') && route.request().method() === 'DELETE') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto('/profil')
  await page.getByLabel(/Je comprends que mon compte/).check()
  await page.getByRole('button', { name: 'Demander la suppression' }).click()
  await expect(page.getByRole('alert')).toContainText('La demande de suppression n’a pas pu être envoyée')
  await expect(page).toHaveURL('/profil')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).not.toBeNull()
})
