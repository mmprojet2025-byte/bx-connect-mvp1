import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
async function setup(page, { role = 'REFERENT', status = 'SOUMIS', fail = false } = {}) {
  let project = { id: 2, titre: 'Projet du membre', description: 'Description complète à relire', objectifs: 'Objectifs', statut: status,
    groupeId: 10, groupeNom: 'Collectif', porteurPrenom: 'Alice', porteurNom: 'Test', visibilite: 'GROUPE', budgetDemande: 100,
    prixParticipation: 0, capacite: 12, dateExecution: '2030-05-05', dateLimiteParticipation: '2030-05-04' }
  const writes = []
  await page.addInitScript(({ token, role }) => {
    localStorage.setItem('bxconnect_lang', 'fr'); localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: role === 'REFERENT' ? 7 : 1, role, prenom: 'Alice' }))
  }, { token, role })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (['PUT', 'PATCH'].includes(request.method())) {
      writes.push({ path, body: request.postDataJSON() })
      if (request.method() === 'PUT') project = { ...project, ...request.postDataJSON() }
      else {
        if (fail) return route.fulfill({ status: 500, json: { message: 'Erreur de test' } })
        await new Promise(resolve => setTimeout(resolve, 300))
        project = { ...project, statut: 'VALIDE_REFERENT' }
      }
      return route.fulfill({ json: project })
    }
    if (path === '/api/projets/mes-projets') return route.fulfill({ json: role === 'REFERENT' ? [] : [project] })
    if (['/api/projets/referent/mes-groupes', '/api/projets'].includes(path)) return route.fulfill({ json: [project] })
    if (path === '/api/referent/groupes') return route.fulfill({ json: [{ id: 10, nom: 'Collectif', actif: true, statut: 'VALIDE' }] })
    if (path === '/api/groupes/mes-adhesions') return route.fulfill({ json: [{ groupeId: 10, groupeNom: 'Collectif', statut: 'ACCEPTE', groupeActif: true }] })
    return route.fulfill({ json: path.endsWith('/count') ? { nonLues: 0 } : [] })
  })
  return writes
}
test('referent opens member dossier edits it and sends once to ADMIN', async ({ page }) => {
  const writes = await setup(page)
  await page.goto('/referent/projets')
  await page.getByRole('button', { name: 'Ouvrir la fiche' }).click()
  const details = page.getByRole('region', { name: 'Fiche du projet' })
  await expect(details).toContainText('Description complète à relire')
  await details.getByRole('button', { name: 'Modifier', exact: true }).click()
  const editor = page.locator('form').first()
  await editor.getByRole('textbox', { name: 'Titre *', exact: true }).fill('Projet relu')
  await expect(editor.getByRole('combobox', { name: 'Groupe associé' })).toBeDisabled()
  await editor.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(details).toContainText('Projet relu')
  await details.getByRole('button', { name: 'Soumettre à l’ADMIN', exact: true }).click()
  const decision = page.getByRole('form', { name: 'Confirmation de la décision' })
  await expect(decision).toBeFocused()
  await expect(page.locator('article').getByRole('button', { name: 'Soumettre à l’ADMIN', exact: true })).toBeDisabled()
  const confirm = decision.locator('button[type=submit]')
  await confirm.click()
  await expect(confirm).toBeDisabled()
  await expect(decision).toHaveCount(0)
  await expect(page.locator('article').first()).toContainText('Soumis à la validation ADMIN')
  await expect(page.getByRole('button', { name: 'Soumettre à l’ADMIN', exact: true })).toHaveCount(0)
  await expect(page.locator('article').getByRole('button', { name: 'Modifier', exact: true })).toHaveCount(0)
  expect(writes.map(write => write.path)).toEqual(['/api/projets/referent/2', '/api/projets/referent/2/valider'])
  expect(writes[0].body).toMatchObject({ titre: 'Projet relu', capacite: 12, dateExecution: '2030-05-05' })
})
test('owner sees submitted to ADMIN status', async ({ page }) => {
  await setup(page, { role: 'MEMBRE', status: 'VALIDE_REFERENT' })
  await page.goto('/projets')
  await expect(page.locator('article')).toHaveCount(0)
  await page.getByRole('button', { name: 'Mes projets', exact: true }).click()
  await expect(page.locator('article').first()).toContainText('Soumis à la validation ADMIN')
})
test('failed submission retains submitted-to-referent state and allows retry', async ({ page }) => {
  await setup(page, { fail: true })
  await page.goto('/referent/projets')
  await page.getByRole('button', { name: 'Soumettre à l’ADMIN', exact: true }).click()
  const decision = page.getByRole('form', { name: 'Confirmation de la décision' })
  await decision.getByRole('button', { name: 'Soumettre à l’ADMIN', exact: true }).click()
  await expect(decision.getByRole('button', { name: 'Soumettre à l’ADMIN', exact: true })).toBeEnabled()
  await expect(page.locator('article')).not.toContainText('Soumis à la validation ADMIN')
})
