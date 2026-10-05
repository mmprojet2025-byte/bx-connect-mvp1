import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`
const group = { id: 5, nom: 'Sport', actif: true, statut: 'VALIDE', referentId: 9 }
const ref = { id: 9, prenom: 'Anne', nom: 'Martin', actif: true, role: 'REFERENT' }
const activity = { id: 42, titre: 'Atelier TFE', description: 'Description', lieu: 'Bruxelles', dateDebut: '2099-01-15T10:00:00', dateFin: '2099-01-15T12:00:00', capaciteMax: 10, gratuite: true, prix: null, statut: 'BROUILLON', visibilite: 'PUBLIC', groupeId: null, referentAssigneId: null }

// These tests exercise the real Web UI with explicitly mocked API responses.
async function setup(page, initial = [], groups = [group], refs = [ref], failSave = false) {
  const writes = []
  await page.addInitScript(token => {
    localStorage.setItem('bxconnect_lang', 'fr')
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, prenom: 'Admin', email: 'admin@example.org', role: 'ADMIN' }))
  }, token)
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (['POST', 'PUT', 'PATCH'].includes(request.method()) && path.startsWith('/api/activites')) {
      const body = request.postDataJSON()
      writes.push({ method: request.method(), body, params: Object.fromEntries(url.searchParams) })
      if (failSave) return route.fulfill({ status: 400, json: {} })
      return route.fulfill({ json: { ...(initial[0] || activity), ...body, groupeNom: body?.groupeId ? 'Sport' : null, referentAssigneId: body?.groupeId ? 9 : null, ...Object.fromEntries(url.searchParams) } })
    }
    if (path === '/api/activites/admin/toutes') return route.fulfill({ json: initial })
    if (path === '/api/admin/groupes') return route.fulfill({ json: groups })
    if (path === '/api/admin/referents') return route.fulfill({ json: refs })
    return route.fulfill({ json: [] })
  })
  await page.goto('/admin/activites')
  await expect(page.getByRole('button', { name: 'Créer une activité', exact: true })).toBeVisible()
  return writes
}
async function create(page) {
  await page.getByRole('button', { name: 'Créer une activité', exact: true }).click()
  return page.getByRole('form', { name: 'Créer une activité' })
}
async function fill(form) {
  await form.locator('input[type="date"]').first().fill('2099-01-15')
  await form.getByRole('textbox', { name: 'Titre *', exact: true }).fill('Atelier TFE')
  await form.getByRole('textbox', { name: /^Description/ }).fill('Description')
  await form.getByLabel('Lieu *', { exact: true }).fill('Bruxelles')
  await form.locator('input[type="time"]').nth(0).fill('10:00')
  await form.locator('input[type="time"]').nth(1).fill('12:00')
}
for (const visibility of [null, 'PUBLIC', 'PRIVE_GROUPE']) {
  test(`create ${visibility || 'general'} draft`, async ({ page }) => {
    const writes = await setup(page)
    const form = await create(page)
    await expect(form.getByLabel(/prix/i)).toHaveCount(0)
    if (visibility) {
      await form.getByRole('combobox', { name: 'Groupe', exact: true }).selectOption('5')
      await expect(form.getByLabel(/référent/i)).toHaveCount(0)
      await expect(form.getByRole('combobox')).toHaveCount(2)
      await expect(form.getByRole('combobox', { name: 'Qui peut participer ?', exact: true }).locator('option')).toHaveText(['Tout le monde', 'Membres du groupe'])
      await form.getByRole('combobox', { name: 'Qui peut participer ?', exact: true }).selectOption(visibility)
    } else {
      await expect(form.getByRole('combobox', { name: 'Groupe', exact: true })).toHaveValue('')
      await expect(form.getByText(/Référent du groupe/)).toHaveCount(0)
      await expect(form.getByRole('combobox', { name: 'Qui peut participer ?', exact: true })).toHaveCount(0)
    }
    await fill(form)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: test.info().outputPath('form.png'), fullPage: true })
    await form.getByRole('button', { name: 'Enregistrer le brouillon' }).click()
    await expect(page.getByText('Brouillon enregistré.', { exact: true })).toBeVisible()
    expect(writes).toHaveLength(1)
    expect(writes[0].method).toBe('POST')
    expect(writes[0].body).toMatchObject({ gratuite: true, prix: null, groupeId: visibility ? 5 : null, visibilite: visibility || 'PUBLIC' })
    if (visibility) expect(writes[0].body).not.toHaveProperty('referentAssigneId')
    else expect(writes[0].body.referentAssigneId).toBeNull()
    expect(writes[0].body).not.toHaveProperty('statut')
    await expect(form).toHaveCount(0)
  })
}
test('group without valid referent cannot save', async ({ page }) => {
  const writes = await setup(page, [], [group], [])
  const form = await create(page)
  await form.getByRole('combobox', { name: 'Groupe', exact: true }).selectOption('5')
  await expect(form.getByRole('alert')).toContainText('référent actif')
  await expect(form.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeDisabled()
  expect(writes).toHaveLength(0)
})
test('required fields and invalid dates/capacity prevent request', async ({ page }) => {
  const writes = await setup(page)
  const form = await create(page)
  await form.getByRole('button', { name: 'Enregistrer le brouillon' }).click()
  for (const message of ['Renseignez le titre.', 'Renseignez la description.', 'Renseignez le lieu.', 'Renseignez une date et une heure de début valides.', 'Renseignez une date et une heure de fin valides.']) await expect(form.getByRole('alert')).toContainText(message)
  await fill(form)
  await form.locator('input[type="time"]').nth(1).fill('09:00')
  await form.getByLabel('Capacité maximale').fill('0')
  await form.getByRole('button', { name: 'Enregistrer le brouillon' }).click()
  await expect(form.getByRole('alert')).toContainText('La fin doit être postérieure au début.')
  await expect(form.getByRole('alert')).toContainText('La capacité doit être')
  expect(writes).toHaveLength(0)
})
for (const [visibility, groupId, audience] of [
  ['PUBLIC', null, 'Cette activité sera visible par tout le monde après sa publication.'],
  ['PUBLIC', 5, 'Cette activité du groupe Sport sera visible par tout le monde.'],
  ['PRIVE_GROUPE', 5, 'Cette activité sera réservée aux membres acceptés du groupe Sport.'],
]) {
  test(`publish ${visibility} group=${groupId} without asking visibility again`, async ({ page }) => {
    const writes = await setup(page, [{ ...activity, groupeId: groupId, groupeNom: groupId ? 'Sport' : null, visibilite: visibility }])
    const row = page.getByRole('row').filter({ hasText: activity.titre })
    await row.locator('summary').click()
    await row.locator('select').selectOption('PUBLIEE')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(audience, { exact: true })).toBeVisible()
    await expect(dialog.getByRole('radio')).toHaveCount(0)
    await expect(dialog.getByRole('combobox')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Publier', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(writes[0].params).toEqual({ statut: 'PUBLIEE', visibilite: visibility })
  })
}
for (const statut of ['BROUILLON', 'PUBLIEE']) {
  test(`edit ${statut} group activity`, async ({ page }) => {
    const writes = await setup(page, [{ ...activity, statut, groupeId: 5, groupeNom: 'Sport', referentAssigneId: 9, visibilite: 'PRIVE_GROUPE' }])
    await page.getByRole('row').filter({ hasText: activity.titre }).getByRole('button', { name: 'Modifier', exact: true }).click()
    const form = page.getByRole('form')
    for (const label of ['Groupe', 'Qui peut participer ?']) {
      if (statut === 'PUBLIEE') await expect(form.getByRole('combobox', { name: label, exact: true })).toBeDisabled()
      else await expect(form.getByRole('combobox', { name: label, exact: true })).toBeEnabled()
    }
    await form.getByRole('textbox', { name: 'Titre *', exact: true }).fill('Atelier modifié')
    await form.getByRole('button', { name: 'Enregistrer les modifications' }).click()
    await expect(form).toHaveCount(0)
    expect(writes[0].method).toBe('PUT')
    if (statut === 'PUBLIEE') for (const key of ['nature', 'groupeId', 'visibilite', 'referentAssigneId']) expect(writes[0].body).not.toHaveProperty(key)
    else expect(writes[0].body).toMatchObject({ groupeId: 5, visibilite: 'PRIVE_GROUPE' })
  })
}
test('historical activity remains editable without changing price or audience', async ({ page }) => {
  const writes = await setup(page, [{ ...activity, gratuite: false, prix: 15, visibilite: 'MEMBRES', categorie: 'Histoire' }])
  await page.getByRole('row').filter({ hasText: activity.titre }).getByRole('button', { name: 'Modifier', exact: true }).click()
  const form = page.getByRole('form')
  await expect(form.getByLabel('Prix par participant (€)')).toHaveValue('15')
  await expect(form.getByText(/Cette activité historique/)).toBeVisible()
  await form.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(form).toHaveCount(0)
  expect(writes[0].body).toMatchObject({ gratuite: false, prix: 15, categorie: 'Histoire' })
  expect(writes[0].body).not.toHaveProperty('visibilite')
})
test('save error is visible even when the catalogue is empty and preserves input', async ({ page }) => {
  const writes = await setup(page, [], [group], [ref], true)
  const form = await create(page)
  await fill(form)
  await form.getByRole('button', { name: 'Enregistrer le brouillon' }).click()
  await expect.poll(() => writes.length).toBe(1)
  await expect(form.getByRole('textbox', { name: 'Titre *', exact: true })).toHaveValue('Atelier TFE')
  await expect(form.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeEnabled()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('a group draft can become a general draft explicitly', async ({ page }) => {
  const writes = await setup(page, [{ ...activity, groupeId: 5, groupeNom: 'Sport', referentAssigneId: 9, visibilite: 'PRIVE_GROUPE' }])
  await page.getByRole('row').filter({ hasText: activity.titre }).getByRole('button', { name: 'Modifier', exact: true }).click()
  const form = page.getByRole('form')
  await form.getByRole('combobox', { name: 'Groupe', exact: true }).selectOption('')
  await form.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(form).toHaveCount(0)
  expect(writes[0].body).toMatchObject({ nature: 'GENERALE', groupeId: null, referentAssigneId: null, visibilite: 'PUBLIC' })
})
test('paid draft can be published with confirmation', async ({ page }) => {
  const writes = await setup(page, [{ ...activity, gratuite: false, prix: 15 }])
  const row = page.getByRole('row').filter({ hasText: activity.titre })
  await row.locator('summary').click()
  await row.locator('select').selectOption('PUBLIEE')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Publier', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Publier', exact: true }).click()
  expect(writes).toHaveLength(1)
})
