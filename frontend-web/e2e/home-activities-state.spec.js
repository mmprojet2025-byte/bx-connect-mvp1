import { test, expect } from '@playwright/test'

const activity = {
  id: 1,
  titre: 'Atelier public',
  categorie: 'Culture',
  statut: 'PUBLIEE',
  visibilite: 'PUBLIC',
  dateCreation: '2026-10-01T10:00:00',
  dateDebut: '2027-01-15T10:00:00Z',
  lieu: 'Bruxelles',
}

async function mockOtherHomeRequests(page) {
  await page.route('**/api/groupes', route => route.fulfill({ json: [] }))
  await page.route('**/api/projets', route => route.fulfill({ json: [] }))
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('bxconnect_lang', 'fr'))
  await mockOtherHomeRequests(page)
})

test('affiche le chargement des activités avant la réponse', async ({ page }) => {
  let respond
  const response = new Promise(resolve => { respond = resolve })
  await page.route('**/api/activites', async route => {
    await response
    await route.fulfill({ json: [activity] })
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const activitiesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Activités récentes', exact: true }),
  })
  await expect(activitiesSection.getByText('Chargement...', { exact: true })).toBeVisible()
  await expect(page.getByText('Aucune activité récente pour le moment.')).toHaveCount(0)

  respond()
  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
})

test('affiche les activités lorsque l’API répond avec du contenu', async ({ page }) => {
  await page.route('**/api/activites', route => route.fulfill({ json: [activity] }))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
  await expect(page.getByText('Aucune activité récente pour le moment.')).toHaveCount(0)
})

test('retient trois activités publiques triées par création puis identifiant décroissants', async ({ page }) => {
  const activities = [
    { ...activity, id: 9, titre: 'Ancienne', dateCreation: '2026-01-01T10:00:00' },
    { ...activity, id: 2, titre: 'Deuxième', dateCreation: '2026-10-02T10:00:00' },
    { ...activity, id: 10, titre: 'Privée', visibilite: 'MEMBRES', dateCreation: '2026-12-01T10:00:00' },
    { ...activity, id: 3, titre: 'Première', dateCreation: '2026-10-02T10:00:00' },
    { ...activity, id: 4, titre: 'Troisième', dateCreation: '2026-10-01T10:00:00' },
    { ...activity, id: 11, titre: 'Brouillon', statut: 'BROUILLON', dateCreation: '2026-12-01T10:00:00' },
  ]
  await page.route('**/api/activites', route => route.fulfill({ json: activities }))
  await page.goto('/')
  const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Activités récentes', exact: true }) })
  await expect(section.getByRole('heading', { level: 3 })).toHaveText(['Première', 'Deuxième', 'Troisième'])
  await expect(section.getByText('Privée', { exact: true })).toHaveCount(0)
  await expect(section.getByRole('link', { name: /Voir toutes les activités/ })).toBeVisible()
})

test('affiche un état vide lorsque l’API répond avec une liste vide', async ({ page }) => {
  await page.route('**/api/activites', route => route.fulfill({ json: [] }))

  await page.goto('/')

  await expect(page.getByText('Aucune activité récente pour le moment.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0)
})

test('affiche une erreur et recharge uniquement les activités après réessai', async ({ page }) => {
  let attempts = 0
  let allowSuccess = false
  await page.route('**/api/activites', route => {
    attempts += 1
    return allowSuccess
      ? route.fulfill({ json: [activity] })
      : route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
  })

  await page.goto('/')

  await expect(page.getByText('Impossible de charger les activités pour le moment.')).toBeVisible()
  await expect(page.getByText('Aucune activité récente pour le moment.')).toHaveCount(0)
  allowSuccess = true
  await page.getByRole('button', { name: 'Réessayer' }).click()

  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
  await expect.poll(() => attempts).toBeGreaterThan(1)
  await expect(page).toHaveURL(/\/$/)
})
