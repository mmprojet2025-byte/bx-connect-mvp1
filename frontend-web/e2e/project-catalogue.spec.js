import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const states = ['BROUILLON', 'SOUMIS', 'VALIDE_REFERENT', 'A_CORRIGER_ADMIN', 'REJETE', 'APPROUVE', 'EN_COURS', 'TERMINE']
const projects = ['GROUPE', 'PUBLIC'].flatMap((visibilite, i) => states.map((statut, j) => ({ id: i * 10 + j, titre: `${visibilite} ${statut}`, statut, visibilite, prixParticipation: 0 })))
for (const role of [null, 'MEMBRE', 'REFERENT', 'ADMIN']) {
  test(`catalogue excludes projects awaiting approval for ${role || 'visitor'}`, async ({ page }) => {
    await page.addInitScript(({ token, role }) => {
      localStorage.setItem('bxconnect_lang', 'fr')
      if (role) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify({ id: 1, role, prenom: 'Alice' }))
      }
    }, { token, role })
    const catalogueRequests = []
    await page.route(url => url.pathname.startsWith('/api/'), route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/projets') { catalogueRequests.push(url.searchParams.get('catalogue')); return route.fulfill({ json: projects }) }
      if (url.pathname === '/api/projets/mes-projets') return route.fulfill({ json: projects.slice(0, 3) })
      return route.fulfill({ json: url.pathname.endsWith('/count') ? { nonLues: 0 } : [] })
    })
    await page.goto('/projets')
    await expect(page.locator('article')).toHaveCount(6)
    expect(catalogueRequests).toContain('true')
    for (const type of ['GROUPE', 'PUBLIC']) {
      for (const state of states.slice(0, 5)) await expect(page.getByRole('heading', { name: `${type} ${state}`, exact: true })).toHaveCount(0)
      for (const state of states.slice(5)) await expect(page.getByRole('heading', { name: `${type} ${state}`, exact: true })).toBeVisible()
    }
    if (role) {
      await page.getByRole('button', { name: 'Mes projets', exact: true }).click()
      await expect(page.locator('article')).toHaveCount(3)
      await expect(page.getByRole('heading', { name: 'GROUPE BROUILLON', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'GROUPE VALIDE_REFERENT', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Catalogue', exact: true }).click()
      await expect(page.locator('article')).toHaveCount(6)
    }
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'GROUPE APPROUVE', exact: true })).toBeVisible()
    for (const state of states.slice(0, 5)) await expect(page.getByRole('heading', { name: `GROUPE ${state}`, exact: true })).toHaveCount(0)
  })
}

test('visitor can view public project details without accessing private discussion', async ({ page }) => {
  const requests = []
  await page.addInitScript(() => localStorage.setItem('bxconnect_lang', 'fr'))
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const url = new URL(route.request().url()); requests.push(url.pathname)
    return route.fulfill({ json: url.pathname === '/api/projets' ? [{ id: 50, titre: 'Projet visible', statut: 'APPROUVE', visibilite: 'GROUPE', description: 'Description complète du projet.', objectifs: 'Objectifs à découvrir.', prixParticipation: 5 }] : [] })
  })
  await page.goto('/projets')
  const card = page.locator('article').first()
  await expect(card.getByRole('link', { name: 'Participer', exact: true })).toHaveAttribute('href', '/login')
  await card.getByRole('button', { name: 'Voir', exact: true }).click()
  const details = card.getByRole('region', { name: 'Détails', exact: true })
  await expect(details).toContainText('Description complète du projet.')
  await expect(details).toContainText('Objectifs à découvrir.')
  expect(requests.some(path => path.endsWith('/commentaires'))).toBe(false)
  await card.getByRole('button', { name: 'Fermer', exact: true }).click()
  await expect(details).toHaveCount(0)
})
