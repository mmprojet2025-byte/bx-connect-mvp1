import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'

const token = `header.${Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString('base64')}.signature`
const paths = ['/admin/groupes', '/admin/groupes/en-attente', '/projets/admin/tous', '/activites/admin/toutes', '/admin/utilisateurs', '/partenaire/admin/tous']
const translations = Object.fromEntries(['fr', 'nl', 'en'].map(lang => [lang,
  JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url), 'utf8')),
]))
const fixtures = [
  [{ id: 1, statut: 'VALIDE' }, { id: 2, statut: 'EN_ATTENTE' }],
  [{ id: 2, nom: 'Groupe en attente', statut: 'EN_ATTENTE' }],
  [
    { id: 1, titre: 'Projet soumis au référent', statut: 'SOUMIS' },
    { id: 2, titre: 'Projet à décider', statut: 'VALIDE_REFERENT' },
    { id: 3, statut: 'APPROUVE' }, { id: 4, statut: 'EN_COURS' }, { id: 5, statut: 'TERMINE' },
  ],
  [{ id: 1, titre: 'Brouillon test', statut: 'BROUILLON' }, { id: 2, titre: 'Activité publiée', statut: 'PUBLIEE', nombreInscrits: 7 }],
  ['MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN', 'SUPER_ADMIN'].flatMap(role => [{ role, actif: true }, { role, actif: false }]),
  [{ projetId: 1, activiteId: null, typeSource: 'DECLARATION', statutPaiement: 'EN_ATTENTE' },
    { projetId: 1, activiteId: 5, typeSource: 'DECLARATION', statutPaiement: 'EN_ATTENTE' },
    { projetId: null, typeSource: 'DECLARATION', statutPaiement: 'EN_ATTENTE' },
    { projetId: 1, typeSource: 'STRIPE', statutPaiement: 'EN_ATTENTE' },
    { projetId: 1, typeSource: 'DECLARATION', statutPaiement: 'PAYE' }],
]
async function setup(page, { lang = 'fr', failed = [], data = fixtures, pending } = {}) {
  const state = { failed, requests: [] }
  await page.addInitScript(({ token, lang }) => {
    localStorage.setItem('bxconnect_lang', lang)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'ADMIN', email: 'admin@example.org' }))
  }, { token, lang })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    state.requests.push(path)
    const index = paths.indexOf(path)
    if (index < 0) return route.fulfill({ json: [] })
    if (pending) await pending
    if (state.failed.includes(index)) return route.fulfill({ status: 500, json: {} })
    return route.fulfill({ json: data[index] })
  })
  await page.goto('/admin/dashboard')
  return state
}
function kpi(page, label) {
  return page.locator('[data-testid^="dashboard-kpi-"]').filter({ has: page.getByText(label, { exact: true }) })
}

for (const lang of ['fr', 'nl', 'en']) {
  test(`${lang}: exact counts, neutral vocabulary and separate activity preparation`, async ({ page }) => {
    const t = translations[lang]
    const state = await setup(page, { lang })
    await expect(page.getByTestId('dashboard-actions-total')).toContainText('3')
    await expect(kpi(page, t.admin.dashboardOverview.activeUsers)).toContainText('3')
    await expect(kpi(page, t.admin.dashboardOverview.activePartners)).toContainText('1')
    // StrictMode replays effects in development; users must load once per batch, not once per KPI.
    expect(state.requests.filter(path => path === '/admin/utilisateurs')).toHaveLength(
      state.requests.filter(path => path === '/admin/groupes').length,
    )
    await expect(kpi(page, t.admin.dashboardReliability.validatedGroups)).toContainText('1')
    await expect(kpi(page, t.admin.dashboardReliability.publishedActivities)).toContainText('1')
    await expect(kpi(page, t.admin.dashboardReliability.activeProjects)).toContainText('2')
    await expect(page.getByText(t.admin.dashboardReliability.activeProjectsDefinition, { exact: true })).toBeVisible()
    for (const [key, label, href] of [
      ['groups', t.admin.dashboardOverview.pendingGroups, '/admin/groupes?vue=en-attente'],
      ['projects', t.admin.dashboardOverview.pendingProjects, '/admin/projets?vue=a-valider'],
      ['supports', t.admin.dashboardOverview.pendingSupports, '/admin/soutiens'],
    ]) {
      const action = page.getByTestId(`dashboard-action-${key}`)
      await expect(action).toContainText(label)
      await expect(action).toContainText('1')
      await expect(action).toHaveAttribute('href', href)
    }
    await expect(page.getByText('Projet soumis au référent', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: t.admin.dashboardOverview.drafts })).toBeVisible()
    await expect(page.locator('[data-testid^="dashboard-kpi-"] a')).toHaveCount(0)
    await expect(page.getByText(t.admin.dashboardSummary, { exact: true })).toBeVisible()
    await expect(page.locator('main').last()).not.toContainText(/aujourd['’]hui|today|vandaag|prêt à publier|ready to publish/i)
  })
}

for (const [index, field] of [[2, 'activeProjects'], [3, 'publishedActivities'], [0, 'validatedGroups']]) {
  test(`source ${index} failure shows unavailable instead of zero and preserves other sources`, async ({ page }) => {
    const t = translations.fr
    const state = await setup(page, { failed: [index] })
    const card = kpi(page, t.admin.dashboardReliability[field])
    await expect(card).toContainText('Données indisponibles')
    await expect(card.locator('p').last()).not.toHaveText('0')
    await expect(kpi(page, t.admin.dashboardReliability[index === 0 ? 'activeProjects' : 'validatedGroups'])).toContainText(index === 0 ? '2' : '1')
    await expect(page.getByTestId('dashboard-actions-total')).toContainText(index === 2 ? 'Données indisponibles' : '3')
    await expect(page.getByRole('alert')).toBeVisible()
    state.failed = []
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
    await expect(card).not.toContainText('Données indisponibles')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test('unknown action sources never produce an all-clear message', async ({ page }) => {
  const data = [[], [], [], [], [], []]
  await setup(page, { data, failed: [1] })
  await expect(page.getByTestId('dashboard-actions-total')).toContainText('Données indisponibles')
  await expect(page.getByText(translations.fr.admin.workFeed.empty, { exact: true })).toHaveCount(0)
  await expect(page.getByText(translations.fr.admin.dashboardReliability.actionsUnavailable, { exact: true })).toBeVisible()
})

test('real empty lists show five known zeros', async ({ page }) => {
  await setup(page, { data: [[], [], [], [], [], []] })
  await expect(page.locator('[data-testid^="dashboard-kpi-"]')).toHaveCount(5)
  await expect(page.locator('[data-testid^="dashboard-kpi-"] > p')).toHaveText(['0', '0', '0', '0', '0'])
  await expect(page.getByTestId('dashboard-actions-total')).toContainText('0')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('loading has no provisional zero, then all-source failure offers retry', async ({ page }) => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  const state = await setup(page, { pending, failed: [0, 1, 2, 3, 4, 5] })
  await expect(page.getByText(translations.fr.admin.loading, { exact: true }).first()).toBeVisible()
  await expect(page.locator('[data-testid^="dashboard-kpi-"]')).toHaveCount(0)
  release()
  await expect(page.getByRole('button', { name: 'Réessayer', exact: true })).toBeVisible()
  await expect(page.locator('[data-testid^="dashboard-kpi-"]')).toHaveCount(0)
  state.failed = []
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByTestId('dashboard-actions-total')).toContainText('3')
})

test('malformed source is unavailable, not an empty successful response', async ({ page }) => {
  await setup(page, { data: [[], [], {}, [], [], []] })
  await expect(kpi(page, translations.fr.admin.dashboardReliability.activeProjects)).toContainText('Données indisponibles')
})

for (const index of [4, 5]) {
  test(`source ${index} unavailable preserves independent indicators and decisions`, async ({ page }) => {
    await setup(page, { failed: [index] })
    if (index === 4) {
      for (const key of ['users', 'partners']) await expect(page.getByTestId(`dashboard-kpi-${key}`)).toContainText('Données indisponibles')
      await expect(page.getByTestId('dashboard-actions-total')).toContainText('3')
    } else {
      await expect(page.getByTestId('dashboard-action-supports')).toContainText('Données indisponibles')
      await expect(page.getByTestId('dashboard-actions-total')).toContainText('Données indisponibles')
      await expect(page.getByTestId('dashboard-kpi-users')).toContainText('3')
    }
  })
}

test('five indicators and action categories remain readable on narrow Web screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  for (const key of ['users', 'groups', 'activities', 'projects', 'partners']) {
    const card = page.getByTestId(`dashboard-kpi-${key}`)
    await expect(card).toBeVisible()
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  }
  for (const key of ['groups', 'projects', 'supports']) {
    const row = page.getByTestId(`dashboard-action-${key}`)
    await expect(row).toBeVisible()
    expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  }
})

for (const lang of ['fr', 'nl', 'en']) {
  test(`${lang}: statistics use translated labels and existing API responses`, async ({ page }) => {
    const t = translations[lang]
    const state = await setup(page, { lang })
    await expect(page.getByRole('heading', { name: t.admin.dashboardStatistics.title, exact: true })).toBeVisible()
    const projects = page.getByTestId('statistics-projects')
    const activities = page.getByTestId('statistics-activities')
    await expect(projects.getByRole('heading')).toHaveText(t.admin.dashboardStatistics.projects)
    await expect(activities.getByRole('heading')).toHaveText(t.admin.dashboardStatistics.activities)
    await expect(projects.locator('table tbody tr')).toHaveCount(12)
    for (const status of ['SOUMIS', 'VALIDE_REFERENT']) {
      const row = projects.getByRole('row').filter({ has: page.getByRole('rowheader', { name: t.statuses[status], exact: true }) })
      await expect(row.getByRole('cell')).toHaveText('1')
    }
    await expect(activities.locator('table tbody tr')).toHaveText(['Activité publiée7'])
    await expect(activities.locator('.recharts-surface')).toBeVisible()
    expect(state.requests.filter(path => path === '/projets/admin/tous').length).toBe(state.requests.filter(path => path === '/admin/groupes').length)
    expect(state.requests.filter(path => path === '/activites/admin/toutes').length).toBe(state.requests.filter(path => path === '/admin/groupes').length)
  })
}

test('each chart distinguishes loading, empty and failed sources', async ({ page }) => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  await setup(page, { pending, data: [[], [], [], [], [], []], failed: [2] })
  for (const key of ['projects', 'activities']) {
    await expect(page.getByTestId(`statistics-${key}`).getByRole('status')).toBeVisible()
  }
  release()
  await expect(page.getByTestId('statistics-projects')).toContainText('Données indisponibles')
  await expect(page.getByTestId('statistics-projects').locator('.recharts-surface')).toHaveCount(0)
  await expect(page.getByTestId('statistics-activities')).toContainText(translations.fr.admin.dashboardStatistics.noActivities)
})

test('activity errors do not hide project statistics or become zero registrations', async ({ page }) => {
  await setup(page, { failed: [3] })
  await expect(page.getByTestId('statistics-activities')).toContainText('Données indisponibles')
  await expect(page.getByTestId('statistics-activities').locator('table')).toHaveCount(0)
  await expect(page.getByTestId('statistics-projects').locator('.recharts-surface')).toBeVisible()
})

test('empty projects and genuine zero registrations have different chart states', async ({ page }) => {
  await setup(page, { data: [[], [], [], [{ id: 1, titre: 'Sans inscription', statut: 'TERMINEE', nombreInscrits: 0 }], [], []] })
  await expect(page.getByTestId('statistics-projects')).toContainText(translations.fr.admin.dashboardStatistics.noProjects)
  const chart = page.getByTestId('statistics-activities')
  await expect(chart.locator('.recharts-surface')).toBeVisible()
  await expect(chart.locator('table tbody td')).toHaveText('0')
})

for (const width of [390, 1440]) {
  test(`statistics fit ${width}px with long activity titles`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const data = [...fixtures]
    data[3] = [9, 7, 10, 2, 5, 1].map(id => ({ id, titre: `Une activité avec un titre très long pour vérifier la lisibilité ${id}`, statut: 'PUBLIEE', nombreInscrits: 4 }))
    await setup(page, { data })
    for (const key of ['projects', 'activities']) {
      const chart = page.getByTestId(`statistics-${key}`)
      await expect(chart.locator('.recharts-surface')).toBeVisible()
      expect(await chart.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    }
    await expect(page.getByTestId('statistics-activities').locator('table tbody tr')).toHaveCount(5)
    await expect(page.getByTestId('statistics-activities').locator('table tbody th')).toHaveText([1, 2, 5, 7, 9].map(id => `Une activité avec un titre très long pour vérifier la lisibilité ${id}`))
  })
}

for (const lang of ['fr', 'nl', 'en']) {
  test(`${lang}: direct PDF and UTF-8 CSV downloads contain the dashboard snapshot`, async ({ page }) => {
    const t = translations[lang]
    const data = [...fixtures]
    data[3] = [{ id: 2, titre: 'Été, "sport"\nBruxelles', statut: 'PUBLIEE', nombreInscrits: 7, capaciteMax: 30, dateDebut: '2026-10-05T10:00:00', dateFin: '2026-10-05T12:00:00', membreEmail: 'PRIVATE_EMAIL@example.org' }]
    await setup(page, { lang, data })
    const reports = page.getByRole('region', { name: t.admin.dashboardReports.title, exact: true })
    for (const format of ['pdf', 'csv']) {
      const button = reports.getByRole('button', { name: t.admin.dashboardReports[format], exact: true })
      await expect(button).toBeEnabled()
      const downloaded = page.waitForEvent('download')
      await button.click()
      const download = await downloaded
      expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`))
      const bytes = readFileSync(await download.path())
      const content = bytes.toString(format === 'pdf' ? 'latin1' : 'utf8')
      expect(content).not.toContain('PRIVATE_EMAIL')
      expect(content).not.toContain('admin@example.org')
      if (format === 'pdf') {
        expect(content).toMatch(/^%PDF-/)
        expect(content).toContain(lang.toUpperCase())
      } else {
        expect(bytes.subarray(0, 3).toString('hex')).toBe('efbbbf')
        expect(content).toContain('"section","element","statut","valeur","date_reference"')
        expect(content).toContain('"Été, ""sport""\nBruxelles"')
        expect(content).toContain(`"${t.admin.dashboardOverview.activeUsers}","","3"`)
        expect(content).not.toMatch(/<html|<table/i)
      }
    }
  })
}

test('reports are disabled for missing sources and enabled for a truly empty snapshot', async ({ page }) => {
  const state = await setup(page, { data: [[], [], [], [], [], []], failed: [4] })
  const reports = page.getByRole('region', { name: 'Rapports', exact: true })
  await expect(reports.getByRole('button')).toHaveCount(2)
  for (const button of await reports.getByRole('button').all()) await expect(button).toBeDisabled()
  await expect(reports).toContainText(translations.fr.admin.dashboardReports.unavailable)
  state.failed = []
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  for (const button of await reports.getByRole('button').all()) await expect(button).toBeEnabled()
})

test('final sections keep preparation before statistics and reports last', async ({ page }) => {
  await setup(page)
  await expect(page.getByRole('region', { name: 'Rapports', exact: true })).toBeVisible()
  const order = await page.locator('#admin-overview-title, #admin-actions-title, section[aria-label="Activités à préparer"], #admin-statistics-title, #admin-reports-title').evaluateAll(elements => elements.map(el => el.id || el.getAttribute('aria-label')))
  expect(order).toEqual(['admin-overview-title', 'admin-actions-title', 'Activités à préparer', 'admin-statistics-title', 'admin-reports-title'])
})
