import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import i18next from 'i18next'
import { buildAdminDashboard } from './adminDashboardModel.js'
import { adminReportCsv, adminReportPdf, buildAdminReport, canExportAdminReport, csvCell } from './adminDashboardReport.js'

const projects = [{ statut: 'SOUMIS', email: 'private@example.org' }, { statut: 'VALIDE_REFERENT', porteurNom: 'PRIVATE_MEMBER' }]
const activities = Array.from({ length: 7 }, (_, id) => ({ id, titre: `Activity ${id}`, statut: 'TERMINEE', nombreInscrits: id, capaciteMax: 20, dateDebut: '2026-10-05T10:00:00', dateFin: '2026-10-05T12:00:00', membres: ['PRIVATE_MEMBER'] }))
const source = { users: [{ role: 'PARTENAIRE', actif: true, email: 'private@example.org' }], groups: [], pendingGroups: [], projects, activities, supports: [] }
const model = buildAdminDashboard(source)
async function translator(language) {
  const i18n = i18next.createInstance()
  const resources = JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8'))
  await i18n.init({ lng: language, resources: { [language]: { translation: resources } }, interpolation: { escapeValue: false } })
  return i18n.t.bind(i18n)
}
for (const language of ['fr', 'nl', 'en']) {
  test(`${language}: PDF and CSV share exact dashboard values and exclude account/participant data`, async () => {
    const t = await translator(language)
    const report = buildAdminReport({ model, projects, activities, language, t, generatedAt: new Date('2026-10-05T12:00:00Z') })
    assert.deepEqual(report.indicators.map(row => row[1]), [model.users, model.groups, model.activities, model.projects, model.partners])
    assert.deepEqual(report.actions.map(row => row[1]), Object.values(model.actions))
    assert.equal(report.activities.length, 7) // full activity table, not only the chart's top five
    assert.equal(report.language, language)
    const csv = adminReportCsv(report, t)
    assert.ok(csv.startsWith('\uFEFF"section","element"'))
    assert.ok(csv.includes(t('admin.dashboardOverview.activeUsers')))
    assert.ok(csv.includes('2026-10-05T12:00:00.000Z'))
    const pdf = adminReportPdf(report, t).output()
    assert.ok(pdf.startsWith('%PDF-'))
    assert.ok(pdf.includes('Activity 6'))
    assert.ok(pdf.includes(language.toUpperCase()))
    if (language === 'en') {
      for (const text of ['Active users', 'Pending support declarations', 'Projects by status', 'Capacity', 'Registrations']) assert.ok(pdf.includes(text), text)
    }
    for (const output of [JSON.stringify(report), csv, pdf]) {
      assert.equal(output.includes('private@example.org'), false)
      assert.equal(output.includes('PRIVATE_MEMBER'), false)
    }
  })
}

test('CSV escapes quotes, commas and multiline UTF-8 content', () => {
  assert.equal(csvCell('Été, "sport"\nBruxelles'), '"Été, ""sport""\nBruxelles"')
  assert.equal(csvCell(0), '"0"')
  assert.equal(csvCell(null), '""')
})

test('CSV neutralizes formulas, including leading whitespace', () => {
  for (const value of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', ' \t=HYPERLINK("x")', '\r\n+1']) {
    assert.ok(csvCell(value).startsWith('"\''), value)
  }
})

test('empty snapshots export real zeros but incomplete sources block generation', async () => {
  const t = await translator('en')
  const emptySource = Object.fromEntries(Object.keys(source).map(key => [key, []]))
  const emptyModel = buildAdminDashboard(emptySource)
  const report = buildAdminReport({ model: emptyModel, projects: [], activities: [], language: 'en', t })
  assert.ok(report.indicators.every(row => row[1] === 0))
  assert.ok(adminReportPdf(report, t).output().includes('No data'))
  for (const key of Object.keys(source)) {
    const incomplete = { ...source, [key]: null }
    const incompleteModel = buildAdminDashboard(incomplete)
    assert.equal(canExportAdminReport(incompleteModel, incomplete.projects, incomplete.activities), false, key)
    assert.throws(() => buildAdminReport({ model: incompleteModel, projects: incomplete.projects, activities: incomplete.activities, language: 'en', t }))
  }
  assert.equal(canExportAdminReport(model, projects, [{ statut: 'PUBLIEE' }]), false)
})
