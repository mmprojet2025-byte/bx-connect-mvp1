import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`
const activity = {
  id: 42, titre: 'Atelier visibilité', description: 'Description atelier',
  statut: 'BROUILLON', visibilite: 'PUBLIC', gratuite: true, capaciteMax: 10,
  nombreInscrits: 0, dateCreation: '2026-10-01T10:00:00',
  dateDebut: '2099-01-15T10:00:00', dateFin: '2099-01-15T12:00:00',
}

async function session(page, role) {
  await page.addInitScript(({ role, token }) => {
    localStorage.setItem('bxconnect_lang', 'fr')
    if (role) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.org', prenom: 'Test', role }))
    }
  }, { role, token })
}

async function managementApi(page, initial = activity, failOnce = false) {
  let current = { ...initial }
  const patches = []
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/users/me') return route.fulfill({ json: { id: 1, role: 'REFERENT', actif: true } })
    if (url.pathname === '/api/referent/groupes') return route.fulfill({ json: [{ id: 5, nom: 'Sport', referentId: 1, actif: true, statut: 'VALIDE' }] })
    if (url.pathname.endsWith('/42/statut')) {
      patches.push(Object.fromEntries(url.searchParams))
      if (failOnce && patches.length === 1) return route.fulfill({ status: 400, json: {} })
      current = { ...current, statut: url.searchParams.get('statut'), visibilite: url.searchParams.get('visibilite') || current.visibilite }
      return route.fulfill({ json: current })
    }
    if (['/api/referent/mes-activites', '/api/activites/admin/toutes'].includes(url.pathname)) {
      return route.fulfill({ json: [current] })
    }
    return route.fulfill({ json: [] })
  })
  return patches
}

for (const [label, value, summary] of [
  ['Tout le monde', 'PUBLIC', 'Cette activité du groupe Sport sera visible par tout le monde.'],
  ['Réservée aux membres du groupe', 'PRIVE_GROUPE', 'Cette activité sera réservée aux membres acceptés du groupe Sport.'],
]) {
  test(`REFERENT publie avec l’audience enregistrée ${value}`, async ({ page }) => {
    await session(page, 'REFERENT')
    const patches = await managementApi(page, { ...activity, groupeId: 5, groupeNom: 'Sport', referentAssigneId: 1, visibilite: value })
    await page.goto('/referent/activites')
    await page.getByRole('button', { name: 'Publier', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(summary)).toBeVisible()
    await expect(dialog.getByRole('radio')).toHaveCount(0)
    await expect(dialog.getByRole('combobox')).toHaveCount(0)
    expect(patches).toHaveLength(0)
    await dialog.getByRole('button', { name: 'Publier', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(patches).toEqual([{ statut: 'PUBLIEE', visibilite: value }])
    await expect(page.getByText(`Visibilité: ${label}`, { exact: true })).toBeVisible()
  })
}

test('un échec de publication conserve le brouillon et permet de réessayer', async ({ page }) => {
  await session(page, 'REFERENT')
  const patches = await managementApi(page, activity, true)
  await page.goto('/referent/activites')
  await page.getByRole('button', { name: 'Publier', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Publier', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByRole('button', { name: 'Publier', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(patches).toHaveLength(2)
})

for (const [label, status] of [['Terminer', 'TERMINEE'], ['Annuler l’activité', 'ANNULEE']]) {
  test(`REFERENT peut ${label.toLowerCase()} sans changer la visibilité`, async ({ page }) => {
    await session(page, 'REFERENT')
    const patches = await managementApi(page, { ...activity, statut: 'PUBLIEE', visibilite: 'MEMBRES' })
    page.on('dialog', dialog => dialog.accept())
    await page.goto('/referent/activites')
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0)
    expect(patches).toEqual([{ statut: status }])
    await expect(page.getByText('Visibilité: Utilisateurs connectés', { exact: true })).toBeVisible()
  })
}

async function readingApi(page, role) {
  const publicActivity = { ...activity, statut: 'PUBLIEE', titre: 'Atelier public', peutSInscrire: true }
  const membersActivity = { ...publicActivity, id: 43, titre: 'Atelier connecté', visibilite: 'MEMBRES' }
  const registrations = []
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    const authenticated = Boolean(route.request().headers().authorization)
    const enrich = a => ({ ...a, peutSInscrire: !authenticated || role === 'MEMBRE', raisonIndisponible: authenticated && role !== 'MEMBRE' ? 'ROLE_NON_MEMBRE' : null })
    if (path === '/api/activites') return route.fulfill({ json: (authenticated ? [publicActivity, membersActivity] : [publicActivity]).map(enrich) })
    if (path === '/api/activites/options-filtres') return route.fulfill({ json: { categories: [], themes: [], lieux: [] } })
    if (path === '/api/activites/42') return route.fulfill({ json: enrich(publicActivity) })
    if (path === '/api/activites/43') return authenticated
      ? route.fulfill({ json: enrich(membersActivity) })
      : route.fulfill({ status: 404, json: {} })
    if (path === '/api/inscriptions' && route.request().method() === 'POST') {
      registrations.push(route.request().postDataJSON())
      return route.fulfill({ status: 201, json: { id: 1, statut: 'CONFIRMEE' } })
    }
    return route.fulfill({ json: [] })
  })
  return registrations
}

test('visiteur : catalogue public, détail public et invitation à se connecter', async ({ page }) => {
  await session(page)
  const registrations = await readingApi(page)
  await page.goto('/activites')
  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
  await expect(page.getByText('Atelier connecté')).toHaveCount(0)
  await page.goto('/activites/42')
  await expect(page.getByRole('heading', { name: 'Atelier public', exact: true })).toBeVisible()
  await page.getByRole('button', { name: "Se connecter pour s'inscrire", exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(registrations).toHaveLength(0)
  await page.goto('/activites/43')
  await expect(page.getByRole('heading', { name: 'Activité introuvable.' })).toBeVisible()
  await expect(page.getByText('Atelier connecté')).toHaveCount(0)
})

for (const role of ['MEMBRE', 'REFERENT', 'ADMIN', 'PARTENAIRE', 'SUPER_ADMIN']) {
  test(`${role} lit les activités connectées sans élargissement des droits d’inscription`, async ({ page }) => {
    await session(page, role)
    const registrations = await readingApi(page, role)
    await page.goto('/activites')
    await expect(page.getByRole('heading', { name: 'Atelier connecté', exact: true })).toBeVisible()
    await page.goto('/activites/43')
    await expect(page.getByRole('heading', { name: 'Atelier connecté', exact: true })).toBeVisible()
    const register = page.getByRole('button', { name: "S'inscrire à cette activité", exact: true })
    if (role === 'MEMBRE') {
      await register.click()
      await expect.poll(() => registrations.length).toBe(1)
      expect(registrations).toEqual([{ activiteId: 43 }])
    } else {
      await expect(register).toHaveCount(0)
      expect(registrations).toHaveLength(0)
    }
  })
}
