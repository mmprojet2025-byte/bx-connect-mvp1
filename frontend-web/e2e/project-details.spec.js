import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
// Une URL relative reste valide avec une API de test isolée, sans imposer le backend local 8080.
const image = '/uploads/projets/12345678-1234-1234-1234-123456789012.png'
const project = { id: 2, titre: 'Projet avec calendrier', description: 'Description', visibilite: 'PUBLIC', statut: 'APPROUVE', prixParticipation: 5,
  budgetDemande: 2500, groupeId: 10, groupeNom: 'Collectif', nombreParticipants: 2, capacite: 12,
  dateExecution: '2030-05-05', dateLimiteParticipation: '2030-05-04', imageUrl: image }
async function setup(page, role = 'MEMBRE', projects = [project], language = 'fr') {
  const writes = []
  await page.route('**/uploads/projets/*.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1XkAAAAASUVORK5CYII=', 'base64') }))
  await page.addInitScript(({ token, role, language }) => {
    localStorage.setItem('bxconnect_lang', language)
    if (role) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify({ id: 1, role, prenom: 'Alice' }))
    }
  }, { token, role, language })
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (path === '/api/upload') return route.fulfill({ json: { url: image } })
    if (request.method() === 'POST' && path === '/api/projets') {
      writes.push(request.postDataJSON())
      return route.fulfill({ json: { id: 20, ...request.postDataJSON(), statut: 'BROUILLON' } })
    }
    if (['/api/projets', '/api/projets/referent/mes-groupes', '/api/projets/admin/tous'].includes(path)) return route.fulfill({ json: projects })
    if (path === '/api/groupes/mes-adhesions') return route.fulfill({ json: [{ groupeId: 10, groupeNom: 'Collectif', statut: 'ACCEPTE', groupeActif: true }] })
    if (path === '/api/referent/groupes') return route.fulfill({ json: [{ id: 10, nom: 'Collectif', actif: true, statut: 'VALIDE' }] })
    return route.fulfill({ json: path.endsWith('/count') ? { nonLues: 0 } : [] })
  })
  return writes
}
for (const role of ['MEMBRE', 'REFERENT', 'ADMIN']) {
  test(`${role} saves dates capacity and uploaded cover with project`, async ({ page }) => {
    const submissions = []
    page.on('request', request => {
      if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/soumettre')) submissions.push(request.url())
    })
    const writes = await setup(page, role)
    await page.goto(role === 'MEMBRE' ? '/projets' : role === 'REFERENT' ? '/referent/projets' : '/admin/projets')
    const uploadedImage = new URL(image, page.url()).href
    await page.getByRole('button', { name: role === 'MEMBRE' ? 'Proposer un projet' : role === 'REFERENT' ? '+ Nouveau projet' : 'Créer un projet', exact: true }).first().click()
    const form = page.locator('form').first()
    await form.locator('input[type=text]').first().fill('Projet complet')
    if (role === 'MEMBRE') await form.locator('textarea').fill('Un projet avec une couverture et des dates.')
    if (role === 'REFERENT') await form.locator('select').first().selectOption('10')
    await form.getByLabel('Capacité maximale').fill('12')
    await form.getByLabel('Date d’exécution').fill('2030-05-05')
    await form.getByLabel('Date limite de participation').fill('2030-05-04')
    await form.locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1XkAAAAASUVORK5CYII=', 'base64') })
    await expect(form.locator('img')).toHaveAttribute('src', uploadedImage)
    await form.getByRole('button', { name: 'Enregistrer le brouillon', exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(submissions).toHaveLength(0)
    await expect(page.getByText('Brouillon enregistré. Soumettez-le lorsque vous êtes prêt.', { exact: true }).first()).toBeVisible()
    expect(writes[0]).toMatchObject({ capacite: 12, dateExecution: '2030-05-05', dateLimiteParticipation: '2030-05-04', imageUrl: uploadedImage })
  })
}
test('catalogue card displays schedule capacity price and cover for visitors', async ({ page }) => {
  await setup(page, null)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/projets')
  const card = page.locator('article').first()
  await expect(card).toContainText('2 / 12')
  await expect(card).toContainText('05/05/2030')
  await expect(card).toContainText('04/05/2030')
  await expect(card).toContainText('5.00 €')
  await expect(card.locator('img')).toHaveAttribute('src', image)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('full and expired projects cannot start a new participation from the card', async ({ page }) => {
  await setup(page, 'MEMBRE', [{ ...project, capacite: 2 }, { ...project, id: 3, dateLimiteParticipation: '2020-01-01' }])
  await page.goto('/projets')
  await expect(page.getByText('Complet', { exact: true })).toBeVisible()
  await expect(page.getByText('Participations clôturées', { exact: true })).toBeVisible()
  const buttons = page.getByRole('button', { name: 'Participer', exact: true })
  await expect(buttons).toHaveCount(2)
  await expect(buttons.nth(0)).toBeDisabled()
  await expect(buttons.nth(1)).toBeDisabled()
})
test('invalid date order prevents submission', async ({ page }) => {
  const writes = await setup(page)
  await page.goto('/projets')
  await page.getByRole('button', { name: 'Proposer un projet', exact: true }).first().click()
  const form = page.locator('form')
  await form.locator('input[type=text]').fill('Test')
  await form.locator('textarea').fill('Test')
  await form.getByLabel('Date d’exécution').fill('2030-05-05')
  await form.getByLabel('Date limite de participation').fill('2030-05-06')
  await form.locator('button[type=submit]').click()
  expect(writes).toHaveLength(0)
  expect(await form.evaluate(element => element.checkValidity())).toBe(false)
})
for (const [language, label] of [['en', 'Execution date'], ['nl', 'Uitvoeringsdatum']]) {
  test(`project dates translated in ${language}`, async ({ page }) => {
    await setup(page, null, [project], language)
    await page.goto('/projets')
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  })
}


test('full project disables participation for visitors too', async ({ page }) => {
  await setup(page, null, [{ ...project, capacite: 2, nombreParticipants: 2 }])
  await page.goto('/projets')
  const card = page.locator('article').first()
  await expect(card.getByRole('button', { name: 'Participer', exact: true })).toBeDisabled()
  await expect(card.getByRole('link', { name: 'Participer', exact: true })).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'Voir', exact: true })).toBeEnabled()
})
