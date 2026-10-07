import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const locales = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url)))]))
test.use({ timezoneId: 'Europe/Brussels', locale: 'fr-BE' })
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
    if (path === '/api/upload') {
      expect(req.method()).toBe('POST')
      expect(req.headers()['authorization']).toBe(`Bearer ${token}`)
      expect(req.headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/)
      const body = req.postDataBuffer()
      expect(body.toString()).toContain('name="file"; filename="cover.png"')
      expect(body.toString()).toContain('name="type"\r\n\r\nactivite')
      expect(body.includes(png)).toBe(true)
      return route.fulfill({ json: { storageKey: 'activites/test/new.png', url: '/activity-test.png' } })
    }
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
  await expect(form.locator('input[type="date"]').nth(0)).toHaveValue('2099-01-15')
  await expect(form.locator('input[type="date"]').nth(1)).toHaveValue('2099-01-16')
  await expect(form.locator('input[type="time"]').nth(0)).toHaveValue('10:00')
  await expect(form.locator('input[type="time"]').nth(1)).toHaveValue('12:00')
  await expect(form.getByRole('img')).toHaveAttribute('src', '/activity-test.png')
  await page.route('**/api/upload', route => route.fulfill({ status: 400, json: {} }))
  await form.locator('input[type="file"]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png })
  await expect(form.getByRole('alert')).toContainText('L’image actuelle est conservée.')
  await expect(form.getByRole('img')).toHaveAttribute('src', '/activity-test.png')
  await form.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(form).toHaveCount(0)
  expect(writes[0].body).toMatchObject({ imageStorageKey: original.imageStorageKey, latitude: 50.8, longitude: 4.3, dateDebut: original.dateDebut, dateFin: original.dateFin })
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
    if (path === '/api/stripe/checkout') { checkout = route.request().postDataJSON(); return route.fulfill({ json: { statutPaiement: 'EN_ATTENTE', checkoutUrl: 'https://checkout.stripe.com/test' } }) }
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
  await expect(page.getByRole('heading', { name: t.paymentReturnUX.pending })).toBeVisible()
  await page.getByRole('button', { name: t.paymentReturnUX.check }).click()
  await expect(page.getByRole('heading', { name: t.paymentReturnUX.confirmed })).toHaveCount(0)
  paid = true
  await expect(page.getByRole('heading', { name: t.paymentReturnUX.confirmed })).toBeVisible()
})

test('payment return stops automatic checks and allows manual recovery from an API error', async ({ page }) => {
  const t = locales.fr
  await setup(page, 'MEMBRE', 'fr')
  await page.clock.install()
  let reads = 0, failing = false, paid = false
  await page.route('**/api/stripe/session/*', route => {
    reads++
    return route.fulfill({ status: failing ? 503 : 200, json: { statutPaiement: paid ? 'PAYE' : 'EN_ATTENTE' } })
  })
  await page.goto('/paiement/succes?session_id=cs_test')
  await expect.poll(() => reads).toBe(1)
  await page.clock.fastForward(31000)
  const stopped = reads
  await page.clock.fastForward(10000)
  expect(reads).toBe(stopped)
  failing = true
  await page.getByRole('button', { name: t.paymentReturnUX.check }).click()
  await expect(page.getByRole('heading', { name: t.paymentReturnUX.error })).toBeVisible()
  failing = false; paid = true
  await page.getByRole('button', { name: t.paymentReturnUX.check }).click()
  await expect(page.getByText(t.paymentReturnUX.activity)).toBeVisible()
  await expect(page.getByRole('button', { name: t.paymentReturnUX.check })).toHaveCount(0)
})

for (const role of ['ADMIN', 'REFERENT']) for (const order of ['date-start-end', 'start-end-date', 'date-end-start', 'edit-existing']) {
  test(`${role} local date/time remains valid with input order=${order}`, async ({ page }) => {
    const writes = await setup(page, role, 'fr'), t = locales.fr
    await page.getByRole('button', { name: role === 'ADMIN' ? t.admin.createActivity : t.referent.newActivity, exact: true }).click()
    const form = page.getByRole('form')
    await form.locator('textarea').fill('Description')
    await form.getByLabel(t.activities.form_place, { exact: false }).fill('Bruxelles')
    await form.getByRole('button', { name: t.adminActivity.saveDraft }).click()
    await expect(form.getByRole('alert')).toContainText(t.adminActivity.errors.dateDebut)
    await expect(form.getByRole('alert')).toContainText(t.adminActivity.errors.dateFin)
    const date = form.locator('input[type="date"]').first()
    const start = form.locator('input[type="time"]').nth(0)
    const end = form.locator('input[type="time"]').nth(1)
    if (order === 'edit-existing') {
      await date.fill('2026-10-31')
      await start.fill('11:00')
      await end.fill('14:00')
      await date.fill('')
      await start.fill('12:30')
      await end.fill('15:30')
      await date.fill('2026-11-01')
    } else {
      for (const field of order.split('-')) {
        if (field === 'date') await date.fill('2026-11-01')
        if (field === 'start') await start.fill('12:30')
        if (field === 'end') await end.fill('15:30')
      }
    }
    await expect(date).toHaveValue('2026-11-01')
    await expect(form.locator('input[type="time"]').nth(0)).toHaveValue('12:30')
    await expect(form.locator('input[type="time"]').nth(1)).toHaveValue('15:30')
    await expect(form.getByText(t.adminActivity.errors.dateDebut, { exact: true })).toHaveCount(0)
    await expect(form.getByText(t.adminActivity.errors.dateFin, { exact: true })).toHaveCount(0)
    // Correcting dates must not hide a still-valid error in another field.
    await expect(form.getByRole('alert')).toContainText(t.adminActivity.errors.titre)
    await form.getByRole('textbox', { name: /^Titre/ }).fill('Dates locales')
    await form.locator('input[type="time"]').nth(1).fill('11:30')
    await form.getByRole('button', { name: t.adminActivity.saveDraft }).click()
    await expect(form.getByRole('alert')).toContainText(t.adminActivity.errors.dateOrder)
    expect(writes).toHaveLength(0)
    await form.locator('input[type="time"]').nth(1).fill('15:30')
    await expect(form.getByText(t.adminActivity.errors.dateOrder, { exact: true })).toHaveCount(0)
    await form.getByRole('button', { name: t.adminActivity.saveDraft }).click()
    await expect(form).toHaveCount(0)
    expect(writes).toHaveLength(1)
    expect(writes[0].body).toMatchObject({ dateDebut: '2026-11-01T12:30', dateFin: '2026-11-01T15:30' })
  })
}

for (const role of ['ADMIN', 'REFERENT']) test(`${role} WebKit native keyboard date/time clears submitted errors`, async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'Native WebKit date/time keyboard layout; shared input-order tests also cover Chromium.')
  const writes = await setup(page, role, 'fr'), t = locales.fr
  await page.getByRole('button', { name: role === 'ADMIN' ? t.admin.createActivity : t.referent.newActivity, exact: true }).click()
  const form = page.getByRole('form')
  await form.getByRole('textbox', { name: /^Titre/ }).fill('Dates Safari')
  await form.locator('textarea').fill('Description')
  await form.getByLabel(t.activities.form_place, { exact: false }).fill('Bruxelles')
  await form.getByRole('button', { name: t.adminActivity.saveDraft }).click()
  await expect(form.getByRole('alert')).toContainText(t.adminActivity.errors.dateDebut)
  await expect(form.getByRole('alert')).toContainText(t.adminActivity.errors.dateFin)
  const inputs = [form.locator('input[type="date"]').first(), ...[0, 1].map(index => form.locator('input[type="time"]').nth(index))]
  const typed = ['01/11/2026', '12:30', '15:30']
  const values = ['2026-11-01', '12:30', '15:30']
  for (const [index, input] of inputs.entries()) {
    await input.focus()
    // Use real key events: fill() bypasses native partial date/time editing.
    await input.pressSequentially(typed[index], { delay: 50 })
    await input.press('Tab')
    await expect(input).toHaveValue(values[index])
    await expect(input).toHaveAttribute('value', values[index])
    expect(await input.evaluate(element => element.validity.badInput)).toBe(false)
  }
  await expect(form.getByText(t.adminActivity.errors.dateDebut, { exact: true })).toHaveCount(0)
  await expect(form.getByText(t.adminActivity.errors.dateFin, { exact: true })).toHaveCount(0)
  await form.getByRole('button', { name: t.adminActivity.saveDraft }).click()
  await expect(form).toHaveCount(0)
  expect(writes).toHaveLength(1)
  expect(writes[0].body).toMatchObject({ dateDebut: '2026-11-01T12:30', dateFin: '2026-11-01T15:30' })
})

for (const lang of ['fr', 'nl', 'en']) test(`new activity upload rejects invalid files and reports failure without claiming an old image ${lang}`, async ({ page }) => {
  const writes = await setup(page, 'ADMIN', lang), t = locales[lang]
  await page.getByRole('button', { name: t.admin.createActivity, exact: true }).click()
  const form = page.getByRole('form')
  let uploads = 0
  await page.route('**/api/upload', route => {
    uploads++
    return route.fulfill({ status: 500, json: { error: "Erreur lors de l'upload." } })
  })
  await form.locator('input[type="file"]').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
  await expect(form.getByRole('alert')).toHaveText(t.activityEditor.imageInvalid)
  expect(uploads).toBe(0)
  await form.locator('input[type="file"]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png })
  await expect(form.getByRole('alert')).toHaveText(t.activityEditor.imageError)
  await expect(form.getByRole('img')).toHaveCount(0)
  expect(uploads).toBe(1)
  expect(writes).toHaveLength(0)
})
