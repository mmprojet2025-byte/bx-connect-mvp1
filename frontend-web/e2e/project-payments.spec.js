import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const project = { id: 2, titre: 'Projet de test', visibilite: 'PUBLIC', statut: 'APPROUVE', prixParticipation: 5,
  budgetDemande: 2500, groupeId: 10, groupeNom: 'Collectif', nombreParticipants: 0 }
const paid = { id: 3, projetId: 2, titreProjet: project.titre, participant: 'Alice Test', montant: 5, devise: 'EUR',
  statut: 'PAYE', dateCreation: '2026-10-06T10:00:00', datePaiement: '2026-10-06T11:00:00', numeroRecu: 'BX-PROJET-3' }
async function setup(page, role = 'MEMBRE', rows = [paid]) {
  const writes = []
  await page.addInitScript(({ token, role }) => {
    localStorage.setItem('bxconnect_lang', 'fr')
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, role, prenom: 'Alice' }))
  }, { token, role })
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const r=route.request(), path=new URL(r.url()).pathname
    if (r.method() === 'POST') writes.push({ path, body: r.postDataJSON() })
    if (path.endsWith('/checkout')) return route.fulfill({ json: { ...paid, statut: 'EN_ATTENTE', checkoutUrl: 'https://checkout.stripe.com/c/pay/test' } })
    if (path === '/api/projets' || path === '/api/projets/referent/mes-groupes' || path === '/api/projets/admin/tous') return route.fulfill({ json: [project] })
    if (path === '/api/projets/admin/2') return route.fulfill({ json: { projet: project } })
    if (path === '/api/projets-paiements/3/recu') return route.fulfill({ json: paid })
    if (path.startsWith('/api/projets-paiements/')) return route.fulfill({ json: rows })
    if (path === '/api/groupes/mes-adhesions') return route.fulfill({ json: [{ groupeId: 10, groupeNom: 'Collectif', statut: 'ACCEPTE', groupeActif: true }] })
    if (path === '/api/referent/groupes') return route.fulfill({ json: [{ id: 10, nom: 'Collectif', actif: true, statut: 'VALIDE' }] })
    return route.fulfill({ json: path.endsWith('/count') ? { nonLues: 0 } : [] })
  })
  return writes
}
test('catalogue shows participation price and paid join uses checkout, not free registration', async ({ page }) => {
  const writes=await setup(page)
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Checkout mock</h1>' }))
  await page.goto('/projets')
  await expect(page.locator('article').first()).toContainText('5.00 €')
  await expect(page.locator('article').first()).not.toContainText('2500')
  await page.getByRole('button', { name: 'Participer', exact: true }).click()
  await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/test')
  expect(writes.map(w => w.path)).toEqual(['/api/projets-paiements/projets/2/checkout'])
})
test('member finds paid receipt in Mes factures and downloads PDF', async ({ page }) => {
  await setup(page)
  await page.goto('/mes-factures?recu=3')
  await expect(page.getByRole('heading', { name: 'Mes factures' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Télécharger le reçu PDF/ }).click()
  expect((await download).suggestedFilename()).toBe('BX-PROJET-3.pdf')
})
test('pending checkout does not expose a receipt or claim payment success', async ({ page }) => {
  await setup(page, 'MEMBRE', [{ ...paid, statut: 'EN_ATTENTE', numeroRecu: null, datePaiement: null }])
  await page.goto('/mes-factures?recu=3')
  await expect(page.getByText(/Paiement en attente de confirmation/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Télécharger le reçu/ })).toHaveCount(0)
})
test('referent opens transactions in the project and downloads a receipt', async ({ page }) => {
  await setup(page, 'REFERENT')
  await page.goto('/referent/projets')
  await page.getByRole('button', { name: /Tous$/i }).click()
  await page.getByRole('button', { name: 'Transactions et reçus' }).click()
  await expect(page.getByText('Alice Test', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Télécharger le reçu PDF/ })).toBeVisible()
})
test('creation keeps budget distinct from paid participation price', async ({ page }) => {
  await setup(page)
  await page.goto('/projets')
  await page.locator('header').getByRole('button', { name: 'Proposer un projet' }).click()
  const form=page.locator('form')
  await form.getByRole('radio', { name: 'Payante', exact: true }).check()
  await form.getByRole('spinbutton', { name: 'Prix par participant (€)' }).fill('5.00')
  await expect(form.locator('#project-budget')).toBeVisible()
  await expect(form.getByRole('spinbutton', { name: 'Prix par participant (€)' })).toHaveValue('5.00')
})

test('ADMIN sees project transactions and paid receipts inside the project dossier', async ({ page }) => {
  await setup(page, 'ADMIN')
  await page.goto('/admin/projets')
  await page.getByRole('button', { name: 'Détails', exact: true }).click()
  await page.getByRole('button', { name: 'Transactions et reçus', exact: true }).click()
  await expect(page.getByRole('button', { name: /Télécharger le reçu PDF/ })).toBeVisible()
})
test('invoices distinguish an empty list from an unavailable source', async ({ page }) => {
  await setup(page, 'MEMBRE', [])
  await page.goto('/mes-factures')
  await expect(page.getByText('Aucune transaction pour le moment.')).toBeVisible()
  await page.route('**/api/projets-paiements/mes-factures', route => route.fulfill({ status: 500, json: {} }))
  await page.reload()
  await expect(page.getByText('Données indisponibles.')).toBeVisible()
  await expect(page.getByText('Aucune transaction pour le moment.')).toHaveCount(0)
})


test('free project participation is accepted immediately without Checkout', async ({ page }) => {
  const writes = await setup(page)
  await page.route(url => url.pathname === '/api/projets', route => route.fulfill({ json: [{ ...project, prixParticipation: 0 }] }))
  await page.goto('/projets')
  await page.getByRole('button', { name: 'Participer', exact: true }).click()
  await expect(page.locator('article').getByRole('button', { name: 'Participant', exact: true })).toBeVisible()
  expect(writes.map(write => write.path)).toEqual(['/api/projets/2/rejoindre'])
  await expect(page).toHaveURL(/\/projets$/)
})


test('taking the last free place immediately disables the participation button', async ({ page }) => {
  const writes = await setup(page)
  await page.route(url => url.pathname === '/api/projets', route => route.fulfill({ json: [{ ...project, prixParticipation: 0, capacite: 2, nombreParticipants: 1 }] }))
  await page.goto('/projets')
  await page.getByRole('button', { name: 'Participer', exact: true }).click()
  const card = page.locator('article').first()
  await expect(card).toContainText('2 / 2')
  await expect(card.getByText('Complet', { exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Participant', exact: true })).toBeDisabled()
  expect(writes.map(write => write.path)).toEqual(['/api/projets/2/rejoindre'])
})
