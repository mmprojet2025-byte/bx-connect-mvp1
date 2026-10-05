import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { projectStatusCounts, topActivityRegistrations } from './adminDashboardStatistics.js'

const INDICATORS = [
  ['users', 'admin.dashboardOverview.activeUsers'],
  ['groups', 'admin.dashboardReliability.validatedGroups'],
  ['activities', 'admin.dashboardReliability.publishedActivities'],
  ['projects', 'admin.dashboardReliability.activeProjects'],
  ['partners', 'admin.dashboardOverview.activePartners'],
]
const ACTIONS = [
  ['groups', 'admin.dashboardOverview.pendingGroups'],
  ['projects', 'admin.dashboardOverview.pendingProjects'],
  ['supports', 'admin.dashboardOverview.pendingSupports'],
]

export function canExportAdminReport(model, projects, activities) {
  return INDICATORS.every(([key]) => model[key] != null)
    && ACTIONS.every(([key]) => model.actions[key] != null)
    && projectStatusCounts(projects) !== null
    && topActivityRegistrations(activities) !== null
}

// Explicit whitelist: account identities and participant lists never enter an export.
export function buildAdminReport({ model, projects, activities, language, t, generatedAt = new Date() }) {
  if (!canExportAdminReport(model, projects, activities)) throw new Error('Incomplete dashboard data')
  const locale = ['fr', 'nl', 'en'].includes(language?.split('-')[0]) ? language.split('-')[0] : 'fr'
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt)
  const missing = t('admin.dashboardReports.notProvided')
  const statusLabel = status => t(`statuses.${status}`, { defaultValue: t('admin.dashboardStatistics.unknownStatus') })
  return {
    title: t('admin.dashboardReports.reportTitle', { date: dateLabel }),
    generatedAt: generatedAt.toISOString(), dateLabel, language: locale,
    indicators: INDICATORS.map(([key, label]) => [t(label), model[key]]),
    actions: ACTIONS.map(([key, label]) => [t(label), model.actions[key]]),
    projects: projectStatusCounts(projects).map(row => [statusLabel(row.status), row.count]),
    activities: activities.filter(activity => ['PUBLIEE', 'TERMINEE'].includes(activity.statut))
      .map(activity => ({
        title: activity.titre || t('admin.dashboardStatistics.activityFallback', { id: activity.id }),
        status: statusLabel(activity.statut),
        start: activity.dateDebut || missing, end: activity.dateFin || missing,
        capacity: activity.capaciteMax ?? missing, registrations: activity.nombreInscrits,
      })),
    definitions: [t('admin.dashboardOverview.activeUsersDefinition'), t('admin.dashboardReliability.activeProjectsDefinition'), t('admin.dashboardReports.definitions')],
  }
}

export function csvCell(value) {
  let text = String(value ?? '')
  // Also neutralize formulas preceded by whitespace/control characters.
  // eslint-disable-next-line no-control-regex -- intentional spreadsheet formula protection
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function adminReportCsv(report, t) {
  const rows = [['section', 'element', 'statut', 'valeur', 'date_reference', 'date_debut', 'date_fin', 'capacite', 'inscriptions', 'langue']]
  const add = (section, element, status = '', value = '', start = '', end = '', capacity = '', registrations = '') => {
    rows.push([section, element, status, value, report.generatedAt, start, end, capacity, registrations, report.language])
  }
  add(t('admin.dashboardReports.title'), report.title)
  for (const [label, value] of report.indicators) add(t('admin.dashboardOverview.title'), label, '', value)
  for (const [label, value] of report.actions) add(t('admin.workFeed.title'), label, '', value)
  for (const [status, value] of report.projects) add(t('admin.dashboardStatistics.projects'), '', status, value)
  for (const activity of report.activities) add(t('admin.dashboardReports.activities'), activity.title, activity.status, '', activity.start, activity.end, activity.capacity, activity.registrations)
  for (const definition of report.definitions) add(t('admin.dashboardReports.definitionsTitle'), definition)
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function adminReportPdf(report, t) {
  const doc = new jsPDF({ compress: false })
  doc.setFontSize(15)
  const title = doc.splitTextToSize(report.title, 180)
  doc.text(title, 14, 18)
  doc.setFontSize(10)
  const metaY = 22 + title.length * 6
  doc.text(`${t('admin.dashboardReports.generatedAt')}: ${report.dateLabel}`, 14, metaY)
  doc.text(`${t('admin.dashboardReports.language')}: ${report.language.toUpperCase()}`, 14, metaY + 6)
  let y = metaY + 14
  const table = (title, head, body) => {
    if (y > 250) { doc.addPage(); y = 18 }
    doc.setFontSize(12)
    doc.text(title, 14, y)
    autoTable(doc, {
      startY: y + 3, head: [head],
      body: body.length ? body : [[t('admin.dashboardReports.noData'), ...head.slice(1).map(() => '')]],
      margin: { left: 14, right: 14 }, styles: { fontSize: 8, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 99, 235] },
    })
    y = doc.lastAutoTable.finalY + 12
  }
  const columns = [t('admin.dashboardReports.indicator'), t('admin.dashboardReports.value')]
  table(t('admin.dashboardOverview.title'), columns, report.indicators)
  table(t('admin.workFeed.title'), columns, report.actions)
  table(t('admin.dashboardStatistics.projects'), [t('users.status'), t('admin.dashboardStatistics.projectCount')], report.projects)
  table(t('admin.dashboardReports.activities'), [t('common.title'), t('users.status'), t('admin.dashboardReports.start'), t('admin.dashboardReports.end'), t('admin.dashboardReports.capacity'), t('admin.dashboardStatistics.registrationCount')],
    report.activities.map(a => [a.title, a.status, a.start, a.end, a.capacity, a.registrations]))
  table(t('admin.dashboardReports.definitionsTitle'), [t('admin.dashboardReports.indicator')], report.definitions.map(text => [text]))
  return doc
}

export function downloadAdminReportCsv(report, t, filename) {
  const url = URL.createObjectURL(new Blob([adminReportCsv(report, t)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
