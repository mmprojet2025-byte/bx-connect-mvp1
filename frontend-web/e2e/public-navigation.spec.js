import { test, expect } from '@playwright/test'

async function mockPublicData(page) {
  await page.route(url => new URL(url).pathname.startsWith('/api/'), async route => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/api/activites/options-filtres') {
      await route.fulfill({ json: { categories: [], themes: [], lieux: [] } })
      return
    }
    await route.fulfill({ json: [] })
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('bxconnect_lang', 'fr'))
  await mockPublicData(page)
})

test('affiche les six accès publics directement dans la navigation desktop', async ({ page }) => {
  await page.goto('/')

  const navigation = page.locator('nav').first()
  await expect(navigation.getByRole('link', { name: 'Accueil', exact: true })).toHaveAttribute('href', '/')
  await expect(navigation.getByRole('link', { name: 'Activités', exact: true })).toHaveAttribute('href', '/activites')
  await expect(navigation.getByRole('link', { name: 'Groupes', exact: true })).toHaveAttribute('href', '/groupes')
  await expect(navigation.getByRole('link', { name: 'Projets', exact: true })).toHaveAttribute('href', '/projets')
  await expect(navigation.getByRole('link', { name: 'Connexion', exact: true })).toHaveAttribute('href', '/login')
  await expect(navigation.getByRole('link', { name: "S'inscrire", exact: true })).toHaveAttribute('href', '/register')
})

test('rend toutes les destinations publiques accessibles dans le menu web sur petit écran', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  expect(await page.locator('html').evaluate(element => element.scrollWidth === element.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()

  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Accueil', exact: true })).toHaveAttribute('href', '/')
  await expect(menu.getByRole('menuitem', { name: 'Activités', exact: true })).toHaveAttribute('href', '/activites')
  await expect(menu.getByRole('menuitem', { name: 'Groupes', exact: true })).toHaveAttribute('href', '/groupes')
  await expect(menu.getByRole('menuitem', { name: 'Projets', exact: true })).toHaveAttribute('href', '/projets')
  await expect(menu.getByRole('menuitem', { name: 'Connexion', exact: true })).toHaveAttribute('href', '/login')
  await expect(menu.getByRole('menuitem', { name: "S'inscrire", exact: true })).toHaveAttribute('href', '/register')

  await menu.getByRole('menuitem', { name: 'Activités', exact: true }).click()
  await expect(page).toHaveURL('/activites')
})

test('conserve un header sans débordement sur tablette', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')

  expect(await page.locator('html').evaluate(element => element.scrollWidth === element.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await expect(page.getByRole('menu').getByRole('menuitem', { name: 'Projets', exact: true })).toBeVisible()
})
