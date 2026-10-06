import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const translations = Object.fromEntries(['fr','nl','en'].map(lang => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url)))]))
async function setup(page, role = 'ADMIN', lang = 'fr') {
  const group = { id: 10, nom: 'Groupe test', categorie: 'Culture', theme: 'Art', commune: 'Ixelles', description: 'Description conservée', objectif: 'Objectif conservé', adresseReunion: 'Adresse conservée', latitude: 50.8, longitude: 4.3, capaciteMax: 3, referentId: 1, statut: 'VALIDE', actif: true, nombreMembres: 1 }
  const members = [
    { id: 20, userId: 2, groupeId: 10, groupeNom: group.nom, prenom: 'Alice', nom: 'Acceptée', email: 'alice@example.org', statut: 'ACCEPTE', groupeActif: true },
    { id: 21, userId: 3, groupeId: 10, prenom: 'Paul', nom: 'Demande', email: 'pending@example.org', statut: 'EN_ATTENTE', groupeActif: true },
  ]
  const writes = []
  await page.addInitScript(({ token, role, lang }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, role, prenom: 'Test', email: 'test@example.org' }))
    localStorage.setItem('bxconnect_lang', lang)
  }, { token, role, lang })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (req.method() !== 'GET') writes.push({ path, method: req.method(), data: req.postDataJSON() })
    if (path === '/api/admin/referents') return route.fulfill({ json: [{ id: 1, prenom: 'Ref', nom: 'Un', actif: true }, { id: 4, prenom: 'Ref', nom: 'Deux', actif: true }] })
    if (path === '/api/admin/groupes' && req.method() === 'POST') return route.fulfill({ json: { ...group, ...req.postDataJSON(), id: 11 } })
    if (['/api/admin/groupes', '/api/referent/groupes'].includes(path)) return route.fulfill({ json: [group] })
    if (path === '/api/groupes') return route.fulfill({ json: group.actif ? [group] : [] })
    if (path === '/api/groupes/mes-adhesions') return route.fulfill({ json: members.filter(m => m.id === 20) })
    if (path === '/api/groupes/10' && req.method() === 'PUT') { Object.assign(group, req.postDataJSON()); return route.fulfill({ json: group }) }
    if (path === '/api/groupes/10' && req.method() === 'DELETE') { group.statut = 'ARCHIVE'; group.actif = false; return route.fulfill({ status: 204 }) }
    if (path.includes('/admin/groupes/10/referent/')) { group.referentId = 4; return route.fulfill({ json: group }) }
    if (path.endsWith('/10/membres')) return route.fulfill({ json: members })
    if (path.endsWith('/10/demandes')) return route.fulfill({ json: members.filter(m => m.statut === 'EN_ATTENTE') })
    if (path.includes('/membres/20/')) { members[0].statut = path.endsWith('/reactiver') ? 'ACCEPTE' : 'SUSPENDU'; return route.fulfill({ json: members[0] }) }
    if (path.includes('/demandes/21/')) { members[1].statut = path.endsWith('/accepter') ? 'ACCEPTE' : 'REFUSE'; return route.fulfill({ json: members[1] }) }
    return route.fulfill({ json: [] })
  })
  return { group, members, writes }
}
for (const lang of ['fr','nl','en']) {
  test(`${lang}: short creation requires name and referent, keeps zero capacity and has no upload`, async ({ page }) => {
    const { writes } = await setup(page, 'ADMIN', lang), t = translations[lang]
    await page.goto('/admin/groupes')
    await page.getByRole('button', { name: t.admin.createGroup, exact: true }).first().click()
    const form = page.locator('form')
    await expect(form.locator('input')).toHaveCount(5)
    await expect(form.locator('input[type="file"], textarea')).toHaveCount(0)
    await expect(form.locator('select')).toHaveAttribute('required','')
    await form.getByRole('button', { name: t.admin.createGroup, exact: true }).click()
    expect(writes).toHaveLength(0)
    await form.getByRole('textbox', { name: t.admin.groupName, exact: true }).fill('Nouveau groupe')
    await form.locator('select').selectOption('1')
    await form.getByRole('button', { name: t.admin.createGroup, exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0].data).toMatchObject({ nom: 'Nouveau groupe', referentId: 1, capaciteMax: 0 })
  })
}
test('ADMIN edits secondary information without clearing coordinates, changes referent and archives with confirmation', async ({ page }) => {
  const { group, writes } = await setup(page)
  await page.goto('/admin/groupes')
  await page.getByRole('button', { name: 'Gérer', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await page.locator('form textarea').first().fill('Description actualisée')
  await page.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click()
  await expect.poll(() => group.description).toBe('Description actualisée')
  expect(group.latitude).toBe(50.8)
  expect(group.objectif).toBe('Objectif conservé')
  await page.locator('aside select').selectOption('4')
  await expect.poll(() => group.referentId).toBe(4)
  page.once('dialog', d => d.dismiss())
  await page.getByRole('button', { name: 'Archiver le groupe' }).click()
  expect(writes.some(w => w.method === 'DELETE')).toBe(false)
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Archiver le groupe' }).click()
  await expect.poll(() => group.statut).toBe('ARCHIVE')
  expect(writes.filter(w => w.method === 'DELETE').map(w => w.path)).toEqual(['/api/groupes/10'])
})
for (const width of [390,1440]) test(`REFERENT ${width}: only accepted memberships, suspension and reactivation`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const { members, writes } = await setup(page, 'REFERENT')
  await page.goto('/referent/membres')
  await expect(page.getByText('pending@example.org')).toHaveCount(0)
  page.on('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Désactiver', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Réactiver', exact: true })).toBeVisible()
  expect(members[0].statut).toBe('SUSPENDU')
  await page.getByRole('button', { name: 'Réactiver', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Désactiver', exact: true })).toBeVisible()
  expect(writes.every(w => w.path.startsWith('/api/referent/groupes/10/membres/20/'))).toBe(true)
})
for (const action of ['Accepter','Refuser']) test(`REFERENT handles a pending request: ${action}`, async ({ page }) => {
  const { members } = await setup(page, 'REFERENT')
  await page.goto('/referent/demandes')
  await page.getByRole('button', { name: action, exact: true }).click()
  await expect.poll(() => members[1].statut).toBe(action === 'Accepter' ? 'ACCEPTE' : 'REFUSE')
  await expect(page.getByRole('button', { name: action, exact: true })).toHaveCount(0)
})
test('archived membership does not block requesting a current group', async ({ page }) => {
  const { members, writes } = await setup(page, 'MEMBRE')
  members[0].groupeId = 99; members[0].groupeActif = false
  await page.goto('/groupes')
  await page.getByRole('button', { name: translations.fr.ux.groups.joinGroup, exact: true }).click()
  await expect.poll(() => writes.some(w => w.path === '/api/groupes/10/rejoindre')).toBe(true)
})

test('project creation selects the current membership instead of an archived historical group', async ({ page }) => {
  const { writes } = await setup(page, 'MEMBRE')
  await page.route('**/api/groupes/mes-adhesions', route => route.fulfill({ json: [
    { groupeId: 99, statut: 'ACCEPTE', groupeActif: false },
    { groupeId: 10, statut: 'ACCEPTE', groupeActif: true },
  ] }))
  await page.goto('/projets')
  await page.locator('header').getByRole('button', { name: translations.fr.ux.projects.propose, exact: true }).click()
  await page.locator('#project-title').fill('Projet du groupe actuel')
  await page.locator('form textarea').fill('Description du projet')
  await page.getByRole('button', { name: translations.fr.projects.submit_project, exact: true }).click()
  await expect.poll(() => writes.find(w => w.path === '/api/projets')?.data?.groupeId).toBe(10)
})
