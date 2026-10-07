import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'

for (const lang of ['fr', 'nl', 'en']) test(`${lang}: support list excludes payments and keeps processed history read-only`, async ({ page }) => {
  const t = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url), 'utf8'))
  const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`
  await page.addInitScript(({ token, lang }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'ADMIN', prenom: 'Admin' }))
    localStorage.setItem('bxconnect_lang', lang)
  }, { token, lang })
  const declaration = { id: 1, projetId: 1, projetTitre: 'Déclaration valide', typeSource: 'DECLARATION', statutPaiement: 'EN_ATTENTE', montant: 10 }
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/partenaire/admin/tous') return route.fulfill({ json: [declaration,
      { ...declaration, id: 2, projetTitre: 'Paiement Stripe', typeSource: 'STRIPE' },
      { ...declaration, id: 3, projetTitre: 'Activité invalide', activiteId: 4 },
      { ...declaration, id: 4, projetTitre: 'Déclaration acceptée', statutPaiement: 'PAYE' },
    ] })
    return route.fulfill({ json: [] })
  })
  await page.goto('/admin/soutiens')
  await expect(page.getByText('Déclaration valide', { exact: true })).toBeVisible()
  await expect(page.getByText('Paiement Stripe', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Activité invalide', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: t.partnerSupport.admin.reject, exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: `${t.partnerSupport.statuses.EN_ATTENTE} 1`, exact: true })).toBeVisible()
  await page.getByRole('button', { name: `${t.partnerSupport.statuses.PAYE} 1`, exact: true }).click()
  await expect(page.getByText('Déclaration acceptée', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: t.partnerSupport.admin.reject, exact: true })).toHaveCount(0)
})
