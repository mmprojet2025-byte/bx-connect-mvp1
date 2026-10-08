import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'

const translations = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url), 'utf8'))]))
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const checkoutUrl = 'https://checkout.stripe.com/c/pay/existing'
const activity = { id: 42, titre: 'Activité payante', description: 'Test paiement', gratuite: false, prix: 5,
  statut: 'PUBLIEE', peutSInscrire: true, dateDebut: '2030-06-01T12:00:00', stripeCheckoutDisponible: true,
  stripeCheckoutDateLimite: '2030-06-01T08:29:00Z' }
const project = { id: 2, titre: 'Projet payé', statut: 'APPROUVE', visibilite: 'PUBLIC', prixParticipation: 5,
  nombreParticipants: 0, capacite: 10 }

async function setup(page, { pending = false, lang = 'fr' } = {}) {
  const state = {
    activity: { ...activity, ...(pending ? { peutSInscrire: false, inscriptionId: 7, paiementActiviteId: 9, statutInscription: 'EN_ATTENTE_PAIEMENT' } : {}) },
    paid: false, response: { id: 9, statutPaiement: 'EN_ATTENTE' }, writes: [], verifyCount: 0, reads: 0,
  }
  await page.addInitScript(({ token, lang }) => {
    localStorage.setItem('bxconnect_lang', lang)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'MEMBRE', prenom: 'Test' }))
  }, { token, lang })
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Existing Checkout</h1>' }))
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() !== 'GET') state.writes.push(path)
    if (path === '/api/activites/paiement-options') return route.fulfill({ json: { STRIPE: true, PAYPAL: false } })
    if (path === '/api/activites/options-filtres') return route.fulfill({ json: { categories: [], themes: [], lieux: [] } })
    if (path === '/api/activites') return route.fulfill({ json: [state.activity] })
    if (path === '/api/activites/42') return route.fulfill({ json: state.paid
      ? { ...state.activity, inscrit: true, inscriptionId: 7, paiementActiviteId: null, statutInscription: 'PAYEE', peutSInscrire: false }
      : state.activity })
    if (path === '/api/stripe/checkout' || path === '/api/stripe/activites/paiements/9/verifier') {
      if (path.endsWith('/verifier')) state.verifyCount++
      if (state.failure) return route.fulfill({ status: 409, json: {} })
      if (state.response.statutPaiement === 'PAYE') state.paid = true
      if (state.response.statutPaiement === 'ANNULE') state.activity = { ...activity }
      return route.fulfill({ json: state.response })
    }
    if (path === '/api/stripe/session/cs_existing') {
      state.reads++
      return route.fulfill({ json: { id: 9, statutPaiement: state.paid ? 'PAYE' : 'EN_ATTENTE', statutInscription: state.registrationStatus || (state.paid ? 'PAYEE' : 'EN_ATTENTE_PAIEMENT') } })
    }
    if (path === '/api/projets-paiements/projets/2/checkout') {
      if (state.response.statut === 'PAYE') state.paid = true
      return route.fulfill({ json: state.response })
    }
    if (path === '/api/projets') return route.fulfill({ json: [{ ...project, nombreParticipants: state.paid ? 1 : 0 }] })
    if (path === '/api/projets/mes-participations') return route.fulfill({ json: state.paid ? [project] : [] })
    return route.fulfill({ json: path.endsWith('/count') ? { nonLues: 0 } : [] })
  })
  return state
}

test('project Checkout PAYE without URL refreshes participation instead of starting another payment', async ({ page }) => {
  const state = await setup(page)
  state.response = { id: 3, statut: 'PAYE', numeroRecu: 'BX-PROJET-3' }
  await page.goto('/projets')
  await page.getByRole('button', { name: 'Participer', exact: true }).click()
  await expect(page.getByText(/Paiement confirmé — Votre participation/)).toBeVisible()
  await expect(page.locator('article').getByRole('button', { name: 'Participant', exact: true })).toBeVisible()
  await expect(page.locator('article')).toContainText('1 / 10')
  await expect(page).toHaveURL('/projets')
  expect(state.writes).toEqual(['/api/projets-paiements/projets/2/checkout'])
})

test('project pending Checkout without URL never claims confirmation or opens Stripe', async ({ page }) => {
  const state = await setup(page)
  state.response = { id: 3, statut: 'EN_ATTENTE' }
  await page.goto('/projets')
  await page.getByRole('button', { name: 'Participer', exact: true }).click()
  await expect(page.getByText('Paiement en cours de confirmation', { exact: true })).toBeVisible()
  await expect(page.getByText(/Paiement confirmé/)).toHaveCount(0)
  await expect(page).toHaveURL('/projets')
})

test('activity Checkout PAYE without URL refreshes the confirmed registration', async ({ page }) => {
  const state = await setup(page)
  state.response = { id: 9, statutPaiement: 'PAYE' }
  await page.goto('/activites/42')
  await page.getByRole('button', { name: 'Payer avec Stripe', exact: true }).click()
  await expect(page.getByText('Paiement confirmé', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Payer avec Stripe', exact: true })).toHaveCount(0)
  await expect(page.getByText(translations.fr.activities.already_registered, { exact: true })).toBeVisible()
  expect(state.writes).toEqual(['/api/stripe/checkout'])
})

test('activity Stripe payment blocks repeated clicks while the server processes the same attempt', async ({ page }) => {
  const state = await setup(page)
  let calls = 0, release
  const ready = new Promise(resolve => { release = resolve })
  await page.route('**/api/stripe/checkout', async route => {
    calls++
    await ready
    state.paid = true
    await route.fulfill({ json: { id: 9, statutPaiement: 'PAYE' } })
  })
  await page.goto('/activites/42')
  const button = page.getByRole('button', { name: 'Payer avec Stripe', exact: true })
  await button.click()
  await expect(button).toBeDisabled()
  await button.dispatchEvent('click')
  expect(calls).toBe(1)
  release()
  await expect(page.getByText('Paiement confirmé', { exact: true })).toBeVisible()
  expect(calls).toBe(1)
})

test('activity payment without a stored attempt cannot invent a checkout during recovery', async ({ page }) => {
  const state = await setup(page, { pending: true })
  state.activity.paiementActiviteId = null
  await page.goto('/activites/42')
  await page.getByRole('button', { name: 'Vérifier auprès de Stripe', exact: true }).click()
  await expect(page.getByText(translations.fr.projectPayment.recoveryError, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reprendre le paiement', exact: true })).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})

test('activity payment resume is offered only after verification, and rechecks before redirecting', async ({ page }) => {
  const state = await setup(page, { pending: true })
  state.activity.stripeCheckoutDisponible = false // Existing sessions are checked independently of the new-Checkout window.
  state.response = { id: 9, statutPaiement: 'EN_ATTENTE', checkoutUrl }
  await page.goto('/activites/42')
  await expect(page.getByRole('button', { name: 'Reprendre le paiement', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Payer avec Stripe', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Vérifier auprès de Stripe', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reprendre le paiement', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reprendre le paiement', exact: true }).click()
  await expect(page).toHaveURL(checkoutUrl)
  expect(state.verifyCount).toBe(2)
  expect(state.writes).toEqual(Array(2).fill('/api/stripe/activites/paiements/9/verifier'))
})

test('activity paid between verification and resume does not reopen Checkout', async ({ page }) => {
  const state = await setup(page, { pending: true })
  state.response = { id: 9, statutPaiement: 'EN_ATTENTE', checkoutUrl }
  await page.goto('/activites/42')
  await page.getByRole('button', { name: 'Vérifier auprès de Stripe', exact: true }).click()
  state.response = { id: 9, statutPaiement: 'PAYE' }
  await page.getByRole('button', { name: 'Reprendre le paiement', exact: true }).click()
  await expect(page.getByText('Paiement confirmé', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reprendre le paiement', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL('/activites/42')
  expect(state.verifyCount).toBe(2)
})

for (const outcome of ['pending', 'unavailable', 'expired']) test(`activity ${outcome} verification never redirects or creates a payment`, async ({ page }) => {
  const state = await setup(page, { pending: true })
  state.failure = outcome === 'unavailable'
  if (outcome === 'expired') state.response = { id: 9, statutPaiement: 'ANNULE' }
  await page.goto('/activites/42')
  await page.getByRole('button', { name: 'Vérifier auprès de Stripe', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reprendre le paiement', exact: true })).toHaveCount(0)
  const message = outcome === 'unavailable' ? translations.fr.projectPayment.recoveryError
    : outcome === 'expired' ? translations.fr.paymentReturnUX.closed : translations.fr.paymentReturnUX.pending
  await expect(page.getByText(message, { exact: true })).toBeVisible()
  if (outcome === 'expired') await expect(page.getByRole('button', { name: 'Payer avec Stripe', exact: true })).toBeVisible()
  expect(state.writes).toEqual(['/api/stripe/activites/paiements/9/verifier'])
})

for (const lang of ['fr', 'nl', 'en']) test(`Stripe window explains the server cutoff in ${lang}`, async ({ page }) => {
  const state = await setup(page, { lang })
  state.activity = { ...activity, stripeCheckoutDisponible: false, peutSInscrire: false, raisonIndisponible: 'PAYMENT_WINDOW_CLOSED' }
  await page.goto('/activites/42')
  await expect(page.getByText(translations[lang].activityEditor.paymentWindowClosed, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: translations[lang].activityEditor.stripe, exact: true })).toHaveCount(0)
  await page.goto('/activites')
  await expect(page.locator('article').getByRole('button', { name: translations[lang].activityEditor.paymentWindowClosed, exact: true })).toBeDisabled()
  await expect(page.getByText(translations[lang].activities.registrationOpen, { exact: true }).locator('..')).toContainText('0')
  expect(state.writes).toHaveLength(0)
})

for (const timezoneId of ['Europe/Brussels', 'America/New_York']) test.describe(`Stripe window in ${timezoneId}`, () => {
  test.use({ timezoneId })
  test('an open page disables new Checkout at the server instant without a local 31 minute calculation', async ({ page }) => {
    await setup(page)
    await page.clock.install({ time: new Date('2030-06-01T08:28:58Z') })
    await page.clock.pauseAt(new Date('2030-06-01T08:28:59Z'))
    await page.goto('/activites/42')
    await expect(page.getByRole('button', { name: 'Payer avec Stripe', exact: true })).toBeVisible()
    await page.clock.fastForward(1002)
    await expect(page.getByRole('button', { name: 'Payer avec Stripe', exact: true })).toHaveCount(0)
    await expect(page.getByText(translations.fr.activityEditor.paymentWindowClosed, { exact: true })).toBeVisible()
  })
})

test('activity success URL only reads server state; manual recovery confirms a missed webhook', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/paiement/succes?session_id=cs_existing')
  await expect(page.getByRole('heading', { name: translations.fr.paymentReturnUX.pending, exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(0)
  state.response = { id: 9, statutPaiement: 'PAYE' }
  await page.getByRole('button', { name: 'Vérifier maintenant', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Paiement confirmé', exact: true })).toBeVisible()
  await expect(page.getByText(translations.fr.paymentReturnUX.activity, { exact: true })).toBeVisible()
  expect(state.writes).toEqual(['/api/stripe/activites/paiements/9/verifier'])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Paiement confirmé', exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(1)
})

test('confirmed activity payment does not claim a historically cancelled registration was reactivated', async ({ page }) => {
  const state = await setup(page)
  state.paid = true
  state.registrationStatus = 'ANNULEE'
  await page.goto('/paiement/succes?session_id=cs_existing')
  await expect(page.getByRole('heading', { name: 'Paiement confirmé', exact: true })).toBeVisible()
  await expect(page.getByText(translations.fr.paymentReturnUX.activityCancelled, { exact: true })).toBeVisible()
  await expect(page.getByText(translations.fr.paymentReturnUX.activity, { exact: true })).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})

for (const trigger of ['poll', 'focus', 'visibility', 'reload']) test(`pending activity registration observes backend confirmation on ${trigger}`, async ({ page }) => {
  const state = await setup(page, { pending: true })
  await page.clock.install()
  await page.goto('/activites/42')
  await expect(page.getByText(translations.fr.activityEditor.paymentPending, { exact: true })).toBeVisible()
  if (trigger !== 'poll') await page.clock.fastForward(31000)
  state.paid = true // only the backend response changes; the browser never confirms payment
  if (trigger === 'poll') await page.clock.fastForward(2000)
  if (trigger === 'focus') await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  if (trigger === 'visibility') await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  if (trigger === 'reload') await page.reload()
  await expect(page.getByText(translations.fr.activities.already_registered, { exact: true })).toBeVisible()
  await expect(page.getByText(translations.fr.activityEditor.paymentPending, { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reprendre le paiement', exact: true })).toHaveCount(0)
  expect(state.writes).toEqual([])
})

test('activity polling is bounded, survives read errors, and keeps manual server verification', async ({ page }) => {
  const state = await setup(page, { pending: true })
  let reads = 0, fail = false
  await page.route('**/api/activites/42', route => {
    reads++
    return route.fulfill({ status: fail ? 503 : 200, json: state.activity })
  })
  await page.clock.install()
  await page.goto('/activites/42')
  // React StrictMode can perform the initial read twice; the bounded window is tested below.
  await expect(page.getByText(translations.fr.activityEditor.paymentPending, { exact: true })).toBeVisible()
  await expect.poll(() => reads).toBeGreaterThan(0)
  fail = true
  await page.clock.fastForward(2000)
  await expect(page.getByText(translations.fr.paymentReturnUX.error, { exact: true })).toBeVisible()
  await expect(page.getByText(translations.fr.activities.already_registered, { exact: true })).toHaveCount(0)
  fail = false
  await page.clock.fastForward(31000)
  const stopped = reads
  await page.clock.fastForward(10000)
  expect(reads).toBe(stopped)
  await expect(page.getByRole('button', { name: 'Vérifier auprès de Stripe', exact: true })).toBeVisible()
  expect(state.writes).toEqual([])
})

test('activity return rechecks on focus after bounded polling and shows confirmed registration', async ({ page }) => {
  const state = await setup(page, { pending: true })
  await page.clock.install()
  await page.goto('/paiement/succes?session_id=cs_existing')
  await expect.poll(() => state.reads).toBe(1)
  await page.clock.fastForward(31000)
  const stopped = state.reads
  await page.clock.fastForward(10000)
  expect(state.reads).toBe(stopped)
  await expect(page.getByRole('button', { name: 'Vérifier maintenant', exact: true })).toBeVisible()
  state.paid = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('heading', { name: 'Paiement confirmé', exact: true })).toBeVisible()
  await expect(page.getByText(translations.fr.paymentReturnUX.activity, { exact: true })).toBeVisible()
  expect(state.writes).toEqual([])
})

for (const path of ['/activites', '/dashboard']) test(`pending activity refreshes in ${path} after backend confirmation`, async ({ page }) => {
  const state = await setup(page, { pending: true })
  await page.route(url => url.pathname === '/api/activites', route => route.fulfill({ json: [{ ...state.activity,
    statutInscription: state.paid ? 'PAYEE' : 'EN_ATTENTE_PAIEMENT' }] }))
  await page.route('**/api/membre/dashboard', route => route.fulfill({ json: {
    inscriptions: [{ id: 7, activiteTitre: activity.titre, activiteStatut: 'PUBLIEE', activiteId: 42,
      statut: state.paid ? 'PAYEE' : 'EN_ATTENTE_PAIEMENT' }], projets: [], notifications: [],
  } }))
  await page.clock.install()
  await page.goto(path)
  await expect(page.getByText(translations.fr.activityEditor.paymentPending, { exact: path !== '/activites' }).first()).toBeVisible()
  state.paid = true
  await page.clock.fastForward(2000)
  await expect(page.getByText(translations.fr.activityEditor.paymentPending, { exact: path !== '/activites' })).toHaveCount(0)
  const finalLabel = path === '/activites' ? translations.fr.activities.already_registered : translations.fr.memberDashboard.statuses.subscription.PAYEE
  await expect(page.getByText(finalLabel, { exact: path !== '/activites' }).first()).toBeVisible()
  expect(state.writes).toEqual([])
})
