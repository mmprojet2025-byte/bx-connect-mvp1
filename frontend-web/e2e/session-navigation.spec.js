import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const jwt = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`
const token = jwt(4_102_444_800)
const member = { id: 1, prenom: 'Amina', nom: 'Test', email: 'amina@example.test', role: 'MEMBRE', languePreference: 'FR', actif: true }
const project = { id: 42, titre: 'Projet choisi', statut: 'APPROUVE', visibilite: 'PUBLIC', prixParticipation: 0, nombreParticipants: 0, capacite: 10 }
const activity = { id: 42, titre: 'Activité choisie', statut: 'PUBLIEE', visibilite: 'PUBLIC', dateDebut: '2099-01-10T10:00:00', peutSInscrire: true }

async function mockApi(page, { selectedProject = project, profileStatus = 200, deletion, notifications = [] } = {}) {
  const requests = []
  await page.addInitScript(() => localStorage.setItem('bxconnect_lang', 'fr'))
  // Les modules Vite /src/api/*.js ne sont jamais interceptés.
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    requests.push({ path, method: request.method() })
    if (path === '/api/auth/login' || path === '/api/auth/register') return route.fulfill({ json: { ...member, token } })
    if (path === '/api/users/me' && request.method() === 'DELETE') return deletion(route)
    if (path === '/api/users/me') return route.fulfill({ status: profileStatus, json: profileStatus === 200 ? member : {} })
    if (path === '/api/notifications/page') return route.fulfill({ json: { content: notifications, page: 0, size: 20, totalElements: notifications.length, totalPages: 1, last: true } })
    if (path === '/api/notifications/count') return route.fulfill({ json: { nonLues: 0 } })
    if (path === '/api/projets' || path === '/api/projets/42') return route.fulfill({ json: path.endsWith('/42') ? selectedProject : [selectedProject] })
    if (path === '/api/activites/42') return route.fulfill({ json: activity })
    if (path === '/api/projets/42/rejoindre') return route.fulfill({ json: {} })
    if (path === '/api/projets-paiements/projets/42/checkout') return route.fulfill({ json: { statut: 'EN_ATTENTE', checkoutUrl: 'https://checkout.stripe.com/c/pay/navigation-test' } })
    if (path === '/api/activites/options-filtres') return route.fulfill({ json: { categories: [], themes: [], lieux: [] } })
    if (request.method() !== 'GET') throw new Error(`Unexpected mutation: ${request.method()} ${path}`)
    return route.fulfill({ json: [] })
  })
  return requests
}

async function seedSessionOnce(page) {
  await page.goto('/a-propos')
  // Pas de réinjection au rechargement : F5 et l'historique doivent refléter la vraie session.
  await page.evaluate(({ token, member }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(member))
  }, { token, member })
}

async function expectSession(page, expectedToken) {
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(expectedToken)
  if (expectedToken === null) expect(await page.evaluate(() => localStorage.getItem('user'))).toBeNull()
}

async function signIn(page) {
  await page.locator('#login-email').fill(member.email)
  await page.locator('#login-password').fill('Test-password')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
}

for (let repetition = 1; repetition <= 3; repetition++) {
  test(`account deletion keeps home and anonymous session after F5 and history (${repetition}/3)`, async ({ page }) => {
    const response = Promise.withResolvers()
    const requests = await mockApi(page, { deletion: async route => {
      await response.promise
      return route.fulfill({ status: 204 })
    } })
    await seedSessionOnce(page)
    await page.goto('/profil')
    await page.getByLabel(/Je comprends que mon compte/).check()
    await page.getByRole('button', { name: 'Demander la suppression' }).click()
    await expect.poll(() => requests.filter(r => r.method === 'DELETE').length).toBe(1)
    await expectSession(page, token)
    await expect(page.locator('section[aria-labelledby="delete-account-title"]').getByRole('button')).toBeDisabled()
    response.resolve()
    await expect(page).toHaveURL('/')
    await expectSession(page, null)
    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(page.locator('main')).toBeVisible()
    await expectSession(page, null)
    await page.goBack()
    await expect(page).toHaveURL('/a-propos')
    await page.goForward()
    await expect(page).toHaveURL('/')
    await expectSession(page, null)
    await page.goto('/profil')
    await expect(page).toHaveURL('/login')
    expect(requests.filter(r => r.method === 'DELETE')).toHaveLength(1)
  })
}

test('failed deletion keeps the session and profile after reload', async ({ page }) => {
  const requests = await mockApi(page, { deletion: route => route.fulfill({ status: 500, json: {} }) })
  await seedSessionOnce(page)
  await page.goto('/profil')
  await page.getByLabel(/Je comprends que mon compte/).check()
  await page.getByRole('button', { name: 'Demander la suppression' }).click()
  await expect(page.getByRole('alert')).toContainText('La demande de suppression n’a pas pu être envoyée')
  await expect(page).toHaveURL('/profil')
  await expectSession(page, token)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Supprimer mon compte' })).toBeVisible()
  await expectSession(page, token)
  expect(requests.filter(r => r.method === 'DELETE')).toHaveLength(1)
})

test('logout remains anonymous after reload and history navigation', async ({ page }) => {
  await mockApi(page)
  await seedSessionOnce(page)
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Supprimer mon compte' })).toBeVisible()
  await page.locator('nav').getByRole('link', { name: 'Accueil', exact: true }).click()
  await page.locator('nav').getByRole('button', { name: /Compte/ }).click()
  await page.getByRole('button', { name: 'Déconnexion', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expectSession(page, null)
  await page.reload()
  await expectSession(page, null)
  await page.goBack()
  await expect(page).toHaveURL('/login')
  await expectSession(page, null)
})

test('expired JWT is discarded on F5 before requesting the protected profile', async ({ page }) => {
  const requests = await mockApi(page)
  await seedSessionOnce(page)
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Supprimer mon compte' })).toBeVisible()
  const profileReads = requests.filter(r => r.path === '/api/users/me').length
  await page.evaluate(expired => localStorage.setItem('token', expired), jwt(1))
  await page.reload()
  await expect(page).toHaveURL('/login')
  await expectSession(page, null)
  expect(requests.filter(r => r.path === '/api/users/me')).toHaveLength(profileReads)
})

for (const status of [401, 403]) {
  test(`protected ${status} ${status === 401 ? 'ends' : 'preserves'} the session across F5`, async ({ page }) => {
    await mockApi(page, { profileStatus: status })
    await seedSessionOnce(page)
    await page.goto('/profil')
    if (status === 401) {
      await expect(page).toHaveURL('/login')
      await expectSession(page, null)
    } else {
      await expect(page.getByText('Accès non autorisé.')).toBeVisible()
      await expect(page).toHaveURL('/profil')
      await expectSession(page, token)
    }
    await page.reload()
    await expect(page).toHaveURL(status === 401 ? '/login' : '/profil')
    await expectSession(page, status === 401 ? null : token)
  })
}

for (const price of [0, 5]) {
  test(`visitor returns to the selected ${price ? 'paid' : 'free'} project after login, with no automatic participation`, async ({ page }) => {
    const requests = await mockApi(page, { selectedProject: { ...project, prixParticipation: price } })
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Checkout mock</h1>' }))
    await page.goto('/projets')
    await page.locator('article').getByRole('link', { name: 'Participer', exact: true }).click()
    await expect(page).toHaveURL('/login')
    await signIn(page)
    await expect(page).toHaveURL('/projets/42')
    await expect(page.getByRole('heading', { name: project.titre, exact: true })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL('/projets/42')
    await expectSession(page, token)
    expect(requests.filter(r => r.method === 'POST').map(r => r.path)).toEqual(['/api/auth/login'])
    await page.locator('article').getByRole('button', { name: 'Participer', exact: true }).click()
    if (price) await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/navigation-test')
    else await expect(page.locator('article').getByRole('button', { name: 'Participant', exact: true })).toBeVisible()
    expect(requests.filter(r => r.method === 'POST').map(r => r.path)).toEqual([
      '/api/auth/login', price ? '/api/projets-paiements/projets/42/checkout' : '/api/projets/42/rejoindre',
    ])
  })
}

test('activity login return preserves its query and session after F5', async ({ page }) => {
  const requests = await mockApi(page)
  await page.goto('/activites/42?source=public')
  await page.getByRole('button', { name: "Se connecter pour s'inscrire", exact: true }).click()
  await signIn(page)
  await expect(page).toHaveURL('/activites/42?source=public')
  await expect(page.getByRole('heading', { name: activity.titre, exact: true })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL('/activites/42?source=public')
  await expectSession(page, token)
  expect(requests.filter(r => r.method === 'POST').map(r => r.path)).toEqual(['/api/auth/login'])
})

test('direct login still reaches the member dashboard and Google remains unavailable', async ({ page }) => {
  await mockApi(page)
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Google/ })).toBeDisabled()
  await signIn(page)
  await expect(page).toHaveURL('/dashboard')
  await page.reload()
  await expect(page).toHaveURL('/dashboard')
  await expectSession(page, token)
})

for (const destination of ['/activites/42', '/projets/42']) {
  test(`registration returns to ${destination} with a persistent session and no automatic participation`, async ({ page }) => {
    const requests = await mockApi(page)
    await page.goto(destination)
    if (destination.startsWith('/projets')) await page.locator('article').getByRole('link', { name: 'Participer', exact: true }).click()
    else await page.getByRole('button', { name: "Se connecter pour s'inscrire", exact: true }).click()
    await expect(page).toHaveURL('/login')
    await page.locator('a[href="/register"]').first().click()
    await page.locator('#register-firstname').fill(member.prenom)
    await page.locator('#register-lastname').fill(member.nom)
    await page.locator('#register-birthdate').fill('2000-01-10')
    await page.locator('#register-email').fill(member.email)
    await page.locator('#register-password').fill('Password123!')
    await page.locator('#register-password-confirmation').fill('Password123!')
    await page.locator('#register-legal-acceptance').check()
    await page.locator('form button[type="submit"]').click()
    await expect(page).toHaveURL(destination)
    await expectSession(page, token)
    await page.reload()
    await expect(page).toHaveURL(destination)
    await expectSession(page, token)
    expect(requests.filter(r => r.method === 'POST').map(r => r.path)).toEqual(['/api/auth/register'])
  })
}

test('notification to an unavailable group offers the group catalogue instead of the previous page', async ({ page }) => {
  await mockApi(page, { notifications: [{ id: 7, titre: 'Ancien groupe', type: 'VALIDATION_GROUPE', lienAction: '/groupes/999', lue: true }] })
  await seedSessionOnce(page)
  await page.goto('/notifications')
  await page.getByRole('button', { name: /Ancien groupe/ }).click()
  await expect(page).toHaveURL('/groupes/999')
  await expect(page.getByText('Groupe introuvable.')).toBeVisible()
  await page.getByRole('button', { name: 'Voir les groupes', exact: true }).click()
  await expect(page).toHaveURL('/groupes')
  await expectSession(page, token)
})
