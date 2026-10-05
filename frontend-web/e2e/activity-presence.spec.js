import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

async function sheet(page, { role = 'REFERENT', status = 'PUBLIEE', future = false, validated = false, failSave = false } = {}) {
  const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
  await page.addInitScript(({ token, role }) => {
    localStorage.setItem('bxconnect_lang', 'fr')
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, role, prenom: 'Test' }))
  }, { token, role })
  const activity = { id: 42, titre: 'Atelier présences', statut: status, dateDebut: new Date(Date.now() + (future ? 86400000 : -3600000)).toISOString() }
  let rows = [
    { inscriptionId: 10, membrePrenom: 'Alice', statutInscription: 'CONFIRMEE', statutPresence: validated ? 'PRESENT' : 'NON_RENSEIGNEE', dateValidationPresence: validated ? '2026-10-01T10:00:00' : null },
    { inscriptionId: 11, membrePrenom: 'Bob', statutInscription: 'CONFIRMEE', statutPresence: validated ? 'ABSENT' : 'NON_RENSEIGNEE', dateValidationPresence: validated ? '2026-10-01T10:00:00' : null },
    { inscriptionId: 12, membrePrenom: 'Chloé', statutInscription: 'ANNULEE', statutPresence: 'PRESENT' },
  ]
  const writes = []
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    if (path === '/api/activites/42') return route.fulfill({ json: activity })
    if (path.endsWith('/presences/bulk')) {
      const payload = req.postDataJSON()
      writes.push({ method: 'PATCH', payload })
      if (failSave) return route.fulfill({ status: 400, json: { message: 'Échec de sauvegarde' } })
      rows = rows.map(row => ({ ...row, ...payload.presences.find(item => item.inscriptionId === row.inscriptionId) }))
      return route.fulfill({ json: rows.filter(row => row.statutInscription !== 'ANNULEE') })
    }
    if (path.endsWith('/presences/cloturer')) {
      writes.push({ method: 'POST' })
      rows = rows.map(row => row.statutInscription === 'ANNULEE' ? row : { ...row, dateValidationPresence: new Date().toISOString() })
      return route.fulfill({ json: rows })
    }
    if (path.endsWith('/presences')) return route.fulfill({ json: rows })
    return route.fulfill({ json: [] })
  })
  await page.goto(`/${role === 'ADMIN' ? 'admin' : 'referent'}/activites/42/presences`)
  await expect(page.getByRole('heading', { name: activity.titre })).toBeVisible()
  return writes
}

for (const role of ['REFERENT', 'ADMIN']) {
  test(`${role} : enregistrer plusieurs lignes puis valider sans perdre de modification`, async ({ page }) => {
    const writes = await sheet(page, { role })
    const alice = page.getByRole('row').filter({ hasText: 'Alice' })
    const bob = page.getByRole('row').filter({ hasText: 'Bob' })
    const validate = page.getByRole('button', { name: 'Valider les présences', exact: true })
    await expect(validate).toBeDisabled()
    await alice.getByRole('combobox').selectOption('PRESENT')
    await bob.getByRole('combobox').selectOption('EXCUSE')
    await alice.getByRole('textbox').fill('À l’heure')
    await expect(page.getByText('Enregistrez les modifications avant de valider les présences', { exact: true })).toBeVisible()
    await expect(validate).toBeDisabled()
    expect(writes).toHaveLength(0)
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(validate).toBeEnabled()
    expect(writes).toEqual([{ method: 'PATCH', payload: { presences: [
      { inscriptionId: 10, statutPresence: 'PRESENT', commentairePresence: 'À l’heure' },
      { inscriptionId: 11, statutPresence: 'EXCUSE', commentairePresence: '' },
    ] } }])
    // Even a comment-only local change must block validation.
    await alice.getByRole('textbox').fill('Commentaire corrigé')
    await expect(validate).toBeDisabled()
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(validate).toBeEnabled()
    await validate.click()
    await expect(page.getByText('Cette feuille est déjà validée. Consultation uniquement.', { exact: true })).toBeVisible()
    await expect(alice.getByRole('combobox')).toBeDisabled()
    await expect(alice.getByRole('textbox')).toHaveValue('Commentaire corrigé')
    await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled()
    expect(writes.map(write => write.method)).toEqual(['PATCH', 'PATCH', 'POST'])
  })
}

for (const [options, message] of [
  [{ future: true }, 'L’activité n’a pas encore commencé.'],
  [{ status: 'BROUILLON' }, 'Les présences ne sont pas disponibles pour un brouillon.'],
  [{ status: 'ANNULEE' }, 'Cette activité est annulée.'],
  [{ status: 'TERMINEE' }, 'Cette activité est terminée.'],
  [{ validated: true }, 'Cette feuille est déjà validée.'],
]) {
  test(`lecture seule : ${message}`, async ({ page }) => {
    const writes = await sheet(page, options)
    await expect(page.getByText(message, { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Alice' }).getByRole('combobox')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Valider les présences', exact: true })).toBeDisabled()
    expect(writes).toHaveLength(0)
  })
}

test('les inscriptions annulées restent visibles mais exclues des compteurs et non modifiables', async ({ page }) => {
  await sheet(page)
  await expect(page.getByRole('row').filter({ hasText: 'Chloé' }).getByRole('combobox')).toBeDisabled()
  await expect(page.getByRole('group', { name: 'Présent', exact: true }).getByText('0', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Non renseigné', exact: true }).getByText('2', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Taux de présence', exact: true }).getByText('0%')).toBeVisible()
})

test('un échec d’enregistrement conserve les brouillons et interdit la validation', async ({ page }) => {
  const writes = await sheet(page, { failSave: true })
  const alice = page.getByRole('row').filter({ hasText: 'Alice' })
  await alice.getByRole('combobox').selectOption('ABSENT')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toBeEnabled()
  await expect(alice.getByRole('combobox')).toHaveValue('ABSENT')
  await expect(page.getByRole('button', { name: 'Valider les présences', exact: true })).toBeDisabled()
  expect(writes.map(write => write.method)).toEqual(['PATCH'])
})
