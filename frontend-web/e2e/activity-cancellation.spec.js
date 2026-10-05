import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

async function session(page, role) {
  const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
  await page.addInitScript(({ role, token }) => {
    localStorage.setItem('bxconnect_lang', 'fr')
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, role, prenom: 'Test', email: 'test@example.org' }))
  }, { role, token })
}

for (const cancelled of [true, false]) {
  test(`dashboard : activité ${cancelled ? 'annulée conservée sans priorité imminente' : 'confirmée toujours imminente'}`, async ({ page }) => {
    await session(page, 'MEMBRE')
    const inscription = {
      id: 1, activiteId: 42, activiteTitre: 'Atelier du membre',
      activiteDateDebut: new Date(Date.now() + 86400000).toISOString(),
      statut: cancelled ? 'ANNULEE' : 'CONFIRMEE',
      activiteStatut: cancelled ? 'ANNULEE' : 'PUBLIEE',
    }
    await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({
      json: new URL(route.request().url()).pathname === '/api/membre/dashboard'
        ? { inscriptions: [inscription], projets: [], notifications: [] } : [],
    }))
    await page.goto('/dashboard')
    const row = page.getByRole('listitem').filter({ hasText: 'Atelier du membre' })
    await expect(row).toBeVisible()
    if (cancelled) {
      await expect(row.getByText('Activité annulée', { exact: true })).toBeVisible()
      await expect(page.getByText('Activité imminente', { exact: true })).toHaveCount(0)
      await expect(row.getByText('Confirmée', { exact: true })).toHaveCount(0)
    } else {
      await expect(page.getByText('Activité imminente', { exact: true })).toBeVisible()
      await expect(row.getByText('Confirmée', { exact: true })).toBeVisible()
    }
  })
}

test('REFERENT : capacité accessible sans ouvrir les paramètres avancés', async ({ page }) => {
  await session(page, 'REFERENT')
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ json: [] }))
  await page.goto('/referent/activites')
  await page.getByRole('button', { name: 'Nouvelle activité', exact: true }).click()
  const capacity = page.getByRole('spinbutton', { name: /Capacité/ })
  await expect(capacity).toBeVisible()
  await expect(capacity).toHaveCount(1)
  await expect(capacity).toHaveAttribute('min', '1')
  expect(await capacity.evaluate(input => input.closest('details') === null)).toBe(true)
  await capacity.fill('12')
  await expect(capacity).toHaveValue('12')
})
