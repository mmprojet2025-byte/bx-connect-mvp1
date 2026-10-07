import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const locales = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [lang,
  JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url)))]))

async function setup(page, lang, authenticated = true) {
  await page.addInitScript(({ token, lang, authenticated }) => {
    localStorage.setItem('bxconnect_lang', lang)
    if (authenticated) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'MEMBRE', prenom: 'Test' }))
    }
  }, { token, lang, authenticated })
  const requests = []
  let cancelled = false
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const request = route.request(), path = new URL(request.url()).pathname
    requests.push({ path, method: request.method() })
    if (path === '/api/activites/42') return route.fulfill({ json: {
      id: 42, titre: 'Activité payée', gratuite: false, prix: 5, statut: 'PUBLIEE',
      dateDebut: '2099-06-01T10:00', dateFin: '2099-06-01T12:00',
      peutSInscrire: false, ...(cancelled ? {} : { inscriptionId: 4, statutInscription: 'PAYEE' }),
    } })
    if (path === '/api/inscriptions/4' && request.method() === 'DELETE') {
      cancelled = true
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/activites/paiement-options') return route.fulfill({ json: { STRIPE: true, PAYPAL: false } })
    return route.fulfill({ json: path.endsWith('/count') ? { nonLues: 0 } : [] })
  })
  return requests
}

for (const lang of ['fr', 'nl', 'en']) {
  test(`${lang}: Google is explicitly future and cannot initiate authentication`, async ({ page }) => {
    const requests = await setup(page, lang, false), t = locales[lang]
    await page.goto('/login')
    await expect(page.getByRole('button', { name: t.auth.googleSoon, exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: t.auth.login_btn, exact: true })).toBeEnabled()
    await expect(page.locator('a[href*="accounts.google.com"]')).toHaveCount(0)
    expect(requests.filter(request => request.method !== 'GET')).toEqual([])
  })

  test(`${lang}: invoices clearly cover project participation only`, async ({ page }) => {
    const requests = await setup(page, lang), t = locales[lang]
    await page.goto('/mes-factures')
    await expect(page.getByRole('heading', { name: t.projectPayment.invoiceTitle, exact: true })).toBeVisible()
    await expect(page.getByText(t.projectPayment.invoiceHelp, { exact: true })).toBeVisible()
    await expect(page.getByText(t.projectPayment.empty, { exact: true })).toBeVisible()
    expect(requests.some(request => request.path === '/api/projets-paiements/mes-factures')).toBe(true)
    expect(requests.some(request => request.path.startsWith('/api/stripe/'))).toBe(false)
  })

  test(`${lang}: paid withdrawal explains no automatic refund and keeps the existing action`, async ({ page }) => {
    const requests = await setup(page, lang), t = locales[lang]
    await page.goto('/activites/42')
    await expect(page.getByText(t.activityEditor.noAutomaticRefund, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: t.activities.cancel_registration, exact: true }).click()
    await expect(page.getByText(t.activities.success_cancel_registration, { exact: true })).toBeVisible()
    expect(requests.filter(request => request.method !== 'GET')).toEqual([
      { path: '/api/inscriptions/4', method: 'DELETE' },
    ])
  })
}
