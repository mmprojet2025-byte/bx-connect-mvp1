import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

const widths = [320, 375, 390]
const testToken = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`

async function installSession(page, role) {
  await page.addInitScript(({ sessionRole, sessionToken }) => {
    window.localStorage.setItem('bxconnect_lang', 'fr')
    window.localStorage.setItem('token', sessionToken)
    window.localStorage.setItem('user', JSON.stringify({
      id: 1,
      prenom: 'Test',
      nom: 'Responsive',
      email: 'test@example.org',
      role: sessionRole,
    }))
  }, { sessionRole: role, sessionToken: testToken })
}

async function mockEmptyApi(page) {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const pathname = new URL(route.request().url()).pathname
    const data = pathname.endsWith('/membre/dashboard')
      ? {
          groupe: null,
          referent: null,
          messagerieDisponible: false,
          notifications: [],
          inscriptions: [],
          projets: [],
        }
      : []

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  })
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
}

test('member dashboard has a true empty feed without horizontal overflow', async ({ page }) => {
  await installSession(page, 'MEMBRE')
  await mockEmptyApi(page)

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dashboard')
    await expect(page.getByText('Aucune activité récente pour le moment.')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
})

test('admin project filters do not overflow on narrow screens', async ({ page }) => {
  await installSession(page, 'ADMIN')
  await mockEmptyApi(page)

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/admin/projets')
    await expect(page.getByPlaceholder('Rechercher par titre...')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
})

for (const language of ['fr', 'nl', 'en']) {
  test(`document language follows ${language.toUpperCase()} on startup`, async ({ page }) => {
    await page.addInitScript(value => {
      window.localStorage.setItem('bxconnect_lang', value)
    }, language)
    await mockEmptyApi(page)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', language)
  })
}
