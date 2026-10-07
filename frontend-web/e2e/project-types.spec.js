import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const locales = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url)))]))
async function setup(page, { member = true, adhesion = null, lang = 'fr' } = {}) {
  const projects = [
    { id: 1, titre: 'Public ouvert', visibilite: 'PUBLIC', statut: 'APPROUVE', nombreParticipants: 0 },
    { id: 2, titre: 'Groupe ouvert', visibilite: 'GROUPE', statut: 'EN_COURS', groupeId: 10, groupeNom: 'Collectif', nombreParticipants: 0 },
    { id: 3, titre: 'Public terminé', visibilite: 'PUBLIC', statut: 'TERMINE', nombreParticipants: 0 },
  ]
  const joined = []
  await page.addInitScript(({ token, member, lang }) => {
    localStorage.setItem('bxconnect_lang', lang)
    if (member) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'MEMBRE', prenom: 'Test' }))
    }
  }, { token, member, lang })
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/projets') return route.fulfill({ json: projects })
    if (path === '/api/groupes/mes-adhesions') return route.fulfill({ json: adhesion ? [adhesion] : [] })
    if (path.endsWith('/rejoindre')) { joined.push(path); return route.fulfill({ status: 201 }) }
    return route.fulfill({ json: [] })
  })
  await page.goto('/projets')
  await expect(page.getByRole('heading', { name: 'Public ouvert', exact: true })).toBeVisible()
  return joined
}
for (const lang of ['fr', 'nl', 'en']) {
  test(`${lang}: public project can be joined without a group, group and finished projects cannot`, async ({ page }) => {
    const joined = await setup(page, { lang }), t = locales[lang]
    const cards = page.locator('article')
    await expect(cards.filter({ hasText: 'Groupe ouvert' }).getByRole('button', { name: t.projects.join, exact: true })).toBeDisabled()
    await expect(cards.filter({ hasText: 'Public terminé' }).getByRole('button', { name: t.projects.join, exact: true })).toBeDisabled()
    await cards.filter({ hasText: 'Public ouvert' }).getByRole('button', { name: t.projects.join, exact: true }).click()
    await expect.poll(() => joined).toEqual(['/api/projets/1/rejoindre'])
    await expect(cards.filter({ hasText: 'Public ouvert' }).getByRole('button', { name: t.projects.joinedLabel, exact: true })).toBeVisible()
    await expect(cards.filter({ hasText: 'Groupe ouvert' }).getByText(t.projectVisibility.GROUPE, { exact: true })).toBeVisible()
    const options = await page.locator('select').allTextContents()
    expect(options.join(' ')).not.toContain(t.projectVisibility.COMMUNAUTE)
    expect(options.join(' ')).not.toContain(t.projectVisibility.PARTENAIRES)
  })
}
for (const statut of ['ACCEPTE', 'SUSPENDU', 'EN_ATTENTE']) {
  test(`group participation with membership ${statut}`, async ({ page }) => {
    await setup(page, { adhesion: { groupeId: 10, statut, groupeActif: true } })
    const button = page.locator('article').filter({ hasText: 'Groupe ouvert' }).getByRole('button', { name: 'Participer', exact: true })
    if (statut === 'ACCEPTE') await expect(button).toBeEnabled()
    else await expect(button).toBeDisabled()
  })
}
test('visitor sees both project types with login links and no join action', async ({ page }) => {
  await setup(page, { member: false })
  await expect(page.getByRole('heading', { name: 'Groupe ouvert', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Participer', exact: true })).toHaveCount(0)
  await expect(page.locator('article a[href="/login"]')).toHaveCount(3)
})

test('member creation offers only Group and Public', async ({ page }) => {
  await setup(page, { adhesion: { groupeId: 10, groupeNom: 'Collectif', statut: 'ACCEPTE', groupeActif: true } })
  await page.locator('header').getByRole('button', { name: locales.fr.ux.projects.propose }).click()
  const type = page.locator('form select')
  await expect(type.locator('option')).toHaveCount(2)
  await type.selectOption('PUBLIC')
  await expect(type).toHaveValue('PUBLIC')
})
