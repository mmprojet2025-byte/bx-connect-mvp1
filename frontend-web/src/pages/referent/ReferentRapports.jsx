import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import AppIcon from '../../components/ui/AppIcons'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import { appendExcelSheet, createExcelWorkbook, saveExcelWorkbook } from '../../utils/excelHtmlExport'

const DEFAULT_FILTERS = { group: 'all', period: 'all' }
const PRESENCE_STATUSES = ['PRESENT', 'ABSENT', 'EXCUSE', 'NON_RENSEIGNEE']

export default function ReferentRapports() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState({
    groups: [],
    membersByGroup: {},
    activities: [],
    projects: [],
    presences: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialError, setPartialError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    setError('')
    setPartialError('')

    try {
      const [groupsResult, activitiesResult, projectsResult] = await Promise.allSettled([
        api.get('/referent/groupes'),
        api.get('/referent/mes-activites'),
        api.get('/projets/referent/mes-groupes'),
      ])

      const nextData = {
        groups: readArrayResult(groupsResult),
        activities: readArrayResult(activitiesResult),
        projects: readArrayResult(projectsResult),
        membersByGroup: {},
        presences: [],
      }

      if (groupsResult.status === 'rejected' && activitiesResult.status === 'rejected' && projectsResult.status === 'rejected') {
        throw new Error('referent-report-load-failed')
      }

      if ([groupsResult, activitiesResult, projectsResult].some(result => result.status === 'rejected')) {
        setPartialError(t('referentReports.partialError'))
      }

      const memberResults = await Promise.allSettled(
        nextData.groups
          .filter(group => group?.id)
          .map(group => api.get(`/referent/groupes/${group.id}/membres`).then(response => [group.id, response.data]))
      )
      memberResults.forEach(result => {
        if (result.status !== 'fulfilled') return
        const [groupId, members] = result.value
        nextData.membersByGroup[String(groupId)] = Array.isArray(members) ? members : []
      })
      if (memberResults.some(result => result.status === 'rejected')) {
        setPartialError(t('referentReports.partialError'))
      }

      const presenceResults = await Promise.allSettled(
        nextData.activities
          .filter(activity => activity?.id)
          .map(activity => api.get(`/activites/${activity.id}/presences`).then(response => enrichPresenceRows(response.data, activity)))
      )
      nextData.presences = presenceResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
      if (presenceResults.some(result => result.status === 'rejected')) {
        setPartialError(t('referentReports.partialError'))
      }

      setData(nextData)
    } catch {
      setError(t('referentReports.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchReportData() }, [fetchReportData])

  const filteredData = useMemo(() => applyReportFilters(data, filters), [data, filters])
  const report = useMemo(
    () => buildReportModel(filteredData, data, filters, t, i18n.language),
    [filteredData, data, filters, t, i18n.language]
  )

  const hasAnyData = data.groups.length > 0
    || data.activities.length > 0
    || data.projects.length > 0
    || data.presences.length > 0

  const updateFilter = (field, value) => {
    setFilters(current => ({ ...current, [field]: value }))
  }

  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  const exportPdf = () => {
    exportReportPdf({
      report,
      data: filteredData,
      generatedAt: new Date(),
      language: i18n.language,
      t,
    })
  }

  const exportExcel = () => {
    exportReportExcel({
      report,
      data: filteredData,
      generatedAt: new Date(),
      language: i18n.language,
      t,
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <PageHeader
          eyebrow={t('referentReports.eyebrow')}
          title={t('referentReports.title')}
          description={t('referentReports.description')}
          action={(
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportPdf}
                disabled={!hasAnyData}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AppIcon name="FileText" className="h-4 w-4" />
                {t('referentReports.actions.exportPdf')}
              </button>
              <button
                type="button"
                onClick={exportExcel}
                disabled={!hasAnyData}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AppIcon name="FileText" className="h-4 w-4" />
                {t('referentReports.actions.exportExcel')}
              </button>
            </div>
          )}
        />

        {loading && <LoadingState label={t('referentReports.loading')} />}
        {!loading && error && !hasAnyData && (
          <ErrorState
            title={t('referentReports.errorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchReportData}
          />
        )}

        {!loading && !error && !hasAnyData && (
          <EmptyState
            icon="FileText"
            title={t('referentReports.empty.title')}
            description={t('referentReports.empty.description')}
          />
        )}

        {!loading && hasAnyData && (
          <div className="space-y-6">
            {partialError && <Alert type="warning">{partialError}</Alert>}

            <SectionCard title={t('referentReports.filters.title')} subtitle={t('referentReports.filters.subtitle')}>
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
                <label className="block text-sm font-semibold text-slate-700">
                  {t('referentReports.filters.group')}
                  <select
                    value={filters.group}
                    onChange={event => updateFilter('group', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('referentReports.filters.allGroups')}</option>
                    {data.groups.map(group => (
                      <option key={group.id} value={group.id}>{group.nom || t('groups.title')}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  {t('referentReports.filters.period')}
                  <select
                    value={filters.period}
                    onChange={event => updateFilter('period', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('referentReports.periods.all')}</option>
                    <option value="30">{t('referentReports.periods.last30')}</option>
                    <option value="90">{t('referentReports.periods.last90')}</option>
                    <option value="year">{t('referentReports.periods.currentYear')}</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('common.reset')}
                </button>
              </div>
            </SectionCard>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {report.kpis.map(kpi => (
                <KpiCard key={kpi.key} label={kpi.label} value={kpi.value} icon={kpi.icon} tone={kpi.tone} />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title={t('referentReports.sections.activities')} subtitle={t('referentReports.sections.activitiesSubtitle')}>
                <CompactTable
                  emptyLabel={t('referentReports.empty.activities')}
                  columns={[t('common.title'), t('common.date'), t('presence.table.presence'), t('referentReports.columns.rate')]}
                  rows={report.activityRows.map(row => [
                    row.title,
                    row.date,
                    `${row.present}/${row.registered}`,
                    formatPercent(row.attendanceRate, i18n.language),
                  ])}
                />
              </SectionCard>

              <SectionCard title={t('referentReports.sections.projects')} subtitle={t('referentReports.sections.projectsSubtitle')}>
                <CompactTable
                  emptyLabel={t('referentReports.empty.projects')}
                  columns={[t('common.title'), t('users.status'), t('common.date')]}
                  rows={filteredData.projects.map(project => [
                    project.titre || t('projects.title'),
                    translateStatus(project.statut, t),
                    formatDate(project.dateCreation || project.dateSoumission || project.dateValidation, i18n.language),
                  ])}
                />
              </SectionCard>
            </div>

            <SectionCard title={t('referentReports.sections.presences')} subtitle={t('referentReports.sections.presencesSubtitle')}>
              <CompactTable
                emptyLabel={t('referentReports.empty.presences')}
                columns={[
                  t('impact.exports.columns.activity'),
                  t('impact.exports.columns.participant'),
                  t('presence.table.registration'),
                  t('presence.table.presence'),
                ]}
                rows={filteredData.presences.slice(0, 12).map(presence => [
                  presence.activiteTitre || t('presence.activityFallback'),
                  formatMemberName(presence),
                  presence.statutInscription || '-',
                  translatePresence(presence.statutPresence, t),
                ])}
              />
            </SectionCard>

            <SectionCard title={t('referentReports.sections.quality')} subtitle={t('referentReports.sections.qualitySubtitle')}>
              <div className="grid gap-4 md:grid-cols-3">
                {report.qualityItems.map(item => (
                  <div key={item.key} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <p className="text-2xl font-black text-slate-950">{item.value}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{item.label}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-semibold">{t('referentReports.limits.title')}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {report.limits.map(limit => <li key={limit}>{limit}</li>)}
                </ul>
              </div>
            </SectionCard>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function readArrayResult(result) {
  if (result.status !== 'fulfilled') return []
  return Array.isArray(result.value.data) ? result.value.data : []
}

function enrichPresenceRows(rows, activity) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    ...row,
    activiteId: activity.id,
    activiteTitre: activity.titre,
    activiteDateDebut: activity.dateDebut,
    activiteDateFin: activity.dateFin,
    activiteStatut: activity.statut,
    activityGroupId: getGroupId(activity),
  }))
}

function applyReportFilters(data, filters) {
  const groups = filters.group === 'all'
    ? data.groups
    : data.groups.filter(group => String(group.id) === String(filters.group))

  const members = selectMembers(data.membersByGroup, filters.group).filter(member => matchesPeriod(member, filters.period, ['dateInscription', 'createdAt', 'dateCreation']))
  const activities = data.activities
    .filter(activity => matchesGroup(activity, filters.group, data.groups))
    .filter(activity => matchesPeriod(activity, filters.period, ['dateDebut', 'dateFin', 'dateCreation']))
  const activityIds = new Set(activities.map(activity => String(activity.id)))
  const presences = data.presences
    .filter(presence => activityIds.has(String(presence.activiteId)))
    .filter(presence => matchesPeriod(presence, filters.period, ['activiteDateDebut', 'datePresence', 'dateInscription']))
  const projects = data.projects
    .filter(project => matchesGroup(project, filters.group, data.groups))
    .filter(project => matchesPeriod(project, filters.period, ['dateCreation', 'dateSoumission', 'dateValidation', 'dateModification']))

  return { groups, members, activities, presences, projects }
}

function selectMembers(membersByGroup, groupId) {
  if (groupId !== 'all') return membersByGroup[String(groupId)] || []
  const uniqueMembers = new Map()
  Object.values(membersByGroup).flat().forEach(member => {
    const key = member.id || member.email || `${member.prenom || ''}-${member.nom || ''}`
    if (key) uniqueMembers.set(String(key), member)
  })
  return Array.from(uniqueMembers.values())
}

function matchesGroup(item, groupId, groups) {
  if (groupId === 'all') return true
  const directGroupId = getGroupId(item)
  if (directGroupId) return String(directGroupId) === String(groupId)
  const group = groups.find(candidate => String(candidate.id) === String(groupId))
  if (!group?.nom) return false
  return item.groupeNom === group.nom || item.nomGroupe === group.nom
}

function getGroupId(item) {
  return item?.groupeId
    || item?.groupId
    || item?.groupe?.id
    || item?.groupe?.groupeId
    || item?.activityGroupId
    || null
}

function matchesPeriod(item, period, fields) {
  if (period === 'all') return true
  const threshold = getPeriodThreshold(period)
  if (!threshold) return true
  const value = fields.map(field => item?.[field]).find(Boolean)
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date >= threshold
}

function getPeriodThreshold(period) {
  const now = new Date()
  if (period === '30') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  if (period === '90') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
  if (period === 'year') return new Date(now.getFullYear(), 0, 1)
  return null
}

function buildReportModel(filteredData, rawData, filters, t, language) {
  const presenceTotals = countPresenceStatuses(filteredData.presences)
  const completedActivities = filteredData.activities.filter(isCompletedActivity)
  const activityRows = buildActivityRows(filteredData.activities, filteredData.presences)
  const projectTotals = buildProjectStatusTotals(filteredData.projects)
  const attendanceDenominator = presenceTotals.PRESENT + presenceTotals.ABSENT + presenceTotals.EXCUSE
  const attendanceRate = attendanceDenominator > 0 ? presenceTotals.PRESENT / attendanceDenominator : 0
  const activitiesWithoutClosedSheet = completedActivities.filter(activity => {
    const rows = filteredData.presences.filter(presence => String(presence.activiteId) === String(activity.id))
    return rows.length === 0 || rows.some(presence => !presence.presenceValideePar && !presence.dateValidationPresence)
  }).length
  const selectedGroup = filters.group === 'all'
    ? null
    : rawData.groups.find(group => String(group.id) === String(filters.group))
  const activitiesWithoutGroupLink = filters.group !== 'all'
    ? rawData.activities.filter(activity => !getGroupId(activity)).length
    : 0

  return {
    filterLabels: buildFilterLabels(filters, rawData.groups, t),
    kpis: [
      { key: 'members', label: t('referentReports.kpis.members'), value: filteredData.members.length, icon: 'Users', tone: 'blue' },
      { key: 'completedActivities', label: t('referentReports.kpis.completedActivities'), value: completedActivities.length, icon: 'Calendar', tone: 'teal' },
      { key: 'registered', label: t('referentReports.kpis.registered'), value: filteredData.presences.length, icon: 'ClipboardList', tone: 'slate' },
      { key: 'present', label: t('referentReports.kpis.present'), value: presenceTotals.PRESENT, icon: 'CheckCircle', tone: 'green' },
      { key: 'absent', label: t('referentReports.kpis.absent'), value: presenceTotals.ABSENT, icon: 'XCircle', tone: 'red' },
      { key: 'excused', label: t('referentReports.kpis.excused'), value: presenceTotals.EXCUSE, icon: 'Clock', tone: 'amber' },
      { key: 'attendanceRate', label: t('referentReports.kpis.attendanceRate'), value: formatPercent(attendanceRate, language), icon: 'BarChart3', tone: 'violet' },
      { key: 'submittedToReferent', label: t('referentReports.kpis.submittedToReferent'), value: projectTotals.submittedToReferent, icon: 'Rocket', tone: 'blue' },
      { key: 'validatedByReferent', label: t('referentReports.kpis.validatedByReferent'), value: projectTotals.validatedByReferent, icon: 'CheckCircle', tone: 'teal' },
      { key: 'rejectedByReferent', label: t('referentReports.kpis.rejectedByReferent'), value: projectTotals.rejectedByReferent, icon: 'XCircle', tone: 'red' },
      { key: 'approvedByAdmin', label: t('referentReports.kpis.approvedByAdmin'), value: projectTotals.approvedByAdmin, icon: 'ShieldCheck', tone: 'green' },
      { key: 'rejectedByAdmin', label: t('referentReports.kpis.rejectedByAdmin'), value: projectTotals.rejectedByAdmin, icon: 'ShieldX', tone: 'amber' },
      { key: 'unclosedSheets', label: t('referentReports.kpis.unclosedSheets'), value: activitiesWithoutClosedSheet, icon: 'AlertTriangle', tone: 'amber' },
    ],
    activityRows,
    qualityItems: [
      {
        key: 'unclosedSheets',
        label: t('referentReports.quality.unclosedSheets'),
        value: activitiesWithoutClosedSheet,
        description: t('referentReports.quality.unclosedSheetsDesc'),
      },
      {
        key: 'notFilled',
        label: t('referentReports.quality.notFilled'),
        value: presenceTotals.NON_RENSEIGNEE,
        description: t('referentReports.quality.notFilledDesc'),
      },
      {
        key: 'unlinkedActivities',
        label: t('referentReports.quality.unlinkedActivities'),
        value: activitiesWithoutGroupLink,
        description: t('referentReports.quality.unlinkedActivitiesDesc'),
      },
    ],
    limits: buildLimits({ t, selectedGroup, activitiesWithoutGroupLink }),
  }
}

function buildActivityRows(activities, presences) {
  return activities.map(activity => {
    const rows = presences.filter(presence => String(presence.activiteId) === String(activity.id))
    const totals = countPresenceStatuses(rows)
    const denominator = totals.PRESENT + totals.ABSENT + totals.EXCUSE
    return {
      id: activity.id,
      title: activity.titre || '',
      date: activity.dateDebut,
      registered: rows.length,
      present: totals.PRESENT,
      absent: totals.ABSENT,
      excused: totals.EXCUSE,
      notFilled: totals.NON_RENSEIGNEE,
      attendanceRate: denominator > 0 ? totals.PRESENT / denominator : 0,
    }
  })
}

function countPresenceStatuses(rows) {
  return rows.reduce((acc, row) => {
    const status = PRESENCE_STATUSES.includes(row.statutPresence) ? row.statutPresence : 'NON_RENSEIGNEE'
    acc[status] += 1
    return acc
  }, { PRESENT: 0, ABSENT: 0, EXCUSE: 0, NON_RENSEIGNEE: 0 })
}

function countByStatuses(items, statuses) {
  return items.filter(item => statuses.includes(normalizeStatus(item.statut))).length
}

function buildProjectStatusTotals(projects) {
  return {
    submittedToReferent: countByStatuses(projects, ['SOUMIS']),
    validatedByReferent: countByStatuses(projects, ['VALIDE_REFERENT']),
    rejectedByReferent: countByStatuses(projects, ['REFUSE_REFERENT']),
    approvedByAdmin: countByStatuses(projects, ['APPROUVE', 'APPROUVÉ']),
    rejectedByAdmin: countByStatuses(projects, ['REJETE', 'REJETÉ']),
  }
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase()
}

function isCompletedActivity(activity) {
  const value = activity.dateFin || activity.dateDebut
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date < new Date()
}

function buildFilterLabels(filters, groups, t) {
  const group = filters.group === 'all'
    ? t('referentReports.filters.allGroups')
    : groups.find(candidate => String(candidate.id) === String(filters.group))?.nom || t('groups.title')
  return [
    { label: t('referentReports.filters.group'), value: group },
    { label: t('referentReports.filters.period'), value: t(`referentReports.periods.${periodKey(filters.period)}`) },
  ]
}

function periodKey(period) {
  if (period === '30') return 'last30'
  if (period === '90') return 'last90'
  if (period === 'year') return 'currentYear'
  return 'all'
}

function buildLimits({ t, selectedGroup, activitiesWithoutGroupLink }) {
  const limits = [
    t('referentReports.limits.existingEndpoints'),
    t('referentReports.limits.noBackendAggregation'),
  ]
  if (selectedGroup && activitiesWithoutGroupLink > 0) {
    limits.push(t('referentReports.limits.activityGroupLink'))
  }
  return limits
}

function KpiCard({ label, value, icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-4 w-4" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </div>
  )
}

function CompactTable({ columns, rows, emptyLabel }) {
  if (!rows.length) {
    return <p className="rounded-lg bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">{emptyLabel}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={`${row.join('-')}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-3 py-2 text-slate-700">
                  {cell || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function exportReportPdf({ report, data, generatedAt, language, t }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  let cursorY = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(t('referentReports.exports.reportTitle'), margin, cursorY)
  cursorY += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(t('referentReports.exports.generatedAt', { date: formatDateTime(generatedAt, language) }), margin, cursorY)
  cursorY += 8

  cursorY = addPdfTable(doc, cursorY, t('referentReports.exports.sections.filters'), [
    [t('referentReports.exports.columns.label'), t('referentReports.exports.columns.value')],
    ...report.filterLabels.map(item => [item.label, item.value]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('referentReports.exports.sections.summary'), [
    [t('referentReports.exports.columns.label'), t('referentReports.exports.columns.value')],
    ...report.kpis.map(item => [item.label, item.value]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('referentReports.exports.sections.activities'), [
    [t('common.title'), t('common.date'), t('referentReports.kpis.registered'), t('referentReports.kpis.present'), t('referentReports.columns.rate')],
    ...report.activityRows.map(row => [row.title, formatDate(row.date, language), row.registered, row.present, formatPercent(row.attendanceRate, language)]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('referentReports.exports.sections.presences'), [
    [t('impact.exports.columns.activity'), t('impact.exports.columns.participant'), t('presence.table.registration'), t('presence.table.presence')],
    ...data.presences.map(presence => [
      presence.activiteTitre || '',
      formatMemberName(presence),
      presence.statutInscription || '',
      translatePresence(presence.statutPresence, t),
    ]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('referentReports.exports.sections.projects'), [
    [t('common.title'), t('users.status'), t('impact.exports.columns.referentComment'), t('common.date')],
    ...data.projects.map(project => [
      project.titre || '',
      translateStatus(project.statut, t),
      getProjectReferentComment(project),
      formatDate(project.dateCreation || project.dateSoumission || project.dateValidation, language),
    ]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('referentReports.exports.sections.limits'), [
    [t('referentReports.exports.columns.limit')],
    ...report.limits.map(limit => [limit]),
  ])

  addPdfTable(doc, cursorY, t('referentReports.exports.sections.quality'), [
    [t('referentReports.exports.columns.label'), t('referentReports.exports.columns.value'), t('referentReports.exports.columns.note')],
    ...report.qualityItems.map(item => [item.label, item.value, item.description]),
  ])

  doc.save(buildFileName('rapport-groupe', 'pdf', generatedAt))
}

function exportReportExcel({ report, data, generatedAt, language, t }) {
  const workbook = createExcelWorkbook()

  appendSheet(workbook, t('referentReports.exports.sheets.summary'), [
    [t('referentReports.exports.reportTitle')],
    [t('referentReports.exports.generatedAt', { date: formatDateTime(generatedAt, language) })],
    [],
    [t('referentReports.exports.sections.filters')],
    [t('referentReports.exports.columns.label'), t('referentReports.exports.columns.value')],
    ...report.filterLabels.map(item => [item.label, item.value]),
    [],
    [t('referentReports.exports.sections.summary')],
    [t('referentReports.exports.columns.label'), t('referentReports.exports.columns.value')],
    ...report.kpis.map(item => [item.label, item.value]),
  ])

  appendSheet(workbook, t('referentReports.exports.sheets.activities'), [
    [t('common.title'), t('users.status'), t('common.date'), t('referentReports.kpis.registered'), t('referentReports.kpis.present'), t('referentReports.kpis.absent'), t('referentReports.kpis.excused'), t('referentReports.columns.rate')],
    ...report.activityRows.map(row => [
      row.title,
      data.activities.find(activity => String(activity.id) === String(row.id))?.statut || '',
      formatDate(row.date, language),
      row.registered,
      row.present,
      row.absent,
      row.excused,
      formatPercent(row.attendanceRate, language),
    ]),
  ])

  appendSheet(workbook, t('referentReports.exports.sheets.presences'), [
    [t('impact.exports.columns.activity'), t('common.date'), t('impact.exports.columns.participant'), t('presence.table.registration'), t('presence.table.presence')],
    ...data.presences.map(presence => [
      presence.activiteTitre || '',
      formatDate(presence.activiteDateDebut || presence.datePresence, language),
      formatMemberName(presence),
      presence.statutInscription || '',
      translatePresence(presence.statutPresence, t),
    ]),
  ])

  appendSheet(workbook, t('referentReports.exports.sheets.projects'), [
    [t('common.title'), t('users.status'), t('impact.exports.columns.referentComment'), t('common.date'), t('referentReports.filters.group')],
    ...data.projects.map(project => [
      project.titre || '',
      translateStatus(project.statut, t),
      getProjectReferentComment(project),
      formatDate(project.dateCreation || project.dateSoumission || project.dateValidation, language),
      project.groupeNom || project.groupe?.nom || '',
    ]),
  ])

  appendSheet(workbook, t('referentReports.exports.sheets.quality'), [
    [t('referentReports.exports.columns.label'), t('referentReports.exports.columns.value'), t('referentReports.exports.columns.note')],
    ...report.qualityItems.map(item => [item.label, item.value, item.description]),
    [],
    [t('referentReports.exports.sections.limits')],
    ...report.limits.map(limit => [limit]),
  ])

  saveExcelWorkbook(workbook, buildFileName('rapport-groupe', 'xls', generatedAt))
}

function addPdfTable(doc, startY, title, rows) {
  const margin = 14
  let nextY = startY
  if (nextY > 250) {
    doc.addPage()
    nextY = 18
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(title, margin, nextY)
  nextY += 3

  autoTable(doc, {
    startY: nextY,
    head: rows.length ? [rows[0]] : [],
    body: rows.slice(1),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    margin: { left: margin, right: margin },
    theme: 'striped',
  })
  return doc.lastAutoTable.finalY + 9
}

function appendSheet(workbook, sheetName, rows) {
  appendExcelSheet(workbook, sheetName, rows)
}

function buildFileName(prefix, extension, date) {
  return `${prefix}-${date.toISOString().slice(0, 10)}.${extension}`
}

function formatMemberName(member) {
  return [member.membrePrenom || member.prenom, member.membreNom || member.nom].filter(Boolean).join(' ')
    || member.membreEmail
    || member.email
    || '-'
}

function formatDate(value, language) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(language || 'fr-BE', { dateStyle: 'short' }).format(date)
}

function formatDateTime(value, language) {
  const date = new Date(value)
  return new Intl.DateTimeFormat(language || 'fr-BE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatPercent(value, language) {
  return new Intl.NumberFormat(language || 'fr-BE', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function translatePresence(status, t) {
  return t(`presence.statuses.${status || 'NON_RENSEIGNEE'}`, {
    defaultValue: status || t('presence.statuses.NON_RENSEIGNEE'),
  })
}

function translateStatus(status, t) {
  return t(`statuses.${status}`, { defaultValue: status || '-' })
}

function getProjectReferentComment(project) {
  return project.commentaireReferent || project.commentaireValidationReferent || project.motifRefusReferent || ''
}
