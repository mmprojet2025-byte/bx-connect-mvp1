import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`
// Deliberately use account-only responses: no PartenaireProfil is required.
const accounts = [
  { id: 11, prenom: 'Alice', nom: 'Dubois', email: 'alice@example.org', role: 'PARTENAIRE', actif: true },
  { id: 12, prenom: 'Boris', nom: 'Martin', email: 'boris@example.org', role: 'PARTENAIRE', actif: false },
  { id: 13, prenom: 'Claire', nom: 'Membre', email: 'membre@example.org', role: 'MEMBRE', actif: true },
  { id: 14, prenom: 'David', nom: 'Referent', email: 'referent@example.org', role: 'REFERENT', actif: false },
]

async function setup(page, { role = 'ADMIN', lang = 'fr', users = accounts, failLoad = false, failToggle = false } = {}) {
  const requests = []
  const state = { failLoad, users: structuredClone(users) }
  await page.addInitScript(({ token, role, lang }) => {
    localStorage.setItem('bxconnect_lang', lang)
    if (role) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify({ id: 1, prenom: 'Test', email: 'admin@example.org', role }))
    }
  }, { token, role, lang })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push({ method: request.method(), path: url.pathname })
    if (url.pathname === '/api/admin/utilisateurs') {
      return state.failLoad
        ? route.fulfill({ status: 400, json: {} })
        : route.fulfill({ json: state.users })
    }
    const match = url.pathname.match(/^\/api\/admin\/utilisateurs\/(\d+)\/(actif|role)$/)
    if (match && request.method() === 'PATCH') {
      if (failToggle) return route.fulfill({ status: 400, json: {} })
      const user = state.users.find(user => user.id === Number(match[1]))
      if (match[2] === 'actif') user.actif = !user.actif
      else user.role = url.searchParams.get('role')
      return route.fulfill({ json: user })
    }
    return route.fulfill({ json: [] })
  })
  return { requests, state }
}

const row = (page, email) => page.getByRole('row').filter({ hasText: email })
const search = page => page.getByRole('textbox', { name: /Rechercher un partenaire/ })

test('ADMIN sees only partner accounts, including accounts without an organization profile', async ({ page }) => {
  const { requests } = await setup(page)
  await page.goto('/admin/partenaires')
  await expect(page.getByRole('heading', { name: 'Partenaires', exact: true })).toBeVisible()
  await expect(page.getByText('2 compte(s) partenaire(s)', { exact: true })).toBeVisible()
  await expect(row(page, 'alice@example.org')).toContainText('Alice Dubois')
  await expect(row(page, 'boris@example.org')).toContainText('Boris Martin')
  for (const email of ['membre@example.org', 'referent@example.org']) {
    await expect(page.getByText(email, { exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('combobox', { name: 'Changer le rôle' })).toHaveCount(0)
  for (const role of ['Membre', 'Référent', 'Partenaire']) {
    await expect(page.getByRole('button', { name: role, exact: true })).toHaveCount(0)
  }
  expect(requests.some(request => request.path === '/api/admin/utilisateurs')).toBe(true)
  expect(requests.some(request => /\/api\/(partenaire|annonces|paiement|prestations)/.test(request.path))).toBe(false)
})

test('search matches first name, last name and email, and status filters stay inside the partner scope', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/partenaires')
  for (const value of ['ALICE', 'Dubois', 'alice@example.org']) {
    await search(page).fill(value)
    await expect(row(page, 'alice@example.org')).toBeVisible()
    await expect(row(page, 'boris@example.org')).toHaveCount(0)
  }
  await search(page).fill('membre@example.org')
  await expect(page.getByText('Aucun résultat trouvé.', { exact: true })).toBeVisible()
  await search(page).fill('')
  await page.getByRole('button', { name: 'Actifs', exact: true }).click()
  await expect(row(page, 'alice@example.org')).toBeVisible()
  await expect(row(page, 'boris@example.org')).toHaveCount(0)
  await page.getByRole('button', { name: 'Inactifs', exact: true }).click()
  await expect(row(page, 'boris@example.org')).toBeVisible()
  await expect(row(page, 'alice@example.org')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tous', exact: true }).click()
  await expect(page.getByRole('row')).toHaveCount(3)
})

test('activation uses the existing confirmation and endpoint, including cancellation', async ({ page }) => {
  const { requests } = await setup(page)
  await page.goto('/admin/partenaires')
  page.once('dialog', dialog => dialog.dismiss())
  await row(page, 'alice@example.org').getByRole('button', { name: 'Désactiver' }).click()
  expect(requests.filter(request => request.method === 'PATCH')).toHaveLength(0)
  page.on('dialog', dialog => dialog.accept())
  await row(page, 'alice@example.org').getByRole('button', { name: 'Désactiver' }).click()
  await expect(row(page, 'alice@example.org').getByRole('button', { name: 'Activer', exact: true })).toBeVisible()
  await row(page, 'alice@example.org').getByRole('button', { name: 'Activer', exact: true }).click()
  await expect(row(page, 'alice@example.org').getByRole('button', { name: 'Désactiver' })).toBeVisible()
  expect(requests.filter(request => request.method === 'PATCH')).toEqual([
    { method: 'PATCH', path: '/api/admin/utilisateurs/11/actif' },
    { method: 'PATCH', path: '/api/admin/utilisateurs/11/actif' },
  ])
})

test('failed activation keeps the original state and shows the existing error', async ({ page }) => {
  await setup(page, { failToggle: true })
  await page.goto('/admin/partenaires')
  page.on('dialog', dialog => dialog.accept())
  await row(page, 'alice@example.org').getByRole('button', { name: 'Désactiver' }).click()
  await expect(page.getByText('Impossible de modifier le statut.', { exact: true })).toBeVisible()
  await expect(row(page, 'alice@example.org').getByRole('button', { name: 'Désactiver' })).toBeVisible()
})

test('Users keeps all roles and role editing; sidebar navigation resets the view', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/utilisateurs')
  await expect(page.getByRole('heading', { name: 'Utilisateurs', exact: true })).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(5)
  await page.getByRole('button', { name: 'Membre', exact: true }).click()
  await expect(row(page, 'membre@example.org')).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  await row(page, 'membre@example.org').getByRole('combobox').selectOption('PARTENAIRE')
  await expect(row(page, 'membre@example.org')).toHaveCount(0)
  await page.locator('a[href="/admin/partenaires"]:visible').click()
  await expect(page).toHaveURL(/\/admin\/partenaires$/)
  await expect(page.getByText('3 compte(s) partenaire(s)', { exact: true })).toBeVisible()
  await search(page).fill('Alice')
  await page.locator('a[href="/admin/utilisateurs"]:visible').click()
  await expect(page.getByRole('row')).toHaveCount(5)
  await expect(page.getByText('4 utilisateur(s) enregistré(s)', { exact: true })).toBeVisible()
  for (const href of ['/admin/groupes', '/admin/projets', '/admin/soutiens']) {
    await expect(page.locator(`a[href="${href}"]:visible`).first()).toBeVisible()
  }
})

for (const [role, destination] of [[null, '/login'], ['MEMBRE', '/dashboard'], ['REFERENT', '/referent/dashboard'], ['PARTENAIRE', '/partenaire'], ['SUPER_ADMIN', '/super-admin/dashboard']]) {
  test(`partner administration is unavailable to ${role || 'visitors'}`, async ({ page }) => {
    const { requests } = await setup(page, { role })
    await page.goto('/admin/partenaires')
    await expect(page).toHaveURL(new RegExp(`${destination}$`))
    expect(requests.some(request => request.path === '/api/admin/utilisateurs')).toBe(false)
  })
}

for (const [lang, title, empty, loading, error] of [
  ['fr', 'Partenaires', 'Aucun compte partenaire enregistré.', 'Chargement des partenaires...', 'Impossible de charger les comptes partenaires.'],
  ['nl', 'Partners', 'Geen partneraccounts geregistreerd.', 'Partners laden...', 'De partneraccounts konden niet worden geladen.'],
  ['en', 'Partners', 'No partner accounts registered.', 'Loading partners...', 'Unable to load partner accounts.'],
]) {
  test(`${lang}: localized loading, error, retry and empty partner state`, async ({ page }) => {
    const { state } = await setup(page, { lang, users: accounts.filter(user => user.role !== 'PARTENAIRE'), failLoad: true })
    let release
    const pending = new Promise(resolve => { release = resolve })
    await page.route('**/api/admin/utilisateurs', async route => {
      await pending
      await route.fallback()
    })
    await page.goto('/admin/partenaires')
    await expect(page.getByText(loading, { exact: true })).toBeVisible()
    release()
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.getByText(error, { exact: true })).toBeVisible()
    state.failLoad = false
    await page.getByRole('button', { name: /Réessayer|Opnieuw proberen|Retry/ }).click()
    await expect(page.getByText(empty, { exact: true })).toBeVisible()
    await expect(page.getByText(error, { exact: true })).toHaveCount(0)
    await expect(page.getByText('membre@example.org', { exact: true })).toHaveCount(0)
  })
}

test('compact Web layout uses the same partner scope and activation action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  await page.goto('/admin/partenaires')
  const card = page.getByRole('article').filter({ hasText: 'alice@example.org' })
  await expect(card).toContainText('Alice Dubois')
  await expect(page.getByText('membre@example.org', { exact: true })).toHaveCount(0)
  page.on('dialog', dialog => dialog.accept())
  await card.getByRole('button', { name: 'Désactiver' }).click()
  await expect(card.getByRole('button', { name: 'Activer', exact: true })).toBeVisible()
})

test('advanced modules remain inaccessible even by direct ADMIN URL', async ({ page }) => {
  await setup(page)
  for (const path of [
    '/admin/partenaires/affectations', '/referent/partenaires', '/referent/impact', '/referent/rapports',
    '/impact', '/prestations', '/referent/prestations', '/admin/prestations', '/paiement/test',
  ]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
  }
})
