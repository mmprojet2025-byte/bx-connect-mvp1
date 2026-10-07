import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const translations = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url)))]))

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
  await page.route(url => ['/api/groupes', '/api/projets'].includes(url.pathname), route => route.fulfill({ json: [] }))
}

test.beforeEach(async ({ page }, testInfo) => {
  const lang = testInfo.title.match(/^(fr|nl|en):/)?.[1] || 'fr'
  await page.addInitScript(lang => window.localStorage.setItem('bxconnect_lang', lang), lang)
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00Z'))
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
    has: page.getByRole('heading', { name: 'Activités à venir', exact: true }),
  })
  await expect(activitiesSection.getByText('Chargement...', { exact: true })).toBeVisible()
  await expect(page.getByText('Aucune activité à venir pour le moment.')).toHaveCount(0)

  respond()
  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
})

test('affiche les activités lorsque l’API répond avec du contenu', async ({ page }) => {
  await page.route('**/api/activites', route => route.fulfill({ json: [activity] }))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
  await expect(page.getByText('Aucune activité à venir pour le moment.')).toHaveCount(0)
})

for (const lang of ['fr', 'nl', 'en']) test(`${lang}: retient trois prochaines activités publiques par début puis identifiant croissants`, async ({ page }) => {
  const t = translations[lang].home
  const activities = [
    { ...activity, id: 9, titre: 'Passée', dateDebut: '2026-10-07T11:00:00Z' },
    { ...activity, id: 4, titre: 'Troisième', dateDebut: '2026-10-09T10:00:00Z' },
    { ...activity, id: 3, titre: 'Deuxième', dateDebut: '2026-10-08T10:00:00Z', dateCreation: '2026-10-06T10:00:00Z' },
    { ...activity, id: 10, titre: 'Privée', visibilite: 'MEMBRES', dateDebut: '2026-10-08T09:00:00Z' },
    { ...activity, id: 2, titre: 'Première', dateDebut: '2026-10-08T10:00:00Z', dateCreation: '2026-01-01T10:00:00Z' },
    { ...activity, id: 11, titre: 'Brouillon', statut: 'BROUILLON', dateDebut: '2026-10-08T09:00:00Z' },
    { ...activity, id: 12, titre: 'Quatrième', dateDebut: '2026-10-10T10:00:00Z' },
    { ...activity, id: 13, titre: 'Sans date', dateDebut: null },
  ]
  await page.route('**/api/activites', route => route.fulfill({ json: activities }))
  await page.goto('/')
  const section = page.locator('section').filter({ has: page.getByRole('heading', { name: t.recentActivitiesTitle, exact: true }) })
  await expect(section.getByRole('heading', { level: 3 })).toHaveText(['Première', 'Deuxième', 'Troisième'])
  for (const title of ['Passée', 'Privée', 'Brouillon', 'Quatrième', 'Sans date']) {
    await expect(section.getByText(title, { exact: true })).toHaveCount(0)
  }
  await expect(section.getByRole('link', { name: t.viewAllActivities, exact: true })).toBeVisible()
})

test('affiche un état vide lorsque l’API répond avec une liste vide', async ({ page }) => {
  await page.route('**/api/activites', route => route.fulfill({ json: [] }))

  await page.goto('/')

  await expect(page.getByText('Aucune activité à venir pour le moment.')).toBeVisible()
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
  await expect(page.getByText('Aucune activité à venir pour le moment.')).toHaveCount(0)
  allowSuccess = true
  await page.getByRole('button', { name: 'Réessayer' }).click()

  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
  await expect.poll(() => attempts).toBeGreaterThan(1)
  await expect(page).toHaveURL(/\/$/)
})
