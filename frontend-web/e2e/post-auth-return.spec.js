import { test, expect } from '@playwright/test'

const activity = {
  id: 42,
  titre: 'Atelier public',
  description: 'Une activité ouverte.',
  statut: 'PUBLIEE',
  peutSInscrire: true,
  dateDebut: '2027-01-15T10:00:00Z',
}

const group = {
  id: 7,
  nom: 'Groupe public',
  description: 'Un groupe public.',
  categorie: 'Culture',
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/api/auth/login') {
      await route.fulfill({ json: { token: 'test-token', prenom: 'Test', nom: 'Member', email: 'member@example.test', role: 'MEMBRE' } })
      return
    }
    if (pathname === '/api/activites/42') {
      await route.fulfill({ json: activity })
      return
    }
    if (pathname === '/api/groupes') {
      await route.fulfill({ json: [group] })
      return
    }
    await route.fulfill({ json: [] })
  })
}

async function signIn(page) {
  await page.locator('#login-email').fill('member@example.test')
  await page.locator('#login-password').fill('Password1')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('bxconnect_lang', 'fr'))
  await mockApi(page)
})

test('revient à l’activité après connexion depuis une inscription visiteur', async ({ page }) => {
  await page.goto('/activites/42?source=public')
  await page.getByRole('button', { name: /connectez-vous/i }).click()
  await expect(page).toHaveURL('/login')

  await signIn(page)

  await expect(page).toHaveURL('/activites/42?source=public')
  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
})

test('revient à la fiche groupe après connexion depuis une demande d’adhésion visiteur', async ({ page }) => {
  await page.goto('/groupes/7?tab=infos')
  await page.locator('a[href="/login"]').first().click()
  await expect(page).toHaveURL('/login')

  await signIn(page)

  await expect(page).toHaveURL('/groupes/7?tab=infos')
  await expect(page.getByRole('heading', { name: 'Groupe public', exact: true })).toBeVisible()
})

test('une connexion directe conserve la destination normale du rôle', async ({ page }) => {
  await page.goto('/login')

  await signIn(page)

  await expect(page).toHaveURL('/dashboard')
})
