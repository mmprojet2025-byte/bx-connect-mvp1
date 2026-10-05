import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const locales = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url)))]))
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9xsAAAAASUVORK5CYII=', 'base64')
async function setup(page, role, lang, original) {
  const writes = []
  let current = original
  const group = { id: 5, nom: 'Sport', actif: true, statut: 'VALIDE', referentId: 9 }
  await page.addInitScript(({ token, role, lang }) => {
    localStorage.setItem('token', token); localStorage.setItem('bxconnect_lang', lang)
    localStorage.setItem('user', JSON.stringify({ id: role === 'ADMIN' ? 1 : 9, role, actif: true, email: 'organiser@example.test' }))
  }, { token, role, lang })
  await page.route('**/activity-test.png', route => route.fulfill({ contentType: 'image/png', body: png }))
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    if (path === '/api/upload') return route.fulfill({ json: { storageKey: 'activites/test/new.png', url: '/activity-test.png' } })
    if (path === '/api/users/me') return route.fulfill({ json: { id: 9, role: 'REFERENT', actif: true } })
    if (path === '/api/admin/groupes' || path === '/api/referent/groupes') return route.fulfill({ json: [group] })
    if (path === '/api/admin/referents') return route.fulfill({ json: [{ id: 9, role: 'REFERENT', actif: true }] })
    if (path.startsWith('/api/activites') && ['POST', 'PUT', 'PATCH'].includes(req.method())) {
      const body = req.postDataJSON(); writes.push({ body, params: Object.fromEntries(url.searchParams) })
      current = { ...current, id: 42, statut: 'BROUILLON', ...body, ...Object.fromEntries(url.searchParams), groupeNom: 'Sport', referentAssigneId: 9, imageUrl: '/activity-test.png' }
      return route.fulfill({ json: current })
    }
    if (path.endsWith('/mes-activites') || path === '/api/activites/admin/toutes') return route.fulfill({ json: current ? [current] : [] })
    if (path === '/api/activites/42') return route.fulfill({ json: current })
    return route.fulfill({ json: [] })
  })
  await page.goto(role === 'ADMIN' ? '/admin/activites' : '/referent/activites')
  return writes
}
for (const role of ['ADMIN', 'REFERENT']) for (const [lang, width] of [['fr', 1440], ['nl', 768], ['en', 390]]) {
  test(`${role} paid multi-day activity with deadline/image ${lang} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const writes = await setup(page, role, lang), t = locales[lang]
    await page.getByRole('button', { name: role === 'ADMIN' ? t.admin.createActivity : t.referent.newActivity, exact: true }).click()
    const form = page.getByRole('form')
    await form.getByRole('textbox', { name: /^(Titre|Title|Titel)/ }).fill('Activity image test')
    await form.locator('textarea').fill('Description test')
    await form.getByLabel(t.activities.form_place, { exact: false }).fill('Bruxelles')
    await form.locator('input[type="date"]').first().fill('2099-01-15')
    await form.locator('input[type="time"]').nth(0).fill('10:00')
    await form.locator('input[type="time"]').nth(1).fill('12:00')
    await form.getByLabel(t.activityEditor.multiDay).check()
    await form.locator('input[type="date"]').nth(1).fill('2099-01-16')
    await form.getByLabel(t.activityEditor.deadline, { exact: true }).fill('2099-01-14T18:00')
    await form.getByRole('radio', { name: t.activityEditor.paid, exact: true }).check()
    await expect(form.getByLabel(t.activityEditor.price, { exact: false })).toBeVisible()
    await form.getByLabel(t.activityEditor.price, { exact: false }).fill('0')
    await form.getByRole('button', { name: t.adminActivity.saveDraft }).click()
    await expect(form.getByRole('alert')).toContainText(t.adminActivity.errors.prix)
    expect(writes).toHaveLength(0)
    await form.getByLabel(t.activityEditor.price, { exact: false }).fill('12.50')
    await form.locator('input[type="file"]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png })
    await expect(form.getByRole('img', { name: t.activityEditor.preview })).toBeVisible()
    await expect(form.getByRole('button', { name: t.adminActivity.saveDraft })).toBeEnabled()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath('activity-form.png'), fullPage: true })
    await form.getByRole('button', { name: t.adminActivity.saveDraft }).click()
    await expect(form).toHaveCount(0)
    expect(writes[0].body).toMatchObject({ gratuite: false, prix: 12.5, dateDebut: '2099-01-15T10:00', dateFin: '2099-01-16T12:00', dateLimiteInscription: '2099-01-14T18:00', imageStorageKey: 'activites/test/new.png' })
    await page.goto('/activites/42')
    await expect(page.getByRole('img', { name: 'Activity image test', exact: true })).toHaveAttribute('src', '/activity-test.png')
  })
}
test('published edit preserves image/coordinates on upload failure and terminal actions stay hidden', async ({ page }) => {
  const original = { id: 42, statut: 'PUBLIEE', titre: 'Existing', description: 'Description', lieu: 'Bruxelles', dateDebut: '2099-01-15T10:00', dateFin: '2099-01-16T12:00', gratuite: true, capaciteMax: 8, visibilite: 'PUBLIC', imageStorageKey: 'activites/test/old.png', imageUrl: '/activity-test.png', latitude: 50.8, longitude: 4.3 }
  const writes = await setup(page, 'ADMIN', 'fr', original)
  await page.getByRole('row').filter({ hasText: 'Existing' }).getByRole('button', { name: 'Modifier', exact: true }).click()
  const form = page.getByRole('form')
  await expect(form.getByRole('checkbox')).toBeChecked()
  await expect(form.getByRole('img')).toHaveAttribute('src', '/activity-test.png')
  await page.route('**/api/upload', route => route.fulfill({ status: 400, json: {} }))
  await form.locator('input[type="file"]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png })
  await expect(form.getByRole('alert')).toContainText('précédente est conservée')
  await expect(form.getByRole('img')).toHaveAttribute('src', '/activity-test.png')
  await form.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(form).toHaveCount(0)
  expect(writes[0].body).toMatchObject({ imageStorageKey: original.imageStorageKey, latitude: 50.8, longitude: 4.3 })
})

test('member uses activity payment flow without sending a free registration request', async ({ page }) => {
  await page.addInitScript(token => {
    localStorage.setItem('token', token); localStorage.setItem('bxconnect_lang', 'fr')
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'MEMBRE', actif: true }))
  }, token)
  let checkout, freeRegistration = false
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ body: '<p>Mock provider checkout</p>' }))
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/activites/42') return route.fulfill({ json: { id: 42, titre: 'Paid activity', description: 'Description', gratuite: false, prix: 12.5, statut: 'PUBLIEE', peutSInscrire: true, dateDebut: '2099-01-15T10:00' } })
    if (path === '/api/activites/paiement-options') return route.fulfill({ json: { STRIPE: true, PAYPAL: false } })
    if (path === '/api/stripe/checkout') { checkout = route.request().postDataJSON(); return route.fulfill({ json: { checkoutUrl: 'https://checkout.stripe.com/test' } }) }
    if (path === '/api/inscriptions') freeRegistration = true
    return route.fulfill({ json: [] })
  })
  await page.goto('/activites/42')
  await page.getByRole('button', { name: 'Payer avec Stripe' }).click()
  await expect(page).toHaveURL('https://checkout.stripe.com/test')
  expect(checkout).toEqual({ activiteId: 42, montant: 12.5 })
  expect(freeRegistration).toBe(false)
})
for (const lang of ['fr', 'nl', 'en']) test(`payment return never claims success from URL alone ${lang}`, async ({ page }) => {
  const t = locales[lang]
  await page.addInitScript(({ token, lang }) => {
    localStorage.setItem('token', token); localStorage.setItem('bxconnect_lang', lang)
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'MEMBRE', actif: true }))
  }, { token, lang })
  let paid = false
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ json: new URL(route.request().url()).pathname.startsWith('/api/stripe/session/') ? { statutPaiement: paid ? 'PAYE' : 'EN_ATTENTE' } : [] }))
  await page.goto('/paiement/succes?session_id=cs_test')
  await expect(page.getByRole('heading', { name: t.activityEditor.paymentPending })).toBeVisible()
  await page.getByRole('button', { name: t.activityEditor.checkPayment }).click()
  await expect(page.getByRole('heading', { name: t.activityEditor.paymentConfirmed })).toHaveCount(0)
  paid = true
  await page.getByRole('button', { name: t.activityEditor.checkPayment }).click()
  await expect(page.getByRole('heading', { name: t.activityEditor.paymentConfirmed })).toBeVisible()
})
