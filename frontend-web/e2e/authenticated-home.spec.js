import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
for (const role of ['MEMBRE', 'REFERENT', 'ADMIN', 'PARTENAIRE', 'SUPER_ADMIN']) {
  for (const width of [390, 1440]) {
    test(`${role} at ${width}px can return home and keep their session`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(({ role, token }) => {
        localStorage.setItem('bxconnect_lang', 'fr')
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify({ id: 1, role, prenom: 'Test', email: 'test@example.org' }))
      }, { role, token })
      await page.route(url => url.pathname.startsWith('/api/'), route =>
        route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/count') ? { nonLues: 0 } : [] }))
      // This shared page uses the same Navbar as the role dashboards.
      await page.goto('/a-propos')
      const home = page.locator('nav').getByRole('link', { name: 'Accueil', exact: true })
      await expect(home).toBeVisible()
      await home.click()
      await expect(page).toHaveURL('/')
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('nav').getByRole('img', { name: 'BX-CONNECT', exact: true })).toBeVisible()
      await page.reload()
      await expect(page).toHaveURL('/')
      expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(token)
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('user')).role)).toBe(role)
      await expect(page.locator('.app-sidebar')).toHaveCount(0)
      await expect(page.locator('button[aria-controls=app-sidebar-mobile-drawer]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.locator('nav').getByRole('button', { name: /Compte/ }).click()
      const space = page.getByRole('menuitem', { name: 'Mon espace', exact: true })
      const destinations = { MEMBRE: '/dashboard', REFERENT: '/referent/dashboard', ADMIN: '/admin/dashboard', PARTENAIRE: '/partenaire', SUPER_ADMIN: '/super-admin/dashboard' }
      await expect(space).toHaveAttribute('href', destinations[role])
      await space.click()
      await expect(page).toHaveURL(new RegExp(destinations[role] + '$'))
      if (width >= 1024) await expect(page.locator('.app-sidebar')).toBeVisible()
      else await expect(page.locator('button[aria-controls=app-sidebar-mobile-drawer]')).toBeVisible()
    })
  }
}

test('direct member login still opens dashboard before returning home', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bxconnect_lang', 'fr'))
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/login') return route.fulfill({ json: { token, role: 'MEMBRE', prenom: 'Test', email: 'test@example.org' } })
    return route.fulfill({ json: path.endsWith('/count') ? { nonLues: 0 } : [] })
  })
  await page.goto('/login')
  await page.locator('#login-email').fill('test@example.org')
  await page.locator('#login-password').fill('Test-password')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
  await page.locator('nav').getByRole('link', { name: 'Accueil', exact: true }).click()
  await expect(page).toHaveURL('/')
})
