import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`
const translations = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [
  lang, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url), 'utf8')),
]))
const paths = ['/admin/dashboard', '/admin/utilisateurs', '/admin/referents', '/admin/partenaires', '/admin/groupes', '/admin/activites', '/admin/projets', '/admin/soutiens']
const oldRecents = JSON.stringify([{ to: '/projets/73', label: 'Projet historique', icon: 'Rocket' }])

async function setup(page, { role = 'ADMIN', lang = 'fr' } = {}) {
  const requests = []
  const notifications = [
    { id: 21, type: 'BUSINESS_MESSAGE', titre: 'Ancien message métier', lienAction: '/api/conversations-metier/42', lue: false },
    { id: 22, type: 'BUSINESS_CONVERSATION_CREATED', titre: 'Ancienne conversation', lienAction: '/admin/conversations?conversationId=42', lue: false },
    { id: 23, type: 'VALIDATION_GROUPE', titre: 'Validation groupe', lienAction: '/groupes/31', lue: false },
  ]
  const groups = [
    { id: 31, nom: 'Groupe à examiner', statut: 'EN_ATTENTE', nombreMembres: 0 },
    { id: 32, nom: 'Groupe déjà validé', statut: 'VALIDE', nombreMembres: 0 },
  ]
  const projects = [
    { id: 41, titre: 'Projet à examiner', statut: 'VALIDE_REFERENT', visibilite: 'PUBLIC' },
    { id: 42, titre: 'Projet déjà approuvé', statut: 'APPROUVE', visibilite: 'PUBLIC' },
  ]
  await page.addInitScript(({ token, role, lang, oldRecents }) => {
    localStorage.setItem('bxconnect_lang', lang)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, prenom: 'Test', email: 'test@example.org', role }))
    localStorage.setItem('bx-app-sidebar-collapsed', 'false')
    localStorage.setItem('bx-sidebar-recents-1', oldRecents)
  }, { token, role, lang, oldRecents })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    requests.push({ method: request.method(), path })
    if (path === '/api/notifications/count') return route.fulfill({ json: { nonLues: notifications.filter(n => !n.lue).length } })
    if (path === '/api/notifications/page') return route.fulfill({ json: notifications })
    const notificationId = path.match(/^\/api\/notifications\/(\d+)(?:\/lue)?$/)?.[1]
    if (notificationId) {
      const index = notifications.findIndex(n => n.id === Number(notificationId))
      if (request.method() === 'DELETE') notifications.splice(index, 1)
      else notifications[index].lue = true
      return route.fulfill({ json: {} })
    }
    if (path === '/api/admin/groupes') return route.fulfill({ json: groups })
    if (path === '/api/admin/groupes/en-attente') return route.fulfill({ json: groups.slice(0, 1) })
    if (path === '/api/projets/admin/tous') return route.fulfill({ json: projects })
    if (path === '/api/admin/utilisateurs') return route.fulfill({ json: [
      { id: 7, prenom: 'Alice', nom: 'Partenaire', email: 'alice@example.org', role: 'PARTENAIRE', actif: true },
    ] })
    if (path === '/api/activites/99') return route.fulfill({ status: 404, json: {} })
    return route.fulfill({ json: [] })
  })
  return { requests, notifications }
}

for (const lang of ['fr', 'nl', 'en']) {
  for (const layout of ['desktop', 'compact', 'responsive']) {
    test(`${lang}: exact ADMIN navigation in ${layout} layout`, async ({ page }) => {
      const t = translations[lang]
      await page.setViewportSize(layout === 'responsive' ? { width: 390, height: 844 } : { width: 1440, height: 900 })
      await setup(page, { lang })
      await page.goto('/admin/partenaires')
      let nav = page.locator('aside.app-sidebar nav')
      if (layout === 'compact') await page.getByRole('button', { name: t.sidebar.collapse, exact: true }).click()
      if (layout === 'responsive') {
        await page.getByRole('button', { name: t.nav.openMenu, exact: true }).click()
        nav = page.locator('#app-sidebar-mobile-drawer nav')
      }
      await expect(nav).toBeVisible()
      await expect(nav.getByRole('link')).toHaveCount(8)
      expect(await nav.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(paths)
      const labels = [t.nav.dashboard, t.nav.users, t.nav.referents, t.users.partners.title, t.nav.groups, t.nav.activities, t.nav.projects, t.nav.supports]
      if (layout === 'compact') {
        expect(await nav.getByRole('link').evaluateAll(links => links.map(link => link.title))).toEqual(labels)
      } else {
        await expect(nav.getByRole('link')).toHaveText(labels)
        await expect(nav.locator('section')).toHaveCount(2)
        await expect(nav.locator('section > p')).toHaveText([t.sidebar.sections.pilotage, t.sidebar.sections.management])
      }
      await expect(nav.locator('a[href="/notifications"], a[href="/admin/conversations"]')).toHaveCount(0)
      await expect(nav.getByText(t.sidebar.recent, { exact: true })).toHaveCount(0)
    })
  }
}

test('each ADMIN management link opens its existing module', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const t = translations.fr
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await setup(page)
  await page.goto('/admin/partenaires')
  const titles = [t.admin.users_title, t.referent.title, t.users.partners.title, t.admin.groupsManagement, t.admin.activities_title, t.admin.projects_title, t.partnerSupport.admin.title]
  for (const [index, path] of paths.slice(1).entries()) {
    await page.locator(`aside.app-sidebar nav a[href="${path}"]`).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { name: titles[index], exact: true })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('group and project validation URLs retain their filtered lists and actions', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/groupes?vue=en-attente')
  await expect(page.getByRole('heading', { name: translations.fr.admin.pendingGroupsTitle, exact: true })).toBeVisible()
  await expect(page.getByText('Groupe à examiner', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Groupe déjà validé', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Valider/, exact: true }).first()).toBeVisible()
  await page.goto('/admin/projets?vue=a-valider')
  await expect(page.getByRole('heading', { name: translations.fr.admin.projectsToValidate, exact: true })).toBeVisible()
  await expect(page.getByText('Projet à examiner', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Projet déjà approuvé', { exact: true })).toHaveCount(0)
})

test('legacy ADMIN conversation URLs redirect without loading conversation APIs', async ({ page }) => {
  const { requests } = await setup(page)
  for (const path of ['/admin/conversations', '/admin/conversations?conversationId=42', '/admin/conversations/42']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
  }
  expect(requests.some(request => request.path.includes('conversations-metier'))).toBe(false)
})

for (const id of [21, 22]) {
  test(`header bell opens historical business notification ${id}, marks it read and falls back to dashboard`, async ({ page }) => {
    const { notifications, requests } = await setup(page)
    await page.goto('/admin/partenaires')
    const bell = page.getByRole('link', { name: translations.fr.nav.notifications, exact: true })
    await expect(bell).toHaveCount(1)
    await expect(bell).toContainText('3')
    await bell.click()
    await expect(page).toHaveURL(/\/notifications$/)
    const notification = notifications.find(n => n.id === id)
    const card = page.locator('article').filter({ hasText: notification.titre })
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: translations.fr.common.open, exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    expect(notification.lue).toBe(true)
    expect(requests).toContainEqual({ method: 'PATCH', path: `/api/notifications/${id}/lue` })
    expect(requests.some(request => request.path.includes('conversations-metier'))).toBe(false)
  })
}

test('notifications still support read state, deletion and ordinary module destinations', async ({ page }) => {
  const { notifications } = await setup(page)
  const t = translations.fr
  await page.goto('/notifications')
  const card = page.locator('article').filter({ hasText: 'Ancien message métier' })
  await card.getByRole('button', { name: t.notifications.markAsRead, exact: true }).click()
  await expect(card.getByRole('button', { name: t.notifications.markAsRead, exact: true })).toHaveCount(0)
  expect(notifications[0].lue).toBe(true)
  page.on('dialog', dialog => dialog.accept())
  await card.getByRole('button', { name: t.notifications.delete, exact: true }).click()
  await expect(card).toHaveCount(0)
  await page.locator('article').filter({ hasText: 'Validation groupe' }).getByRole('button', { name: t.common.open, exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/groupes$/)
})


for (const role of ['ADMIN', 'MEMBRE', 'REFERENT', 'PARTENAIRE', 'SUPER_ADMIN']) {
  test(`${role}: recent navigation is absent and old storage is preserved`, async ({ page }) => {
    await setup(page, { role })
    await page.goto('/activites/99')
    await expect(page.locator('aside.app-sidebar nav')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Projet historique', exact: true })).toHaveCount(0)
    await expect(page.locator('aside.app-sidebar nav').getByText('Récents', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('bx-sidebar-recents-1'))).toBe(oldRecents)
  })
}

for (const [role, path] of [['MEMBRE', '/messagerie'], ['REFERENT', '/referent/messagerie']]) {
  test(`${role}: member–referent messaging remains accessible`, async ({ page }) => {
    await setup(page, { role })
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.locator(`aside.app-sidebar nav a[href="${path}"]`)).toBeVisible()
    await expect(page.locator('aside.app-sidebar nav a[href="/notifications"]')).toHaveCount(0)
  })
}

const roleNavigation = {
  REFERENT: t => ({
    paths: ['/referent/dashboard', '/referent/groupes', '/referent/membres', '/referent/activites', '/referent/projets', '/referent/demandes', '/referent/messagerie'],
    labels: [t.nav.dashboard, t.nav.myGroups, t.nav.members, t.nav.activities, t.nav.projects, t.sidebar.labels.membershipRequests, t.nav.messaging],
    sections: [t.sidebar.sections.pilotage, t.sidebar.sections.management, t.sidebar.sections.communication],
  }),
  PARTENAIRE: t => ({
    paths: ['/partenaire?tab=dashboard', '/partenaire?tab=projets', '/partenaire?tab=activites', '/partenaire?tab=soutiens'],
    labels: [t.nav.dashboard, t.nav.projects, t.nav.activities, t.nav.supports],
    sections: [t.sidebar.sections.pilotage, t.sidebar.sections.management],
  }),
  MEMBRE: t => ({
    paths: ['/dashboard', '/groupes', '/activites', '/projets', '/mes-factures', '/messagerie'],
    labels: [t.nav.dashboard, t.nav.groups, t.nav.activities, t.nav.projects, t.projectPayment.invoices, t.nav.messaging],
    sections: [t.sidebar.sections.pilotage, t.sidebar.sections.management, t.sidebar.sections.communication],
  }),
  SUPER_ADMIN: t => ({
    paths: ['/super-admin/dashboard', '/super-admin/admins', '/super-admin/logs'],
    labels: [t.nav.dashboard, t.nav.admins, t.nav.logs],
    sections: [t.sidebar.sections.pilotage, t.sidebar.sections.security],
  }),
}

for (const role of Object.keys(roleNavigation)) {
  for (const lang of ['fr', 'nl', 'en']) {
    for (const layout of ['desktop', 'compact', 'responsive']) {
      test(`${role} ${lang}: harmonized navigation in ${layout}`, async ({ page }) => {
        const t = translations[lang]
        const expected = roleNavigation[role](t)
        await page.setViewportSize(layout === 'responsive' ? { width: 390, height: 844 } : { width: 1440, height: 900 })
        await setup(page, { role, lang })
        await page.goto('/activites/99')
        let nav = page.locator('aside.app-sidebar nav')
        if (layout === 'compact') await page.getByRole('button', { name: t.sidebar.collapse, exact: true }).click()
        if (layout === 'responsive') {
          await page.getByRole('button', { name: t.nav.openMenu, exact: true }).click()
          nav = page.locator('#app-sidebar-mobile-drawer nav')
        }
        await expect(nav).toBeVisible()
        expect(await nav.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(expected.paths)
        if (layout === 'compact') {
          expect(await nav.getByRole('link').evaluateAll(links => links.map(link => link.title))).toEqual(expected.labels)
        } else {
          await expect(nav.getByRole('link')).toHaveText(expected.labels)
          await expect(nav.locator('section > p')).toHaveText(expected.sections)
        }
      })
    }
  }
}

for (const [role, home] of [['REFERENT', '/referent/dashboard'], ['PARTENAIRE', '/partenaire']]) {
  test(`${role}: retired conversation URLs and notifications do not reopen the module`, async ({ page }) => {
    const { requests, notifications } = await setup(page, { role })
    for (const suffix of ['', '?conversationId=42', '/42']) {
      await page.goto(`/${role.toLowerCase()}/conversations${suffix}`)
      await expect(page).toHaveURL(new RegExp(`${home}$`))
    }
    await page.getByRole('link', { name: translations.fr.nav.notifications, exact: true }).click()
    const card = page.locator('article').filter({ hasText: notifications[0].titre })
    await card.getByRole('button', { name: translations.fr.common.open, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${home.replaceAll('?', '\\?')}(?:\\?tab=dashboard)?$`))
    expect(notifications[0].lue).toBe(true)
    expect(requests.some(request => request.path.includes('conversations-metier'))).toBe(false)
  })
}

for (const role of ['ADMIN', 'REFERENT', 'PARTENAIRE', 'MEMBRE', 'SUPER_ADMIN']) {
  test(`${role}: bell access and account menu have no notification duplicate`, async ({ page }) => {
    const { requests } = await setup(page, { role })
    await page.goto('/activites/99')
    await page.getByRole('button', { name: new RegExp(`${translations.fr.nav.account}$`) }).click()
    await expect(page.getByRole('menu').locator('a[href="/notifications"]')).toHaveCount(0)
    const bell = page.getByRole('link', { name: translations.fr.nav.notifications, exact: true })
    if (role === 'SUPER_ADMIN') {
      await expect(bell).toHaveCount(0)
      expect(requests.some(request => request.path.startsWith('/api/notifications'))).toBe(false)
    } else {
      await expect(bell).toHaveCount(1)
      await expect(bell).toContainText('3')
      await bell.click()
      await expect(page).toHaveURL(/\/notifications$/)
      await expect(page.locator('article')).toHaveCount(3)
    }
  })
}
